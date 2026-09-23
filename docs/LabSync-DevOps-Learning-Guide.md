# LabSync: Application, DevOps, and DevSecOps Learning Guide

**Project:** LabSync Clinical Laboratory Management System  
**Release documented:** v0.3.4  
**Cloud platform:** Google Cloud Platform (GCP)  
**Purpose:** Combined technical project report, operational handbook, and beginner-friendly learning guide  
**Prepared:** August 2026

**Practical companion:** [LabSync End-to-End Workflow Playbook](LabSync-End-to-End-Workflow-Playbook.md)

> This guide documents the system that was actually built. Passwords, tokens, JWT signing values, database credentials, and private authentication material are intentionally excluded.

---

## 1. Executive summary

LabSync began as a minimal but realistic laboratory management application. Its first purpose was to support essential clinical laboratory work: staff authentication, patient registration, laboratory test configuration, appointment scheduling, sample processing, result entry, result authorization, and dashboard reporting. Its second purpose was to become a stable workload for learning modern DevOps and DevSecOps practices.

The completed project now demonstrates the full path from source code to an operated cloud service:

1. A modular FastAPI, SQLAlchemy, Alembic, and PostgreSQL backend.
2. A Next.js, TypeScript, Tailwind CSS, and shadcn/ui frontend.
3. Automated backend, frontend, and container validation in GitHub Actions.
4. Hardened, non-root production containers coordinated with Docker Compose.
5. Versioned container images published to GitHub Container Registry (GHCR).
6. Keyless GitHub-to-GCP authentication using Workload Identity Federation.
7. Automated deployment to a private Google Compute Engine virtual machine.
8. Secrets retrieved from Google Secret Manager only when a deployment needs them.
9. Health checks and automatic rollback when a release cannot start safely.
10. Centralized logs, monitoring, alerts, scheduled backups, retention, and a tested restore procedure.
11. Operational and security runbooks that make the system maintainable.

Release `v0.3.4` is an internship- and portfolio-ready milestone. It is not positioned as a complete commercial laboratory product. PDF reporting, billing, inventory, public production access, a managed database, and multi-environment promotion remain intentionally outside the current scope.

## 2. What was learned

The project connects concepts that are often learned separately:

- **Application architecture:** separating models, schemas, routes, services, and dependencies.
- **Database lifecycle:** representing relationships, applying versioned migrations, and preserving state.
- **Authentication and authorization:** password hashing, JWT validation, account state, and server-side role enforcement.
- **Containers:** packaging applications predictably and coordinating dependent services.
- **Continuous integration:** turning manual checks into repeatable quality gates.
- **Supply-chain security:** scanning dependencies and images before release.
- **Artifact management:** treating container images as immutable, versioned release artifacts.
- **Continuous delivery:** deploying the same artifact that passed validation.
- **Cloud identity:** replacing long-lived service-account keys with short-lived federated credentials.
- **Secret management:** separating configuration from credentials and rotating sensitive values safely.
- **Observability:** checking health, collecting logs, monitoring resources, and alerting on failure.
- **Reliability:** rolling back failed releases and proving backups can be restored.
- **Operations:** documenting routine actions and incident procedures.

The most important lesson is that DevOps is not a single tool. It is a system of feedback loops that helps a team change software safely.

## 3. Project scope and boundaries

### 3.1 Implemented application scope

LabSync supports three staff roles:

- **Administrator:** manages users and laboratory tests, and can access operational records.
- **Receptionist:** manages patients and appointments.
- **Technician:** processes ordered tests, enters results, and authorizes or flags results.

The application includes:

- Public landing and staff login pages.
- JWT-authenticated staff sessions.
- Mandatory replacement of administrator-generated temporary passwords.
- Patient registration, search, details, and editing.
- Laboratory test creation, editing, activation, and deactivation.
- Appointment creation with one patient and one or more tests.
- Independent processing status for every test ordered in an appointment.
- Sample collection, result entry, completion, authorization, and recheck handling.
- On-screen authorized result viewing.
- Dashboard metrics for patients, appointments, pending tests, and completed tests.
- Administrator-only team management.

### 3.2 Deliberately deferred scope

The following were deliberately deferred to protect the minimum viable product:

- PDF result reports.
- Patient and doctor portals.
- Billing and finance workflows.
- Inventory and supplier management.
- SMS and email delivery.
- External laboratory integrations.
- Kubernetes, Terraform, and multi-cloud orchestration.
- A public domain and HTTPS endpoint.
- Managed PostgreSQL and separate staging/production environments.

This boundary is good engineering practice. A smaller stable workload makes infrastructure lessons easier to understand and failures easier to diagnose.

## 4. System architecture

### 4.1 Application architecture

```text
Browser
   |
   | HTTP through a local IAP tunnel
   v
Next.js frontend (port 3000, VM loopback only)
   |
   | /api/* server-side rewrite
   v
FastAPI backend (Docker network only, port 8000)
   |
   | SQLAlchemy + psycopg
   v
PostgreSQL (Docker network only, persistent volume)
```

The frontend uses a same-origin `/api` path. Next.js rewrites this path to `http://backend:8000` inside the Docker network. This avoids exposing the backend directly and avoids embedding a private container hostname in browser JavaScript.

### 4.2 Delivery and operations architecture

```text
Developer -> GitHub repository -> GitHub Actions
                                      |
                       test, build, scan, publish
                                      |
                                      v
                            GHCR versioned images
                                      |
                       Workload Identity Federation
                                      |
                                      v
                         GCP Compute Engine VM
                         |        |          |
                    Secret     Ops Agent   systemd
                    Manager    logs/metrics timers
                         |                   |
                         v                   v
                  runtime secrets     health + backups
                                             |
                                             v
                                  private Cloud Storage bucket
```

### 4.3 Important deployed resources

- GCP project: `labsync-devops`.
- Compute Engine VM: `labsync-vm`.
- Zone: `asia-south1-a`.
- GHCR images: `ghcr.io/isumans/labsync-backend` and `ghcr.io/isumans/labsync-frontend`.
- Secret Manager entries: PostgreSQL password and JWT signing secret.
- Private Cloud Storage bucket for PostgreSQL backups.
- Google Cloud Ops Agent for logging and monitoring.
- IAP and OS Login for administrative access.

## 5. Phase 1: building the application

### 5.1 Modular FastAPI backend

The backend avoids placing all behavior in `main.py`. Its main responsibilities are separated as follows:

- `core/`: environment-based application configuration.
- `db/`: SQLAlchemy base, session creation, and request-scoped database dependencies.
- `models/`: database tables and relationships.
- `schemas/`: Pydantic request and response validation.
- `routes/`: HTTP endpoints and status codes.
- `services/`: authentication and business rules.
- `dependencies/`: reusable authentication and role guards.
- `alembic/`: version-controlled database migrations.
- `tests/`: automated backend and acceptance tests.

`create_app()` constructs FastAPI, adds CORS configuration, and registers each router. This application-factory style makes the entry point easy to understand and keeps feature logic in dedicated modules.

### 5.2 Configuration with environment variables

Pydantic Settings loads values with the `LABSYNC_` prefix. Important values include the database URL, JWT signing key, token lifetime, CORS origins, application version, and debug flag.

This follows the principle that deploy-specific configuration should not be hard-coded into application source. Example environment files document required names, while real `.env` files remain ignored by Git.

### 5.3 Relational data model

The core tables are:

| Entity | Purpose | Important relationships and constraints |
|---|---|---|
| `users` | Staff identity and authorization | Unique indexed email; role; active flag; forced-password-change flag |
| `patients` | Patient demographics and contact data | Indexed name, birth date, gender, phone, and email |
| `laboratory_tests` | Test catalog | Unique indexed test code; price; sample type; active/inactive status |
| `appointments` | A scheduled patient visit | Foreign key to patient; date, time, and appointment status |
| `appointment_tests` | One ordered test within an appointment | Foreign keys to appointment and test; unique appointment/test pair; result and authorization fields |

`AppointmentTest` solves an important modeling problem: an appointment can contain multiple tests, and every test needs an independent lifecycle and result. A direct many-to-many table would not be enough because the relationship itself carries status, value, unit, reference range, notes, completion time, authorization time, and authorizing user.

### 5.4 Database migrations with Alembic

Alembic migrations create and evolve the database deterministically. Six migrations establish users, patients, tests, appointments, result authorization, and team management.

The backend container runs `python -m alembic upgrade head` before starting Uvicorn. This ensures the release expects the correct schema. Migrations are also applied during Backend CI against a temporary PostgreSQL service, which catches migration errors before deployment.

The key lesson is that a database schema is versioned application code. Editing a production database manually makes environments diverge and makes rollback or recreation difficult.

### 5.5 Authentication and password security

Passwords are never stored as plaintext. `pwdlib` uses its recommended password hashing algorithm, which currently provides Argon2-based hashing. Verification compares a submitted password against the stored hash.

After successful login, the backend creates a time-limited JWT containing:

- `sub`: the authenticated user ID.
- `exp`: token expiration time.
- `type`: `access`.

Protected endpoints use an HTTP Bearer token. The backend decodes the token with the configured signing secret, validates its type and expiration, loads the user, and rejects inactive accounts.

JWT logout in this implementation is primarily client-side token removal. Since access tokens are stateless and expire after 30 minutes, the backend does not maintain a token revocation list. A future high-security version could use short-lived access tokens, refresh-token rotation, and server-side revocation.

### 5.6 Role-based access control

Authorization is enforced in the backend, not only by hiding frontend buttons. The reusable `require_roles()` dependency returns HTTP 403 when a valid user lacks the required role.

Examples:

- Patient management: Administrator and Receptionist.
- Test catalog changes: Administrator only.
- Appointment creation: Administrator and Receptionist.
- Laboratory processing: Administrator and Technician.
- Team management: Administrator only.
- Dashboard and read-only workflow views: authenticated staff, as appropriate.

This distinction matters: authentication answers “Who are you?” Authorization answers “What are you allowed to do?”

### 5.7 Temporary-password onboarding

An administrator can create a team member with a role. The system generates a temporary password and displays it once. The stored database value is only its hash, and `must_change_password` prevents access to normal protected functions until the staff member replaces it with a password of at least 12 characters.

No automated email is sent in the current phase. The temporary value must be shared through a trusted channel. This was a deliberate Phase 1 compromise that avoids pretending a mail-delivery system exists.

### 5.8 Laboratory workflow state machine

The database supports these ordered-test states:

```text
PENDING
   -> SAMPLE_COLLECTED / IN_PROGRESS
   -> COMPLETED
   -> AUTHORIZED

COMPLETED -> RECHECK_REQUIRED -> IN_PROGRESS -> COMPLETED
```

The user-facing meaning developed during the project is:

- `PENDING`: the patient/sample has not entered processing.
- `IN_PROGRESS`: the patient has arrived and the sample is ready for laboratory work.
- `COMPLETED`: a technician entered and saved the measured result.
- `AUTHORIZED`: a technician reviewed and approved the result.
- `RECHECK_REQUIRED`: the reviewer rejected the current result for another measurement.
- `CANCELLED`: processing was intentionally stopped.

The service layer validates transitions so users cannot enter results for an inappropriate state or authorize an unfinished result.

### 5.9 Frontend architecture and UI system

The frontend uses the Next.js App Router, TypeScript, Tailwind CSS, Inter variable font, Lucide icons, and reusable shadcn/ui-style components. Major areas are separated into:

- `app/`: routes, layouts, and pages.
- `components/`: reusable feature and UI components.
- `services/`: HTTP API functions.
- `types/`: TypeScript domain types.
- `lib/`: shared utilities.

The public landing header and authenticated application header are separate. The authenticated shell provides a role-aware sidebar, search area, logout action, and consistent LabSync branding.

Reusable `Button`, `Dialog`, `Card`, `Input`, `Select`, `Table`, `Badge`, `Switch`, and related components established a consistent visual vocabulary. This reduced duplicated styling and made later screens faster to build.

### 5.10 Testing and Phase 1 acceptance

The backend currently collects 30 Pytest tests. Coverage includes:

- Successful and failed authentication.
- Token requirements and role guards.
- Patient validation and role restrictions.
- Test catalog uniqueness and permissions.
- Appointment creation and validation.
- Independent test processing and result authorization.
- Recheck and re-entry behavior.
- Dashboard metrics.
- Temporary-password replacement and team management.
- A full Administrator-to-Receptionist-to-Technician acceptance workflow.

Tests use isolated database setup through `conftest.py`, keeping test data separate from development and production data.

## 6. Phase 2: containerization

### 6.1 Why containers were introduced

Before containers, every developer machine needed the correct Python, Node.js, PostgreSQL, dependencies, commands, and environment variables. Containers package the runtime and dependencies into repeatable images.

An **image** is an immutable template. A **container** is a running instance of that image. A **volume** stores data independently of a container lifecycle. A **network** allows services to use stable service names such as `db` and `backend`.

### 6.2 Local Docker Compose stack

`compose.yaml` defines three services:

1. `db`: PostgreSQL with a persistent named volume and readiness check.
2. `backend`: locally built FastAPI image; waits for the database to become healthy.
3. `frontend`: locally built Next.js image; waits for backend health.

Compose supplies environment variables, establishes the private service network, exposes development ports, defines restart policies, and keeps PostgreSQL data in `labsync_postgres_data`.

The correct database hostname inside Docker is `db`, not `localhost`. Inside the backend container, `localhost` means the backend container itself. This distinction explained the early “connection refused” error.

### 6.3 Backend image hardening

The backend image:

- Uses `python:3.13-slim`.
- Applies current Debian security updates during the build.
- Installs only production Python requirements.
- Removes `pip` executables from the runtime image after installation.
- Copies only migrations and application code.
- Runs as a dedicated non-root `labsync` user.
- Includes a health check for `/health`.
- Runs migrations before starting Uvicorn.

Running as non-root reduces the impact of a container compromise. Applying base operating-system updates fixed OpenSSL vulnerabilities detected by Docker Scout.

### 6.4 Frontend multi-stage image

The frontend Dockerfile uses three stages:

- `dependencies`: deterministic `npm ci` installation.
- `builder`: compiles the Next.js production application.
- `runtime`: receives only the standalone server, static files, public assets, and Node runtime.

The runtime removes npm/npx and runs as the built-in non-root `node` user. Multi-stage builds keep build tools and source dependencies out of the final image, reducing size and attack surface.

### 6.5 Health checks and dependency ordering

PostgreSQL uses `pg_isready`. FastAPI calls its `/health` endpoint. The frontend checks its own HTTP response. Compose starts dependent services only after required health conditions are satisfied.

A process being “running” does not mean it is ready. Health checks provide a stronger readiness signal for orchestration, CI, deployment, and monitoring.

## 7. Continuous integration

### 7.1 What CI means

Continuous Integration automatically validates changes when they are pushed or proposed. It shortens the feedback loop and makes the repository—not a developer’s memory—the source of quality rules.

The workflows grant only `contents: read` unless additional permissions are required. They use concurrency groups to cancel obsolete runs and timeouts to prevent stuck jobs.

### 7.2 Backend CI

Backend CI provisions a temporary PostgreSQL 18.4 service and Python 3.13, installs dependencies, runs `pip check`, applies all Alembic migrations, and executes the 30-test suite.

This validates both code and schema against a clean database. The CI-only password and JWT string are disposable workflow values, not production credentials.

### 7.3 Frontend CI

Frontend CI uses Node.js 22 and `npm ci`, restores a Next.js build cache, runs ESLint, audits production dependencies at high severity, and creates a production build.

`npm ci` is preferred in CI because it follows `package-lock.json` exactly and fails when the manifest and lock file disagree.

### 7.4 Container CI and Docker Scout

Container CI builds backend and frontend production images as a matrix. For each image it:

1. Builds the image from its real Dockerfile.
2. runs `id -u` inside the image and fails if the result is root (`0`).
3. runs Docker Scout for fixable critical and high vulnerabilities.
4. fails the workflow when the security threshold is exceeded.

This is a DevSecOps control because security evaluation occurs within the delivery pipeline rather than as a separate late review.

When OpenSSL vulnerabilities appeared in the Debian layer, the correct response was to identify the owning layer and update base operating-system packages—not to change unrelated Python code or suppress the scanner.

### 7.5 Path filters and manual validation

Backend and frontend workflows use path filters so documentation-only changes do not consume unnecessary build minutes. This means a release-preparation documentation commit may trigger no workflows. Before a release, the three validation workflows can be started manually with `workflow_dispatch`.

The lesson is that “no workflow triggered” and “all checks passed” are different states. A release checklist must confirm that relevant checks ran on the intended source revision.

## 8. Container registry and release artifacts

### 8.1 GitHub Container Registry

GHCR stores the production backend and frontend images. A release is identified by a semantic version such as `0.3.4`.

Published images also receive:

- Major/minor tags such as `0.3`.
- A commit-derived `sha-...` tag.
- `latest`.
- OCI labels for source repository and revision.
- An SBOM and build provenance.

Production deployment uses the exact semantic version, not `latest`. Immutable version selection makes deployment and rollback predictable.

### 8.2 Release workflow

Pushing a tag matching `v*.*.*` starts `Publish Container Images`. The workflow verifies that the tagged commit belongs to `master`, logs into GHCR with GitHub’s short-lived `GITHUB_TOKEN`, builds both images with Buildx, publishes them, and calls the reusable GCP deployment workflow.

The release sequence is:

```text
green validation -> annotated Git tag -> build/publish -> deploy -> health verify
```

The release documented here is `v0.3.4`.

## 9. Google Cloud deployment

### 9.1 Why Compute Engine was selected

A single Compute Engine VM is easy to understand and closely matches local Docker Compose. It teaches Linux administration, networking, identity, service management, logs, and persistent storage without introducing Kubernetes complexity.

The current architecture is cost-conscious and appropriate for a demonstration workload, but it remains a single-machine design. The application and database share one VM, so a VM failure affects the entire service.

### 9.2 Private access model

The frontend is bound to `127.0.0.1:3000` on the VM. It is not exposed publicly. Administrators access it through an IAP SSH tunnel:

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --ssh-flag="-L 3000:127.0.0.1:3000"
```

The browser then opens `http://localhost:3000`. IAP provides an authenticated path to the private service without opening SSH to the whole internet or publishing the application.

### 9.3 OS Login

OS Login maps Google Cloud IAM identities to Linux access. Metadata-based SSH keys were removed, and the RDP firewall rule was disabled. Port 22 is limited to Google’s IAP TCP forwarding range and targeted by a VM network tag.

OS Login centralizes access control and reduces unmanaged SSH-key sprawl. A permission can be revoked through IAM rather than by editing keys on every server.

### 9.4 Workload Identity Federation

GitHub Actions does not store a downloadable GCP service-account key. Instead:

1. GitHub issues an OpenID Connect identity token for the workflow.
2. GCP validates it through a Workload Identity Provider.
3. Attribute restrictions limit trust to `Isumans/clinical-lab`.
4. The workflow impersonates `labsync-deployer` for a short period.
5. The temporary credential expires automatically.

This removes a major secret-management burden. A long-lived JSON key can be copied and remain valid until manually revoked; a federated token is short-lived and tied to verified workload identity.

### 9.5 Least-privilege deployment identity

The deployer was initially granted broad Compute Instance Admin access while the deployment path was being established. After validation, that role was removed. The final deployer uses the smaller set required for IAP, OS Login, and service-account interaction.

This demonstrates a practical least-privilege method:

1. Make the workflow work with clearly understood temporary permissions.
2. Observe which operations it actually performs.
3. Remove unnecessary broad roles.
4. rerun the workflow to prove the reduced policy still works.

Neither the deployer nor VM service account has user-managed service-account keys.

## 10. Automated deployment and rollback

### 10.1 Deployment workflow

`Deploy to GCP` accepts a semantic version, trims accidental whitespace, removes an optional `v`, and validates the `major.minor.patch` form. It authenticates to GCP, copies the deployment script through IAP, and executes it as the dedicated `isuma` application owner.

Deployment concurrency is serialized for production. A second production deployment cannot cancel one halfway through, reducing race conditions around shared state.

### 10.2 Deployment script

`scripts/deploy-release.sh` performs these actions:

1. Validates the requested version and required files.
2. Creates a protected backup of the persistent non-secret release configuration.
3. Retrieves the latest enabled PostgreSQL and JWT secrets.
4. Builds a mode-600 temporary runtime environment file.
5. updates backend, frontend, and application versions.
6. validates Compose interpolation.
7. pulls the exact GHCR images.
8. starts the stack without deleting the persistent database volume.
9. polls `/api/health` for up to 150 seconds.
10. reports success only after health is proven.

### 10.3 Automatic rollback

The script uses strict shell options and an error trap. If secret retrieval, validation, image pulling, startup, or health verification fails, it restores the previous image configuration and starts the previous release.

A controlled test deployed nonexistent version `99.99.99`. The release failed as expected, while production remained on healthy `0.3.4`. A red workflow in this test was evidence that the safety control rejected a bad artifact—not evidence that production was broken.

Rollback protects application availability, but it does not automatically reverse a destructive database migration. Future migrations must remain backward-compatible across at least one release or have a separately rehearsed database rollback plan.

## 11. Secrets management

### 11.1 Secret categories

The sensitive production values are:

- PostgreSQL password.
- JWT signing secret.
- The VM’s GHCR read-only token.

GitHub Actions uses its short-lived `GITHUB_TOKEN` for publishing and Workload Identity Federation for GCP. No GCP service-account JSON key is stored in GitHub.

### 11.2 Secret Manager integration

The PostgreSQL password and JWT secret live in Google Secret Manager. The persistent `/opt/labsync/.env.release` file contains non-secret settings and image versions only.

During deployment, the script reads the latest enabled versions into a temporary file under `/var/tmp`, sets permissions to `600`, uses it for Compose, and removes it on exit. Secret access is granted to the VM service account on the individual secret resources.

This reduces secret exposure in source control, workflow variables, deployment logs, and persistent configuration.

### 11.3 Rotation process

A safe rotation sequence is:

1. Add a new secret version.
2. deploy so the application consumes it.
3. test authentication and health.
4. keep the previous version temporarily for recovery.
5. disable the previous version after validation.
6. destroy old versions only after the recovery window and policy permit it.

Changing the JWT signing secret invalidates existing tokens, so users must log in again. Changing the PostgreSQL password also requires updating the actual database role password; changing only an environment variable does not modify an initialized PostgreSQL volume.

### 11.4 GHCR token

The VM requires only `read:packages` to pull private GHCR images. The token should have an expiration date and be stored in a mode-600 Docker configuration. It does not belong in `.env.release` because it authenticates the Docker client, not the application.

## 12. Observability and incident response

### 12.1 Health monitoring

The public-facing service chain is validated through:

- Container health checks.
- Deployment-time polling of `http://127.0.0.1:3000/api/health`.
- A systemd health-check timer that runs every minute.
- Cloud Monitoring alerts for health failures and infrastructure conditions.

The systemd checker retries three times before logging `LABSYNC_HEALTHCHECK_FAILED`. Retries reduce alerts caused by a single transient timeout.

### 12.2 Centralized logs

Docker uses the `json-file` logging driver. The Google Cloud Ops Agent tails `/var/lib/docker/containers/*/*.log`, parses Docker JSON, and sends records to Cloud Logging under `labsync_docker_logs`.

The VM service account requires `roles/logging.logWriter`. A real troubleshooting exercise found `logging.logEntries.create` permission errors. Adding the correct role fixed the pipeline, illustrating that a running agent is not necessarily an agent that can deliver data.

### 12.3 Metrics and alerts

Monitoring covers:

- Health-check failures.
- High CPU utilization.
- High root-disk utilization.
- Application error logs.
- PostgreSQL backup failures.
- VM and agent metrics.

The VM service account has `roles/monitoring.metricWriter`. Alerts should identify symptoms quickly, while logs provide the detail needed to diagnose causes.

### 12.4 Incident response loop

The documented response process is:

1. Acknowledge the alert and record its time.
2. Check VM status, container status, and the health endpoint.
3. Review recent application, systemd, and deployment logs.
4. Avoid deleting containers, volumes, backups, or secret versions during diagnosis.
5. Roll back when a deployment caused the incident.
6. verify health and a user workflow after recovery.
7. record impact, root cause, remediation, recovery time, and prevention.

This converts monitoring from a dashboard into an operational capability.

## 13. PostgreSQL backup and recovery

### 13.1 Why volume persistence is not a backup

The Docker volume survives container recreation, but it remains attached to the same VM environment. Accidental deletion, disk corruption, or VM loss could still remove it. A backup must be a separate recoverable copy.

### 13.2 Automated backup process

`labsync-backup.timer` runs daily at approximately 02:00 UTC with up to 15 minutes of randomized delay. The oneshot service runs as `isuma`, receives only the required Docker group, and uses systemd hardening such as `NoNewPrivileges`, `PrivateTmp`, `ProtectHome`, and `ProtectSystem`.

The backup script:

1. Creates a mode-700 temporary directory.
2. runs `pg_dump --format=custom` inside the database container.
3. rejects an empty output.
4. validates the dump catalogue with `pg_restore --list`.
5. creates a SHA-256 checksum.
6. uploads both dump and checksum to a date-based bucket prefix.
7. reads the remote checksum back and compares it with the local hash.
8. logs success or failure.
9. removes temporary local files.

Objects under `postgres/` expire after 30 days through a bucket lifecycle rule, controlling storage growth and cost.

### 13.3 Least-privilege backup access

The VM service account uses a custom bucket role designed for the required backup operations. During development, errors such as missing `storage.objects.get` and `storage.objects.list` showed why permissions must match the exact client behavior. Permissions were adjusted at the bucket resource instead of granting project-wide Storage Admin.

### 13.4 Restore drill

A backup is useful only if it restores. The verified drill:

1. downloaded a dump and checksum to a protected temporary directory.
2. validated the checksum.
3. created a separate `labsync_restore_YYYYMMDD_HHMMSS` database.
4. restored with `--no-owner --no-privileges`.
5. listed the six expected tables.
6. compared structure and data counts.
7. removed only the named temporary database and directory after validation.

The production `labsync` database was never overwritten during the drill. This protects the live system while proving recoverability.

## 14. Security posture

### 14.1 Controls implemented

- Argon2-based password hashes instead of plaintext passwords.
- Short-lived JWT access tokens.
- Backend-enforced role permissions.
- Input validation with Pydantic.
- Environment-based configuration.
- Secrets excluded from Git and stored in Secret Manager.
- Non-root application containers.
- Reduced production image contents.
- Base operating-system security updates.
- Dependency and image vulnerability scanning.
- Private application binding.
- IAP-only SSH path and OS Login.
- Keyless GitHub-to-GCP federation.
- No user-managed service-account keys.
- Resource-level secret and backup permissions.
- Health checks, rollback, logging, alerts, backups, and restore validation.

### 14.2 Residual risks

- The VM has an external IP even though application access is private.
- Application and database share one VM and failure domain.
- PostgreSQL is self-managed in Docker.
- No TLS/domain is currently configured because the application is accessed through IAP tunneling.
- JWT revocation and refresh tokens are not implemented.
- No web application firewall or public rate-limiting layer exists.
- The GHCR pull token is a long-lived credential and needs expiry/rotation management.
- CI actions currently use version tags rather than immutable action commit SHAs.
- Database migration rollback needs additional design for destructive changes.

These are not reasons to discard the system. They define the next risk-based improvements if the service becomes public or handles real clinical data.

## 15. Release management

### 15.1 Semantic versioning

The project uses versions such as `0.3.4`:

- `0`: the product is still before a stable 1.0 commercial contract.
- `3`: the current minor development line.
- `4`: a patch-level release containing security and release-readiness improvements.

An annotated Git tag `v0.3.4` triggers artifact publication and deployment. A GitHub Release records the human-readable contents of that tag.

### 15.2 Release checklist

Before tagging:

- Backend CI is green.
- Frontend CI is green.
- Container CI is green.
- Fixable critical/high findings are addressed.
- Working tree is clean.
- Release notes and default image versions are updated.
- No `.env`, token, password, or secret was staged.

After tagging:

- Both versioned GHCR images exist.
- Deployment workflow is green.
- Running backend and frontend images match the requested version.
- All three containers are healthy.
- `/api/health` returns `{"status":"healthy"}`.
- Login and representative application functions work through IAP.

### 15.3 Stopping the VM for cost control

For a portfolio system, stop the VM when it is not being demonstrated:

```bash
gcloud compute instances stop labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a
```

Start it before use:

```bash
gcloud compute instances start labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a
```

Persistent disks, stored container packages, Secret Manager, monitoring, and Cloud Storage can still create small charges while compute is stopped. Budgets and billing alerts remain important.

## 16. Troubleshooting lessons from the implementation

### 16.1 PowerShell commands in Git Bash

`Copy-Item` and `Activate.ps1` are PowerShell commands. Git Bash equivalents are:

```bash
cp .env.example .env
source .venv/Scripts/activate
```

The shell matters because quoting, path separators, environment-variable syntax, and built-in commands differ.

### 16.2 “No module named fastapi” during Pytest

Pytest was initially executed with a different Python installation than the project environment. Activating the virtual environment and using `python -m pytest` ensures Python and Pytest refer to the same installed dependencies.

### 16.3 PostgreSQL password authentication failure

Creating a PostgreSQL role and database does not guarantee the password typed later matches. Resetting the role password as the PostgreSQL administrator and updating the local database URL resolved the mismatch.

### 16.4 Docker backend could not connect to localhost

Inside the backend container, `localhost:5432` pointed to itself. The Compose database hostname is `db`, so the container database URL must use `@db:5432`.

### 16.5 Docker database password mismatch

PostgreSQL applies `POSTGRES_PASSWORD` only when initializing a new data directory. Changing the environment variable later does not change the existing role password in a persisted volume. The stored database password and application URL must remain synchronized.

### 16.6 Compose image listing reported a missing digest

Old Compose/container metadata referred to an image that Docker had removed. Inspecting active container image names directly with `docker ps` was more reliable than depending on stale local metadata.

### 16.7 Frontend `/api/health` returned 404

The first published frontend image had no production rewrite. Inspecting `.next/routes-manifest.json` confirmed the missing rewrite. Adding the Next.js rewrite and rebuilding/publishing the frontend routed `/api/*` to the backend correctly.

### 16.8 Deployment version validation rejected a correct-looking value

The manually entered version contained trailing whitespace. The workflow now trims leading/trailing whitespace before semantic-version validation.

### 16.9 Cloud logs were absent although the agent was running

The Ops Agent process was active, but its own log showed `logging.logEntries.create` denied. Granting the VM service account `roles/logging.logWriter` fixed delivery. Service state and end-to-end functionality must both be checked.

### 16.10 Backup service used the wrong Docker/Compose context

The first systemd backup command encountered Docker configuration permissions and Compose flag parsing. The final backup script uses `docker exec` directly and a known absolute `gcloud` executable path, reducing dependency on interactive shell configuration.

### 16.11 Cloud database was empty after deployment

Local Docker data is not automatically copied to a new cloud volume. Migrations created the schema, but no users existed. Creating a new production administrator was correct for a clean environment. When data migration is required, it must be an explicit backup/restore activity.

## 17. Operational command reference

### 17.1 Local application

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend frontend
curl http://localhost:8000/health
docker compose down
```

Do not add `--volumes` unless intentionally deleting local database data.

### 17.2 CI and release

```bash
git status
git tag -a v0.3.4 -m "LabSync 0.3.4"
git push origin v0.3.4
```

The GitHub Actions interface is the primary place to observe Backend CI, Frontend CI, Container CI, image publication, and deployment.

### 17.3 Private application tunnel

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --ssh-flag="-L 3000:127.0.0.1:3000"
```

### 17.4 Remote status and health

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --command="sudo -u isuma docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"

gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --command="curl -fsS http://127.0.0.1:3000/api/health"
```

The persistent `.env.release` intentionally lacks secrets. Directly evaluating Compose without the deployment script’s temporary runtime environment will report missing secret variables; this is expected.

### 17.5 Logs and backups on the VM

```bash
sudo -u isuma docker logs --since 15m labsync-backend-1
sudo -u isuma docker logs --since 15m labsync-frontend-1
sudo journalctl -u labsync-backup.service -n 100 --no-pager -o cat
systemctl list-timers labsync-backup.timer --all --no-pager
sudo systemctl start labsync-backup.service
```

## 18. How to demonstrate the project

A strong 10- to 15-minute demonstration can follow this order:

1. Show the architecture diagram and explain the separation between application and delivery layers.
2. Open the public landing page through the IAP tunnel.
3. Log in as an administrator and show the dashboard, test catalog, and team settings.
4. Register or select a patient and create an appointment with multiple tests.
5. Switch to the technician flow, mark processing, enter a result, and authorize it.
6. Show the reports view and live dashboard metrics.
7. Open GitHub Actions and explain the three validation workflows.
8. Show versioned GHCR images and the release workflow.
9. Show the deployed container versions and health endpoint.
10. Show Cloud Logging/Monitoring and the latest successful backup.
11. Explain the restore drill and controlled rollback test.
12. End with residual risks and the next improvements you would make.

This sequence demonstrates not just a working interface, but an understanding of how the software is built, secured, released, observed, and recovered.

## 19. Possible next phases

The next phase is optional for the present learning objective. Improvements should be chosen because they reduce a real risk or teach a targeted concept.

### 19.1 Portfolio/documentation phase (recommended now)

- Add application and GitHub Actions screenshots.
- Create a one-page architecture diagram.
- Record a short demonstration video.
- Publish the GitHub Release and link this guide from the README.
- Prepare interview questions and answers based on the incidents solved.

### 19.2 Public production hardening

- Purchase/configure a domain and managed TLS.
- Add an HTTPS reverse proxy or managed load balancer.
- Remove unnecessary public VM addressing.
- Add rate limiting, secure response headers, and public-edge protection.
- Conduct an application security review for real clinical data obligations.

### 19.3 Reliability and scale

- Move PostgreSQL to a managed database.
- Create separate staging and production environments.
- Add migration compatibility gates.
- Automate restore drills and recovery-time measurements.
- Define service-level objectives and error-budget alerts.

### 19.4 Infrastructure as code

- Model GCP resources with Terraform.
- Review plans in pull requests.
- Keep state in a protected remote backend.
- Rebuild the environment from code to test reproducibility.

Kubernetes is not required unless orchestration complexity, scale, or learning goals justify it.

## 20. Glossary

| Term | Meaning in LabSync |
|---|---|
| API | The FastAPI HTTP interface used by the frontend |
| Alembic migration | A versioned database-schema change |
| Artifact | A build output, especially a versioned container image |
| Authentication | Verifying a user’s identity |
| Authorization | Deciding what an authenticated user may do |
| CI | Automated validation of integrated source changes |
| CD | Automated publication and deployment of validated releases |
| Container | A running isolated process created from an image |
| Docker Compose | Declarative coordination for the database, backend, and frontend |
| GHCR | GitHub Container Registry, which stores LabSync images |
| Health check | A request that proves a service is ready to respond |
| IAP | Google Identity-Aware Proxy, used for the private tunnel |
| Image | An immutable packaged application filesystem and runtime definition |
| JWT | A signed token representing an authenticated session |
| Least privilege | Granting only the permissions required for a task |
| Observability | Using health, logs, metrics, and alerts to understand the system |
| OS Login | IAM-controlled Linux login for Compute Engine |
| RBAC | Role-based access control for Admin, Receptionist, and Technician |
| Rollback | Returning to a last known-good application release |
| SBOM | A software bill of materials listing image components |
| Secret Manager | GCP service storing versioned sensitive values |
| Semantic version | A release identifier in `major.minor.patch` form |
| Supply chain | The dependencies, build systems, registries, and artifacts used to deliver software |
| Volume | Persistent Docker-managed storage, used by PostgreSQL |
| WIF | Workload Identity Federation for keyless GitHub-to-GCP authentication |

## 21. Final assessment

LabSync has progressed far beyond a locally running CRUD demonstration. It now provides a traceable delivery path, repeatable validation, secured artifacts, private cloud deployment, operational visibility, controlled rollback, and verified data recovery.

The strongest evidence of learning is not the number of tools used. It is the way failures were investigated:

- confirming which Python environment executed tests;
- distinguishing host `localhost` from container networking;
- understanding persisted PostgreSQL credentials;
- inspecting built Next.js rewrites;
- using scanner findings to update the correct dependency layer;
- reading agent logs to diagnose IAM denial;
- reducing deployer permissions after proving the workflow;
- testing restore into an isolated database;
- and intentionally failing a release to prove rollback.

Those are transferable engineering habits. The current release is a credible platform for an internship presentation, portfolio review, or continued DevOps study.

## Appendix A. Repository evidence map

| Area | Primary repository evidence |
|---|---|
| Application overview and local setup | `README.md` |
| Backend entry point and configuration | `backend/app/main.py`, `backend/app/core/config.py` |
| Models and relationships | `backend/app/models/` |
| Role enforcement | `backend/app/dependencies/auth.py` |
| Authentication and hashing | `backend/app/services/security.py` |
| Migrations | `backend/alembic/versions/` |
| Backend tests | `backend/tests/` |
| Frontend routes and components | `frontend/app/`, `frontend/components/` |
| Frontend API rewrite | `frontend/next.config.ts` |
| Container builds | `backend/Dockerfile`, `frontend/Dockerfile` |
| Local and release orchestration | `compose.yaml`, `compose.release.yaml` |
| Continuous integration | `.github/workflows/backend-ci.yml`, `frontend-ci.yml`, `container-ci.yml` |
| Publishing and deployment | `.github/workflows/publish-images.yml`, `deploy-gcp.yml` |
| Health-checked rollback | `scripts/deploy-release.sh` |
| Health monitoring | `ops/healthcheck/` |
| Central logging | `ops/ops-agent/config.yaml` |
| Backup automation | `ops/backups/` |
| Operational procedures | `docs/operations/` |

## Appendix B. Security rules for future contributors

1. Never commit `.env`, `.env.release`, `.env.local`, tokens, passwords, JWT signing values, private keys, or downloaded service-account credentials.
2. Never paste secret values into issues, pull requests, chat, screenshots, logs, or documentation.
3. Do not expose PostgreSQL or the backend directly to the internet.
4. Do not delete the PostgreSQL volume during routine deploy or rollback.
5. Do not destroy an old secret version immediately after rotation.
6. Do not treat a successful backup upload as proof of recovery; continue restore drills.
7. Do not bypass a failed security scan without documenting and approving the risk.
8. Keep production deployment tied to immutable semantic image versions.
9. Review IAM after every new automation capability.
10. Stop the VM when it is not needed, while continuing to monitor residual storage costs.
