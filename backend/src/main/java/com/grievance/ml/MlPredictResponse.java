package com.grievance.ml;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** Raw reply of POST /predict (plan.md §3). Category and priority are strings until MlClient checks them. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MlPredictResponse(
        String category,
        @JsonProperty("category_confidence") Double categoryConfidence,
        String priority,
        @JsonProperty("priority_confidence") Double priorityConfidence,
        @JsonProperty("keyword_override") boolean keywordOverride) {
}
