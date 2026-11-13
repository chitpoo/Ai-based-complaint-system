package com.grievance.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Scheduling + async support (plan Step 1).
 * The escalation job (scheduler/) and the ML warm-up ping both need these.
 */
@Configuration
@EnableScheduling
@EnableAsync
public class AppConfig {
}
