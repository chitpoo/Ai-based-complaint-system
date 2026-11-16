package com.grievance.service;

import com.grievance.entity.Grievance;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IdentityPolicyTest {

    private final User owner = user(1L, "Asha Rao", Role.USER);
    private final User otherUser = user(2L, "Someone Else", Role.USER);
    private final User officer = user(3L, "Officer Singh", Role.OFFICER);
    private final User admin = user(4L, "Admin", Role.ADMIN);

    @Test
    void anonymousGrievanceHidesSubmitterFromOfficers() {
        Grievance g = grievance(true);
        assertTrue(IdentityPolicy.hidesSubmitterFrom(g, officer));
        assertEquals("Anonymous", IdentityPolicy.displayName(owner, g, officer));
    }

    @Test
    void ownerAndAdminStillSeeTheName() {
        Grievance g = grievance(true);
        assertFalse(IdentityPolicy.hidesSubmitterFrom(g, owner));
        assertFalse(IdentityPolicy.hidesSubmitterFrom(g, admin));
        assertEquals("Asha Rao", IdentityPolicy.displayName(owner, g, owner));
        assertEquals("Asha Rao", IdentityPolicy.displayName(owner, g, admin));
    }

    @Test
    void anotherUserNeverSeesTheName() {
        assertEquals("Anonymous", IdentityPolicy.displayName(owner, grievance(true), otherUser));
    }

    @Test
    void normalGrievanceShowsTheNameToOfficers() {
        Grievance g = grievance(false);
        assertFalse(IdentityPolicy.hidesSubmitterFrom(g, officer));
        assertEquals("Asha Rao", IdentityPolicy.displayName(owner, g, officer));
    }

    @Test
    void staffNamesInTheHistoryAreNeverMasked() {
        Grievance g = grievance(true);
        assertEquals("Officer Singh", IdentityPolicy.displayName(officer, g, officer));
        assertEquals("Admin", IdentityPolicy.displayName(admin, g, officer));
    }

    private Grievance grievance(boolean anonymous) {
        Grievance g = new Grievance();
        g.setUser(owner);
        g.setAnonymous(anonymous);
        return g;
    }

    private static User user(Long id, String name, Role role) {
        User u = new User();
        u.setId(id);
        u.setName(name);
        u.setRole(role);
        return u;
    }
}
