package com.grievance.enums;

/**
 * Grievance lifecycle (plan.md §2, README):
 * SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED,
 * plus ESCALATED when the department SLA is breached.
 */
public enum GrievanceStatus {
    SUBMITTED,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    ESCALATED
}
