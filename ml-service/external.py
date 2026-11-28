"""Map the University Students Complaints dataset onto this project's categories.

Source: https://huggingface.co/datasets/sanchit-19/university-students-complaints
(CC-BY-4.0, created by Md. Al Amin). The raw files in data/external/ are kept unchanged.

Only the complaint text and its category are used. The dataset's severity labels follow a
different policy from ours (slow WiFi is "Urgent", broken staircase emergency lights are "Low"),
so they are not used to train or score priority.

train.py and evaluate.py call load_mapped() directly, so there is no separate preparation
step and nothing generated to commit. Run this file only to see the row counts.
"""
from pathlib import Path

import pandas as pd

EXTERNAL_DIR = Path(__file__).resolve().parent / "data" / "external"

# Technical complaints in this dataset are WiFi, projectors, labs and portals: facilities,
# which our Infrastructure department owns. Administrative complaints (discipline, library
# rules, transport schedules) have no matching department here and are left out.
CATEGORY_MAP = {
    "Infrastructure": "INFRASTRUCTURE",
    "Technical": "INFRASTRUCTURE",
    "Academic": "ACADEMIC",
    "Finance": "FINANCE",
}


def load_mapped(split: str) -> pd.DataFrame | None:
    """Rows in the same shape as data/grievances.csv, or None if the file is absent.
    These complaints have no title."""
    path = EXTERNAL_DIR / f"university_complaints_{split}.csv"
    if not path.exists():
        return None
    raw = pd.read_csv(path, dtype=str, keep_default_na=False)
    raw = raw[raw["Category"].isin(CATEGORY_MAP)]
    raw = raw[raw["Complaint_Description"].str.strip() != ""]
    return pd.DataFrame({
        # Prefixed so these groups can never collide with ours in a grouped split.
        "group_id": "EXT-" + raw["Complaint_Group_ID"],
        "title": "",
        "description": raw["Complaint_Description"].str.strip(),
        "category": raw["Category"].map(CATEGORY_MAP),
    })


def main() -> None:
    for split in ("train", "test"):
        df = load_mapped(split)
        if df is None:
            print(f"{split}: file not found")
            continue
        print(f"{split}: {len(df)} rows, {df['group_id'].nunique()} groups, {df['category'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
