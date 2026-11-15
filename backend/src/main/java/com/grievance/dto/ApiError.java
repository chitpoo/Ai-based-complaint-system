package com.grievance.dto;

import java.time.Instant;

/** The one error shape every endpoint returns (plan.md §3). */
public record ApiError(Instant timestamp, int status, String error, String message, String path) {

    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path);
    }
}
