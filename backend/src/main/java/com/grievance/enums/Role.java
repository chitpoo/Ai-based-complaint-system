package com.grievance.enums;

/**
 * User roles for role-based access (plan.md §2).
 * Stored as VARCHAR via {@code @Enumerated(EnumType.STRING)} - never ordinal.
 */
public enum Role {
    USER,
    OFFICER,
    ADMIN
}
