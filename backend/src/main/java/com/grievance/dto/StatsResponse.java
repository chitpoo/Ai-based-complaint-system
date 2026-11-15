package com.grievance.dto;

import java.util.Map;

/** avgResolutionHours is null until at least one grievance has been resolved. */
public record StatsResponse(Map<String, Long> byStatus, Map<String, Long> byCategory, Map<String, Long> byPriority,
                            long overdueCount, Double avgResolutionHours) {
}
