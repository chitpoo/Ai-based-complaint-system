# AI-Powered Grievance Management and Resolution System

A full-stack web application that lets users submit grievances online and uses NLP to automatically **categorise** each complaint, **predict its priority** and **route** it to the right department. Every grievance is tracked until it is resolved, and delayed cases are escalated automatically.

> **Status:** the backend API, the ML service and the frontend are complete and run locally end to end. Deployment to free hosting is the remaining step. See the [Roadmap](#roadmap).

**Contents:** [Problem](#the-problem) · [Features](#features) · [Architecture](#architecture) · [How it works](#how-it-works) · [Roles](#roles-and-permissions) · [AI module](#ai-module) · [Security and privacy](#security-and-privacy) · [API](#api-reference) · [Data model](#data-model) · [Tech stack](#tech-stack) · [Project structure](#project-structure) · [Getting started](#getting-started) · [Configuration](#configuration) · [Testing](#testing) · [Deployment](#deployment) · [Roadmap](#roadmap) · [Known limitations](#known-limitations) · [Documentation](#documentation)

---

## The Problem

In many colleges, organisations and public offices, grievances are still collected through paper forms, emails or suggestion boxes. As a result:

- Complaints are classified by hand and often forwarded to the wrong department
- Grievances get lost or stay unresolved for weeks
- Complainants have no way to track progress
- Urgent issues (harassment, safety, ragging) get no priority over minor ones
- Complainants hold back sensitive complaints because their name is attached
- Authorities have no data on recurring problems

## Features

| Feature | What it does |
|---|---|
| **Online submission** | A logged-in user submits a title and description and gets a tracking ID such as `GRV-2026-483920` |
| **AI classification** | The text is classified as *Academic, Hostel, Infrastructure, Finance* or *Harassment* |
| **Priority prediction** | *Low / Medium / High*, with keyword rules that force *High* for critical complaints |
| **Automatic routing** | The grievance goes to the department that owns its category |
| **Anonymous submission** | A switch on the form hides the submitter's name from department officers |
| **Public tracking** | Anyone with the tracking ID can see the status and timeline, without logging in |
| **Officer queue** | Officers see only their own department's grievances and move them forward with remarks |
| **Time-based escalation** | A scheduled job escalates anything still open past its department's SLA |
| **Email notifications** | The complainant is told about every status change; departments and admins are told when action is needed |
| **Admin dashboard** | Counts by status, priority and category, overdue list, average resolution time, a warning when the AI service is down, reassignment, officer and department management |
| **Audit trail** | Every status change is written to an append-only history with who made it and why |

---

## Architecture

```mermaid
flowchart LR
    U[User / Officer / Admin] -->|HTTPS| FE[React Frontend]
    FE -->|REST + JWT| BE[Spring Boot Backend]
    BE -->|POST /predict| ML[Python ML Service<br/>FastAPI + scikit-learn]
    BE --> DB[(MySQL)]
    BE --> MAIL[Email Notifications<br/>JavaMail]
    BE --> SCH[Spring Scheduler<br/>Escalation Job]
```

Three services, each in its own folder:

- **`frontend/`** — the React single-page app. It talks only to the backend.
- **`backend/`** — the Spring Boot REST API. It owns all rules: authentication, permissions, status transitions, routing, escalation and email.
- **`ml-service/`** — a small FastAPI service with one job: turn grievance text into a category and a priority. Only the backend calls it.

---

## How It Works

1. A user logs in and submits a grievance, optionally ticking *Submit anonymously*.
2. The backend sends the text to the ML service, which returns a **category**, a **priority** and confidence scores.
3. The grievance is routed to the department that owns that category and marked *Assigned*. If the AI cannot be trusted for this text (see [Fallback](#fallback-when-the-ai-cannot-decide)), it is saved as *Unclassified* and waits for the admin instead.
4. Officers of that department see it in their queue and move it through *In progress* → *Resolved*. An admin closes it.
5. Every 15 minutes a scheduled job checks each open grievance against its department's SLA (72 hours by default). Anything past it is marked *Escalated* and the admins are notified.
6. The complainant gets an email on every status change and can check progress at any time with the tracking ID.

### Grievance lifecycle

```
Submitted → Assigned → In progress → Resolved → Closed
     ↘          ↘           ↘
      └──────────┴───────────┴──→ Escalated → In progress / Resolved
```

Only these moves are allowed. The backend validates every change against this table and rejects anything else with `400`.

| From | To | Who |
|---|---|---|
| Submitted | Assigned | AI routing, or an admin assigning it by hand |
| Assigned | In progress | Officer of that department, admin |
| In progress | Resolved | Officer of that department, admin |
| Resolved | Closed | Admin only |
| Submitted / Assigned / In progress | Escalated | The escalation job only |
| Escalated | In progress / Resolved | Officer of that department, admin |

A grievance that was ever escalated keeps an `is_escalated` flag even after it moves on, so the record is not lost.

### Departments

Five departments are created on first start, one per category. Each has its own SLA and an optional notification email, both editable by the admin.

| Category | Department |
|---|---|
| Academic | Academic Cell |
| Hostel | Hostel Office |
| Infrastructure | Infrastructure and Maintenance |
| Finance | Accounts and Finance |
| Harassment | Anti-Harassment Committee |

### Notifications

| Event | Who is emailed |
|---|---|
| Any status change | The complainant |
| Grievance assigned to a department | The department's notification email, if set |
| Grievance escalated | All admins |
| AI could not classify the grievance | All admins |

Emails are sent after the database transaction commits and on a separate thread, so a slow or failing mail server never blocks or rolls back a request. With `MAIL_ENABLED=false` (the default) emails are written to the log instead of being sent.

---

## Roles and Permissions

| Role | Can do |
|---|---|
| **User** | Register, log in, submit grievances (with or without their name shown), see their own grievances and their full history |
| **Officer** | See their own department's queue, open those grievances, update status with a remark |
| **Admin** | See and filter all grievances, assign or reassign to a department or officer, close resolved cases, create officer accounts, edit department SLA and email, view the dashboard |
| **Anyone** | Track a grievance by tracking ID (limited fields only) |

Public registration always creates a normal user, whatever the request says. Officer accounts are created by an admin. The first admin account is created from configuration on first start.

---

## AI Module

| Part | Approach |
|---|---|
| Features | TF-IDF over title + description, unigrams and bigrams |
| Models | Two Logistic Regression classifiers with balanced class weights: category (5 classes) and priority (3 levels) |
| Keyword rules | Applied after the model. Words such as *ragging, harass…, bully…, threat…, assault…, attack…, beat up, hit me, fight…, injur…, knife, unsafe, suicid…, urgent, bribe…, stalk…* force **High** priority. Matching is by word stem, so "threatens" and "harassed" count |
| Long outages | Water, electricity or lights missing for days or weeks ("no water in hostel for 3 days") is raised to **High** |
| Safety floor | A grievance classified as Harassment is never given Low priority |
| Unknown text | If no word of the text is in the model's vocabulary ("hello", gibberish), the service reports confidence 0, so the backend always sends it to manual triage |
| Split | 80/20, grouped by source complaint, so paraphrases of one complaint never appear on both sides |

### Dataset

`ml-service/data/grievances.csv` holds 495 labelled rows: 165 source complaints, each written three ways, 99 rows per category. `ml-service/data/sanity.csv` holds 50 separately written rows used only for checking. The labelling rules are in `ml-service/data/README.md`.

**The dataset was drafted with AI assistance, not collected from real complaints.** It should be read through and corrected by hand before the numbers below are relied on.

The category model also learns from real text: the training half of the [University Students Complaints](https://huggingface.co/datasets/sanchit-19/university-students-complaints) dataset (332 complaints by university students, CC-BY-4.0, Md. Al Amin), mapped onto Academic, Infrastructure and Finance. Its rows count at 0.3 weight so they do not swamp the two classes it lacks (Hostel, Harassment). Its severity labels follow a different policy from ours and are not used.

### Results

| | Category accuracy | Priority (model alone) | Priority (as served, with rules) |
|---|---|---|---|
| Grouped test split (99 rows) | 0.8788 | 0.8384 | 0.8182 |
| Sanity set (50 rows) | 0.9200 | 0.8000 | 0.8000 |
| Real student complaints, external test half (56 rows) | 0.9286 | — | — |

Adding the real complaints raised category accuracy on real text from 0.84 to 0.93, and none of them now fall below the confidence floor (13 of 56 did before).

Per-class precision and recall, the confusion matrices and a discussion of the mistakes are in [`ml-service/docs/evaluation.md`](ml-service/docs/evaluation.md).

### Fallback when the AI cannot decide

Submission never depends on the AI. The grievance is saved as *Unclassified*, with *Medium* priority, and sent to the admin's queue when any of these is true:

- the ML service is down or does not answer within 5 seconds
- the model's category confidence is below a floor (`ML_MIN_CONFIDENCE`, default 0.25) and no critical keyword matched

This stops meaningless text such as "test" from being routed to a real department. At the default floor about one grievance in twenty goes to manual triage. When the admin assigns an unclassified grievance, it takes the category of the department chosen. If it was left unclassified because the AI was down, the admin can instead press **Run AI classification again** on the grievance page once the service is back (`POST /grievances/{id}/reclassify`).

---

## Security and Privacy

- **Authentication:** JWT (HS256), sent as a bearer token. The secret must be at least 32 characters or the backend refuses to start. Passwords are hashed with BCrypt.
- **Authorisation on the server:** every endpoint checks the role, and officers are checked against the grievance's department. Hiding a button in the UI is never the only protection.
- **Public tracking shows limited fields:** tracking ID, title, category, priority, status and the status timeline. Never the description, names, emails or internal remarks.
- **Hide-identity mode:** when a user submits anonymously, the server replaces their name with "Anonymous" for department officers, both in the grievance and in its history. The submitter and admins still see the name, and the submitter still gets their list and email updates. It hides the name, not the text: a complaint that names its author is still readable.
- **Complaint text is not logged.** ML errors are logged by status code only.
- **Secrets** are read from environment variables or a gitignored local file. Nothing sensitive is committed, and there are no default secrets.
- **CORS** allows only the configured frontend origin.

---

## API Reference

Base path: `/api`. All bodies are JSON. Errors use one shape: `{ timestamp, status, error, message, path }`.

### Auth and users

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a user account; returns a token |
| POST | `/auth/login` | Public | Log in; returns a token and the role |
| GET | `/users/me` | Logged in | The current user |
| GET | `/health` | Public | Liveness check |

### Grievances

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/grievances` | User | Submit. Body: `title`, `description`, optional `anonymous` |
| GET | `/grievances/my` | User | The caller's own grievances |
| GET | `/grievances/track/{trackingId}` | Public | Limited status view |
| GET | `/grievances/{id}` | Owner, department officer, admin | Full detail with history |
| GET | `/grievances/assigned` | Officer | The officer's department queue; optional `status` filter |
| PUT | `/grievances/{id}/status` | Officer, admin | Change status. Body: `status`, optional `remark` |
| GET | `/grievances` | Admin | All grievances, paged. Filters: `status`, `category`, `priority`, `overdue`, `page`, `size` |
| PUT | `/grievances/{id}/assign` | Admin | Assign or reassign. Body: `departmentId` and/or `officerId` |
| POST | `/grievances/{id}/reclassify` | Admin | Ask the AI again about an unclassified, unrouted grievance. `503` if the ML service is down, `400` if it is still not confident |
| GET | `/stats/public` | Any signed-in user | Site-wide counts only (by status, escalated, filed and resolved per day for 14 days); no titles or names |

### Departments and admin

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/departments` | Logged in | List departments |
| POST | `/departments` | Admin | Create a department |
| PUT | `/departments/{id}` | Admin | Update SLA hours or notification email |
| POST | `/admin/officers` | Admin | Create an officer account in a department |
| GET | `/admin/officers` | Admin | List officers |
| GET | `/admin/stats` | Admin | Counts by status, category and priority, overdue count, average resolution hours |
| GET | `/admin/ml-status` | Admin | Whether the ML service answers right now |

### ML service (internal)

| Method | Path | Purpose |
|---|---|---|
| POST | `/predict` | Body: `title`, `description`. Returns `category`, `category_confidence`, `priority`, `priority_confidence`, `keyword_override` |
| GET | `/health` | Liveness check. The service refuses to start without its model files, so a healthy answer means they are loaded |

Full request and response shapes are in [`plan.md` §3](plan.md).

---

## Data Model

Four tables. The full DDL is in [`docs/schema.sql`](docs/schema.sql).

| Table | Holds |
|---|---|
| `users` | Name, email, password hash, role (`USER` / `OFFICER` / `ADMIN`), department for officers |
| `departments` | Name, the category it owns, notification email, SLA hours |
| `grievances` | Tracking ID, title, description, category, priority, status, AI confidence, submitter, department, officer, `is_anonymous`, `is_escalated`, timestamps |
| `status_history` | One row per status change: old and new status, who changed it (empty for the system), remark, time |

All timestamps are stored and returned in UTC. The frontend converts them to the browser's time zone.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 (Vite), React Router 6, Axios, Bootstrap 5 with a custom theme |
| **Backend** | Java 17, Spring Boot 3.4, Spring Web, Spring Data JPA / Hibernate, Spring Security, JJWT, Lombok |
| **AI / ML** | Python 3.13, scikit-learn (TF-IDF + Logistic Regression), pandas, FastAPI, Uvicorn |
| **Database** | MySQL 8 |
| **Other** | JavaMail, Spring Scheduler, Maven, JUnit 5, Postman, Docker, Git |

---

## Project Structure

```
.
├── backend/                     Spring Boot REST API
│   ├── src/main/java/com/grievance/
│   │   ├── controller/          REST endpoints
│   │   ├── service/             Business rules: submission, transitions, identity, stats
│   │   ├── security/            JWT filter and security configuration
│   │   ├── ml/                  Client for the ML service
│   │   ├── mail/                Email senders (log or SMTP)
│   │   ├── scheduler/           Escalation job
│   │   ├── entity/ enums/ repository/ dto/ config/ exception/
│   ├── src/test/                Unit tests
│   ├── Dockerfile
│   └── .env.example
├── ml-service/                  FastAPI classification service
│   ├── app.py                   /predict and /health
│   ├── rules.py                 Keyword rules
│   ├── train.py  evaluate.py
│   ├── data/                    Dataset, sanity set, labelling rules
│   └── docs/                    Evaluation report and confusion matrices
├── frontend/                    React application
│   └── src/
│       ├── pages/               Login, Register, Submit, My grievances, Detail, Track, Officer queue, Admin
│       ├── components/          Navbar, table, badges, timeline, icons
│       ├── api/ context/ utils/
├── docs/
│   ├── schema.sql               Database DDL
│   ├── postman-collection.json  API test collection
│   └── deployment.md            Deployment checklist
└── plan.md                      Full specification and step-by-step build guide
```

---

## Getting Started

### Prerequisites

- Java JDK 17 or newer, and Maven
- Python 3.13 (the pinned packages were installed and tested on 3.13)
- Node.js 18 or newer
- MySQL 8

### 1. Database

```sql
CREATE DATABASE Grievance_System CHARACTER SET utf8mb4;
```

The backend creates the tables itself on first start.

### 2. ML service

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn app:app --port 8000
```

`train.py` builds the two models from `data/grievances.csv`; the service will not start without them. Leave it running.

### 3. Backend

Create `backend/src/main/resources/application-local.properties` (gitignored) with your local values:

```properties
spring.datasource.password=<your MySQL password>
app.jwt.secret=<any random string of 32+ characters>
app.admin.password=<password for the first admin account>
```

Then:

```bash
cd backend
mvn clean package
java -jar target/grievance-management-0.0.1-SNAPSHOT.jar
```

The API runs on `http://localhost:8080/api`. On first start it creates the tables, the five departments and an admin account (`admin@example.com` with the password you set).

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

### 5. Try it

1. Log in as the admin and create an officer account in the Hostel Office (*Dashboard → Officers*).
2. Register a normal account and submit a grievance about a hostel problem. Try the *Submit anonymously* switch.
3. Log in as the officer: the grievance is in the queue, and an anonymous one shows no name.
4. Move it to *In progress*, then *Resolved*. Log in as the admin and close it.
5. Open the tracking page while logged out and enter the tracking ID.

To see the fallback, stop the ML service and submit again: the grievance is saved as *Awaiting review* and appears in the admin's list for manual assignment.

### Troubleshooting

- **`Unable to find a single main class`** when starting the backend: `backend/target` holds duplicate class files. Run `mvn clean` and build again.
- **Timestamps 5.5 hours off:** a local database created before UTC storage was introduced holds local-time values. Drop and recreate the database.
- **`Access denied` from MySQL:** the password in `application-local.properties` is missing or wrong.

---

## Configuration

Backend settings are environment variables; `backend/.env.example` lists them all. For local work the same values can go in `application-local.properties`.

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | local `Grievance_System` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | `root` / none | Database login |
| `DB_POOL_SIZE` | 4 | Maximum database connections (kept low for free-tier limits) |
| `JWT_SECRET` | none, required | Signing key, at least 32 characters |
| `JWT_EXPIRATION_MS` | 86400000 | Token lifetime (24 hours) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@example.com` / none, required | First admin account |
| `ML_URL` | `http://localhost:8000` | Address of the ML service |
| `ML_MIN_CONFIDENCE` | 0.25 | Confidence floor below which a grievance goes to manual triage |
| `ESCALATION_INTERVAL_MS` | 900000 | How often the escalation job runs (15 minutes) |
| `MAIL_ENABLED` | false | Send real email; when false, emails are logged |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`, `MAIL_FROM` | — | SMTP settings |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin and the base of links in emails |

The frontend has one setting, `VITE_API_URL`, in `frontend/.env`. The ML service reads `PORT`, `MODEL_DIR` and `LOG_LEVEL`.

---

## Testing

| What | How | State |
|---|---|---|
| Backend unit tests | `cd backend && mvn test` | 27 tests pass: status transitions, tracking IDs, identity masking |
| ML evaluation | `cd ml-service && python evaluate.py` | Reproduces the numbers in the evaluation report |
| API collection | Import `docs/postman-collection.json` into Postman, set the `adminPassword` variable, run the folders top to bottom | 48 requests covering auth, roles, the full lifecycle and anonymous mode |
| ML-down drill | Stop the ML service, submit a grievance | Saved as Unclassified, admin notified |
| Escalation drill | Back-date a grievance's `created_at` past its SLA, wait for the job | Status becomes Escalated, with a system history row |

The frontend has no automated tests; it was checked by hand in the browser for all three roles.

---

## Deployment

Not deployed yet. The intended free-tier setup:

| Part | Target |
|---|---|
| Database | Clever Cloud MySQL |
| ML service | Render (Python web service; the build runs `train.py`) |
| Backend | Render (Docker, using `backend/Dockerfile`) |
| Frontend | Vercel (`frontend/vercel.json` handles client-side routes) |

[`docs/deployment.md`](docs/deployment.md) is a step-by-step checklist: database first, then ML service, backend, frontend, and finally pointing the backend at the frontend's address. Free plans change often, so check each provider's current limits on the day.

---

## Roadmap

**Core**
- [x] Database schema and JPA entities
- [x] User registration and login (JWT, role-based access)
- [x] Grievance submission with unique tracking ID
- [x] Public status tracking
- [x] Officer queue and status updates

**AI module**
- [x] Labelled grievance dataset
- [x] Category classification model
- [x] Priority prediction and keyword rules
- [x] Prediction API (FastAPI)
- [x] Evaluation report

**Automation**
- [x] Automatic routing to departments
- [x] Confidence floor and manual-triage fallback
- [x] Scheduled escalation of delayed grievances
- [x] Email notifications on status change

**Frontend and dashboard**
- [x] Pages for all three roles
- [x] Admin analytics dashboard
- [x] Hide-identity mode (submit anonymously)
- [x] Refreshed theme and responsive navigation

**Remaining**
- [ ] Deployment and production checks
- [ ] Screenshots and demo video

**Possible extensions**
- [ ] Feedback and rating after resolution
- [ ] File attachments
- [ ] Fully anonymous submission without an account
- [ ] Trend charts and exports

---

## Known Limitations

- **Mostly synthetic data.** Our training and sanity sets were drafted with AI assistance and come from the same source, so those figures are optimistic. The real-complaint test covers only Academic, Infrastructure and Finance; Hostel and Harassment have been tested on synthetic text only. The sets are small: one row moves a score by one to two points.
- **Keyword rules ignore context.** A question about the "anti-ragging committee" or the phrase "non-urgent" is still forced to High priority.
- **Anonymous mode hides the name only.** Admins can see the submitter, and nothing stops a user from identifying themselves in the text.
- **English only.** The model was trained on English text.
- **Email is untested against a real SMTP server**; only the logging sender has been exercised.
- **No password reset, no rate limiting and no file attachments.**
- **The admin grievances table** needs a little sideways scrolling at laptop width.

---

## Documentation

| File | Contents |
|---|---|
| [`plan.md`](plan.md) | Full specification: scope, schema, API contract, ML plan, 28 build steps, deployment plan, test plan |
| [`docs/schema.sql`](docs/schema.sql) | Database DDL |
| [`docs/postman-collection.json`](docs/postman-collection.json) | API test collection |
| [`docs/deployment.md`](docs/deployment.md) | Deployment checklist |
| [`ml-service/README.md`](ml-service/README.md) | Training, evaluating and running the ML service |
| [`ml-service/data/README.md`](ml-service/data/README.md) | Dataset format, labelling rules and provenance |
| [`ml-service/docs/evaluation.md`](ml-service/docs/evaluation.md) | Accuracy, per-class metrics, confusion matrices, error analysis |

---

Built by Swastik as an academic mini-project (final submission December 2026).
