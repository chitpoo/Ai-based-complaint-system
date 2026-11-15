package com.grievance.dto;

import com.grievance.enums.GrievanceStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StatusUpdateRequest(@NotNull GrievanceStatus status, @Size(max = 500) String remark) {
}
