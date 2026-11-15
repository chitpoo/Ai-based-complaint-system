package com.grievance.service;

import com.grievance.repository.GrievanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Year;

/**
 * Makes IDs like GRV-2026-483920. The digits are random, not sequential, because the
 * tracking endpoint is public. The unique index on tracking_id is the real guarantee.
 */
@Component
@RequiredArgsConstructor
public class TrackingIdGenerator {

    private static final int MAX_ATTEMPTS = 5;

    private final GrievanceRepository grievanceRepository;
    private final SecureRandom random = new SecureRandom();

    public String next() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = String.format("GRV-%d-%06d", Year.now().getValue(), random.nextInt(1_000_000));
            if (!grievanceRepository.existsByTrackingId(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique tracking ID");
    }
}
