package com.grievance.dto;

import com.grievance.enums.Role;

public record LoginResponse(String token, Role role, String name) {
}
