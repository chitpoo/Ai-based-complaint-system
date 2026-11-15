package com.grievance.service;

import com.grievance.enums.GrievanceStatus;

/**
 * Published inside the transaction that changes a status; NotificationListener
 * reacts only after that transaction commits. oldStatus is null for a new grievance.
 */
public record StatusChangedEvent(Long grievanceId, GrievanceStatus oldStatus, GrievanceStatus newStatus,
                                 String remark, boolean mlFallback) {
}
