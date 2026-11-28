package com.grievance.controller;

import com.grievance.dto.PublicStatsResponse;
import com.grievance.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Site-wide counts for any signed-in user (the student dashboard's "Everyone" view). */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private static final int DAYS = 14;

    private final StatsService statsService;

    @GetMapping("/public")
    public PublicStatsResponse publicStats() {
        return statsService.publicStats(DAYS);
    }
}
