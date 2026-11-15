package com.grievance.service;

import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Role;
import com.grievance.exception.ForbiddenOperationException;
import com.grievance.exception.InvalidTransitionException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import static com.grievance.enums.GrievanceStatus.ASSIGNED;
import static com.grievance.enums.GrievanceStatus.CLOSED;
import static com.grievance.enums.GrievanceStatus.ESCALATED;
import static com.grievance.enums.GrievanceStatus.IN_PROGRESS;
import static com.grievance.enums.GrievanceStatus.RESOLVED;
import static com.grievance.enums.GrievanceStatus.SUBMITTED;

/**
 * The only place that decides which status moves are legal (plan.md §2 transition table).
 */
@Component
public class StatusTransitionPolicy {

    private static final Map<GrievanceStatus, Set<GrievanceStatus>> ALLOWED = new EnumMap<>(GrievanceStatus.class);

    /** Moves made by the system (AI routing, admin assignment, the escalation job), never typed in by a person. */
    private static final Set<GrievanceStatus> SYSTEM_ONLY_TARGETS = EnumSet.of(SUBMITTED, ASSIGNED, ESCALATED);

    static {
        ALLOWED.put(SUBMITTED, EnumSet.of(ASSIGNED, ESCALATED));
        ALLOWED.put(ASSIGNED, EnumSet.of(IN_PROGRESS, ESCALATED));
        ALLOWED.put(IN_PROGRESS, EnumSet.of(RESOLVED, ESCALATED));
        ALLOWED.put(RESOLVED, EnumSet.of(CLOSED));
        ALLOWED.put(ESCALATED, EnumSet.of(IN_PROGRESS, RESOLVED));
        ALLOWED.put(CLOSED, EnumSet.noneOf(GrievanceStatus.class));
    }

    public boolean isAllowed(GrievanceStatus from, GrievanceStatus to) {
        return ALLOWED.get(from).contains(to);
    }

    /** For moves the system makes itself. */
    public void requireAllowed(GrievanceStatus from, GrievanceStatus to) {
        if (!isAllowed(from, to)) {
            throw new InvalidTransitionException("Cannot move a grievance from " + from + " to " + to);
        }
    }

    /** For PUT /api/grievances/{id}/status: checks the move and who is making it. */
    public void validate(GrievanceStatus from, GrievanceStatus to, Role actorRole) {
        if (actorRole != Role.OFFICER && actorRole != Role.ADMIN) {
            throw new ForbiddenOperationException("Only officers and admins can change a grievance's status");
        }
        if (SYSTEM_ONLY_TARGETS.contains(to)) {
            throw new InvalidTransitionException("Status " + to + " is set by the system and cannot be chosen");
        }
        requireAllowed(from, to);
        if (to == CLOSED && actorRole != Role.ADMIN) {
            throw new ForbiddenOperationException("Only an admin can close a grievance");
        }
    }
}
