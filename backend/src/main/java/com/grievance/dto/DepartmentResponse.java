package com.grievance.dto;

import com.grievance.entity.Department;
import com.grievance.enums.Category;

public record DepartmentResponse(Long id, String name, Category category, String email, Integer slaHours) {

    public static DepartmentResponse from(Department d) {
        return new DepartmentResponse(d.getId(), d.getName(), d.getCategory(), d.getEmail(), d.getSlaHours());
    }
}
