package com.grievance.dto;

import com.grievance.entity.User;

public record OfficerResponse(Long id, String name, String email, Long departmentId) {

    public static OfficerResponse from(User user) {
        return new OfficerResponse(user.getId(), user.getName(), user.getEmail(),
                user.getDepartment() == null ? null : user.getDepartment().getId());
    }
}
