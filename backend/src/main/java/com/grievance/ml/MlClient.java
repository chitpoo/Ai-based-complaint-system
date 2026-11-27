package com.grievance.ml;

import com.grievance.enums.Category;
import com.grievance.enums.Priority;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Optional;

/**
 * Talks to the FastAPI service. predict() never throws: any failure becomes Optional.empty()
 * and the caller falls back to UNCLASSIFIED. One attempt only, so the worst case is the read timeout.
 */
@Slf4j
@Component
public class MlClient {

    private final RestClient restClient;
    private final double minConfidence;

    public MlClient(@Qualifier("mlRestClient") RestClient restClient,
                    @Value("${app.ml.min-confidence}") double minConfidence) {
        this.restClient = restClient;
        this.minConfidence = minConfidence;
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
            // Text with no word the model knows (gibberish, another script) still gets a category,
            // decided by the model's bias alone and with a low score. Routing that to a department
            // would be a guess, so it goes to manual triage instead. A critical keyword is the
            // exception: such a grievance must reach a department queue without waiting.
            // A missing confidence is treated like a low one: there is nothing to trust it by.
            Double confidence = body.categoryConfidence();
            if (!body.keywordOverride() && (confidence == null || confidence < minConfidence)) {
                log.info("ML category confidence {} is below the floor {}, falling back to manual triage",
                        confidence, minConfidence);
                return Optional.empty();
            }
            return Optional.of(new MlPrediction(category, priority, confidence, body.keywordOverride()));
        } catch (RestClientResponseException ex) {
            // Status only: FastAPI's 422 body echoes the submitted text, which must not reach the log.
            log.warn("ML service answered HTTP {}, falling back to manual triage", ex.getStatusCode().value());
            return Optional.empty();
        } catch (Exception ex) {
            // Covers timeouts, connection refused and unknown enum strings.
            log.warn("ML prediction unavailable, falling back to manual triage: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Asks the ML service's /health right now. Used by the admin dashboard so a stopped service
     * is noticed, instead of every new grievance quietly going to manual triage.
     */
    public boolean isAvailable() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.debug("ML health check failed: {}", ex.getMessage());
            return false;
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
