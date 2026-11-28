"""Prediction API for the grievance backend (plan.md §3 contract, Step 9).

Run: uvicorn app:app --host 0.0.0.0 --port 8000
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import joblib
from fastapi import FastAPI, Request
from pydantic import BaseModel, StringConstraints

from rules import apply_rules

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger("ml-service")


def load_model(filename: str):
    path = MODEL_DIR / filename
    if not path.exists():
        # Fail at startup, not on the first request: a deploy without models must not look healthy.
        raise RuntimeError(f"Model file not found: {path}. Run 'python train.py' before starting the service.")
    return joblib.load(path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loaded once here and reused by every request.
    app.state.category_model = load_model("category_model.pkl")
    app.state.priority_model = load_model("priority_model.pkl")
    log.info("Models loaded from %s", MODEL_DIR)
    yield


app = FastAPI(title="Grievance ML service", lifespan=lifespan)

# Whitespace is stripped before the length checks, so a blank string fails min_length.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class PredictRequest(BaseModel):
    title: Title
    description: Description


class PredictResponse(BaseModel):
    # Field names are the wire contract: the backend's MlPredictResponse maps them one to one.
    category: str
    category_confidence: float
    priority: str
    priority_confidence: float
    keyword_override: bool


def predict_with_confidence(model, text: str) -> tuple[str, float]:
    probabilities = model.predict_proba([text])[0]
    best = probabilities.argmax()
    return str(model.classes_[best]), round(float(probabilities[best]), 4)


def knows_any_word(model, text: str) -> bool:
    """False when no word of the text is in the model's vocabulary ("hello", "asdf qwer")."""
    return model.named_steps["tfidf"].transform([text]).nnz > 0


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest, request: Request) -> PredictResponse:
    text = f"{body.title} {body.description}"  # same input string as train.build_text
    category, category_confidence = predict_with_confidence(request.app.state.category_model, text)
    priority, priority_confidence = predict_with_confidence(request.app.state.priority_model, text)
    if not knows_any_word(request.app.state.category_model, text):
        # The model would still name a class, at about 0.25. Report zero so the backend's
        # confidence floor always sends such text to manual triage, whatever the floor is.
        category_confidence = 0.0

    priority, keyword_override, keyword = apply_rules(text, category, priority)
    if keyword_override:
        # Only the keyword is logged. Complaint text is personal and never goes to the logs.
        log.info("Critical keyword '%s' matched: priority forced to HIGH", keyword)

    return PredictResponse(
        category=category,
        category_confidence=category_confidence,
        priority=priority,
        priority_confidence=priority_confidence,
        keyword_override=keyword_override,
    )
