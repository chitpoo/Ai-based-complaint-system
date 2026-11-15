package com.grievance.service;

import com.grievance.entity.Department;
import com.grievance.entity.Grievance;
import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Reusable filters for grievance lists. The overdue rule here is the same one the escalation job uses. */
public final class GrievanceSpecifications {

    /** Statuses whose SLA clock is still running (plan.md §2). */
    public static final Set<GrievanceStatus> OPEN_STATUSES = EnumSet.of(
            GrievanceStatus.SUBMITTED, GrievanceStatus.ASSIGNED, GrievanceStatus.IN_PROGRESS);

    /** SLA for grievances that have no department yet. */
    public static final int DEFAULT_SLA_HOURS = 72;

    private GrievanceSpecifications() {
    }

    public static Specification<Grievance> hasStatus(GrievanceStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Grievance> hasCategory(Category category) {
        return (root, query, cb) -> category == null ? cb.conjunction() : cb.equal(root.get("category"), category);
    }

    public static Specification<Grievance> hasPriority(Priority priority) {
        return (root, query, cb) -> priority == null ? cb.conjunction() : cb.equal(root.get("priority"), priority);
    }

    public static Specification<Grievance> inDepartment(Long departmentId) {
        return (root, query, cb) -> cb.equal(root.get("department").get("id"), departmentId);
    }

    /**
     * Open AND created longer ago than the SLA of its department (72h if it has none).
     * Each department has its own SLA, so the filter is one OR-branch per department.
     */
    public static Specification<Grievance> overdue(List<Department> departments, LocalDateTime now) {
        return (root, query, cb) -> {
            List<Predicate> pastSla = new ArrayList<>();
            for (Department department : departments) {
                pastSla.add(cb.and(
                        cb.equal(root.get("department").get("id"), department.getId()),
                        cb.lessThan(root.get("createdAt"), now.minusHours(department.getSlaHours()))));
            }
            pastSla.add(cb.and(
                    cb.isNull(root.get("department")),
                    cb.lessThan(root.get("createdAt"), now.minusHours(DEFAULT_SLA_HOURS))));
            return cb.and(root.get("status").in(OPEN_STATUSES), cb.or(pastSla.toArray(new Predicate[0])));
        };
    }
}
