package com.grievance.dto;

/** At least one of the two must be given; the service checks it. */
public record AssignRequest(Long officerId, Long departmentId) {
}
