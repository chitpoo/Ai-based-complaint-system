package com.grievance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GrievanceCreateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String description,
        /** Optional. True hides the submitter's name from department officers. */
        Boolean anonymous) {

    public boolean wantsAnonymity() {
        return Boolean.TRUE.equals(anonymous);
    }
}
