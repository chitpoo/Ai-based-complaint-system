package com.grievance.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** Used when app.mail.enabled is false (the default): prints the email to the log. */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class LogMailService implements MailService {

    @Override
    public void send(String to, String subject, String body) {
        log.info("[MAIL not sent, MAIL_ENABLED=false]\nTo: {}\nSubject: {}\n{}", to, subject, body);
    }
}
