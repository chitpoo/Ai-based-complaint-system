package com.grievance.enums;

/**
 * Predicted priority (plan.md §2). Keyword rules in the ML service
 * can force a grievance to HIGH regardless of model output.
 */
public enum Priority {
    LOW,
    MEDIUM,
    HIGH
}
