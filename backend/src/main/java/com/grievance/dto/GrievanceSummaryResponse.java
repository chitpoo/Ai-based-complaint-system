package com.grievance.dto;

import com.grievance.entity.Grievance;
import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;

import java.time.LocalDateTime;

/** One row of a list (my grievances, officer queue, admin list). */
public record GrievanceSummaryResponse(Long id, String trackingId, String title, Category category,
                                       Priority priority, GrievanceStatus status, Long departmentId,
                                       String departmentName, boolean escalated, boolean anonymous,
                                       LocalDateTime createdAt, LocalDateTime resolvedAt) {

    public static GrievanceSummaryResponse from(Grievance g) {
        return new GrievanceSummaryResponse(g.getId(), g.getTrackingId(), g.getTitle(), g.getCategory(),
                g.getPriority(), g.getStatus(),
                g.getDepartment() == null ? null : g.getDepartment().getId(),
                g.getDepartment() == null ? null : g.getDepartment().getName(),
                g.isEscalated(), g.isAnonymous(), g.getCreatedAt(), g.getResolvedAt());
    }
}
