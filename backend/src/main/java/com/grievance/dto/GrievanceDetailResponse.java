package com.grievance.dto;

import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full view for the owner, the department's officers and admins.
 * For an anonymous grievance, submittedBy is "Anonymous" unless the viewer is the owner or an admin.
 */
public record GrievanceDetailResponse(Long id, String trackingId, String title, String description,
                                      Category category, Priority priority, GrievanceStatus status,
                                      BigDecimal aiConfidence, boolean escalated, LocalDateTime escalatedAt,
                                      LocalDateTime resolvedAt, LocalDateTime createdAt, LocalDateTime updatedAt,
                                      Long departmentId, String departmentName, Long officerId, String officerName,
                                      String submittedBy, boolean anonymous, List<HistoryEntry> statusHistory) {

    /** changedBy is null when the system (AI routing or the escalation job) made the change. */
    public record HistoryEntry(GrievanceStatus oldStatus, GrievanceStatus newStatus, String changedBy,
                               String remark, LocalDateTime at) {
    }
}
