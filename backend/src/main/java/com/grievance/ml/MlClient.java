package com.grievance.ml;

import com.grievance.enums.Category;
import com.grievance.enums.Priority;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;

/**
 * Talks to the FastAPI service. predict() never throws: any failure becomes Optional.empty()
 * and the caller falls back to UNCLASSIFIED. One attempt only, so the worst case is the read timeout.
 */
@Slf4j
@Component
public class MlClient {

    private final RestClient restClient;

    public MlClient(@Qualifier("mlRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public Optional<MlPrediction> predict(String title, String description) {
        try {
            MlPredictResponse body = restClient.post()
                    .uri("/predict")
                    .body(new MlPredictRequest(title, description))
                    .retrieve()
                    .body(MlPredictResponse.class);
            if (body == null || body.category() == null || body.priority() == null) {
                log.warn("ML service returned an empty or incomplete prediction");
                return Optional.empty();
            }
            Category category = Category.valueOf(body.category().trim().toUpperCase());
            Priority priority = Priority.valueOf(body.priority().trim().toUpperCase());
            if (category == Category.UNCLASSIFIED) {
                log.warn("ML service returned UNCLASSIFIED, which it must never do");
                return Optional.empty();
            }
            return Optional.of(new MlPrediction(category, priority, body.categoryConfidence(), body.keywordOverride()));
        } catch (Exception ex) {
            // Covers timeouts, connection refused, non-2xx replies and unknown enum strings.
            log.warn("ML prediction unavailable, falling back to manual triage: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /** Wakes a sleeping free-tier ML instance. Runs off the request thread; errors are ignored. */
    @Async
    public void warmUp() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
        } catch (Exception ex) {
            log.debug("ML warm-up ping failed: {}", ex.getMessage());
        }
    }
}
