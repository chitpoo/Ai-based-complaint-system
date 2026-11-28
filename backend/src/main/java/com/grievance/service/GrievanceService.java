package com.grievance.service;

import com.grievance.dto.AssignRequest;
import com.grievance.dto.AssignResponse;
import com.grievance.dto.GrievanceCreateRequest;
import com.grievance.dto.GrievanceCreatedResponse;
import com.grievance.dto.GrievanceDetailResponse;
import com.grievance.dto.GrievanceSummaryResponse;
import com.grievance.dto.PageResponse;
import com.grievance.dto.PublicTrackResponse;
import com.grievance.dto.StatusUpdateRequest;
import com.grievance.dto.StatusUpdateResponse;
import com.grievance.entity.Department;
import com.grievance.entity.Grievance;
import com.grievance.entity.StatusHistory;
import com.grievance.entity.User;
import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;
import com.grievance.enums.Role;
import com.grievance.exception.BadRequestException;
import com.grievance.exception.ForbiddenOperationException;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.dto.ReclassifyResponse;
import com.grievance.exception.ServiceUnavailableException;
import com.grievance.ml.MlClient;
import com.grievance.ml.MlPrediction;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.GrievanceRepository;
import com.grievance.repository.StatusHistoryRepository;
import com.grievance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.grievance.service.GrievanceSpecifications.hasCategory;
import static com.grievance.service.GrievanceSpecifications.hasPriority;
import static com.grievance.service.GrievanceSpecifications.hasStatus;
import static com.grievance.service.GrievanceSpecifications.inDepartment;
import static com.grievance.service.GrievanceSpecifications.overdue;

@Slf4j
@Service
@RequiredArgsConstructor
public class GrievanceService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final GrievanceRepository grievanceRepository;
    private final StatusHistoryRepository historyRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final MlClient mlClient;
    private final TrackingIdGenerator trackingIdGenerator;
    private final StatusTransitionPolicy transitionPolicy;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transactionTemplate;

    // ---------------------------------------------------------------- submit

    /**
     * Not @Transactional on purpose: the ML call can take up to 5 seconds and must not
     * hold a database connection. The transaction starts only once the prediction is in hand.
     */
    public GrievanceCreatedResponse submit(GrievanceCreateRequest request, User owner) {
        String title = request.title().trim();
        String description = request.description().trim();
        Optional<MlPrediction> prediction = mlClient.predict(title, description);
        boolean anonymous = request.wantsAnonymity();
        return transactionTemplate.execute(tx -> save(title, description, anonymous, owner.getId(), prediction));
    }

    private GrievanceCreatedResponse save(String title, String description, boolean anonymous, Long ownerId,
                                          Optional<MlPrediction> prediction) {
        User owner = userRepository.getReferenceById(ownerId);
        Department department = prediction
                .flatMap(p -> departmentRepository.findByCategory(p.category()))
                .orElse(null);

        Grievance grievance = new Grievance();
        grievance.setTrackingId(trackingIdGenerator.next());
        grievance.setUser(owner);
        grievance.setTitle(title);
        grievance.setDescription(description);
        grievance.setAnonymous(anonymous);
        grievance.setCategory(prediction.map(MlPrediction::category).orElse(Category.UNCLASSIFIED));
        grievance.setPriority(prediction.map(MlPrediction::priority).orElse(Priority.MEDIUM));
        grievance.setAiConfidence(prediction.map(MlPrediction::categoryConfidence)
                .map(c -> BigDecimal.valueOf(Math.max(0, Math.min(1, c))).setScale(4, RoundingMode.HALF_UP))
                .orElse(null));
        grievance.setDepartment(department);
        // Routed only when the AI answered AND a department owns that category; otherwise the admin triages it.
        boolean routed = department != null;
        grievance.setStatus(routed ? GrievanceStatus.ASSIGNED : GrievanceStatus.SUBMITTED);
        grievance = grievanceRepository.save(grievance);

        addHistory(grievance, null, GrievanceStatus.SUBMITTED, owner, null);
        if (routed) {
            addHistory(grievance, GrievanceStatus.SUBMITTED, GrievanceStatus.ASSIGNED, null, "Auto-routed by AI");
        } else {
            log.warn("Grievance {} saved without routing; it is waiting in the admin queue", grievance.getTrackingId());
        }
        events.publishEvent(new StatusChangedEvent(grievance.getId(), null, grievance.getStatus(), null, !routed));

        return new GrievanceCreatedResponse(grievance.getId(), grievance.getTrackingId(), grievance.getCategory(),
                grievance.getPriority(), grievance.getStatus(), routed ? department.getName() : null,
                grievance.isAnonymous());
    }

    // ----------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public List<GrievanceSummaryResponse> listMine(User owner) {
        return grievanceRepository.findByUserIdOrderByCreatedAtDesc(owner.getId()).stream()
                .map(GrievanceSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicTrackResponse track(String trackingId) {
        Grievance grievance = grievanceRepository.findByTrackingId(trackingId.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("No grievance found with this tracking ID"));
        List<PublicTrackResponse.Step> steps = historyRepository
                .findByGrievanceIdOrderByCreatedAtAscIdAsc(grievance.getId()).stream()
                // A reassignment keeps the status the same; it is internal and not part of the public timeline.
                .filter(h -> h.getOldStatus() != h.getNewStatus())
                .map(h -> new PublicTrackResponse.Step(h.getNewStatus(), h.getCreatedAt()))
                .toList();
        return new PublicTrackResponse(grievance.getTrackingId(), grievance.getTitle(), grievance.getCategory(),
                grievance.getPriority(), grievance.getStatus(), steps);
    }

    @Transactional(readOnly = true)
    public GrievanceDetailResponse getDetail(Long id, User actor) {
        Grievance g = load(id);
        if (!canView(g, actor)) {
            throw new ForbiddenOperationException("You do not have access to this grievance");
        }
        List<GrievanceDetailResponse.HistoryEntry> history = historyRepository
                .findByGrievanceIdOrderByCreatedAtAscIdAsc(id).stream()
                .map(h -> new GrievanceDetailResponse.HistoryEntry(h.getOldStatus(), h.getNewStatus(),
                        h.getChangedBy() == null ? null : IdentityPolicy.displayName(h.getChangedBy(), g, actor),
                        h.getRemark(), h.getCreatedAt()))
                .toList();
        return new GrievanceDetailResponse(g.getId(), g.getTrackingId(), g.getTitle(), g.getDescription(),
                g.getCategory(), g.getPriority(), g.getStatus(), g.getAiConfidence(), g.isEscalated(),
                g.getEscalatedAt(), g.getResolvedAt(), g.getCreatedAt(), g.getUpdatedAt(),
                g.getDepartment() == null ? null : g.getDepartment().getId(),
                g.getDepartment() == null ? null : g.getDepartment().getName(),
                g.getOfficer() == null ? null : g.getOfficer().getId(),
                g.getOfficer() == null ? null : g.getOfficer().getName(),
                IdentityPolicy.displayName(g.getUser(), g, actor), g.isAnonymous(), history);
    }

    /** The officer's department queue. An officer with no department sees nothing. */
    @Transactional(readOnly = true)
    public List<GrievanceSummaryResponse> listAssigned(User officer, GrievanceStatus status) {
        if (officer.getDepartment() == null) {
            return List.of();
        }
        Specification<Grievance> spec = inDepartment(officer.getDepartment().getId()).and(hasStatus(status));
        return grievanceRepository.findAll(spec, NEWEST_FIRST).stream()
                .map(GrievanceSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<GrievanceSummaryResponse> listAll(GrievanceStatus status, Category category,
                                                          Priority priority, boolean overdueOnly,
                                                          int page, int size) {
        Specification<Grievance> spec = hasStatus(status).and(hasCategory(category)).and(hasPriority(priority));
        if (overdueOnly) {
            spec = spec.and(overdue(departmentRepository.findAll(), LocalDateTime.now()));
        }
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                NEWEST_FIRST);
        return PageResponse.from(grievanceRepository.findAll(spec, pageRequest).map(GrievanceSummaryResponse::from));
    }

    // ---------------------------------------------------------------- writes

    @Transactional
    public StatusUpdateResponse updateStatus(Long id, StatusUpdateRequest request, User actor) {
        Grievance g = load(id);
        if (actor.getRole() == Role.OFFICER && !sameDepartment(g, actor)) {
            throw new ForbiddenOperationException("This grievance belongs to another department");
        }
        GrievanceStatus old = g.getStatus();
        transitionPolicy.validate(old, request.status(), actor.getRole());
        applyStatus(g, request.status(), userRepository.getReferenceById(actor.getId()), clean(request.remark()));
        return new StatusUpdateResponse(g.getId(), old, g.getStatus());
    }

    /**
     * Admin routing. Naming an officer also moves the grievance to that officer's department.
     * An unrouted grievance becomes ASSIGNED; one already in progress keeps its status and
     * gets a history row that records the reassignment.
     */
    @Transactional
    public AssignResponse assign(Long id, AssignRequest request, User admin) {
        if (request.officerId() == null && request.departmentId() == null) {
            throw new BadRequestException("Give an officerId, a departmentId, or both");
        }
        Grievance g = load(id);
        if (g.getStatus() == GrievanceStatus.RESOLVED || g.getStatus() == GrievanceStatus.CLOSED) {
            throw new BadRequestException("A " + g.getStatus() + " grievance cannot be reassigned");
        }

        User officer = null;
        Department department;
        if (request.officerId() != null) {
            officer = userRepository.findById(request.officerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Officer not found"));
            if (officer.getRole() != Role.OFFICER || officer.getDepartment() == null) {
                throw new BadRequestException("That user is not an officer with a department");
            }
            department = officer.getDepartment();
            if (request.departmentId() != null && !request.departmentId().equals(department.getId())) {
                throw new BadRequestException("That officer does not belong to the given department");
            }
        } else {
            department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        }

        g.setDepartment(department);
        g.setOfficer(officer);
        if (g.getCategory() == Category.UNCLASSIFIED) {
            // Manual triage: the department the admin picked tells us the category.
            g.setCategory(department.getCategory());
        }
        String remark = "Assigned to " + department.getName() + (officer == null ? "" : " (" + officer.getName() + ")");
        User adminRef = userRepository.getReferenceById(admin.getId());
        if (g.getStatus() == GrievanceStatus.SUBMITTED) {
            transitionPolicy.requireAllowed(GrievanceStatus.SUBMITTED, GrievanceStatus.ASSIGNED);
            applyStatus(g, GrievanceStatus.ASSIGNED, adminRef, remark);
        } else {
            addHistory(g, g.getStatus(), g.getStatus(), adminRef, "Re" + remark.substring(0, 1).toLowerCase()
                    + remark.substring(1));
        }
        return new AssignResponse(g.getId(), officer == null ? null : officer.getId(), department.getId(),
                g.getStatus());
    }

    /**
     * Asks the AI again about a grievance that was saved without a category, usually because the
     * ML service was down at submission. Like submit, the ML call runs outside the transaction.
     */
    public ReclassifyResponse reclassify(Long id, User admin) {
        Grievance before = load(id);
        requireReclassifiable(before);
        if (!mlClient.isAvailable()) {
            throw new ServiceUnavailableException("The AI service is not running; start it and try again");
        }
        MlPrediction prediction = mlClient.predict(before.getTitle(), before.getDescription())
                .orElseThrow(() -> new BadRequestException(
                        "The AI is not confident about this grievance; assign it by hand"));
        return transactionTemplate.execute(tx -> applyPrediction(id, prediction, admin));
    }

    private ReclassifyResponse applyPrediction(Long id, MlPrediction prediction, User admin) {
        Grievance g = load(id);
        requireReclassifiable(g); // re-checked: an admin may have assigned it during the ML call
        Department department = departmentRepository.findByCategory(prediction.category())
                .orElseThrow(() -> new BadRequestException("No department handles "
                        + prediction.category() + " yet; create one or assign by hand"));

        g.setCategory(prediction.category());
        g.setPriority(prediction.priority());
        g.setAiConfidence(prediction.categoryConfidence() == null ? null
                : BigDecimal.valueOf(Math.max(0, Math.min(1, prediction.categoryConfidence())))
                        .setScale(4, RoundingMode.HALF_UP));
        g.setDepartment(department);

        String remark = "Classified by AI on admin request; routed to " + department.getName();
        User adminRef = userRepository.getReferenceById(admin.getId());
        if (g.getStatus() == GrievanceStatus.SUBMITTED) {
            transitionPolicy.requireAllowed(GrievanceStatus.SUBMITTED, GrievanceStatus.ASSIGNED);
            applyStatus(g, GrievanceStatus.ASSIGNED, adminRef, remark);
        } else {
            addHistory(g, g.getStatus(), g.getStatus(), adminRef, remark);
        }
        return new ReclassifyResponse(g.getId(), g.getCategory(), g.getPriority(), g.getStatus(),
                department.getName());
    }

    private void requireReclassifiable(Grievance g) {
        if (g.getCategory() != Category.UNCLASSIFIED || g.getDepartment() != null) {
            throw new BadRequestException("Only grievances still awaiting review can be sent to the AI again");
        }
        // ESCALATED counts as open here: a grievance nobody routed is exactly the one that escalates.
        if (g.getStatus() == GrievanceStatus.RESOLVED || g.getStatus() == GrievanceStatus.CLOSED) {
            throw new BadRequestException("A " + g.getStatus() + " grievance cannot be reclassified");
        }
    }

    /**
     * Called by the escalation job, one grievance per transaction.
     * Re-checks the status so a grievance is never escalated twice.
     */
    @Transactional
    public boolean escalate(Long id) {
        Grievance g = load(id);
        if (!GrievanceSpecifications.OPEN_STATUSES.contains(g.getStatus())) {
            return false;
        }
        transitionPolicy.requireAllowed(g.getStatus(), GrievanceStatus.ESCALATED);
        applyStatus(g, GrievanceStatus.ESCALATED, null, "SLA breached");
        return true;
    }

    // --------------------------------------------------------------- helpers

    private Grievance load(Long id) {
        return grievanceRepository.findWithRelationsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Grievance not found"));
    }

    /** Changes the status, sets the matching timestamps, writes the history row and announces the change. */
    private void applyStatus(Grievance g, GrievanceStatus to, User changedBy, String remark) {
        GrievanceStatus from = g.getStatus();
        g.setStatus(to);
        if (to == GrievanceStatus.RESOLVED) {
            g.setResolvedAt(LocalDateTime.now());
        }
        if (to == GrievanceStatus.ESCALATED) {
            g.setEscalated(true);
            g.setEscalatedAt(LocalDateTime.now());
        }
        addHistory(g, from, to, changedBy, remark);
        events.publishEvent(new StatusChangedEvent(g.getId(), from, to, remark, false));
    }

    private void addHistory(Grievance g, GrievanceStatus from, GrievanceStatus to, User changedBy, String remark) {
        StatusHistory row = new StatusHistory();
        row.setGrievance(g);
        row.setOldStatus(from);
        row.setNewStatus(to);
        row.setChangedBy(changedBy);
        row.setRemark(remark);
        historyRepository.save(row);
    }

    private boolean canView(Grievance g, User actor) {
        return switch (actor.getRole()) {
            case ADMIN -> true;
            case OFFICER -> sameDepartment(g, actor);
            case USER -> g.getUser().getId().equals(actor.getId());
        };
    }

    /** False when either side has no department, so an officer without one can never pass. */
    private boolean sameDepartment(Grievance g, User officer) {
        return g.getDepartment() != null && officer.getDepartment() != null
                && g.getDepartment().getId().equals(officer.getDepartment().getId());
    }

    private String clean(String remark) {
        return remark == null || remark.isBlank() ? null : remark.trim();
    }
}
