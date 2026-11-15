package com.grievance.dto;

import com.grievance.enums.Category;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DepartmentCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Category category,
        @Email @Size(max = 150) String email,
        @Min(1) @Max(8760) Integer slaHours) {
}
