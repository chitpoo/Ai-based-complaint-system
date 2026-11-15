package com.grievance.mail;

public interface MailService {

    void send(String to, String subject, String body);
}
