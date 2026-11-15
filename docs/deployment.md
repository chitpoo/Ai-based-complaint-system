# Deployment checklist

Follow the steps by hand, in this order: **MySQL → ML service → backend → frontend → point the backend at the frontend**. Each later step needs a value produced by an earlier one.

> **Check the free tiers yourself before you start.** Free plans, credits, sleep rules, connection caps and SMTP rules change often. Nothing in this file is a promise about what a provider offers today. Open each provider's own pricing and docs pages (links in `plan.md` → Sources) on the day you deploy and confirm that a free option still exists and what its limits are. If a screen looks different from what is described here, trust the provider's documentation.

## 0. Before you start

- [ ] `cd backend && mvn -q clean package` passes locally.
- [ ] `cd ml-service && python train.py && python evaluate.py` runs and the numbers match `ml-service/docs/evaluation.md`.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] Everything is committed and pushed to GitHub; `git status` is clean. `application-local.properties`, `.env` files and `*.pkl` files are **not** in the repository (`git ls-files | grep -E "application-local|\.env$|\.pkl$"` prints nothing).
- [ ] Generate fresh production secrets and keep them in a password manager, not in the repo:
  - `JWT_SECRET`: `openssl rand -base64 48` (must differ from your local one).
  - `ADMIN_PASSWORD`: long and random. The login page is public once deployed.

## 1. MySQL (Clever Cloud)

- [ ] Re-check the current free offer and its limits (storage, **maximum connections**, how long credits last) on Clever Cloud's own pages.
- [ ] Create a MySQL 8 add-on. Choose the smallest plan that is free for you.
- [ ] From the add-on's dashboard note: host, port, database name, user, password.
- [ ] Build the JDBC URL from them (the dashboard's `mysql://...` URI is not a JDBC URL):

  ```
  jdbc:mysql://<host>:<port>/<database>?characterEncoding=UTF-8&sslMode=REQUIRED
  ```

  If the backend later fails to connect with an SSL error, read the add-on's connection docs and adjust `sslMode`.
- [ ] Note the plan's maximum connection count. `DB_POOL_SIZE` (step 3) must stay below it, with room left for one manual client session.
- [ ] Tables: nothing to do. The backend creates them on first boot (`ddl-auto=update`) and seeds the five departments and the admin. To create them by hand instead, run `docs/schema.sql` against the database.

## 2. ML service (Render web service)

- [ ] Re-check Render's current free web service terms (sleep after idle, build minutes, RAM).
- [ ] New → Web Service → connect the GitHub repository.

  | Setting | Value |
  |---|---|
  | Root directory | `ml-service` |
  | Runtime | Python |
  | Build command | `pip install -r requirements.txt && python train.py` |
  | Start command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
  | Health check path | `/health` |

- [ ] Environment variables:

  | Variable | Value |
  |---|---|
  | `PYTHON_VERSION` | `3.13.0` (the pinned packages were installed and tested on this version; confirm in Render's docs that this is still how the Python version is chosen) |
  | `LOG_LEVEL` | `INFO` |
  | `MODEL_DIR` | leave unset (default `./models`) |
  | `PORT` | do not set; Render provides it |

- [ ] The health check must point at the ML service's own `/health`, as in the table above. It loads no model and touches nothing else.
- [ ] Deploy. The build log must show `train.py` printing `saved models and test_split.csv`. If the models are missing the service stops at startup with `Model file not found`.
- [ ] Verify, replacing the host with yours:

  ```bash
  curl https://<ml-service>.onrender.com/health
  # {"status":"ok"}
  curl -X POST https://<ml-service>.onrender.com/predict -H 'Content-Type: application/json' \
    -d '{"title":"Water leakage in hostel block B","description":"Bathroom pipe leaking since 3 days..."}'
  # five fields: category, category_confidence, priority, priority_confidence, keyword_override
  ```
- [ ] Note the base URL (no trailing slash, no path). It becomes `ML_URL`.

## 3. Backend (Render web service, Docker)

- [ ] New → Web Service → same repository.

  | Setting | Value |
  |---|---|
  | Root directory | `backend` |
  | Runtime | Docker |
  | Dockerfile path | `./Dockerfile` |
  | Build / start command | none; the Dockerfile does both (`mvn clean package -DskipTests`, then `java -Xmx350m -jar app.jar`) |
  | Health check path | `/api/health` |

- [ ] Environment variables (all from `plan.md` §8; type secrets into Render's dashboard, never into a file in the repo):

  | Variable | Value |
  |---|---|
  | `SPRING_DATASOURCE_URL` | the JDBC URL from step 1 |
  | `SPRING_DATASOURCE_USERNAME` | from step 1 |
  | `SPRING_DATASOURCE_PASSWORD` | from step 1 |
  | `DB_POOL_SIZE` | `3` or `4`, below the plan's connection cap (default `4`) |
  | `JWT_SECRET` | the new random value from step 0 |
  | `JWT_EXPIRATION_MS` | `86400000` |
  | `ML_URL` | `https://<ml-service>.onrender.com` (base URL only) |
  | `FRONTEND_URL` | `http://localhost:5173` for now; replaced in step 5 |
  | `ADMIN_EMAIL` | the admin's login email |
  | `ADMIN_PASSWORD` | the strong password from step 0 |
  | `MAIL_ENABLED` | `false` for the first deploy (emails are written to the log) |
  | `ESCALATION_INTERVAL_MS` | optional, default `900000` |
  | `PORT` | do not set; Render provides it and the app reads it |

  Only if you turn mail on (`MAIL_ENABLED=true`): `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SMTP_AUTH=true`, `MAIL_SMTP_STARTTLS=true`. First check in Render's docs whether outbound SMTP is allowed on your plan.

- [ ] Note on the health check: every call to `/api/health` also sends a warm-up request to the ML service's `/health`. Check in Render's docs how often the platform polls the health check path, and whether that polling keeps either service awake or uses up free hours. If it is a problem, leave the backend's health check path empty.
- [ ] Optional: `ML_MIN_CONFIDENCE` (default `0.25`). A category prediction below it is saved as `UNCLASSIFIED` for the admin to route. See `ml-service/docs/evaluation.md` for how many complaints that affects before changing it.
- [ ] Deploy and watch the log for `Started GrievanceManagementApplication`. Out-of-memory restarts mean the instance has less RAM than the heap cap assumes; check the plan's RAM.
- [ ] Verify:

  ```bash
  curl https://<backend>.onrender.com/api/health
  ```

  Then in Postman (`docs/postman-collection.json`, `baseUrl` = `https://<backend>.onrender.com/api`): register → login → submit a grievance. The response must have a real category (not `UNCLASSIFIED`), a department name and status `ASSIGNED`. If it is `UNCLASSIFIED`, the ML service was asleep or `ML_URL` is wrong: call `/api/health` (it wakes the ML service), wait a minute and submit again.
- [ ] Log in as the seeded admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 4. Frontend (Vercel)

- [ ] Re-check that Vercel's free plan still covers a personal project like this.
- [ ] New Project → import the repository.

  | Setting | Value |
  |---|---|
  | Root directory | `frontend` |
  | Framework preset | Vite |
  | Build command | `npm run build` |
  | Output directory | `dist` |

- [ ] Environment variable: `VITE_API_URL` = `https://<backend>.onrender.com/api`. It is read at build time, so any change needs a redeploy.
- [ ] Deploy and note the site URL, e.g. `https://<project>.vercel.app`.
- [ ] `frontend/vercel.json` is already in the repo. It rewrites every path to `/index.html` so that a deep link survives a refresh.

## 5. Point the backend at the frontend

- [ ] In Render, set the backend's `FRONTEND_URL` to the exact Vercel origin: `https://<project>.vercel.app` (scheme included, no trailing slash, no path). CORS allows only this origin.
- [ ] Redeploy the backend.

## 6. Final checks

- [ ] Open the Vercel URL. The browser console shows no CORS errors.
- [ ] Register, log in, submit a grievance: it gets a category and a tracking ID.
- [ ] Open `/track/<tracking id>` and refresh the page: no 404.
- [ ] The "Submitted" time shown is your current local time. The backend stores and returns every timestamp in UTC whatever the host's or the database's time zone, and the browser converts it; there is nothing to configure.
- [ ] Log in as admin, create one officer per department, and move a grievance through its statuses.
- [ ] Repeat the flow on a phone.
- [ ] Leave the site idle past the host's sleep time, then reload: the page load wakes the backend, which wakes the ML service; a grievance submitted a minute later is still classified.
- [ ] Tag the commit: `git tag mvp-v1 && git push --tags`.

## If something goes wrong

| Symptom | Likely cause |
|---|---|
| Backend build fails on Render | Root directory is not `backend`, or the runtime is not Docker. |
| Backend starts, then exits with a placeholder error for `JWT_SECRET` or `ADMIN_PASSWORD` | That variable is not set. Neither has a default. |
| `Too many connections` in the backend log | `DB_POOL_SIZE` is at or above the plan's cap, or old instances are still connected. Lower it. |
| Every grievance is `UNCLASSIFIED` | `ML_URL` has a path or trailing slash, or the ML service failed its build. Check `/health` on the ML service. |
| Some ordinary grievances are `UNCLASSIFIED` | Their category confidence was below `ML_MIN_CONFIDENCE`. This is the designed fallback; the backend log line says so. |
| CORS error in the browser | `FRONTEND_URL` does not match the site's origin exactly, or the backend was not redeployed after changing it. |
| API calls return the HTML page and login silently fails | `VITE_API_URL` was not set before the build, so requests go to the Vercel site itself and the rewrite answers with `index.html`. Set it and redeploy. |
| ML build fails while installing packages | The Python version on the host does not match `PYTHON_VERSION=3.13.0`. |
