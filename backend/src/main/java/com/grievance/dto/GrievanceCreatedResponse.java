package com.grievance.dto;

import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;

public record GrievanceCreatedResponse(Long id, String trackingId, Category category, Priority priority,
                                       GrievanceStatus status, String departmentName) {
}
