package com.grievance.service;

import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Role;
import com.grievance.exception.ForbiddenOperationException;
import com.grievance.exception.InvalidTransitionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static com.grievance.enums.GrievanceStatus.ASSIGNED;
import static com.grievance.enums.GrievanceStatus.CLOSED;
import static com.grievance.enums.GrievanceStatus.ESCALATED;
import static com.grievance.enums.GrievanceStatus.IN_PROGRESS;
import static com.grievance.enums.GrievanceStatus.RESOLVED;
import static com.grievance.enums.GrievanceStatus.SUBMITTED;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Every row of the plan.md §2 transition table, plus the moves that must be refused. */
class StatusTransitionPolicyTest {

    private final StatusTransitionPolicy policy = new StatusTransitionPolicy();

    @ParameterizedTest
    @CsvSource({
            "SUBMITTED,ASSIGNED", "ASSIGNED,IN_PROGRESS", "IN_PROGRESS,RESOLVED", "RESOLVED,CLOSED",
            "SUBMITTED,ESCALATED", "ASSIGNED,ESCALATED", "IN_PROGRESS,ESCALATED",
            "ESCALATED,IN_PROGRESS", "ESCALATED,RESOLVED"})
    void everyTableRowIsAllowed(GrievanceStatus from, GrievanceStatus to) {
        assertDoesNotThrow(() -> policy.requireAllowed(from, to));
    }

    @Test
    void theTableHasExactlyNineMoves() {
        int allowed = 0;
        for (GrievanceStatus from : GrievanceStatus.values()) {
            for (GrievanceStatus to : GrievanceStatus.values()) {
                if (policy.isAllowed(from, to)) {
                    allowed++;
                }
            }
        }
        assertEquals(9, allowed);
    }

    @ParameterizedTest
    @CsvSource({"ASSIGNED,RESOLVED", "SUBMITTED,IN_PROGRESS", "CLOSED,IN_PROGRESS", "RESOLVED,IN_PROGRESS",
            "IN_PROGRESS,IN_PROGRESS", "ESCALATED,CLOSED"})
    void illegalJumpsAreRefused(GrievanceStatus from, GrievanceStatus to) {
        assertThrows(InvalidTransitionException.class, () -> policy.validate(from, to, Role.ADMIN));
    }

    @Test
    void officerCanWorkACaseButNotCloseIt() {
        assertDoesNotThrow(() -> policy.validate(ASSIGNED, IN_PROGRESS, Role.OFFICER));
        assertDoesNotThrow(() -> policy.validate(IN_PROGRESS, RESOLVED, Role.OFFICER));
        assertDoesNotThrow(() -> policy.validate(ESCALATED, RESOLVED, Role.OFFICER));
        assertThrows(ForbiddenOperationException.class, () -> policy.validate(RESOLVED, CLOSED, Role.OFFICER));
        assertDoesNotThrow(() -> policy.validate(RESOLVED, CLOSED, Role.ADMIN));
    }

    @Test
    void nobodyCanChooseASystemOnlyStatus() {
        assertThrows(InvalidTransitionException.class, () -> policy.validate(SUBMITTED, ASSIGNED, Role.ADMIN));
        assertThrows(InvalidTransitionException.class, () -> policy.validate(ASSIGNED, ESCALATED, Role.OFFICER));
        assertThrows(InvalidTransitionException.class, () -> policy.validate(ASSIGNED, SUBMITTED, Role.ADMIN));
    }

    @Test
    void ordinaryUsersCannotChangeStatus() {
        assertThrows(ForbiddenOperationException.class, () -> policy.validate(ASSIGNED, IN_PROGRESS, Role.USER));
    }
}
