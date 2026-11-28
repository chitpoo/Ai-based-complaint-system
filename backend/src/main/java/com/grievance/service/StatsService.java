package com.grievance.service;

import com.grievance.dto.PublicStatsResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;

import com.grievance.dto.StatsResponse;
import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.GrievanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Dashboard numbers. Every figure is counted by the database; no grievance rows are loaded. */
@Service
@RequiredArgsConstructor
public class StatsService {

    private final GrievanceRepository grievanceRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        long overdue = grievanceRepository.count(
                GrievanceSpecifications.overdue(departmentRepository.findAll(), LocalDateTime.now()));
        Double average = grievanceRepository.averageResolutionHours();
        return new StatsResponse(
                fill(GrievanceStatus.values(), grievanceRepository.countByStatus()),
                fill(Category.values(), grievanceRepository.countByCategory()),
                fill(Priority.values(), grievanceRepository.countByPriority()),
                overdue,
                average == null ? null : Math.round(average * 10) / 10.0);
    }

    /** Site-wide numbers for every signed-in user; {@code days} days of daily counts, today last. */
    @Transactional(readOnly = true)
    public PublicStatsResponse publicStats(int days) {
        Map<String, Long> byStatus = fill(GrievanceStatus.values(), grievanceRepository.countByStatus());
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();

        LocalDate today = LocalDate.now();
        LocalDateTime since = today.minusDays(days - 1L).atStartOfDay();
        Map<LocalDate, Long> filed = perDay(grievanceRepository.countFiledPerDaySince(since));
        Map<LocalDate, Long> resolved = perDay(grievanceRepository.countResolvedPerDaySince(since));
        List<PublicStatsResponse.Day> daily = new ArrayList<>();
        for (LocalDate d = since.toLocalDate(); !d.isAfter(today); d = d.plusDays(1)) {
            daily.add(new PublicStatsResponse.Day(d, filed.getOrDefault(d, 0L), resolved.getOrDefault(d, 0L)));
        }
        return new PublicStatsResponse(total, byStatus, grievanceRepository.countByEscalatedTrue(), daily);
    }

    private Map<LocalDate, Long> perDay(List<Object[]> rows) {
        Map<LocalDate, Long> out = new HashMap<>();
        for (Object[] row : rows) {
            LocalDate day = row[0] instanceof java.sql.Date d ? d.toLocalDate() : (LocalDate) row[0];
            out.put(day, ((Number) row[1]).longValue());
        }
        return out;
    }

    /** Starts every enum value at 0 so the UI always gets every key, then fills in the real counts. */
    private Map<String, Long> fill(Enum<?>[] keys, List<Object[]> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Enum<?> key : keys) {
            counts.put(key.name(), 0L);
        }
        for (Object[] row : rows) {
            counts.put(((Enum<?>) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }
}
