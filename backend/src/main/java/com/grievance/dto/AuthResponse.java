package com.grievance.dto;

import com.grievance.enums.Role;

/** Returned by register. */
public record AuthResponse(Long id, String name, String email, Role role, String token) {
}
