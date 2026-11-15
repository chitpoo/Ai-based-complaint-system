package com.grievance.scheduler;

import com.grievance.entity.Department;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.GrievanceRepository;
import com.grievance.service.GrievanceService;
import com.grievance.service.GrievanceSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Escalates open grievances that are past their department's SLA.
 * It looks at the current state every run, so after the server has been asleep
 * it simply catches up on the next run.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EscalationJob {

    private final DepartmentRepository departmentRepository;
    private final GrievanceRepository grievanceRepository;
    private final GrievanceService grievanceService;

    @Scheduled(initialDelayString = "${app.escalation.initial-delay-ms:60000}",
            fixedDelayString = "${app.escalation.interval-ms:900000}")
    public void escalateOverdue() {
        LocalDateTime now = LocalDateTime.now();
        List<Long> overdue = new ArrayList<>();
        for (Department department : departmentRepository.findAll()) {
            overdue.addAll(grievanceRepository.findOverdueIdsInDepartment(department.getId(),
                    GrievanceSpecifications.OPEN_STATUSES, now.minusHours(department.getSlaHours())));
        }
        overdue.addAll(grievanceRepository.findOverdueIdsUnrouted(GrievanceSpecifications.OPEN_STATUSES,
                now.minusHours(GrievanceSpecifications.DEFAULT_SLA_HOURS)));

        int escalated = 0;
        for (Long id : overdue) {
            try {
                // One transaction per grievance: a failure here does not stop the rest.
                if (grievanceService.escalate(id)) {
                    escalated++;
                }
            } catch (Exception ex) {
                log.error("Could not escalate grievance {}", id, ex);
            }
        }
        if (escalated > 0) {
            log.info("Escalated {} overdue grievance(s)", escalated);
        }
    }
}
