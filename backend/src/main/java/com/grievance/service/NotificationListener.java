package com.grievance.service;

import com.grievance.entity.Grievance;
import com.grievance.entity.User;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Role;
import com.grievance.mail.MailService;
import com.grievance.repository.GrievanceRepository;
import com.grievance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends the emails for a status change. Runs after the change has committed and on a
 * background thread, so a slow or broken mail server can never fail or roll back the change.
 * Every address comes from the database.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final GrievanceRepository grievanceRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatusChanged(StatusChangedEvent event) {
        try {
            Grievance g = grievanceRepository.findWithRelationsById(event.grievanceId()).orElse(null);
            if (g == null) {
                return;
            }
            String body = body(g, event);

            sendQuietly(g.getUser().getEmail(), "Grievance " + g.getTrackingId() + ": " + label(event.newStatus()), body);

            if (event.newStatus() == GrievanceStatus.ASSIGNED
                    && g.getDepartment() != null && g.getDepartment().getEmail() != null) {
                sendQuietly(g.getDepartment().getEmail(),
                        "New grievance assigned: " + g.getTrackingId() + " (" + g.getPriority() + " priority)", body);
            }
            if (event.newStatus() == GrievanceStatus.ESCALATED) {
                notifyAdmins("ESCALATED: grievance " + g.getTrackingId() + " breached its SLA", body);
            }
            if (event.mlFallback()) {
                notifyAdmins("Needs manual routing: grievance " + g.getTrackingId(),
                        body + "\nThe AI service could not classify this grievance. Please assign it to a department.\n");
            }
        } catch (Exception ex) {
            log.error("Could not prepare notifications for grievance {}", event.grievanceId(), ex);
        }
    }

    private void notifyAdmins(String subject, String body) {
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            sendQuietly(admin.getEmail(), subject, body);
        }
    }

    private void sendQuietly(String to, String subject, String body) {
        try {
            mailService.send(to, subject, body);
        } catch (Exception ex) {
            log.error("Email to {} failed: {}", to, ex.getMessage());
        }
    }

    private String body(Grievance g, StatusChangedEvent event) {
        StringBuilder text = new StringBuilder();
        text.append("Tracking ID: ").append(g.getTrackingId()).append('\n');
        text.append("Title: ").append(g.getTitle()).append('\n');
        text.append("Status: ");
        if (event.oldStatus() != null) {
            text.append(label(event.oldStatus())).append(" -> ");
        }
        text.append(label(event.newStatus())).append('\n');
        if (g.getDepartment() != null) {
            text.append("Department: ").append(g.getDepartment().getName()).append('\n');
        }
        if (event.remark() != null) {
            text.append("Remark: ").append(event.remark()).append('\n');
        }
        text.append("Track it here: ").append(frontendUrl).append("/track/").append(g.getTrackingId()).append('\n');
        return text.toString();
    }

    private String label(GrievanceStatus status) {
        return status.name().replace('_', ' ');
    }
}
