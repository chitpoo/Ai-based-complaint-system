# Development Plan — AI-Powered Grievance Management and Resolution System

**Developer:** Swastik Mishra (solo — backend, ML service, frontend, deployment)
**Goal:** working MVP built step by step (§5) → deploy → resume-ready. Final submission December 2026.
**How it's built:** code is written one step at a time with an AI coding assistant, and every step is code-reviewed before it is merged. I must be able to explain every line in interviews/reviews — nothing gets merged that I don't understand. This plan is the spec: it says *what* to build, *in what order*, and *how to check it*.

Conventions: `backend/` = Spring Boot 3.4 / Java 17 / MySQL 8 · `ml-service/` = FastAPI + scikit-learn · `frontend/` = React (Vite) + Bootstrap. Lifecycle (per README): `Submitted → Assigned → In Progress → Resolved → Closed`, plus `Escalated` on SLA breach.

**Solo build order:** backend auth → ML service → backend core flow → backend workflow → frontend → deploy. The backend is finished and Postman-tested against the §3 contract *before* any UI is written, so the frontend is pure wiring and there is never a half-built layer on both sides at once.

---

## 1. MVP Scope

### In (MVP)

| Area | MVP includes |
|---|---|
| Auth | Register, login, JWT, roles USER / OFFICER / ADMIN; admin creates officer accounts |
| Grievance | Submit (title, description, category auto), unique tracking ID, track by ID + "my grievances" |
| AI | Category classify (5 classes) + priority predict via `POST /predict`; keyword override to HIGH |
| Routing | Auto-assign department from predicted category; admin can reassign |
| Workflow | Officer updates status; full lifecycle with validated transitions (§2) |
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

**MVP definition of done:** a USER can register → submit → get tracking ID → see AI category/priority → track status; OFFICER sees their department queue and resolves; ADMIN sees dashboard, reassigns, receives escalation; emails fire on status change.

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

Public registration always creates `USER`. Officers are created by an admin (`POST /api/admin/officers`); the first admin is seeded from env vars.

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
| tracking_id | VARCHAR(20) NOT NULL | UNIQUE, e.g. `GRV-2026-483920` (random digits, **not** sequential — the track endpoint is public) |
| user_id | BIGINT NOT NULL | FK → `users.id` (complainant) |
| officer_id | BIGINT NULL | FK → `users.id` (optional named assignee) |
| department_id | BIGINT NULL | FK → `departments.id` |
| title | VARCHAR(200) NOT NULL | |
| description | TEXT NOT NULL | ML input |
| category | VARCHAR(30) NOT NULL | `category` enum |
| priority | VARCHAR(10) NOT NULL | `priority` enum |
| status | VARCHAR(20) NOT NULL | `status` enum, default `SUBMITTED` |
| ai_confidence | DECIMAL(5,4) NULL | `category_confidence` from ML service (0–1); NULL on fallback |
| is_escalated | BOOLEAN | default FALSE; stays TRUE forever once escalated (status moves on, flag is the record) |
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

### Status transitions (the only ones `PUT /{id}/status` and the system may perform)

| From | To | Who | Side effects |
|---|---|---|---|
| — | `SUBMITTED` | system (on create) | history row with `old_status=NULL` |
| `SUBMITTED` | `ASSIGNED` | system (ML routed to a department) or ADMIN (`/assign`) | sets `department_id` |
| `ASSIGNED` | `IN_PROGRESS` | OFFICER of that department, ADMIN | |
| `IN_PROGRESS` | `RESOLVED` | OFFICER of that department, ADMIN | sets `resolved_at` |
| `RESOLVED` | `CLOSED` | ADMIN | |
| `SUBMITTED` / `ASSIGNED` / `IN_PROGRESS` | `ESCALATED` | scheduler only | `is_escalated=TRUE`, `escalated_at=NOW` |
| `ESCALATED` | `IN_PROGRESS` / `RESOLVED` | OFFICER of that department, ADMIN | `is_escalated` stays TRUE |

Anything else → `400`. Implement as one `Map<Status, Set<Status>>` + a role check, in one place.

**Rules that pin down the vague parts:**

- **Normal submit:** ML succeeds → grievance is saved as `ASSIGNED` with the department set (two history rows: `NULL→SUBMITTED`, `SUBMITTED→ASSIGNED`). ML fallback → stays `SUBMITTED`, `department_id=NULL`, waits for admin.
- **Officer queue** = all grievances whose `department_id` equals the officer's department. `officer_id` is optional in the MVP (only set when an admin names a specific officer). "Wrong officer" = officer from a different department → `403`.
- **SLA clock** runs from `created_at`. Overdue = status not in (`RESOLVED`, `CLOSED`, `ESCALATED`) AND `created_at + sla_hours < now`. Unrouted grievances (no department) use the default 72h.

---

## 3. REST API Contract

Base URL backend: `/api`. Auth: `Authorization: Bearer <JWT>` except register/login/track-by-ID/health. All responses JSON. Errors: `{ "timestamp", "status", "error", "message", "path" }`. Missing/invalid token → `401`; valid token but wrong role → `403`.

### Auth & users

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | `{ name, email, password }` | `201 { id, name, email, role, token }` |
| POST | `/api/auth/login` | public | `{ email, password }` | `200 { token, role, name }` |
| GET | `/api/users/me` | all | — | `200 { id, name, email, role, departmentId }` |
| GET | `/api/health` | public | — | `200 { status: "UP" }` — also fires an async warm-up ping to the ML service (see §8 cold starts) |

### Grievances

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| POST | `/api/grievances` | USER | `{ title, description }` | `201 { id, trackingId, category, priority, status, departmentName }` |
| GET | `/api/grievances/my` | USER | — | `200 [ { id, trackingId, title, category, priority, status, createdAt } ]` |
| GET | `/api/grievances/track/{trackingId}` | public* | — | `200 { trackingId, title, category, priority, status, statusHistory[] }` |
| GET | `/api/grievances/{id}` | owner / dept officer / ADMIN | — | `200 { full grievance + statusHistory[] }` |
| GET | `/api/grievances/assigned` | OFFICER | — (`?status=` optional) | `200 [ grievance summaries ]` (officer's department queue) |
| GET | `/api/grievances` | ADMIN | — (`?status=&category=&priority=&overdue=true` optional) | `200 [ grievance summaries ]` (paged) |
| PUT | `/api/grievances/{id}/status` | OFFICER, ADMIN | `{ status, remark? }` | `200 { id, oldStatus, newStatus }` |
| PUT | `/api/grievances/{id}/assign` | ADMIN | `{ officerId?, departmentId? }` | `200 { id, officerId, departmentId, status }` |

\*Public track endpoint returns limited fields only (no emails, no description, no internal remarks; history shows status + timestamp only).

`?overdue=true` on the admin list is what feeds the dashboard's overdue list (stats only returns the count).

### Departments & admin

| Method | Path | Roles | Request body | Response |
|---|---|---|---|---|
| GET | `/api/departments` | all logged in | — | `200 [ { id, name, category, email, slaHours } ]` |
| POST | `/api/departments` | ADMIN | `{ name, category, email?, slaHours? }` | `201 { id, ... }` |
| PUT | `/api/departments/{id}` | ADMIN | `{ name?, email?, slaHours? }` | `200 { id, ... }` |
| POST | `/api/admin/officers` | ADMIN | `{ name, email, password, departmentId }` | `201 { id, name, email, departmentId }` |
| GET | `/api/admin/officers` | ADMIN | — | `200 [ { id, name, email, departmentId } ]` |
| GET | `/api/admin/stats` | ADMIN | — | `200 { byStatus:{}, byCategory:{}, byPriority:{}, overdueCount, avgResolutionHours }` |

### Spring Boot → ML service contract (internal, no JWT; service-to-service)

`POST {ML_URL}/predict` — backend `MlClient` → FastAPI. `GET {ML_URL}/health` → `200 { "status": "ok" }` (used for warm-up).

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
- Backend timeout 5s; on timeout/error → fallback: `category=UNCLASSIFIED`, `priority=MEDIUM`, status stays `SUBMITTED`, lands in the admin queue, still `201` to user.
- The same fallback applies when `category_confidence` is below `app.ml.min-confidence` (env `ML_MIN_CONFIDENCE`, default `0.25`) and `keyword_override` is false: text the model does not recognise (gibberish, another script) would otherwise be routed on a guess. A prediction with `keyword_override: true` is always kept. A reply with no `category_confidence` is treated as below the floor.

---

## 4. ML Module Plan (`ml-service/`)

### Dataset (target ~500 rows: ~100 per category × 5)

Scaled down from 750 because one person is writing it — 500 clean rows beat 750 rushed ones, and the dataset can grow post-MVP.

> **Note on the delivered dataset.** The files in `ml-service/data/` were drafted with AI assistance, not written by hand. The student must read every row, correct wording and labels, and describe the data this way in the report. See `ml-service/data/README.md`.

- File: `ml-service/data/grievances.csv` with columns `group_id, title, description, category, priority`.
- Each row: realistic 1–3 sentence complaint; every row labelled with **both** category and priority.
- Priority labelling guide: HIGH = safety/harassment/threat/deadline-tomorrow; MEDIUM = unresolved >3 days, money blocked, repeated issue; LOW = suggestion, minor repair, general query.
- Sources: write ~30/category by hand, then paraphrase/augment each to ~100 (vary wording, hostel block names, amounts, departments). Every paraphrase keeps the `group_id` of the hand-written row it came from.
- Sanity set: 10/category written last, by hand, never augmented, kept in `data/sanity.csv` and never trained on.
- Balance: each category 90–110 rows; each priority ≥20% of total.

### Training

- Input = `title + " " + description`.
- **Split by `group_id`, not by row** (`GroupShuffleSplit`, 80/20, `random_state=42`). A plain random split puts paraphrases of the same complaint in both train and test and inflates accuracy — a reviewer who asks "how did you split?" will catch it.
- Pipeline (two heads, same features): `TF-IDF (unigrams+bigrams, max_features≈5000, stop_words=english)` → `LogisticRegression (balanced class weights)`; one classifier for category, one for priority.
- Artefacts: `ml-service/models/category_model.pkl`, `priority_model.pkl` (gitignored). `train.py` runs in the deploy build step so the models are rebuilt from the committed CSV.

### Metrics to report (`ml-service/docs/evaluation.md` + confusion matrices as images)

- Accuracy (category, priority separately) on the grouped test split **and** on the sanity set. The sanity set is a separately written check from the same source as the training data: useful for catching leakage and memorisation, but not a measure of real-world accuracy.
- Precision / recall / F1 **per class** (`classification_report`).
- Confusion matrix for category (5×5) and priority (3×3).
- MVP bar: category accuracy ≥ 0.75, priority accuracy ≥ 0.65. Below bar → add data for weakest class first, then tune `max_features` / n-grams.

### Keyword rules (force HIGH priority, applied AFTER model, in FastAPI)

Critical words (case-insensitive, matched from the start of a word with any ending, so `threat` also catches "threatens" and "threatened"): stems `ragging, ragged, harass, unsafe, threat, assault, abus, suicid, emergenc, urgen, discriminat, brib, stalk, molest`; plus `corrupt` / `corruption` (not "corrupted"), `self-harm` / `self harm`, `kill` (with `-s/-ed/-ing`), `rape` and its forms, "end / ending my / his / her / their life", "acid attack". The exact pattern is in `ml-service/rules.py`.

- If any keyword hits → `priority=HIGH`, `keyword_override=true` regardless of model output. Log the matched keyword.
- Harassment-category predictions default to at least MEDIUM even without keywords.

### Fallback (backend side)

- If `POST /predict` fails/times out: save grievance with `category=UNCLASSIFIED`, `priority=MEDIUM`, `ai_confidence=NULL`, `department_id=NULL`, notify ADMIN; user still gets `201` + tracking ID. Admin reassigns manually. Never fail the submission because ML is down.

---

## 5. Step-by-Step Build Guide

28 steps in 6 phases. Steps are ordered so each one only depends on steps above it — do them in order, one at a time. There are no deadlines per step; a step is finished when its **Verify** list passes and it has been reviewed.

### How to work a step

1. `git checkout main && git pull`, then `git checkout -b feature/<step-name>`.
2. Give the coding assistant **one step only**: paste the step's block plus the sections it references (§2 for schema/transitions, §3 for the endpoint rows, §4 for ML). Don't ask for several steps at once — small diffs are reviewable, big ones aren't.
3. Read the generated code before running it. If a line can't be explained, ask why it's there or have it rewritten simpler.
4. Run the step's **Verify** list by hand. Every item must pass.
5. Ask for a code review of the diff (`git diff main`), pointing at the step's **Review focus**. Fix what the review finds; re-run Verify.
6. Commit (`feat(scope): …`), merge to `main`, push, tick the step in §6.
7. If the step changed an endpoint's shape, update §3 in the same commit.

### Backend package layout (`backend/src/main/java/com/grievance/`)

Layer-based, matching the existing `entity/` and `enums/` packages:

| Package | Holds |
|---|---|
| `entity/`, `enums/` | JPA entities, enums (done) |
| `repository/` | Spring Data interfaces |
| `dto/` | Request/response records — controllers never accept or return entities |
| `controller/` | REST controllers: thin, no business logic |
| `service/` | Business logic, `@Transactional` boundaries |
| `security/` | `JwtUtil`, `JwtAuthFilter`, `CustomUserDetailsService`, `SecurityConfig` |
| `config/` | CORS, async/scheduling, data seeder, HTTP client beans |
| `exception/` | Custom exceptions + `GlobalExceptionHandler` |
| `ml/` | `MlClient` + its request/response records |
| `mail/` | `MailService` interface + SMTP and console implementations |
| `scheduler/` | Escalation job |

---

### Phase A — Backend foundation

#### Step 1 — Dependencies and configuration

**Goal:** the app boots against local MySQL and creates the tables from the existing entities.

**Build:**
- `pom.xml`: add `spring-boot-starter-web`, `spring-boot-starter-security`, `spring-boot-starter-mail`, and the JJWT trio (`jjwt-api`, `jjwt-impl`, `jjwt-jackson` — check the current stable version on Maven Central).
- `application.properties`: every value from an env var with a safe local default — `server.port=${PORT:8080}`, datasource URL/user/password, `spring.jpa.hibernate.ddl-auto=update`, `spring.jpa.open-in-view=false`, `app.jwt.secret`, `app.jwt.expiration-ms`, `app.ml.url`, `app.mail.enabled`, `app.frontend-url`, `app.admin.email`, `app.admin.password`, `spring.profiles.active=${SPRING_PROFILES_ACTIVE:local}`.
- `application-local.properties` (gitignored): real local DB password, a dev JWT secret, a dev admin password (`app.jwt.secret` and `app.admin.password` have no committed default).
- `backend/.env.example`: every variable from §8 with placeholder values.
- Add `@EnableScheduling` and `@EnableAsync` on a class in `config/`.
- Create the local database: `CREATE DATABASE Grievance_System CHARACTER SET utf8mb4;`

**Files:** `backend/pom.xml`, `backend/src/main/resources/application*.properties`, `backend/.env.example`, `config/AppConfig.java`

**Verify:**
- [ ] `mvn clean package` is green.
- [ ] App starts; MySQL shows `users`, `departments`, `grievances`, `status_history` with the §2 column names and types.
- [ ] `git status` does not list `application-local.properties`.

**Review focus:** no secret has a real value in a committed file; every config key is read from env; column types match §2.

#### Step 2 — Repositories and seed data

**Goal:** the database always has the 5 departments and one admin.

**Build:**
- `UserRepository` (`findByEmail`, `existsByEmail`, `findByRole`), `DepartmentRepository` (`findByCategory`), `GrievanceRepository`, `StatusHistoryRepository` (`findByGrievanceIdOrderByCreatedAtAsc`). Add query methods later as steps need them — don't pre-write unused ones.
- `PasswordEncoder` bean (BCrypt).
- `DataSeeder` (`CommandLineRunner`): insert each of the 5 departments only if its category is missing; create the admin from `app.admin.email` / `app.admin.password` only if that email doesn't exist. Must be safe to run on every boot.
- Export the schema to `docs/schema.sql` (`mysqldump --no-data`).

**Files:** `repository/*.java`, `config/DataSeeder.java`, `docs/schema.sql`

**Verify:**
- [ ] First boot: 5 department rows + 1 ADMIN user whose `password_hash` starts with `$2`.
- [ ] Second boot: still exactly 5 departments and 1 admin (no duplicates, no crash).

**Review focus:** idempotent seeding; admin password never logged; no plain-text password anywhere.

#### Step 3 — Error handling

**Goal:** every error leaves the API in the §3 error shape. Built before any endpoint so every later step uses it.

**Build:**
- `ApiError` record: `timestamp, status, error, message, path`.
- Exceptions: `ResourceNotFoundException` (404), `DuplicateResourceException` (409), `InvalidTransitionException` (400), `ForbiddenOperationException` (403).
- `GlobalExceptionHandler` (`@RestControllerAdvice`): the four above; `MethodArgumentNotValidException` → 400 with field messages joined; `HttpMessageNotReadableException` → 400; `AccessDeniedException` → 403; fallback `Exception` → 500 with a generic message (log the stack trace server-side, never return it).

**Files:** `dto/ApiError.java`, `exception/*.java`

**Verify:** exercised by Step 5 (bad register body → 400 in the right shape).

**Review focus:** no stack traces or SQL text in any response body; correct status code per exception.

#### Step 4 — JWT and security configuration

**Goal:** stateless JWT auth with role guards. This is the step most likely to eat hours — go slowly.

**Build:**
- `JwtUtil`: `generateToken(user)` (subject = email, claim = role, expiry from config, HS256 key from `app.jwt.secret`), `extractEmail`, `isValid`.
- `CustomUserDetailsService`: load by email; authority = `ROLE_` + role name.
- `JwtAuthFilter` (`OncePerRequestFilter`): read `Authorization: Bearer …`; if valid, set the `SecurityContext`; if missing or invalid, **do nothing and continue the chain** (the entry point produces the 401).
- `SecurityConfig`: the filter chain below; `AuthenticationManager` bean; `@EnableMethodSecurity` so `@PreAuthorize` works on controllers.
- CORS: `WebMvcConfigurer` allowing `app.frontend-url` on `/api/**`.
- `authenticationEntryPoint` and `accessDeniedHandler` that write the `ApiError` JSON (401 and 403).

Illustrative shape only — write your own:

```java
// Spring Boot 3.4 / Security 6 lambda DSL. The old http.cors().and() chain is deprecated — don't copy it from tutorials.
http.cors(Customizer.withDefaults())
    .csrf(csrf -> csrf.disable())
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .exceptionHandling(e -> e.authenticationEntryPoint(/* 401 JSON; default is 403 */))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**", "/api/grievances/track/**", "/api/health").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated())
    .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
```

**Files:** `security/*.java`, `config/CorsConfig.java`

**Verify:** (with Step 5's endpoints)
- [ ] No token on a protected path → 401 JSON. Garbage or expired token → 401.
- [ ] USER token on `/api/admin/**` → 403 JSON.
- [ ] Browser preflight (`OPTIONS`) from `http://localhost:5173` succeeds; from another origin it doesn't.

**Review focus:** secret length ≥ 32 chars enforced at startup; filter never throws on a bad token; nothing but the three public matchers is `permitAll`; token carries no password or sensitive data.

#### Step 5 — Auth endpoints

**Goal:** register, login, who-am-I, health — the first working API.

**Build:**
- DTO records with validation: `RegisterRequest` (`@NotBlank name`, `@Email email`, `@Size(min=8) password`), `LoginRequest`, `AuthResponse`, `UserResponse`.
- `AuthService.register`: reject duplicate email (409), hash password, role always `USER` (ignore any role in the body), return token.
- `AuthService.login`: authenticate via `AuthenticationManager`; wrong credentials → 401 with the same message for "no such user" and "wrong password".
- `AuthController` (`/api/auth/register`, `/api/auth/login`), `UserController` (`GET /api/users/me`), `HealthController` (`GET /api/health` → `{status:"UP"}`; the ML warm-up is added in Step 10).

**Files:** `dto/*`, `service/AuthService.java`, `controller/{Auth,User,Health}Controller.java`

**Verify:** §9 rows for `register`, `login`, `users/me` all pass in Postman. Also: registering with `"role":"ADMIN"` in the body still creates a USER.

**Review focus:** no entity or `passwordHash` in any response; no user enumeration via error messages; validation on every request field.

> ✅ **Phase A done when:** Postman `register → login → GET /users/me` returns 200; 401 and 403 cases behave; seeded admin can log in. Tag `phase-a-auth`.

---

### Phase B — ML service

#### Step 6 — Dataset

**Goal:** `grievances.csv` and `sanity.csv` as specified in §4. This is manual writing work, not code — and it decides how good the "AI" is.

> **Note on the delivered dataset.** The delivered files were drafted with AI assistance rather than by hand. The reading-and-correcting work below still has to be done by the student before submission; see `ml-service/data/README.md`.

**Build:**
- Write ~30 complaints per category by hand: realistic college-student wording, 1–3 sentences, mixed lengths, a spread of all three priorities per category. Each gets a unique `group_id` (e.g. `HOS-017`).
- Expand each to ~3 variants (reword, change block names / amounts / subjects / durations). Variants keep the parent's `group_id`, category and priority. Read every generated row — delete any that drifted in meaning or priority.
- Write `sanity.csv` last: 10 fresh hand-written rows per category, same columns, no variants.
- `ml-service/data/README.md`: column meanings + the priority labelling guide from §4.

**Files:** `ml-service/data/{grievances.csv, sanity.csv, README.md}`

**Verify:**
- [ ] ~500 rows; 90–110 per category; each priority ≥ 20% overall.
- [ ] No empty cells; category and priority values are exactly the enum names from §2.
- [ ] No sanity row is a near-copy of a training row.

**Review focus:** label consistency (same kind of complaint → same priority); hard cases present (hostel fee = FINANCE or HOSTEL? pick one rule and apply it everywhere); no real names or phone numbers.

#### Step 7 — Training script

**Goal:** one command turns the CSV into two saved models.

**Build:**
- `requirements.txt` with pinned versions: `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `joblib`, `matplotlib`.
- `train.py`: load CSV → `text = title + " " + description` → `GroupShuffleSplit` 80/20 on `group_id` (`random_state=42`) → two `Pipeline(TfidfVectorizer, LogisticRegression)` as in §4 → fit → save `models/category_model.pkl`, `models/priority_model.pkl` → save the test indices (or a `test.csv`) so `evaluate.py` scores the same split.

**Files:** `ml-service/{requirements.txt, train.py}`

**Verify:**
- [ ] `python train.py` in a fresh venv produces both `.pkl` files.
- [ ] Running it twice gives identical results.
- [ ] No `group_id` appears in both train and test (assert this in the script).

**Review focus:** the vectorizer is fit on train only (inside the pipeline); split is by group; pinned scikit-learn version matches what the server will load.

#### Step 8 — Evaluation

**Goal:** honest numbers on paper.

**Build:**
- `evaluate.py`: load models → score the saved test split and `sanity.csv` → print accuracy + `classification_report` for category and priority → save `docs/confusion_category.png`, `docs/confusion_priority.png`.
- `docs/evaluation.md`: dataset size and balance, how the split works and why it's grouped, both accuracy tables, per-class precision/recall/F1, the two images, 3–5 misclassified examples with a sentence on why, known limitations.

**Files:** `ml-service/evaluate.py`, `ml-service/docs/*`

**Verify:**
- [ ] Category ≥ 0.75 and priority ≥ 0.65 on the test split. If not: add ~30 rows to the weakest class (Step 6), retrain, re-evaluate.
- [ ] Sanity-set numbers reported even if lower.

**Review focus:** numbers in `evaluation.md` match the script output exactly; no tuning against the sanity set.

#### Step 9 — Prediction API

**Goal:** `POST /predict` and `GET /health` exactly as §3 defines them.

**Build:**
- `app.py`: load both models once at startup (fail fast with a clear error if missing).
- Pydantic request model: `title` and `description`, both required, non-empty, max lengths (200 / 5000).
- Predict category + priority; confidences = max of `predict_proba`, rounded to 4 places.
- Keyword rules from §4 in their own module (`rules.py`): compiled regex, case-insensitive, word boundaries, `discriminat\w*` for the prefix. Any hit → `HIGH` + `keyword_override=true`; log the matched keyword (not the complaint text). HARASSMENT with `LOW` → raise to `MEDIUM`.
- `GET /health` → `{"status":"ok"}`.

**Files:** `ml-service/{app.py, rules.py}`

**Verify:**
- [ ] `curl -X POST localhost:8000/predict` with the §3 example returns all five fields with valid enum values.
- [ ] 10 keyword texts → all `HIGH` + `keyword_override=true`. "This is not a **threat**ening issue"-style edge cases behave as the rule says (a hit is a hit).
- [ ] Empty description → 422. p95 latency < 500 ms over 100 local calls.

**Review focus:** response field names match §3 character-for-character (the backend deserialises them); models loaded once, not per request; complaint text not written to logs.

> ✅ **Phase B done when:** `uvicorn app:app` serves `/predict`, `evaluation.md` has real numbers. Tag `phase-b-ml`.

---

### Phase C — Backend core flow (submit → classify → route → track)

#### Step 10 — ML client

**Goal:** the backend can ask for a prediction and never breaks when it can't get one.

**Build:**
- `MlPredictRequest` / `MlPredictResponse` records (snake_case JSON names mapped with `@JsonProperty`).
- `RestClient` bean with connect timeout 2s and read timeout 5s, base URL `app.ml.url`.
- `MlClient.predict(title, description)` returns `Optional<MlPredictResponse>`: any exception, non-200, or a category/priority value that isn't a known enum → log a warning and return `Optional.empty()`. It must never throw.
- `MlClient.warmUp()` — `@Async` `GET /health`, errors swallowed. Call it from `HealthController`.

**Files:** `ml/*.java`, `config/HttpClientConfig.java`, `controller/HealthController.java`

**Verify:**
- [ ] FastAPI running → `predict` returns a populated response.
- [ ] FastAPI stopped → returns empty in well under 5s (connection refused), no exception escapes.
- [ ] `GET /api/health` returns immediately even when ML is down.

**Review focus:** timeouts actually applied to the client; no retry loop that could multiply the delay; unknown enum strings handled.

#### Step 11 — Tracking-ID generator

**Build:** `TrackingIdGenerator.next()`: `GRV-<current year>-<6 random digits>` using `SecureRandom`; check `existsByTrackingId`; retry up to 5 times, then throw.

**Files:** `service/TrackingIdGenerator.java`, `GrievanceRepository` (`existsByTrackingId`, `findByTrackingId`)

**Verify:** generates the right format; a unit test with a mocked repository that reports the first two as taken still returns a third.

**Review focus:** `SecureRandom`, not `Random`; zero-padded to 6 digits; the DB unique constraint remains the real guarantee.

#### Step 12 — Submit grievance

**Goal:** `POST /api/grievances` — the heart of the project.

**Build:**
- `GrievanceCreateRequest` (`@NotBlank @Size(max=200) title`, `@NotBlank @Size(max=5000) description`), `GrievanceCreatedResponse` per §3.
- `GrievanceService.submit(request, currentUser)`:
  1. Call `MlClient.predict` **before** opening the DB transaction (never hold a DB connection across a 5s HTTP call).
  2. ML result present → set category, priority, `ai_confidence = category_confidence`, look up department by category, status `ASSIGNED`. History rows: `NULL→SUBMITTED` (changed_by = user), `SUBMITTED→ASSIGNED` (changed_by = NULL, remark "Auto-routed by AI").
  3. ML result empty → `UNCLASSIFIED`, `MEDIUM`, no department, status `SUBMITTED`. One history row. Notify admin (a log line now; real email in Step 16).
  4. Save grievance + history in one transaction.
- `GrievanceController.create` → `201`, `@PreAuthorize("hasRole('USER')")`.

**Files:** `dto/*`, `service/GrievanceService.java`, `controller/GrievanceController.java`

**Verify:** §9 rows for `POST /api/grievances` and the ML-down drill. Check the DB: correct department, two history rows (or one on fallback).

**Review focus:** ML call outside the transaction; grievance and history saved atomically; the owner comes from the JWT, never from the request body.

#### Step 13 — Read endpoints

**Build:**
- `GET /api/grievances/my` → summaries for the current user, newest first.
- `GET /api/grievances/track/{trackingId}` → public DTO: `trackingId, title, category, priority, status, statusHistory[{status, at}]`. Nothing else. Unknown ID → 404.
- `GET /api/grievances/{id}` → full detail + history with remarks. Allowed for: the owner, an OFFICER whose department matches, any ADMIN. Everyone else → 403.
- Separate DTOs for summary / public / detail — never one DTO with nulls.

**Files:** `dto/*`, `service/GrievanceService.java`, `controller/GrievanceController.java`

**Verify:** §9 rows for `my`, `track`, and the "other user's ID → 403" case. Confirm `/track` works with no token and `/assigned` (added later) won't be swallowed by `/{id}`.

**Review focus:** the public DTO leaks no email, description, remark or internal ID; ownership check lives in the service, not only in the UI; lazy-loading doesn't cause N+1 queries on the list.

> ✅ **Phase C done when:** Postman: submit → tracking ID + AI result + `ASSIGNED` → track shows history; with FastAPI killed it still returns 201 `UNCLASSIFIED`. Tag `phase-c-core-flow`.

---

### Phase D — Workflow, automation, dashboard

#### Step 14 — Status updates

**Goal:** `PUT /api/grievances/{id}/status` enforcing the §2 transition table.

**Build:**
- `StatusTransitionPolicy`: the allowed-moves map + `validate(from, to, actorRole)`. Users can never set `SUBMITTED`, `ASSIGNED` or `ESCALATED` through this endpoint; only ADMIN can set `CLOSED`.
- `GrievanceService.updateStatus(id, request, actor)`: load → officer must belong to the grievance's department (else 403) → validate transition (else 400) → apply → set `resolved_at` on `RESOLVED` → history row with actor + remark → publish a `StatusChangedEvent` (consumed in Step 16).
- `GET /api/grievances/assigned?status=` → grievances in the officer's department.

**Files:** `service/{StatusTransitionPolicy, GrievanceService}.java`, `controller/GrievanceController.java`, `dto/*`

**Verify:** §9 rows for `PUT /{id}/status` and `GET /assigned`. Unit-test `StatusTransitionPolicy` for every row of the §2 table plus three illegal moves.

**Review focus:** the policy is the single place transitions are decided; department check can't be bypassed by an officer with no department; status + history written in one transaction.

#### Step 15 — Admin: assign, officers, departments

**Build:**
- `PUT /api/grievances/{id}/assign` `{officerId?, departmentId?}`: at least one required; if `officerId` is given, that user must be an OFFICER and their department becomes the grievance's department; `SUBMITTED` → `ASSIGNED` with a history row; if already past `SUBMITTED`, status is unchanged but a history row records the reassignment in the remark.
- `POST /api/admin/officers` (create with role OFFICER + department; duplicate email → 409), `GET /api/admin/officers`.
- `GET /api/departments` (any logged-in user), `POST` / `PUT /api/departments/{id}` (ADMIN).

**Files:** `controller/{Admin,Department}Controller.java`, `service/{AdminService, DepartmentService}.java`, `dto/*`

**Verify:** §9 rows for `/assign` and `/admin/officers`. An UNCLASSIFIED grievance assigned to a department shows up in that department's officer queue.

**Review focus:** every route here is admin-guarded on the server; assigning to a non-officer is rejected; department `category` can't be changed to duplicate another's.

#### Step 16 — Email notifications

**Build:**
- `MailService` interface: `send(to, subject, body)`.
- `SmtpMailService` (JavaMail) active when `app.mail.enabled=true`; `LogMailService` (prints to the log) when false — chosen with `@ConditionalOnProperty`.
- `NotificationListener`: handles `StatusChangedEvent` **after commit** (`@TransactionalEventListener`) and `@Async`. Sends to the complainant on every change; to the department email on `ASSIGNED`; to the admin on `ESCALATED` and on ML fallback. Plain text: tracking ID, old → new status, remark, link to the tracking page.
- Every send wrapped in try/catch — a mail failure is logged and never fails or rolls back the status change.

**Files:** `mail/*.java`, `service/NotificationListener.java`

**Verify:**
- [ ] `MAIL_ENABLED=false`: status change prints the email to the console.
- [ ] `MAIL_ENABLED=true` with real SMTP creds locally: one real email arrives.
- [ ] Wrong SMTP password: status update still returns 200.

**Review focus:** sent after commit, off the request thread; no credentials in code; recipient addresses come from the DB, not from request input.

#### Step 17 — Escalation scheduler

**Build:**
- `EscalationJob` with `@Scheduled(fixedDelayString = "${app.escalation.interval-ms:900000}")`.
- For each department: cutoff = now − `sla_hours`; find grievances in that department with status in (`SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`) and `created_at < cutoff`. Plus unrouted ones (no department) older than 72h.
- For each: status `ESCALATED`, `is_escalated=true`, `escalated_at=now`, history row with `changed_by=NULL` and remark "SLA breached", publish the event.

**Files:** `scheduler/EscalationJob.java`, `GrievanceRepository` query methods

**Verify:** the §9 escalation drill — back-date `created_at` in SQL, set the interval to 10s locally, watch it flip. Run again: the same grievance is not escalated twice.

**Review focus:** it's a query over current state (so it catches up after the server sleeps); idempotent; one failing grievance doesn't abort the batch.

#### Step 18 — Admin list and stats

**Build:**
- `GET /api/grievances` (ADMIN): optional `status`, `category`, `priority`, `overdue=true`; `Pageable` (default size 20, newest first); returns a page of summaries. Overdue uses the §2 definition.
- `GET /api/admin/stats`: `byStatus`, `byCategory`, `byPriority` from `GROUP BY` count queries (include zero-count keys so the UI doesn't have to guess); `overdueCount`; `avgResolutionHours` = average of `resolved_at − created_at` over resolved grievances, `null` if none.

**Files:** `controller/{Grievance,Admin}Controller.java`, `service/StatsService.java`, repository queries

**Verify:** §9 row for stats — counts match a manual `SELECT … GROUP BY`. Filters combine correctly; `overdue=true` matches the scheduler's definition.

**Review focus:** aggregation happens in SQL, not by loading every row into Java; page size has an upper cap.

#### Step 19 — Postman collection

**Build:** one collection with folders per §3 group; `{{baseUrl}}`, `{{userToken}}`, `{{officerToken}}`, `{{adminToken}}` variables; login requests save tokens via a test script; every row of the §9 table as a request with a status-code assertion.

**Files:** `docs/postman-collection.json`

**Verify:** "Run collection" against local is fully green from an empty database (after seed).

> ✅ **Phase D done when:** the whole §9 table passes locally. **The backend is feature-complete.** Tag `phase-d-backend-complete`.

---

### Phase E — Frontend

#### Step 20 — Scaffold, API client, auth context

**Build:**
- `npm create vite@latest frontend -- --template react`; add `react-router-dom`, `axios`, `bootstrap`.
- `src/api/client.js`: axios instance with `baseURL = import.meta.env.VITE_API_URL`; request interceptor attaches the token; response interceptor clears auth and redirects to `/login` on 401.
- `src/context/AuthContext.jsx`: `user`, `token`, `login()`, `logout()`; persisted in `localStorage`; on load, call `/users/me` to confirm the token is still good.
- `ProtectedRoute` taking allowed roles; navbar that changes by role; routes: `/login`, `/register`, `/submit`, `/my`, `/grievances/:id`, `/track`, `/track/:trackingId`, `/officer`, `/admin`.
- On app load, fire `GET /api/health` (wakes backend + ML).
- `frontend/.env.example` with `VITE_API_URL=http://localhost:8080/api`.

**Files:** `frontend/**`

**Verify:** `npm run dev` on `:5173`; unknown route shows a 404 page; protected routes redirect to login.

**Review focus:** no API URL hardcoded outside `.env`; token handling in one place.

#### Step 21 — Login and register

**Build:** two forms with client-side validation mirroring the backend rules; show the backend's `message` on error; after login redirect by role (USER → `/my`, OFFICER → `/officer`, ADMIN → `/admin`); disable the button while the request is in flight.

**Verify:** register → lands logged in; wrong password shows the error; refresh keeps the session; logout clears it.

#### Step 22 — Submit grievance

**Build:** title + description form with character counters; on success show a result card: tracking ID (with copy button), predicted category, priority badge (colour by level), department name, and a link to the tracking page. If the category is `UNCLASSIFIED`, say "Received — awaiting manual review" instead of showing a failed-AI look.

**Verify:** real submission shows the AI result; with FastAPI stopped the fallback message appears and nothing looks broken.

#### Step 23 — My grievances, detail, public tracking

**Build:** `/my` table (tracking ID, title, category, priority, status badge, date) with an empty state; `/grievances/:id` detail with a status-history timeline; `/track` search box → `/track/:trackingId` showing the public fields + timeline, usable while logged out, with a clear "not found" message.

**Verify:** the Phase C flow works end-to-end in the browser; a tracking link opened in a private window works.

**Review focus (Steps 21–23):** loading and error states on every request; no token or user data rendered on the public page; no `dangerouslySetInnerHTML` on user-written text.

#### Step 24 — Officer queue

**Build:** `/officer` table of the department's grievances with a status filter; row → detail view with description + history; a status-update form offering **only** the transitions §2 allows from the current status, with an optional remark; list refreshes after an update.

**Verify:** officer moves a case `ASSIGNED → IN_PROGRESS → RESOLVED` entirely from the UI; the complainant's tracking page reflects each change.

#### Step 25 — Admin dashboard

**Build:** stat cards (total, by status, by priority, by category, avg resolution hours, overdue count); overdue list (`?overdue=true`); all-grievances table with filters + pagination; reassign control (department / officer dropdowns) on each row; create-officer form; departments table with editable SLA hours.

**Verify:** the numbers match Postman's `/admin/stats`; reassigning an UNCLASSIFIED grievance moves it into an officer's queue; a USER who types `/admin` is redirected **and** the API call returns 403.

**Review focus (Steps 24–25):** role checks exist on the server for everything the UI hides; no admin data fetched before the role is confirmed.

> ✅ **Phase E done when:** all three roles can do their whole job from the browser with no Postman. Tag `phase-e-frontend`. Add per-module run steps to README "Getting Started".

---

### Phase F — Deploy and document

#### Step 26 — Deploy database, ML service, backend

**Build:**
- Re-check the free-tier limits in Sources first.
- MySQL: create the add-on; run `docs/schema.sql` or let `ddl-auto=update` create tables on first boot.
- ML: Render web service from `ml-service/`; build = `pip install -r requirements.txt && python train.py`; start = `uvicorn app:app --host 0.0.0.0 --port $PORT`.
- Backend: multi-stage `Dockerfile` (Maven build → JRE 17 runtime, heap capped e.g. `-Xmx350m`); Render web service; all §8 env vars; Hikari pool size 3–4.

**Verify:** prod `/health` on both services; prod `register → login → submit` in Postman returns an AI category; the seeded admin can log in.

**Review focus:** no secret in the Dockerfile or repo; prod JWT secret differs from local; admin password is strong (the login is public now).

#### Step 27 — Deploy frontend

**Build:** `vercel.json` rewriting all paths to `/index.html`; Vercel project rooted at `frontend/` with `VITE_API_URL` set; then set the backend's `FRONTEND_URL` to the real Vercel URL and redeploy the backend.

**Verify:** no CORS errors in the browser console; refreshing `/track/GRV-…` doesn't 404; the full flow works on a phone.

#### Step 28 — Prod verification and docs

**Build:** run the Postman collection against prod; create one officer per department; click through all three roles; final numbers in `evaluation.md`; README live links, screenshots, finished "Getting Started"; demo video script + 2-minute recording; tick the README roadmap; tag `mvp-v1`.

> ✅ **MVP done when:** a stranger with only the README link can register, submit, and track a grievance on the live site.

---

## 6. Progress Tracker

Tick a step only after its Verify list passes and the review is addressed.

**Already done**
- [x] Maven project: Spring Boot 3.4.1, JPA, Validation, MySQL driver, Lombok
- [x] Entities `User`, `Department`, `Grievance`, `StatusHistory` + enums

**Phase A — Backend foundation**
- [x] 1. Dependencies and configuration
- [x] 2. Repositories and seed data
- [x] 3. Error handling
- [x] 4. JWT and security configuration
- [x] 5. Auth endpoints

**Phase B — ML service**
- [x] 6. Dataset
- [x] 7. Training script
- [x] 8. Evaluation
- [x] 9. Prediction API

**Phase C — Backend core flow**
- [x] 10. ML client
- [x] 11. Tracking-ID generator
- [x] 12. Submit grievance
- [x] 13. Read endpoints

**Phase D — Workflow, automation, dashboard**
- [x] 14. Status updates
- [x] 15. Admin: assign, officers, departments
- [x] 16. Email notifications
- [x] 17. Escalation scheduler
- [x] 18. Admin list and stats
- [x] 19. Postman collection

**Phase E — Frontend**
- [x] 20. Scaffold, API client, auth context
- [x] 21. Login and register
- [x] 22. Submit grievance
- [x] 23. My grievances, detail, public tracking
- [x] 24. Officer queue
- [x] 25. Admin dashboard

**Phase F — Deploy and document**
- [ ] 26. Deploy database, ML service, backend
- [ ] 27. Deploy frontend
- [ ] 28. Prod verification and docs

---

## 7. Git Workflow

- **One short-lived branch per feature:** `feature/auth`, `feature/ml-predict`, `feature/grievance-crud`, `feature/workflow`, `feature/escalation`, `feature/frontend-user`, `feature/admin-dashboard`, `fix/<what>`. Merge to `main` when that piece works; delete the branch. `main` always builds.
- **Small commits, clear messages:** `feat(auth): add JWT login endpoint`, `fix(ml): handle empty description`, `docs(plan): add API contract`. One logical change per commit — the history is part of what a reviewer reads.
- **Never commit secrets.** Local secrets live in `backend/src/main/resources/application-local.properties` and `ml-service/.env` / `frontend/.env` — all already in `.gitignore`. Commit only `*.example` templates. If a secret leaks: rotate it immediately, then purge the commit.
- **One branch and one review per step** (§5 "How to work a step"). Never mix two steps in one branch.
- **Push after every merged step** — the remote is the only backup.
- Tag each phase checkpoint (`phase-a-auth`, `phase-c-core-flow`, …, `mvp-v1`) so there is always a known-good state to roll back to or demo from.

---

## 8. Deployment Plan (free tiers)

| Service | Option A (recommended) | Option B | Notes |
|---|---|---|---|
| Spring Boot | Render free web service (Docker runtime — needs a `Dockerfile`) | Any Docker-capable free host (verify at deploy time) | Needs ≥512MB RAM (cap heap, e.g. `-Xmx350m`); `server.port=${PORT:8080}`; free services spin down after 15 min idle |
| FastAPI (ML) | Render free web service (same workspace as backend) | Hugging Face Spaces (Docker) | Build command runs `train.py` so `.pkl` files exist at start |
| React | Vercel Hobby (free for personal projects) | Render static site | `npm run build` → `dist/`; set `VITE_API_URL`; add a `vercel.json` rewrite of all paths to `/index.html` or deep links like `/track/GRV-…` 404 on refresh |
| MySQL 8 | Clever Cloud MySQL add-on (free signup credits, no card) | Local MySQL 8 for demos as backup | Verify credits cover the December window; keep `docs/schema.sql` fresh for instant re-provision |

Free tiers change often — re-verify limits at Step 26 before deploying (see Sources).

### Free-tier gotchas to design for now

- **ML cold start vs the 5s timeout.** A sleeping Render service takes far longer than 5s to wake, so the first submission after idle would *always* fall back to `UNCLASSIFIED` — in a demo that looks like the AI is broken. Fix: the frontend calls `GET /api/health` on page load, and that endpoint fires an async `GET {ML_URL}/health`. By the time someone has typed a grievance, both services are awake.
- **Scheduler doesn't run while the backend sleeps.** Fine, because the escalation job is a query ("everything overdue right now"), not a timer per grievance — it catches up on the first run after wake. Keep it that way.
- **DB connection cap.** Small free MySQL plans allow only a handful of connections and Hikari's default pool is 10. Set `spring.datasource.hikari.maximum-pool-size` to 3–4 in prod. (Check the exact cap on the plan page.)
- **Outbound SMTP may be blocked.** Some free hosts block SMTP ports (check Render's current free-tier docs before relying on JavaMail there). Fallback: a transactional-email provider with an HTTPS API, behind the same `MailService` interface — or the console-log mode for the demo.

### Environment variables

**Backend (`application.properties` reads env, local overrides in `application-local.properties`):**

| Var | Example | Required |
|---|---|---|
| `PORT` | `8080` | platform sets |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://host:3306/grievance?sslMode=REQUIRED` | yes |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | — | yes |
| `DB_POOL_SIZE` | Hikari `maximum-pool-size` (default `4`; keep below the MySQL plan's connection cap) | no |
| `JWT_SECRET` | 256-bit random (≥32 chars) | yes |
| `JWT_EXPIRATION_MS` | `86400000` | yes |
| `ML_URL` | `https://<ml-service>` (base URL, no path — the client appends `/predict` and `/health`) | yes |
| `ML_MIN_CONFIDENCE` | category confidence below this goes to manual triage unless a keyword matched (default `0.25`) | no |
| `MAIL_ENABLED` | `true` / `false` (false = log emails to console) | yes |
| `MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD/MAIL_FROM` | any free SMTP provider | if `MAIL_ENABLED=true` |
| `MAIL_SMTP_AUTH` / `MAIL_SMTP_STARTTLS` | `true` for real SMTP providers (default `false` for a local mail catcher) | if `MAIL_ENABLED=true` |
| `FRONTEND_URL` | `https://<vercel-app>.vercel.app` | yes (CORS) |
| `ADMIN_EMAIL/ADMIN_PASSWORD` | seed admin | yes (first boot) |
| `ESCALATION_INTERVAL_MS` | how often the escalation job runs (default `900000` = 15 min) | no |

**ML service:** `PORT`, `MODEL_DIR` (default `./models`), `LOG_LEVEL`. No secrets. It is only ever called server-to-server, so no CORS config is needed.

**Frontend (build-time):** `VITE_API_URL=https://<backend>/api`. Rebuild + redeploy on change.

Deploy order: MySQL → ML service → backend (verify `/predict` wiring + login) → frontend. Tag the working commit `mvp-v1`.

---

## 9. Testing

### Postman (collection built in Step 19, re-run against prod in Step 28)

| Endpoint | Test |
|---|---|
| `POST /api/auth/register` | 201 + token; duplicate email → 409; bad email/short password → 400 |
| `POST /api/auth/login` | 200 + role; wrong password → 401 |
| `GET /api/users/me` | 200 with token; 401 without |
| `POST /api/grievances` | 201 + tracking ID + category/priority + status `ASSIGNED`; unauthenticated → 401; empty description → 400 |
| `GET /api/grievances/my` | only own rows; other user's ID via `/{id}` → 403 |
| `GET /api/grievances/track/{id}` | valid → 200 limited fields; bogus ID → 404; no emails/description leaked |
| `GET /api/grievances/assigned` | OFFICER sees own dept queue only; USER → 403 |
| `PUT /{id}/status` | valid transition → 200 + history row + email; invalid jump (ASSIGNED→RESOLVED) → 400; officer from another department → 403 |
| `PUT /{id}/assign` | ADMIN ok (SUBMITTED→ASSIGNED when unrouted); OFFICER/USER → 403 |
| `POST /api/admin/officers` | ADMIN → 201, new officer can log in; duplicate email → 409; non-admin → 403 |
| `GET /api/admin/stats` | ADMIN 200 with real counts; non-admin → 403 |
| ML-down drill | stop FastAPI → `POST /api/grievances` still 201 with `UNCLASSIFIED` + status `SUBMITTED`, admin notified |
| Escalation drill | back-date `created_at` past SLA → after scheduler run: status `ESCALATED`, `is_escalated=1`, history row with `changed_by=NULL` |

Save as `docs/postman-collection.json` with `{{baseUrl}}` + `{{token}}` variables.

### ML accuracy evaluation

- Run `evaluate.py` on the grouped 20% test split **and** the sanity set; record accuracy, per-class precision/recall/F1, both confusion matrices in `ml-service/docs/evaluation.md`.
- Bars: category ≥ 0.75, priority ≥ 0.65. Below bar → inspect weakest class in confusion matrix, add ~30 targeted rows, retrain.
- Keyword spot-check: 10 texts containing `ragging / harassment / unsafe / threat` must all return HIGH with `keyword_override=true`.
- Latency check: p95 `/predict` < 500ms locally.

---

## 10. Risks and Fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| Scope overrun | High | Cut in this order: (1) admin stats polish → raw counts only; (2) HTML emails → plain text; (3) department CRUD UI + reassign UI → backend-only + Postman demo; (4) scheduler → manual "escalate" button. **Never cut:** submit → classify → track. |
| Dataset writing drags on | High | Ship with ~60 rows/category and honest numbers; grow it post-MVP. Do not skip the grouped split to make numbers look better. |
| ML accuracy too low | Medium | Ship keyword + category-default rules as the classifier; keep model behind a flag; report honest numbers in `evaluation.md`. |
| ML service undeployable | Medium | Backend fallback becomes the path: everything `UNCLASSIFIED` → admin triage; still a complete grievance system for the resume. |
| Free-tier MySQL limits/sleeps | Medium | Small Hikari pool (§8); keep `docs/schema.sql` fresh for instant re-provision; local MySQL for demos as backup. |
| Render cold starts | High | `/api/health` warm-up chain (§8); note it in demo ("first request wakes the server"); open the site 2 min before any review. |
| JWT/CORS bugs eating hours | Medium | Steps 4–5 exist exactly for this; use the Step 4 snippet's ordering (CORS → JWT filter → auth rules) and test with Postman before React. |
| Contract drift between layers | Medium | §3 is the single source of truth — if an endpoint changes while building, update §3 and the Postman collection in the same commit, so the frontend steps start from accurate docs. |
| Email blocked (SMTP ports / spam limits) | Medium | `MAIL_ENABLED=false` logs emails to console; demo shows logs + one real email sent locally. |
| Can't explain AI-written code in review | High | One step per session, read every line before running it, and write 3–4 lines in the commit body on *why* it's built that way. If a step's code can't be explained, it isn't done. |
| AI assistant drifts from the plan | Medium | Give it one step + the referenced sections only; the Verify list and the §3 contract are the acceptance test, not "it compiles". Reject extra features, extra dependencies and unrequested refactors. |

---

## 11. Post-MVP Roadmap (before December 2026 submission)

| Priority | Feature | Notes |
|---|---|---|
| 1 | Unit + integration tests | Transition table, tracking-ID generator, ML fallback, auth guards — highest review value per hour |
| 2 | Feedback / rating | Build `feedback` table (§2), `POST /api/grievances/{id}/feedback` (owner, after RESOLVED), show on admin dashboard |
| 3 | File attachments | Upload (5MB cap, images/PDF), type/size validation, object storage or `uploads/`; link to grievance |
| 4 | Anonymous submission | Optional-auth submit flow; tracking ID + PIN instead of login for tracking |
| 5 | Advanced analytics | Trend charts (volume over time), SLA compliance %, CSV export |
| 6 | Polish for review | Auto-generated API docs, CI pipeline, grow dataset toward ~150 rows/category |
| 7 | Docs | ER diagram, sequence diagrams, final report in `docs/`; update README roadmap checkboxes |

**Resume line (after MVP):** "Built and deployed an AI grievance system (Spring Boot + FastAPI + React, MySQL): NLP auto-categorisation into 5 classes, priority prediction, SLA escalation, JWT role-based access — live at <frontend-URL>."

---

## Sources

Deployment picks in §8 trace to these official pages (inspected during planning; re-verify at Step 26):

- Render free instances (750 hrs/mo, spin down after 15 min idle): <https://render.com/docs/free>
- Vercel Hobby plan (free for personal projects): <https://vercel.com/docs/plans/hobby>
- Hugging Face Spaces (Docker support): <https://huggingface.co/docs/hub/en/spaces>
- Clever Cloud pricing (free signup credits; MySQL add-on): <https://www.clever.cloud/pricing/>

The §8 gotchas about SMTP port blocking and DB connection caps are not yet checked against these pages — confirm both at Step 26.

All other stack names (Java 17, Spring Boot 3.x, scikit-learn, FastAPI, React, Vite, Bootstrap, MySQL 8, JavaMail, Maven, Postman) restate the fixed stack from the project brief and README, except Vite, which replaces the deprecated Create React App as the React build tool.
