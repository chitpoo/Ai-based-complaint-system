"""Score the saved models on the grouped test split and on the sanity set (plan.md Step 8).

Usage: python evaluate.py   (run train.py first)
Prints accuracy and a classification report for both heads and writes the two test-split
confusion matrices to docs/. Priority is reported twice: the model alone, and what the service
returns after rules.py. The numbers in docs/evaluation.md are copied from this output.
"""
import os
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")  # no display on a server or in CI
import matplotlib.pyplot as plt
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, classification_report, confusion_matrix

from rules import apply_rules, find_critical_keyword
from train import BASE_DIR, DATA_PATH, build_text, load_dataset

MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
DOCS_DIR = BASE_DIR / "docs"
SANITY_PATH = BASE_DIR / "data" / "sanity.csv"

CATEGORY_LABELS = ["ACADEMIC", "FINANCE", "HARASSMENT", "HOSTEL", "INFRASTRUCTURE"]
PRIORITY_LABELS = ["LOW", "MEDIUM", "HIGH"]
# Floors for the backend's app.ml.min-confidence: below it a prediction is dropped to manual
# triage. 0.25 is the backend default; 0.30 is shown for comparison.
CONFIDENCE_FLOORS = (0.25, 0.30)


def report(name, model, df, target, labels):
    predicted = model.predict(build_text(df))
    print(f"\n=== {name}: {target} (n={len(df)}) ===")
    print(f"accuracy: {accuracy_score(df[target], predicted):.4f}")
    print(classification_report(df[target], predicted, labels=labels, digits=3, zero_division=0))
    print("confusion matrix (rows = true, columns = predicted, order: " + ", ".join(labels) + ")")
    print(confusion_matrix(df[target], predicted, labels=labels))
    return predicted


def report_served_priority(name, df, category_pred, priority_pred):
    """Priority as /predict returns it: the model's answer passed through rules.py."""
    served = [apply_rules(text, category, priority)[0]
              for text, category, priority in zip(build_text(df), category_pred, priority_pred)]
    changed = sum(a != b for a, b in zip(served, priority_pred))
    print(f"\n=== {name}: priority after rules.py (n={len(df)}) ===")
    print(f"accuracy: {accuracy_score(df['priority'], served):.4f}  (rules changed {changed} predictions)")
    print("confusion matrix (rows = true, columns = served, order: " + ", ".join(PRIORITY_LABELS) + ")")
    print(confusion_matrix(df["priority"], served, labels=PRIORITY_LABELS))


def report_low_confidence(name, model, df):
    """How many rows the backend would send to manual triage at each confidence floor."""
    text = build_text(df)
    confidence = model.predict_proba(text).max(axis=1)
    correct = model.predict(text) == df["category"].to_numpy()
    # A keyword hit is kept whatever the confidence, so those rows are not triaged.
    has_keyword = text.map(lambda t: find_critical_keyword(t) is not None).to_numpy()
    print(f"{name}: category confidence lowest {confidence.min():.4f}, median {sorted(confidence)[len(df) // 2]:.4f}")
    for floor in CONFIDENCE_FLOORS:
        triaged = (confidence < floor) & ~has_keyword
        print(f"  floor {floor:.2f}: {triaged.sum()} of {len(df)} rows to manual triage "
              f"({correct[triaged].sum()} of them were classified correctly); "
              f"category accuracy on the rows kept: {correct[~triaged].mean():.4f}")


def report_keyword_coupling(name, df):
    """HIGH harassment rows are mostly rescued by the keyword rule; show how many are not."""
    rows = df[(df["category"] == "HARASSMENT") & (df["priority"] == "HIGH")]
    with_keyword = build_text(rows).map(lambda t: find_critical_keyword(t) is not None).sum()
    print(f"{name}: HARASSMENT/HIGH rows containing a critical keyword: {with_keyword} of {len(rows)}")


def save_confusion_matrix(y_true, y_pred, labels, title, path):
    fig, ax = plt.subplots(figsize=(7, 6))
    ConfusionMatrixDisplay.from_predictions(
        y_true, y_pred, labels=labels, cmap="Blues", colorbar=False, xticks_rotation=30, ax=ax)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def print_errors(name, df, target, predicted):
    wrong = df.assign(predicted=predicted)
    wrong = wrong[wrong[target] != wrong["predicted"]]
    print(f"\n--- {name}: misclassified {target} ({len(wrong)}) ---")
    for row in wrong.itertuples():
        print(f"{row.group_id} | true={getattr(row, target)} predicted={row.predicted} | {row.title}")


def main() -> None:
    for filename in ("category_model.pkl", "priority_model.pkl", "test_split.csv"):
        if not (MODEL_DIR / filename).exists():
            raise SystemExit(f"{MODEL_DIR / filename} not found. Run 'python train.py' first.")
    category_model = joblib.load(MODEL_DIR / "category_model.pkl")
    priority_model = joblib.load(MODEL_DIR / "priority_model.pkl")
    test = load_dataset(MODEL_DIR / "test_split.csv")
    sanity = load_dataset(SANITY_PATH)

    test_category = report("test split", category_model, test, "category", CATEGORY_LABELS)
    test_priority = report("test split", priority_model, test, "priority", PRIORITY_LABELS)
    sanity_category = report("sanity set", category_model, sanity, "category", CATEGORY_LABELS)
    sanity_priority = report("sanity set", priority_model, sanity, "priority", PRIORITY_LABELS)

    report_served_priority("test split", test, test_category, test_priority)
    report_served_priority("sanity set", sanity, sanity_category, sanity_priority)

    full = load_dataset(DATA_PATH)
    train = full[~full["group_id"].isin(test["group_id"])]
    print("\n=== keyword coverage and low-confidence share ===")
    report_keyword_coupling("training rows", train)
    report_keyword_coupling("test split", test)
    report_keyword_coupling("sanity set", sanity)
    report_low_confidence("test split", category_model, test)
    report_low_confidence("sanity set", category_model, sanity)

    DOCS_DIR.mkdir(exist_ok=True)
    save_confusion_matrix(test["category"], test_category, CATEGORY_LABELS,
                          "Category - grouped test split", DOCS_DIR / "confusion_category.png")
    save_confusion_matrix(test["priority"], test_priority, PRIORITY_LABELS,
                          "Priority - grouped test split", DOCS_DIR / "confusion_priority.png")
    print(f"\nsaved confusion matrices to {DOCS_DIR}")

    print_errors("test split", test, "category", test_category)
    print_errors("test split", test, "priority", test_priority)
    print_errors("sanity set", sanity, "category", sanity_category)
    print_errors("sanity set", sanity, "priority", sanity_priority)


if __name__ == "__main__":
    main()
