# ML service

FastAPI service that classifies a grievance into a category and a priority. The Spring Boot backend calls it; nothing else does. Contract: `plan.md` §3.

## Setup (Python 3.13)

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Train

```bash
python train.py
```

Reads `data/grievances.csv`, splits 80/20 by `group_id`, adds the train half of the external dataset in `data/external/` to the category model's training rows (weight 0.3; see `external.py`), and writes `category_model.pkl`, `priority_model.pkl` and `test_split.csv` to `models/`. These are not committed; the deploy build runs this command.

## Evaluate

```bash
python evaluate.py
```

Prints accuracy and per-class precision/recall/F1 for the test split, for `data/sanity.csv` and, for category only, for the external dataset's test half of real student complaints, the priority accuracy after `rules.py`, and how many rows fall below the backend's confidence floor, and writes the confusion matrices to `docs/`. After changing the data, copy the new numbers into `docs/evaluation.md`.

## Run

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

The service refuses to start if the model files are missing.

```bash
curl localhost:8000/health
curl -X POST localhost:8000/predict -H 'Content-Type: application/json' \
  -d '{"title": "Water leakage in hostel block B", "description": "Bathroom pipe leaking since 3 days..."}'
```

## Settings

Read from the environment (see `.env.example`; the service does not load a `.env` file itself).

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | none | Passed to uvicorn with `--port`. The host sets it in production. |
| `MODEL_DIR` | `./models` | Where `train.py` writes and `app.py` reads the models. |
| `LOG_LEVEL` | `INFO` | Log level of the service's own logger. |

## Files

| File | Purpose |
|---|---|
| `data/` | Dataset, sanity set and the labelling rules (`data/README.md`). |
| `data/external/` | University Students Complaints dataset, unchanged (CC-BY-4.0, Md. Al Amin). |
| `external.py` | Maps it onto our categories. Run it alone to see the row counts. |
| `train.py` | Builds the two models. |
| `evaluate.py` | Scores them. |
| `rules.py` | Critical-keyword override (stems matched from the start of a word), the long-outage rule (water or power missing for days → HIGH) and the HARASSMENT minimum priority. |
| `app.py` | `/predict` and `/health`. |
| `docs/evaluation.md` | Results and known limitations. |
