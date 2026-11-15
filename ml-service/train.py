"""Train the category and priority classifiers from data/grievances.csv (plan.md §4, Step 7).

Usage: python train.py
Writes category_model.pkl, priority_model.pkl and test_split.csv into MODEL_DIR (default ./models).
"""
import os
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "grievances.csv"
MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))

CATEGORIES = {"ACADEMIC", "HOSTEL", "INFRASTRUCTURE", "FINANCE", "HARASSMENT"}
PRIORITIES = {"LOW", "MEDIUM", "HIGH"}
RANDOM_STATE = 42


def build_text(df: pd.DataFrame) -> pd.Series:
    """The model input. app.py builds the same string for a request."""
    return df["title"].str.strip() + " " + df["description"].str.strip()


def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    for column in ("group_id", "title", "description", "category", "priority"):
        if (df[column].str.strip() == "").any():
            raise ValueError(f"{path.name}: empty value in column '{column}'")
    if not set(df["category"]) <= CATEGORIES:
        raise ValueError(f"{path.name}: unknown category {set(df['category']) - CATEGORIES}")
    if not set(df["priority"]) <= PRIORITIES:
        raise ValueError(f"{path.name}: unknown priority {set(df['priority']) - PRIORITIES}")
    return df


def build_pipeline() -> Pipeline:
    # The vectorizer sits inside the pipeline so it is fitted on the training rows only.
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, stop_words="english")),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE)),
    ])


def main() -> None:
    df = load_dataset(DATA_PATH)

    # Variants of one complaint share a group_id. Splitting by group keeps all of them on one
    # side; a row-level split would leak paraphrases into the test set and inflate accuracy.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
    train_idx, test_idx = next(splitter.split(df, groups=df["group_id"]))
    train, test = df.iloc[train_idx], df.iloc[test_idx]
    shared = set(train["group_id"]) & set(test["group_id"])
    assert not shared, f"group_id on both sides of the split: {sorted(shared)}"

    category_model = build_pipeline().fit(build_text(train), train["category"])
    priority_model = build_pipeline().fit(build_text(train), train["priority"])

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(category_model, MODEL_DIR / "category_model.pkl")
    joblib.dump(priority_model, MODEL_DIR / "priority_model.pkl")
    # evaluate.py scores exactly these rows, so it never has to redo the split.
    test.to_csv(MODEL_DIR / "test_split.csv", index=False)

    print(f"rows: {len(df)}  groups: {df['group_id'].nunique()}")
    print(f"train: {len(train)} rows / {train['group_id'].nunique()} groups")
    print(f"test:  {len(test)} rows / {test['group_id'].nunique()} groups")
    print(f"saved models and test_split.csv to {MODEL_DIR}")


if __name__ == "__main__":
    main()
