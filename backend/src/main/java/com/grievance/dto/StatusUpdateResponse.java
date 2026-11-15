package com.grievance.dto;

import com.grievance.enums.GrievanceStatus;

public record StatusUpdateResponse(Long id, GrievanceStatus oldStatus, GrievanceStatus newStatus) {
}
