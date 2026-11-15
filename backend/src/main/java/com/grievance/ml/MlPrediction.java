package com.grievance.ml;

import com.grievance.enums.Category;
import com.grievance.enums.Priority;

/** A prediction that has passed validation: both values are known enums. */
public record MlPrediction(Category category, Priority priority, Double categoryConfidence, boolean keywordOverride) {
}
