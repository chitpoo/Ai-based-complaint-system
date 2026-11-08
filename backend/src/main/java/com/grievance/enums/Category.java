package com.grievance.enums;

/**
 * AI classification categories (plan.md §2).
 * UNCLASSIFIED is the ML-down fallback only - the ML service never returns it.
 */
public enum Category {
    ACADEMIC,
    HOSTEL,
    INFRASTRUCTURE,
    FINANCE,
    HARASSMENT,
    UNCLASSIFIED
}
