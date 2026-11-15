package com.grievance.dto;

import com.grievance.entity.User;
import com.grievance.enums.Role;

public record UserResponse(Long id, String name, String email, Role role, Long departmentId) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getDepartment() == null ? null : user.getDepartment().getId());
    }
}
