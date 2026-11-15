package com.grievance.dto;

import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;

import java.time.LocalDateTime;
import java.util.List;

/**
 * What anyone with a tracking ID may see. No description, emails, names, remarks or database IDs.
 */
public record PublicTrackResponse(String trackingId, String title, Category category, Priority priority,
                                  GrievanceStatus status, List<Step> statusHistory) {

    public record Step(GrievanceStatus status, LocalDateTime at) {
    }
}
