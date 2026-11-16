package com.grievance.service;

import com.grievance.entity.Grievance;
import com.grievance.entity.User;
import com.grievance.enums.Role;

/**
 * Hide-identity mode. The submitter of an anonymous grievance is still stored, so they keep
 * their own list and their email notifications, but their name is shown only to themselves
 * and to admins. Everyone else (in practice: department officers) sees "Anonymous".
 */
public final class IdentityPolicy {

    public static final String ANONYMOUS = "Anonymous";

    private IdentityPolicy() {
    }

    /** True when the viewer must not learn who submitted this grievance. */
    public static boolean hidesSubmitterFrom(Grievance grievance, User viewer) {
        return grievance.isAnonymous()
                && viewer.getRole() != Role.ADMIN
                && !grievance.getUser().getId().equals(viewer.getId());
    }

    /**
     * The name to show for a person who appears on a grievance (as submitter or in its history).
     * Only the submitter is ever masked; officers and admins always appear under their own name.
     */
    public static String displayName(User person, Grievance grievance, User viewer) {
        boolean isSubmitter = person.getId().equals(grievance.getUser().getId());
        return isSubmitter && hidesSubmitterFrom(grievance, viewer) ? ANONYMOUS : person.getName();
    }
}
