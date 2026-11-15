package com.grievance.controller;

import com.grievance.ml.MlClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final MlClient mlClient;

    /** Answers at once; the ML warm-up runs in the background. */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        mlClient.warmUp();
        return Map.of("status", "UP");
    }
}
