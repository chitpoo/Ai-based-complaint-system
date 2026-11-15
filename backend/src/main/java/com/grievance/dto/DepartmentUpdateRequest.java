package com.grievance.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** All fields optional; only the ones sent are changed. Category cannot be changed. */
public record DepartmentUpdateRequest(
        @Size(min = 1, max = 100) String name,
        @Email @Size(max = 150) String email,
        @Min(1) @Max(8760) Integer slaHours) {
}
