package com.grievance.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Site-wide counts any signed-in user may see. Numbers only: no titles, names or ids,
 * so nothing here can point to a person or a single complaint.
 */
public record PublicStatsResponse(long total, Map<String, Long> byStatus, long escalated, List<Day> daily) {

    public record Day(LocalDate date, long filed, long resolved) {
    }
}
