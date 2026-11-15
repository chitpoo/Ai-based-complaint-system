package com.grievance.service;

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
