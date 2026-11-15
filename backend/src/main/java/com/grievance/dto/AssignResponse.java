package com.grievance.dto;

import com.grievance.enums.GrievanceStatus;

public record AssignResponse(Long id, Long officerId, Long departmentId, GrievanceStatus status) {
}
