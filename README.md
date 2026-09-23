# LabSync

LabSync is a minimal laboratory management system and a practical workload for learning DevOps and DevSecOps delivery practices.

## Current stage

The Phase 1 application currently provides:

- A modular FastAPI backend and PostgreSQL database
- SQLAlchemy models and Alembic migrations
- Staff users with `ADMIN`, `RECEPTIONIST`, and `TECHNICIAN` roles
- Argon2 password hashing and JWT authentication
- Login, logout, and current-user endpoints
- Reusable backend role guards
- A responsive Next.js staff login and authenticated role-aware dashboard
- Backend authentication tests
- A public landing page with role-aware dashboard access
- A reusable authenticated dashboard shell
- Patient registration, search, filtering, details, and editing
- Backend role enforcement for administrators and receptionists
- A dashboard summary with the live patient count
- A shared shadcn/ui component system themed for LabSync
- Laboratory Test Catalog search, filtering, details, creation, editing, and activation
- A scoped three-step test configuration flow
- Appointment search, filtering, creation, and details
- Existing-patient selection plus an embedded create-patient dialog
- One independently tracked `AppointmentTest` record per ordered test
- Live dashboard counts for today's appointments and test processing status
- Sample collection and independently tracked test processing
- Technician result entry with units, reference ranges, and notes
- Result authorization and recheck handling
- On-screen viewing of authorized results
- Reports search, progress tracking, and appointment-level report details
- Administrator-only team management with role assignment and account activation controls
- One-time temporary passwords with mandatory first-login password replacement

PDF reports remain deferred. Phase 2 now includes hardened containers, CI,
security scanning, GHCR publishing, automated deployment to Google Compute
Engine, health-checked rollback, OS Login and IAP access, Secret Manager,
centralized logging and alerts, and validated PostgreSQL backup and recovery.

Production procedures are documented in the
[operations runbooks](docs/operations/README.md).

The complete application, DevOps, and DevSecOps journey is explained in the
[LabSync learning guide and project report](docs/LabSync-DevOps-Learning-Guide.md).
The exact stages, commands, execution locations, checks, and operational meaning
are captured in the
[LabSync end-to-end workflow playbook](docs/LabSync-End-to-End-Workflow-Playbook.md).

## Project structure

```text
clinical-lab-system/
|-- backend/
|   |-- alembic/
|   |-- app/
|   |   |-- core/
|   |   |-- db/
|   |   |-- dependencies/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- schemas/
|   |   |-- scripts/
|   |   `-- services/
|   |-- tests/
|   |-- .env.example
|   |-- alembic.ini
|   `-- requirements.txt
`-- frontend/
    |-- app/
    |-- components/
    |-- public/
    |-- services/
    |-- types/
    `-- package.json
```

## Backend setup with Git Bash

PostgreSQL must be installed and running. From `backend/`:

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
cp -n .env.example .env
```

Generate a JWT signing secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the output into `LABSYNC_JWT_SECRET_KEY` in `backend/.env`. Also update `LABSYNC_DATABASE_URL` with your local PostgreSQL credentials. Never commit `.env`.

Apply database migrations:

```bash
python -m alembic upgrade head
```

Create the initial administrator. The command securely prompts for a password and requires at least 12 characters:

```bash
python -m app.scripts.create_admin --name "Your Name" --email "admin@example.com"
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Useful endpoints:

- API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Login: `POST /auth/login`
- Current user: `GET /auth/me`
- Logout: `POST /auth/logout`
- Patient list/search: `GET /patients`
- Register patient: `POST /patients`
- Patient details: `GET /patients/{id}`
- Update patient: `PUT /patients/{id}`
- Dashboard metrics: `GET /dashboard/summary`
- Test catalog: `GET /tests`
- Create test: `POST /tests`
- Test details: `GET /tests/{id}`
- Update test: `PUT /tests/{id}`
- Activate/deactivate test: `PATCH /tests/{id}/status`
- Appointment list/search: `GET /appointments`
- Create appointment: `POST /appointments`
- Appointment details: `GET /appointments/{id}`
- Mark sample collected: `PATCH /appointment-tests/{id}/status`
- Enter test result: `POST /appointment-tests/{id}/result`
- Authorize or flag a result: `POST /appointment-tests/{id}/authorize`
- Report work queue: `GET /reports`
- Report details: `GET /reports/{appointment_id}`
- Team list/search: `GET /users`
- Create team member: `POST /users`
- Activate/deactivate team member: `PATCH /users/{id}/status`
- Replace temporary password: `POST /auth/change-password`

Run backend tests:

```bash
python -m pytest
```

## Frontend setup with Git Bash

From `frontend/`:

```bash
npm install
cp -n .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. This is the public entry point. Staff login is at `/login`. The authenticated workspace includes:

- Dashboard: `/dashboard`
- Patients: `/dashboard/patients`
- Test Catalog: `/dashboard/tests`
- Appointments: `/dashboard/appointments`
- Laboratory Reports: `/dashboard/reports`
- Team Settings (administrators only): `/dashboard/settings`

The default frontend configuration connects to the backend at `http://127.0.0.1:8000`.

Run frontend checks:

```bash
npm run lint
npm run build
```

## Supported Phase 1 workflow

1. An administrator creates active laboratory tests.
2. A receptionist or administrator registers a patient and creates an appointment.
3. A technician marks each collected sample as `IN_PROGRESS` from appointment details.
4. The appointment appears in Reports and the technician enters test values.
5. Saving a value changes that ordered test to `COMPLETED`.
6. A technician authorizes the result or flags it as `RECHECK_REQUIRED`.
7. Authorized results are available through the on-screen result viewer.

## Adding a team member locally

1. Sign in as an administrator and open **Settings**.
2. Select **Add New User**, enter the staff member's details, and assign a role.
3. Copy the generated temporary password from the one-time confirmation dialog.
4. Share it directly with the staff member during local development.
5. At first login, the staff member must replace it with a password of at least 12 characters before accessing LabSync.

No email is sent in Phase 1. Email-based account activation can be added after deployment infrastructure and an email provider are selected.

## Phase 1 release-readiness checks

Run these checks before creating the Phase 1 Git tag:

```bash
cd backend
source .venv/Scripts/activate
python -m pytest -q
python -m alembic check
python -m pip check

cd ../frontend
npm run lint
npm run build
npm audit --omit=dev
```

The automated acceptance suite includes the complete Admin → Receptionist → Technician workflow, temporary-password replacement, role restrictions, patient registration, appointment creation, sample collection, result entry, authorization, result viewing, and dashboard access.

Before tagging the release, manually verify in a browser:

- Desktop and mobile navigation
- Landing page, login, and logout
- One-time temporary-password copy dialog
- First-login password replacement
- Empty, loading, validation, and API-error states
- Dashboard metrics after completing a laboratory result
- Visual consistency of patients, tests, appointments, reports, and settings

Do not commit `backend/.env`, `frontend/.env.local`, credentials, generated build output, virtual environments, or dependency directories.

## DevOps Stage 1: local containers

This stage containerizes the existing Phase 1 application only. It does not add CI/CD, cloud infrastructure, Kubernetes, Terraform, monitoring, or automated deployment.

Prerequisites:

- Docker Desktop with Docker Compose v2
- Ports `3000` and `8000` available
- Port `5433` available for optional host access to the containerized PostgreSQL instance

Create the Compose environment from the repository root:

```bash
cp .env.docker.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Replace `LABSYNC_JWT_SECRET_KEY` in the root `.env` with the generated value. Replace both occurrences of the example database password with the same URL-safe password. The root `.env` is ignored by Git.

Build and start the stack:

```bash
docker compose up --build -d
docker compose ps
```

The backend waits for PostgreSQL to become healthy, applies Alembic migrations, and then starts FastAPI. The frontend waits for the backend health check before starting.

Create the first administrator:

```bash
docker compose exec backend python -m app.scripts.create_admin --name "Your Name" --email "admin@example.com"
```

Open:

- LabSync: `http://localhost:3000`
- FastAPI documentation: `http://localhost:8000/docs`
- Health endpoint: `http://localhost:8000/health`
- PostgreSQL from the host: `localhost:5433`

Inspect logs and health:

```bash
docker compose logs -f backend frontend
curl http://localhost:8000/health
```

Stop containers without deleting database data:

```bash
docker compose down
```

Delete the local container database only when you intentionally want a clean reset:

```bash
docker compose down --volumes
```

`NEXT_PUBLIC_API_URL` is embedded during the frontend image build. If it changes, rebuild the frontend image with `docker compose build frontend` before restarting it.

## DevOps Stage 2: verify published release images

The release Compose file runs the versioned images published to GitHub Container Registry and contains no local build directives. It uses the same `labsync` Compose project and `postgres_data` volume as the development stack, so switching configurations preserves the existing PostgreSQL data.

Authenticate to GHCR and create the ignored release environment file:

```bash
docker login ghcr.io -u Isumans
cp .env.release.example .env.release
```

When Docker requests a password, use a GitHub classic personal access token with `read:packages`. In `.env.release`, replace the placeholders with the same database password and JWT secret currently used by the existing stack. PostgreSQL does not change the stored user's password when an initialized volume is restarted with a different environment value.

Pull and start the published release without building local source:

```bash
docker compose -f compose.release.yaml --env-file .env.release pull
docker compose -f compose.release.yaml --env-file .env.release up -d
docker compose -f compose.release.yaml --env-file .env.release ps
```

Verify both applications:

```bash
curl http://localhost:8000/health
curl --fail --output /dev/null http://localhost:3000
```

Confirm that the running containers use GHCR images:

```bash
docker compose -f compose.release.yaml --env-file .env.release images
```

Stop the release stack without deleting PostgreSQL data:

```bash
docker compose -f compose.release.yaml --env-file .env.release down
```

Never add `--volumes` unless the local database is intentionally being erased.
