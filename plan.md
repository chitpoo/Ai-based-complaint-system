im# Development Plan — AI-Powered Grievance Management and Resolution System

**Team:** Swastik Mishra (backend: `backend/`) · Vinayak Patil (ML + frontend: `ml-service/`, `frontend/`)
**Goal:** working MVP in 4 days → deploy → resume-ready. Final submission December 2026.
**Rule:** we write all code ourselves (must explain it in interviews/reviews). This plan says *what* and *in what order*, not finished code.

Conventions: `backend/` = Spring Boot 3.x / Java 17 / MySQL 8 · `ml-service/` = FastAPI + scikit-learn · `frontend/` = React + Bootstrap. Lifecycle (per README): `Submitted → Assigned → In Progress → Resolved → Closed`, plus `Escalated` on SLA breach.

---

## 1. MVP Scope

### In (4-day build)

| Area | MVP includes |
|---|---|
| Auth | Register, login, JWT, roles USER / OFFICER / ADMIN |
| Grievance | Submit (title, description, category auto), unique tracking ID, track by ID + "my grievances" |
| AI | Category classify (5 classes) + priority predict via `POST /predict`; keyword override to HIGH |
| Routing | Auto-assign department from predicted category; admin can reassign |
| Workflow | Officer updates status; full lifecycle + escalation flag |
| Automation | Scheduler escalates overdue; email on status change |
| Dashboard | Admin: counts by status/category/priority, avg resolution time, overdue list |
| Deployment | All 4 services live on free tiers; demo-able from phone |

### Out (deferred to post-MVP, before December)

| Feature | Why deferred |
|---|---|
| File attachments | Storage + validation + size/time cost |
| Anonymous submission | Auth/tracking edge cases; needs separate flow |
| Feedback / rating | Needs resolved-flow stable first; `feedback` table designed now, built later |
| Advanced analytics | Trends, charts, exports; MVP keeps basic counts only |

**MVP definition of done:** a USER can register → submit → get tracking ID → see AI category/priority → track status; OFFICER sees assigned queue and resolves; ADMIN sees dashboard, reassigns, receives escalation; emails fire on status change.

---

## 2. Database Schema

MySQL 8, InnoDB, `utf8mb4`. JPA entities mirror these tables 1:1.

### Enums

| Enum | Values |
|---|---|
| `status` | `SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `ESCALATED` |
| `category` | `ACADEMIC`, `HOSTEL`, `INFRASTRUCTURE`, `FINANCE`, `HARASSMENT`, `UNCLASSIFIED` (ML-down fallback only) |
| `priority` | `LOW`, `MEDIUM`, `HIGH` |
| `role` | `USER`, `OFFICER`, `ADMIN` |

Store enums as `VARCHAR` (`@Enumerated(EnumType.STRING)`), never ordinal.

### `users`

| Column | Type | Key / Constraint |
|---|---|---|
| id | BIGINT AUTO_INCREMENT | PK |
| name | VARCHAR(100) NOT NULL | |
| email | VARCHAR(150) NOT NULL | UNIQUE |
| password_hash | VARCHAR(255) NOT NULL | BCrypt (Spring Security's default encoder), never plain |
| role | VARCHAR(20) NOT NULL | `role` enum, default `USER` |
| department_id | BIGINT NULL | FK → `departments.id` (officers only) |
| created_at | TIMESTAMP | default NOW |

### `departments`

| Column | Type | Key / Constraint |
|---|---|---|
| id | BIGINT AUTO_INCREMENT | PK |
| name | VARCHAR(100) NOT NULL | UNIQUE (e.g. "Academic Cell") |
| category | VARCHAR(30) NOT NULL | UNIQUE, one per AI category (excl. UNCLASSIFIED) |
| email | VARCHAR(150) NULL | notification target |
| sla_hours | INT NOT NULL | default 72; escalation threshold |

Seed 5 rows, one per category: ACADEMIC, HOSTEL, INFRASTRUCTURE, FINANCE, HARASSMENT.

### `grievances`

| Column | Type | Key / Constraint |
|---|---|---|
| id | BIGINT AUTO_INCREMENT | PK |
| tracking_id | VARCHAR(20) NOT NULL | UNIQUE, e.g. `GRV-2026-000123` |
| user_id | BIGINT NOT NULL | FK → `users.id` (complainant) |
| officer_id | BIGINT NULL | FK → `users.id` (assignee) |
| department_id | BIGINT NULL | FK → `departments.id` |
| title | VARCHAR(200) NOT NULL | |
| description | TEXT NOT NULL | ML input |
| category | VARCHAR(30) NOT NULL | `category` enum |
| priority | VARCHAR(10) NOT NULL | `priority` enum |
| status | VARCHAR(20) NOT NULL | `status` enum, default `SUBMITTED` |
| ai_confidence | DECIMAL(5,4) NULL | 0–1 from ML service |
| is_escalated | BOOLEAN | default FALSE |
| escalated_at | TIMESTAMP NULL | |
| resolved_at | TIMESTAMP NULL | set on RESOLVED |
| created_at / updated_at | TIMESTAMP | |

### `status_history` (audit trail, append-only)

| Column | Type | Key / Constraint |
|---|---|---|
| id | BIGINT AUTO_INCREMENT | PK |
| grievance_id | BIGINT NOT NULL | FK → `grievances.id` |
| old_status | VARCHAR(20) NULL | NULL on creation |
| new_status | VARCHAR(20) NOT NULL | |
| changed_by | BIGINT NULL | FK → `users.id` (NULL = system/scheduler) |
| remark | VARCHAR(500) NULL | |
| created_at | TIMESTAMP | default NOW |

### `feedback` — DEFERRED (do not build in MVP; schema reserved)

| Column | Type | Key / Constraint |
|---|---|---|
| id | BIGINT AUTO_INCREMENT | PK |
| grievance_id | BIGINT NOT NULL | FK → `grievances.id`, UNIQUE (one per grievance) |
| rating | INT NOT NULL | 1–5 |
| comment | VARCHAR(1000) NULL | |
| created_at | TIMESTAMP | |

### Relationships

- `users.department_id` → `departments` (N:1, officers).
- `grievances.user_id` → `users` (N:1); `grievances.officer_id` → `users` (N:1, nullable); `grievances.department_id` → `departments` (N:1, nullable until routed).
- `status_history.grievance_id` → `grievances` (N:1, cascade delete); every status change inserts one row.
- `feedback.grievance_id` → `grievances` (1:1, deferred).

---

## 3. REST API Contract

Base URL backend: `/api`. Auth: `Authorization: Bearer <JWT>` except register/login/track-by-ID. All responses JSON. Errors: `{ "timestamp", "status", "error", "message", "path" }`.

### Auth (`AuthController` → `backend/` Swastik)

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | `{ name, email, password }` | `201 { id, name, email, role, token }` |
| POST | `/api/auth/login` | public | `{ email, password }` | `200 { token, role, name }` |
| GET | `/api/users/me` | all | — | `200 { id, name, email, role, departmentId }` |

### Grievances

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| POST | `/api/grievances` | USER | `{ title, description }` | `201 { id, trackingId, category, priority, status, departmentName }` |
| GET | `/api/grievances/my` | USER | — | `200 [ { id, trackingId, title, category, priority, status, createdAt } ]` |
| GET | `/api/grievances/track/{trackingId}` | public* | — | `200 { trackingId, title, category, priority, status, statusHistory[] }` |
| GET | `/api/grievances/{id}` | owner/officer/ADMIN | — | `200 { full grievance + statusHistory[] }` |
| GET | `/api/grievances/assigned` | OFFICER | — (`?status=` optional) | `200 [ grievance summaries ]` |
| GET | `/api/grievances` | ADMIN | — (`?status=&category=&priority=` optional) | `200 [ grievance summaries ]` (paged) |
| PUT | `/api/grievances/{id}/status` | OFFICER, ADMIN | `{ status, remark? }` | `200 { id, oldStatus, newStatus }` |
| PUT | `/api/grievances/{id}/assign` | ADMIN | `{ officerId?, departmentId? }` | `200 { id, officerId, departmentId, status }` |

\*Public track endpoint returns limited fields only (no emails, no internal remarks).

### Departments & admin

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| GET | `/api/departments` | all logged in | — | `200 [ { id, name, category, email, slaHours } ]` |
| POST | `/api/departments` | ADMIN | `{ name, category, email?, slaHours? }` | `201 { id, ... }` |
| PUT | `/api/departments/{id}` | ADMIN | `{ name?, email?, slaHours? }` | `200 { id, ... }` |
| GET | `/api/admin/officers` | ADMIN | — | `200 [ { id, name, email, departmentId } ]` |
| GET | `/api/admin/stats` | ADMIN | — | `200 { byStatus:{}, byCategory:{}, byPriority:{}, overdueCount, avgResolutionHours }` |

### Spring Boot → ML service contract (internal, no JWT; service-to-service)

`POST {ML_URL}/predict` — backend `MlClient` → FastAPI.

Request:

```json
{ "title": "Water leakage in hostel block B", "description": "Bathroom pipe leaking since 3 days..." }
```

Response (`200`):

```json
{ "category": "HOSTEL", "category_confidence": 0.91, "priority": "MEDIUM", "priority_confidence": 0.78, "keyword_override": false }
```

- `category` ∈ 5 classes (never UNCLASSIFIED from ML); `priority` ∈ LOW/MEDIUM/HIGH.
- `keyword_override: true` means a critical keyword forced HIGH (see §4).
- Backend timeout 5s; on timeout/error → fallback: `category=UNCLASSIFIED`, `priority=MEDIUM`, route to ADMIN queue, still `201` to user.

---

## 4. ML Module Plan (`ml-service/`, Vinayak)

### Dataset (target ~750 rows: ~150 per category × 5)

- File: `ml-service/data/grievances.csv` with columns `title, description, category, priority`.
- Each row: realistic 1–3 sentence complaint; every row labelled with **both** category and priority.
- Priority labelling guide: HIGH = safety/harassment/threat/deadline-tomorrow; MEDIUM = unresolved >3 days, money blocked, repeated issue; LOW = suggestion, minor repair, general query.
- Sources: write ~40/category by hand (fastest, most realistic), then paraphrase/augment to ~150 (vary wording, hostel block names, amounts, departments). Keep a held-out 10/category written last as a sanity set.
- Balance: each category 140–160 rows; each priority ≥20% of total. No duplicate texts across splits.

### Training

- Split: 80/20 stratified train/test (`train_test_split(stratify=y, random_state=42)`); input = `title + " " + description`.
- Pipeline (two heads, same features): `TF-IDF (unigrams+bigrams, max_features≈5000, stop_words=english)` → `LogisticRegression (balanced class weights)`; one classifier for category, one for priority.
- Artefacts: `ml-service/models/category_model.pkl`, `priority_model.pkl` (gitignored; rebuild on deploy or attach to release).

### Metrics to report (`ml-service/docs/evaluation.md` + confusion matrices as images)

- Accuracy (category, priority separately).
- Precision / recall / F1 **per class** (`classification_report`).
- Confusion matrix for category (5×5) and priority (3×3).
- MVP bar: category accuracy ≥ 0.75, priority accuracy ≥ 0.65. Below bar → add data for weakest class first, then tune `max_features` / n-grams.

### Keyword rules (force HIGH priority, applied AFTER model, in FastAPI)

Critical words (case-insensitive, match whole words): `ragging, harassment, harass, unsafe, threat, threaten, assault, abuse, suicide, self-harm, emergency, urgent, discriminat*, bribe, corruption, stalking, molestation`.

- If any keyword hits → `priority=HIGH`, `keyword_override=true` regardless of model output. Log the matched keyword.
- Harassment-category predictions default to at least MEDIUM even without keywords.

### Fallback (backend side, Swastik)

- If `POST /predict` fails/times out: save grievance with `category=UNCLASSIFIED`, `priority=MEDIUM`, `ai_confidence=NULL`, `department_id=NULL`, notify ADMIN; user still gets `201` + tracking ID. Admin reassigns manually. Never fail the submission because ML is down.

---

## 5. Day-by-Day Plan (Day 1–4)

File ownership (no same-file edits): **Swastik** owns `backend/**` + `docs/schema.sql`. **Vinayak** owns `ml-service/**` + `frontend/**`. Shared read-only: this plan, README. `docs/` diagrams: Vinayak draws, Swastik reviews.

### Day 1 — Foundations (auth, schema, dataset, skeletons)

| Who | Tasks | Files |
|---|---|---|
| Swastik | Spring Boot scaffold (Web, JPA, Security, Validation, Mail, Scheduler); MySQL schema + seed departments; register/login + JWT filter + role guard; `GET /api/users/me`; CORS for localhost:3000 | `backend/**` |
| Vinayak | `grievances.csv` (~750 rows); train both models + evaluation report; FastAPI `POST /predict` + keyword rules running locally; React scaffold (router, auth context, login/register pages) | `ml-service/**`, `frontend/src/{App.js, pages/Auth*, context/*}` |

> ✅ **Done when (Day 1 demo):** Postman `register → login → GET /users/me` returns 200 with JWT; `curl POST localhost:8000/predict` returns category+priority; React login page calls backend login and stores token.

Snippets allowed here (illustrative only — write your own):

```java
// JWT filter MUST run before Spring's auth filter, CORS first (Spring Boot 3.x shape)
http.cors().and().csrf(csrf -> csrf.disable())
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**", "/api/grievances/track/**").permitAll()
        .anyRequest().authenticated())
    .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
```

```java
// CORS: allow React dev server + later Vercel URL from config, not hardcoded
registry.addMapping("/api/**").allowedOrigins(frontendUrl).allowedMethods("*").allowCredentials(true);
```

### Day 2 — Core flow end-to-end (submit → classify → route → track)

| Who | Tasks | Files |
|---|---|---|
| Swastik | `Grievance` + `StatusHistory` entities; `MlClient` (5s timeout + UNCLASSIFIED fallback); `POST /api/grievances` (tracking-ID gen, auto-route by category→department, write history row); `GET my/track/{id}`; global exception handler | `backend/.../grievance/**`, `.../ml/**`, `.../exception/**` |
| Vinayak | React submit form + "my grievances" list + tracking page (public, by tracking ID); polish `/predict` confidence + override flag; start `evaluation.md` | `frontend/src/pages/{Submit,MyGrievances,Track}.js`, `ml-service/app.py` |

> ✅ **Done when (Day 2 demo — FULL CORE FLOW):** in the browser: submit a grievance → see tracking ID + AI category/priority → open tracking page → status `SUBMITTED/ASSIGNED` visible. Postman collection green for all Day-1–2 endpoints. ML down → still submits as UNCLASSIFIED (kill FastAPI and re-submit to prove it).

### Day 3 — Roles, workflow, automation, dashboard

| Who | Tasks | Files |
|---|---|---|
| Swastik | Officer/admin endpoints (assigned queue, status update, reassign); status-transition validation; JavaMail on status change; `@Scheduled` escalation job (sla_hours breached → ESCALATED + email); `/api/admin/stats` | `backend/.../{officer,admin,mail,scheduler}/**` |
| Vinayak | Role-guarded officer queue + status-update UI; admin dashboard (counts, overdue list, reassign dropdown); departments dropdown wiring; README "Getting Started" per-module run steps | `frontend/src/pages/{Officer,Admin}*.js`, `README.md` |

> ✅ **Done when (Day 3 demo):** officer logs in → sees assigned case → moves it to IN_PROGRESS → user gets email; force an old grievance past SLA → scheduler marks ESCALATED; admin dashboard shows real counts.

### Day 4 — Harden, test, deploy, resume

| Who | Tasks | Files |
|---|---|---|
| Swastik | Postman pass on every endpoint (§9); fix auth/routing bugs; deploy backend + MySQL; env vars; seed prod departments + admin user; record demo video script | `backend/**`, `docs/postman-collection.json` |
| Vinayak | Deploy ML service + React; point frontend to prod backend; ML accuracy final numbers into `evaluation.md`; end-to-end click-through on prod; screenshots for resume/README | `ml-service/**`, `frontend/**`, `ml-service/docs/evaluation.md` |

> ✅ **Done when (Day 4 demo):** public URLs for frontend + backend + ML docs; fresh register→submit→track→resolve works on prod; Postman suite green; README has live links + screenshots.

---

## 6. Task Checklist

### Backend (Swastik — `backend/`)

- [ ] Scaffold Spring Boot 3.x (Web, JPA, Security, Validation, Mail, Scheduler) + Maven build green
- [ ] `application.properties` + `application-local.properties` (secrets, gitignored) + `.env.example`
- [ ] Entities: `User`, `Department`, `Grievance`, `StatusHistory` (+ `Feedback` entity deferred — see §11)
- [ ] Repositories + seed 5 departments + 1 admin user (data seeder / migration)
- [ ] JWT util + filter + role guard (`USER/OFFICER/ADMIN`) + CORS config
- [ ] `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`
- [ ] Tracking-ID generator (`GRV-YYYY-######`, unique, retry on collision)
- [ ] `MlClient`: `POST /predict`, 5s timeout, UNCLASSIFIED→admin fallback
- [ ] `POST /api/grievances` (classify → route → history row → `201`)
- [ ] `GET /api/grievances/my`, `/track/{trackingId}`, `/{id}` (owner/officer/admin guard)
- [ ] `GET /api/grievances/assigned`, `PUT /{id}/status` (transition validation), `PUT /{id}/assign`
- [ ] Department CRUD + `GET /api/admin/officers` + `GET /api/admin/stats`
- [ ] JavaMail on every status change (user + officer/admin as applicable)
- [ ] `@Scheduled` escalation job (SLA breach → `ESCALATED`, email, history row)
- [ ] Global exception handler + validation errors + consistent error JSON
- [ ] Deploy backend + MySQL; prod env vars; seed prod data

### ML service (Vinayak — `ml-service/`)

- [ ] `data/grievances.csv`: ~150 rows × 5 categories, each with priority label
- [ ] Train/test split 80/20 stratified + TF-IDF + Logistic Regression (category + priority)
- [ ] `evaluation.md`: accuracy, per-class precision/recall, 2 confusion matrices
- [ ] FastAPI `POST /predict` (title+description → category, priority, confidences)
- [ ] Keyword override list → force HIGH + `keyword_override` flag
- [ ] Deploy ML service; document `ML_URL` for backend

### Frontend (Vinayak — `frontend/`)

- [ ] Scaffold React + Bootstrap + router + auth context (JWT in memory/localStorage)
- [ ] Login / register pages wired to backend
- [ ] Submit grievance form → shows tracking ID + AI result
- [ ] "My grievances" list + detail view
- [ ] Public tracking page (by tracking ID, limited fields)
- [ ] Officer queue + status-update UI (role-guarded routes)
- [ ] Admin dashboard (stats, overdue, reassign) + departments view
- [ ] Point to prod APIs; deploy React; mobile sanity check

### Shared / docs

- [ ] Postman collection for every endpoint (`docs/postman-collection.json`)
- [ ] README "Getting Started" + live URLs + screenshots
- [ ] Demo video script + 2-min recording (for reviews + internship proof)

---

## 7. Git Workflow

- **One branch per feature:** `feature/auth`, `feature/grievance-crud`, `feature/ml-predict`, `feature/officer-ui`, `feature/escalation`, `feature/admin-dashboard`, `fix/<what>`.
- **Always `git pull` on main before starting** a new branch; rebase or merge main into your branch daily so Day-2 integration doesn't explode.
- **Small commits, clear messages:** `feat(auth): add JWT login endpoint`, `fix(ml): handle empty description`, `docs(plan): add API contract`. One logical change per commit.
- **Never commit secrets.** Local secrets live in `backend/src/main/resources/application-local.properties` and `ml-service/.env` / `frontend/.env` — all already in `.gitignore`. Commit only `*.example` templates. If a secret leaks: rotate it immediately, then purge the commit.
- **Ownership = fewer conflicts:** Swastik commits only under `backend/` (+ `docs/schema.sql`); Vinayak only under `ml-service/`, `frontend/` (+ README run steps). Cross-area change? Ask first, then PR/merge together.
- Merge to `main` only when the Day checkpoint it belongs to is demo-able.

---

## 8. Deployment Plan (free tiers)

| Service | Option A (recommended) | Option B | Notes |
|---|---|---|---|
| Spring Boot | Render free web service (Java or Docker runtime) | Any Docker-capable free host (verify at deploy time) | Needs ≥512MB RAM; set `server.port=$PORT`; free services spin down after 15 min idle |
| FastAPI (ML) | Render free web service (same workspace as backend) | Hugging Face Spaces (Docker) | Include model rebuild step or ship `.pkl` via release asset |
| React | Vercel Hobby (free for personal projects) | Render static site | `npm run build`; set `REACT_APP_API_URL` |
| MySQL 8 | Clever Cloud MySQL add-on (free signup credits, no card) | Local MySQL 8 for demos as backup | Verify credits cover the December window; keep `docs/schema.sql` fresh for instant re-provision |

Free tiers change often — re-verify limits on Day 4 before deploying (see Sources).

### Environment variables

**Backend (`application.properties` reads env, local overrides in `application-local.properties`):**

| Var | Example | Required |
|---|---|---|
| `PORT` | `8080` | platform sets |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://host:3306/grievance?sslMode=REQUIRED` | yes |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | — | yes |
| `JWT_SECRET` | 256-bit random (≥32 chars) | yes |
| `JWT_EXPIRATION_MS` | `86400000` | yes |
| `ML_URL` | `https://<ml-service>/predict` base | yes |
| `MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD/MAIL_FROM` | any free SMTP provider | yes |
| `FRONTEND_URL` | `https://<vercel-app>.vercel.app` | yes (CORS) |
| `ADMIN_EMAIL/ADMIN_PASSWORD` | seed admin | yes (first boot) |

**ML service:** `PORT`, `MODEL_DIR` (default `./models`), `LOG_LEVEL`. No secrets; CORS open only to backend origin if the platform needs it.

**Frontend (build-time):** `REACT_APP_API_URL=https://<backend>/api`. Rebuild + redeploy on change.

Deploy order: MySQL → ML service → backend (verify `/predict` wiring + login) → frontend. Tag the working commit `mvp-v1`.

---

## 9. Testing

### Postman (Swastik owns collection; Vinayak re-runs on prod)

| Endpoint | Test |
|---|---|
| `POST /api/auth/register` | 201 + token; duplicate email → 409; bad email/short password → 400 |
| `POST /api/auth/login` | 200 + role; wrong password → 401 |
| `GET /api/users/me` | 200 with token; 401/403 without |
| `POST /api/grievances` | 201 + tracking ID + category/priority; unauthenticated → 401; empty description → 400 |
| `GET /api/grievances/my` | only own rows; other user's ID via `/{id}` → 403 |
| `GET /api/grievances/track/{id}` | valid → 200 limited fields; bogus ID → 404; no emails leaked |
| `GET /api/grievances/assigned` | OFFICER sees own dept queue; USER → 403 |
| `PUT /{id}/status` | valid transition → 200 + history row + email; invalid jump (SUBMITTED→RESOLVED) → 400; wrong officer → 403 |
| `PUT /{id}/assign` | ADMIN ok; OFFICER/USER → 403 |
| `GET /api/admin/stats` | ADMIN 200 with real counts; non-admin → 403 |
| ML-down drill | stop FastAPI → `POST /api/grievances` still 201 with `UNCLASSIFIED`, admin notified |

Save as `docs/postman-collection.json` with `{{baseUrl}}` + `{{token}}` variables.

### ML accuracy evaluation (Vinayak)

- Run eval script on the 20% held-out split; record accuracy, per-class precision/recall/F1, both confusion matrices in `ml-service/docs/evaluation.md`.
- Bars: category ≥ 0.75, priority ≥ 0.65. Below bar → inspect weakest class in confusion matrix, add ~30 targeted rows, retrain.
- Keyword spot-check: 10 texts containing `ragging / harassment / unsafe / threat` must all return HIGH with `keyword_override=true`.
- Latency check: p95 `/predict` < 500ms locally.

---

## 10. Risks and Fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| Day 3 time crunch | High | Cut in this order: (1) admin stats polish → raw counts only; (2) HTML emails → plain text; (3) officer reassignment UI → backend-only + Postman demo; (4) escalation → manual "escalate" button instead of scheduler. **Never cut:** submit → classify → track. |
| ML accuracy too low | Medium | Ship keyword + category-default rules as the classifier; keep model behind a flag; report honest numbers in `evaluation.md`. |
| ML service undeployable | Medium | Backend fallback becomes the path: everything `UNCLASSIFIED` → admin triage; still a complete grievance system for the resume. |
| Free-tier MySQL limits/sleeps | Medium | Keep `docs/schema.sql` fresh for instant re-provision; local MySQL for demos as backup. |
| Render cold starts | High | Note it in demo ("first request wakes the server"); warm up backend + ML 2 min before any review. |
| JWT/CORS bugs eating hours | Medium | Day-1 checkpoint is exactly this; use the §5 snippets' ordering (CORS → JWT filter → auth rules) and test with Postman before React. |
| Merge conflicts Day 2–3 | Medium | File ownership (§5) + daily pull; integrate backend↔frontend via the §3 contract, never by editing each other's code. |
| Email provider blocks (spam/limits) | Low | Log emails to console/file as backup; demo shows logs + one real email. |

---

## 11. Post-MVP Roadmap (before December 2026 submission)

| Priority | Feature | Notes |
|---|---|---|
| 1 | Feedback / rating | Build `feedback` table (§2), `POST /api/grievances/{id}/feedback` (owner, after RESOLVED), show on admin dashboard |
| 2 | File attachments | Upload (5MB cap, images/PDF), virus/size validation, object storage or `uploads/`; link to grievance |
| 3 | Anonymous submission | Optional-auth submit flow; tracking ID + PIN instead of login for tracking |
| 4 | Advanced analytics | Trend charts (volume over time), SLA compliance %, officer leaderboard, CSV export |
| 5 | Polish for review | Auto-generated API docs, unit + integration tests with each stack's standard test framework, CI pipeline |
| 6 | Docs | ER diagram, sequence diagrams, final report in `docs/`; update README roadmap checkboxes |

**Resume line (after MVP):** "Built and deployed an AI grievance system (Spring Boot + FastAPI + React, MySQL): NLP auto-categorisation into 5 classes, priority prediction, SLA escalation, JWT role-based access — live at <frontend-URL>."

---

## Sources

Deployment picks in §8 trace to these official pages (inspected during planning; re-verify on Day 4):

- Render free instances (750 hrs/mo, spin down after 15 min idle): <https://render.com/docs/free>
- Vercel Hobby plan (free for personal projects): <https://vercel.com/docs/plans/hobby>
- Hugging Face Spaces (Docker support): <https://huggingface.co/docs/hub/en/spaces>
- Clever Cloud pricing (free signup credits; MySQL add-on): <https://www.clever.cloud/pricing/>

All other stack names (Java 17, Spring Boot 3.x, scikit-learn, FastAPI, React, Bootstrap, MySQL 8, JavaMail, Maven, Postman) restate the fixed stack from the project brief and README, not external recommendations.
