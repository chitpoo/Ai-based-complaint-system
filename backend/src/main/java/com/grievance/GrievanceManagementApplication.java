package com.grievance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class GrievanceManagementApplication {

    public static void main(String[] args) {
        // Timestamps are LocalDateTime (no zone), so the JVM zone decides what they mean. Pinning it
        // to UTC makes a laptop in IST and a UTC cloud host store and return the same values; the
        // frontend reads them as UTC. Must run before Spring starts so Hibernate and Jackson see it.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(GrievanceManagementApplication.class, args);
    }
}
