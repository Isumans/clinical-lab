# LabSync End-to-End Workflow Playbook

**Release baseline:** v0.3.4  
**Audience:** Students, interns, reviewers, and future LabSync maintainers  
**Purpose:** Reconstruct the stages used to build, validate, secure, deploy, monitor, back up, and recover LabSync  
**Companion:** `docs/LabSync-DevOps-Learning-Guide.md`

> Commands containing secrets use prompts or placeholders. Never paste real passwords, JWT secrets, GHCR tokens, or service-account credentials into source control, documentation, terminal history, screenshots, or chat.

---

## 1. How to read this playbook

Every stage answers five questions:

1. **Objective:** What outcome did the stage produce?
2. **Run from:** Which computer, shell, account, or directory should execute the command?
3. **Commands:** What was used to perform or verify the work?
4. **Function and meaning:** What does each important command accomplish?
5. **Exit check:** How do we know it is safe to continue?

The prompt shown in examples helps identify the execution location:

| Prompt pattern | Meaning |
|---|---|
| `isuma@IsumManmitha MINGW64 ...` | Local Windows computer using Git Bash |
| `(base) PS C:\Users\isuma>` | Local Windows computer using PowerShell |
| `postgres=#` | Interactive PostgreSQL `psql` session |
| `isuma@labsync-vm:~$` | Remote Ubuntu VM on Google Compute Engine |
| GitHub Actions log | A temporary GitHub-hosted Linux runner |

Do not paste the prompt itself. Paste only the command after `$`, `>`, or `postgres=#`.

## 2. Workflow overview

```text
Stage 0   Tools and shell orientation
Stage 1   Backend environment and local PostgreSQL
Stage 2   Application schema, authentication, and Phase 1 features
Stage 3   Frontend integration and acceptance validation
Stage 4   Local Docker images and Compose stack
Stage 5   Container hardening and vulnerability remediation
Stage 6   GitHub CI workflows
Stage 7   GHCR publishing and release Compose
Stage 8   GCP project, budget, CLI, and VM
Stage 9   Private VM access, Docker, and initial deployment
Stage 10  Workload Identity Federation and automated deployment
Stage 11  Secret Manager and secret rotation
Stage 12  Logging, monitoring, and health alerts
Stage 13  PostgreSQL backups, retention, and restore drill
Stage 14  IAM and VM security hardening
Stage 15  Release v0.3.4 and controlled rollback test
Stage 16  Routine operation and cost control
```

Each stage built on the previous stage. Cloud automation was not introduced until the application could run and pass acceptance checks locally.

## 3. Stage 0 - tools and shell orientation

### Objective

Install and identify the command-line tools, and avoid mixing PowerShell syntax with Git Bash syntax.

### Run from

Local Windows PowerShell or Git Bash. Version commands can be run from any directory because they do not depend on repository files.

### Commands

PowerShell:

```powershell
aws --version
gcloud --version
docker --version
git --version
python --version
```

Git Bash:

```bash
aws --version
gcloud --version
docker --version
git --version
python --version
```

### Function and meaning

- `--version` confirms that an executable is installed and visible through the current shell’s `PATH`.
- Installation can update the Windows system `PATH`, but terminals already open may not notice it. Restarting Git Bash reloads the environment.
- PowerShell uses commands such as `Copy-Item` and `Activate.ps1`; Git Bash uses Unix-style commands such as `cp` and `source`.

### Important shell translations

| Task | PowerShell | Git Bash |
|---|---|---|
| Copy example environment file | `Copy-Item .env.example .env` | `cp .env.example .env` |
| Activate Windows virtual environment | `.\.venv\Scripts\Activate.ps1` | `source .venv/Scripts/activate` |
| Set a temporary variable | `$env:NAME="value"` | `NAME="value"` |

### Exit check

Every required `--version` command prints a version rather than “command not found.”

## 4. Stage 1 - backend environment and PostgreSQL

### Objective

Create an isolated Python environment, install backend dependencies, create the local PostgreSQL role/database, and connect FastAPI to it.

### Run from

Backend setup commands: local Git Bash in `clinical-lab-system/backend`.  
PostgreSQL administration: local Git Bash followed by the `psql` prompt.

### Create and activate the Python environment

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
cp -n .env.example .env
```

### Function and meaning

- `python -m venv .venv` creates a project-specific Python installation.
- `source .../activate` makes `python`, `pip`, and installed packages resolve from that environment.
- `python -m pip` guarantees pip belongs to the same Python interpreter.
- `-r requirements.txt` installs the declared development and testing dependencies.
- `cp -n` creates `.env` only when it does not already exist, preventing accidental overwrite.

### Verify PostgreSQL

```bash
psql --version
psql -U postgres -h localhost
```

At the `postgres=#` prompt:

```sql
CREATE USER labsync WITH PASSWORD 'choose_a_local_password';
CREATE DATABASE labsync OWNER labsync;
\l
\q
```

Test the application role from Git Bash:

```bash
psql -U labsync -h localhost -d labsync
```

### Function and meaning

- `-U` selects the database user.
- `-h localhost` forces a TCP connection and password authentication.
- `-d labsync` selects the LabSync database.
- `CREATE USER` creates a login role.
- `CREATE DATABASE ... OWNER labsync` gives the application role ownership.
- `\l` lists databases; `\q` exits `psql`.

If authentication fails, reconnect as `postgres` and deliberately reset the role password:

```sql
ALTER USER labsync WITH PASSWORD 'new_local_password';
```

Then update `LABSYNC_DATABASE_URL` in `backend/.env` to the same password.

### Generate a JWT secret

Run from `backend/` with the virtual environment active:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the generated value into `LABSYNC_JWT_SECRET_KEY` in the ignored `backend/.env`. It is a signing key, not a user password.

### Apply migrations and run the API

```bash
python -m alembic upgrade head
python -m app.scripts.create_admin --name "Your Name" --email "admin@example.com"
uvicorn app.main:app --reload
```

In another Git Bash terminal:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"healthy"}
```

### Exit check

- Alembic reaches `head` without error.
- The administrator is created with a password hash.
- `/health` returns HTTP 200 and `healthy`.
- `http://127.0.0.1:8000/docs` opens the FastAPI documentation.

## 5. Stage 2 - application schema, authentication, and Phase 1 features

### Objective

Build the minimum functional laboratory system before adding infrastructure.

### Functionality implemented

| Application stage | Functionality | Meaning |
|---|---|---|
| Users and authentication | Login, current user, logout, password change | Establishes staff identity and protected access |
| RBAC | Admin, Receptionist, Technician guards | Enforces permissions in the backend |
| Patients | Create, search, view, update | Maintains laboratory customer records |
| Test catalog | Create, edit, activate/deactivate | Defines services that appointments can order |
| Appointments | Select patient, tests, date, and time | Creates a scheduled laboratory visit |
| AppointmentTest | One row per ordered test | Tracks each test independently |
| Laboratory workflow | Processing, result entry, authorization, recheck | Represents the real test lifecycle |
| Dashboard | Live counts | Provides operational visibility |
| Team settings | Create/deactivate staff, temporary password | Allows controlled staff onboarding |

### Data workflow

```text
Administrator creates an active test
        -> Receptionist registers/selects a patient
        -> Receptionist creates an appointment with tests
        -> Technician marks a sample IN_PROGRESS
        -> Technician enters result; state becomes COMPLETED
        -> Technician authorizes or flags RECHECK_REQUIRED
        -> Authorized result becomes viewable on screen
```

### Migration commands used during development

Run from `backend/` with the virtual environment active:

```bash
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

### Function and meaning

- `upgrade head` applies all unapplied migrations.
- `current` displays the database revision.
- `check` determines whether model metadata would require a new migration.
- The migration history is stored in `alembic_version` inside PostgreSQL.

### Backend validation

```bash
python -m pytest -q
python -m pip check
```

- Pytest validates routes, services, state transitions, permissions, and the complete role workflow.
- `pip check` finds incompatible installed Python package requirements.
- The final suite collects 30 backend tests.

### Exit check

The complete Administrator -> Receptionist -> Technician acceptance test passes, and unauthorized roles receive HTTP 403 from backend endpoints.

## 6. Stage 3 - frontend integration and acceptance validation

### Objective

Connect a reusable Next.js interface to the FastAPI API and validate the full user journey.

### Run from

Local Git Bash in `clinical-lab-system/frontend`.

### Commands

```bash
cd frontend
npm install
cp -n .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Production-oriented checks:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

### Function and meaning

- `npm install` installs packages and maintains the lock file during development.
- `npm run dev` starts Next.js with development feedback and hot reload.
- ESLint detects code-quality and framework issues.
- `next build` proves the application can compile for production.
- `npm audit --omit=dev` reviews runtime dependencies rather than development-only tooling.

### Frontend routing meaning

- `/` is the public landing page.
- `/login` is the staff entry point.
- `/dashboard/*` is the authenticated workspace.
- `/api/*` is rewritten by Next.js to FastAPI.

The landing page and authenticated dashboard intentionally use separate top bars. The dashboard shell applies consistent logo placement, search, notifications, logout, sidebar navigation, and role-aware menu access.

### Manual acceptance checks

1. Landing page appears before login.
2. Invalid login shows a safe generic error.
3. Temporary-password users are forced to change their password.
4. Admin can configure tests and users.
5. Receptionist can manage patients and appointments.
6. Technician can process tests and authorize results.
7. Dashboard metrics update after workflow changes.
8. Logout removes the client token and returns to public navigation.

### Exit check

Lint and production build pass, and the complete browser workflow matches backend behavior.

## 7. Stage 4 - local Docker images and Compose stack

### Objective

Package PostgreSQL, FastAPI, and Next.js so the same runtime structure can be reproduced on another machine.

### Run from

Local Git Bash in the repository root.

### Prepare configuration

```bash
cp .env.docker.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edit the ignored root `.env`:

- Use the same URL-safe database password in `POSTGRES_PASSWORD` and `LABSYNC_DATABASE_URL`.
- Set the generated `LABSYNC_JWT_SECRET_KEY`.
- Do not commit the file.

### Build and run

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend frontend
```

Create the containerized administrator:

```bash
docker compose exec backend \
  python -m app.scripts.create_admin \
  --name "Your Name" \
  --email "admin@example.com"
```

Verify:

```bash
curl http://localhost:8000/health
curl --fail --output /dev/null http://localhost:3000
```

Stop without deleting data:

```bash
docker compose down
```

Delete local data only for an intentional reset:

```bash
docker compose down --volumes
```

### Function and meaning

- `up --build -d` builds missing/changed images and starts containers in the background.
- `ps` shows state and health.
- `logs -f` follows output for diagnosis.
- `exec backend` runs a command inside the running backend container.
- `down` removes containers and networks but preserves named volumes.
- `down --volumes` also deletes PostgreSQL data and is therefore destructive.

### Networking lesson

Inside the backend container, use database host `db`, not `localhost`:

```text
postgresql+psycopg://labsync:PASSWORD@db:5432/labsync
```

`localhost` always refers to the current network namespace. In a container, it does not refer to another Compose service.

### Exit check

`db`, `backend`, and `frontend` are healthy, login works, and data survives `docker compose down` followed by `up`.

## 8. Stage 5 - container hardening and vulnerability remediation

### Objective

Reduce image attack surface, run applications as non-root, and fail validation for fixable critical/high vulnerabilities.

### Verify runtime users

```bash
docker compose exec backend whoami
docker compose exec frontend whoami
```

Expected:

```text
labsync
node
```

### Resolve image IDs when Compose metadata is stale

```bash
BACKEND_IMAGE=$(docker inspect labsync-backend-1 --format '{{.Image}}')
FRONTEND_IMAGE=$(docker inspect labsync-frontend-1 --format '{{.Image}}')
```

### Docker Scout commands

```bash
docker scout quickview labsync-backend:latest
docker scout quickview labsync-frontend:latest

docker scout cves \
  --only-severity critical,high \
  --only-fixed \
  labsync-backend:latest

docker scout cves \
  --only-severity critical,high \
  --only-fixed \
  labsync-frontend:latest
```

### Function and meaning

- `quickview` summarizes packages, policies, and severity counts.
- `cves` prints affected packages and fixed versions.
- `--only-fixed` focuses the gate on vulnerabilities with an available remediation.
- `--only-severity critical,high` establishes the project’s release threshold.

### Remediation used

- Python packages were upgraded or pinned to fixed versions.
- The Next.js runtime image excludes npm/npx and build dependencies.
- The backend image applies current Debian security updates:

```dockerfile
RUN apt-get update \
    && apt-get upgrade --yes --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
```

The OpenSSL finding came from the Debian base layer, so the correct fix was an operating-system package update rather than unrelated Python changes.

### Rebuild without stale base cache

```bash
docker build --pull --no-cache \
  -t labsync-backend:security-fix \
  backend

docker run --rm \
  --entrypoint dpkg-query \
  labsync-backend:security-fix \
  -W openssl

docker run --rm \
  --entrypoint id \
  labsync-backend:security-fix \
  -u
```

`--pull` asks Docker for the latest matching base image. `--no-cache` proves old layers did not hide the remediation. The UID must not be `0`.

### Exit check

The images run as non-root and Docker Scout finds no fixable critical/high vulnerabilities above the configured gate.

## 9. Stage 6 - GitHub continuous integration

### Objective

Move local validation into repeatable GitHub-hosted workflows.

### Workflows created

| Workflow | Trigger | Function |
|---|---|---|
| Backend CI | Backend changes, pull request, manual | PostgreSQL service, dependency check, migrations, Pytest |
| Frontend CI | Frontend changes, pull request, manual | `npm ci`, lint, runtime audit, production build |
| Container CI | Container/application changes, pull request, manual | Build images, verify non-root, Docker Scout gate |

### Run manually in GitHub

1. Repository -> **Actions**.
2. Select the workflow.
3. Select **Run workflow**.
4. Choose `master`.
5. Wait for the green check mark.

If GitHub CLI is installed locally:

```bash
gh run list --branch master --limit 10
gh run view RUN_ID
```

### Function and meaning

- A workflow is the whole automation definition.
- A job is a group of steps running on one runner.
- A step runs an action or command.
- A service container supplies PostgreSQL to Backend CI.
- A matrix runs equivalent build/scan logic for backend and frontend.
- Path filters avoid unnecessary work, so documentation-only commits might trigger no CI.
- `workflow_dispatch` enables deliberate pre-release validation.

### Exit check

Backend CI, Frontend CI, and Container CI are green for the source intended for release.

## 10. Stage 7 - GHCR publishing and release Compose

### Objective

Publish immutable versioned images and prove the server can run published artifacts without rebuilding source.

### Authenticate a machine that only needs to pull

Create a classic GitHub PAT with `read:packages`, then run:

```bash
read -s -p "GHCR token: " GHCR_TOKEN
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io \
  --username isumans \
  --password-stdin
unset GHCR_TOKEN
```

The token is Docker client authentication. It does not belong in `.env.release`.

### Prepare release configuration locally

```bash
cp .env.release.example .env.release
docker compose \
  --env-file .env.release \
  -f compose.release.yaml \
  config --quiet
```

### Pull and run published images

```bash
docker compose --env-file .env.release -f compose.release.yaml pull
docker compose --env-file .env.release -f compose.release.yaml up -d
docker compose --env-file .env.release -f compose.release.yaml ps
```

### Function and meaning

- `compose.release.yaml` contains `image:` references and no local `build:` definitions.
- `pull` downloads the exact registry artifact.
- `config --quiet` validates interpolation and Compose structure without starting services.
- Using the same Compose project and volume preserves PostgreSQL data while changing image sources.

### Publish workflow

An annotated tag such as `v0.3.4` triggers image publication:

```bash
git tag -a v0.3.4 -m "LabSync 0.3.4"
git push origin v0.3.4
```

GitHub Actions publishes:

- `ghcr.io/isumans/labsync-backend:0.3.4`
- `ghcr.io/isumans/labsync-frontend:0.3.4`
- minor, SHA, and `latest` tags
- SBOM and provenance metadata

### Exit check

Both versioned images exist in GHCR and the release Compose stack passes health checks.

## 11. Stage 8 - GCP project, budget, CLI, and VM

### Objective

Create a cost-controlled GCP environment and a small Ubuntu VM for the Compose workload.

### Billing and budget

The GCP project is `labsync-devops`. A billing account and budget/alerts were configured before compute resources were created. Budgets notify; they do not automatically stop services unless additional automation is added.

### Configure the local CLI

Run from any local Git Bash directory:

```bash
gcloud init
gcloud auth list
gcloud config set project labsync-devops
gcloud config get-value project
```

If prompted to reinitialize the current `default` configuration, choose the existing account/project unless you intentionally need a separate CLI profile.

### Function and meaning

- `gcloud init` authenticates and selects a configuration.
- `auth list` identifies the active Google identity.
- `config set project` defines the default project for later commands.
- A default compute region/zone reduces repetition, but critical commands still explicitly use the project and zone.

### VM verification

```bash
gcloud compute instances describe labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --format="yaml(status,machineType,disks,networkInterfaces)"
```

The initial estimated compute cost was reviewed before proceeding. Actual billing depends on runtime, disk, network, storage, and regional pricing.

### Exit check

The VM exists in `asia-south1-a`, budget alerts are configured, and the local CLI targets `labsync-devops`.

## 12. Stage 9 - private VM access, Docker, and initial deployment

### Objective

Reach the Ubuntu VM through IAP, install Docker, copy release configuration, pull images, and run LabSync privately.

### Connect from local Git Bash

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap
```

When SSH first displays the server fingerprint, verify the target IP/resource and accept it to cache the host key.

### Verify the remote account and Docker

Run after the prompt changes to `...@labsync-vm`:

```bash
groups
docker version
docker compose version
```

If Docker is not installed, install it using Docker’s supported Ubuntu repository/process, then verify the daemon and add the application account to the Docker group. Log out and back in after group membership changes.

### Prepare the deployment directory

On the VM:

```bash
sudo install -d -m 0750 -o isuma -g isuma /opt/labsync
```

Copy files from local Git Bash, not from inside the VM:

```bash
gcloud compute scp \
  compose.release.yaml \
  .env.release.example \
  labsync-vm:/tmp/ \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap
```

Move them on the VM:

```bash
sudo mv /tmp/compose.release.yaml /opt/labsync/
sudo mv /tmp/.env.release.example /opt/labsync/
sudo chown isuma:isuma /opt/labsync/*
cd /opt/labsync
cp .env.release.example .env.release
chmod 600 .env.release
```

Files under `/tmp` disappear across interruption/reboot and must be copied again if missing.

### Authenticate and pull

On the VM:

```bash
read -s -p "GHCR token: " GHCR_TOKEN
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io \
  --username isumans \
  --password-stdin
unset GHCR_TOKEN

docker compose --env-file .env.release -f compose.release.yaml pull
docker compose --env-file .env.release -f compose.release.yaml up -d
docker compose --env-file .env.release -f compose.release.yaml ps
```

### Verify the private endpoint

On the VM:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Expected:

```json
{"status":"healthy"}
```

### Exit check

All three containers are healthy and the frontend-to-backend `/api/health` path works.

## 13. Stage 10 - Workload Identity Federation and automated deployment

### Objective

Allow GitHub Actions to deploy without a stored GCP service-account key.

### Architecture

```text
GitHub OIDC token
  -> GCP Workload Identity Provider
  -> repository attribute restriction
  -> short-lived impersonation of labsync-deployer
  -> IAP + OS Login deployment
```

### Discover provider and service-account values

Run from local Git Bash:

```bash
gcloud iam workload-identity-pools providers describe github \
  --project=labsync-devops \
  --location=global \
  --workload-identity-pool=github-actions \
  --format='value(name)'

gcloud iam service-accounts describe \
  labsync-deployer@labsync-devops.iam.gserviceaccount.com \
  --project=labsync-devops \
  --format='value(email)'
```

The provider output is the value used for GitHub variable `GCP_WORKLOAD_IDENTITY_PROVIDER`.

### Repository-restricted trust

The deployer service account grants `roles/iam.workloadIdentityUser` to a principal set restricted to:

```text
attribute.repository/Isumans/clinical-lab
```

This prevents unrelated repositories from impersonating the deployer through the same provider.

### GitHub environment variables

The production environment supplies non-secret identifiers:

```text
GCP_PROJECT_ID=labsync-devops
GCP_ZONE=asia-south1-a
GCP_VM_NAME=labsync-vm
GCP_SERVICE_ACCOUNT=labsync-deployer@labsync-devops.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/.../providers/github
```

### Deployment workflow meaning

The workflow:

1. validates and trims the semantic version;
2. obtains a short-lived GCP credential;
3. installs `gcloud` on the runner;
4. copies `scripts/deploy-release.sh` through IAP;
5. executes the script as `isuma`;
6. reports success only after health verification.

### Exit check

The GitHub deployment succeeds without a service-account JSON key, and user-managed key listings are empty.

## 14. Stage 11 - Secret Manager and secret rotation

### Objective

Remove production database/JWT values from persistent release configuration and retrieve them only during deployment.

### Create new secret versions safely

Run locally or on an authenticated administrative shell. Use silent prompts:

```bash
read -s -p "New database password: " DB_PASSWORD
printf '%s' "$DB_PASSWORD" | gcloud secrets versions add \
  labsync-postgres-password \
  --project=labsync-devops \
  --data-file=-
unset DB_PASSWORD

read -s -p "New JWT secret: " JWT_SECRET
printf '%s' "$JWT_SECRET" | gcloud secrets versions add \
  labsync-jwt-secret \
  --project=labsync-devops \
  --data-file=-
unset JWT_SECRET
```

### List versions without reading values

```bash
gcloud secrets versions list labsync-jwt-secret \
  --project=labsync-devops \
  --format="table(name,state,createTime)"
```

### Function and meaning

- `read -s` prevents terminal echo.
- `--data-file=-` reads secret data from standard input rather than a plaintext file.
- `versions add` supports rotation and rollback history.
- Listing metadata is safe; reading actual secret payloads should be rare and controlled.

### Deployment behavior

`deploy-release.sh` retrieves the latest enabled versions, writes them to a mode-600 temporary file, uses that file for Compose, and deletes it on exit. The persistent `.env.release` must not contain:

```text
POSTGRES_PASSWORD
LABSYNC_DATABASE_URL
LABSYNC_JWT_SECRET_KEY
```

Therefore, directly running Compose with only `.env.release` now produces a missing-secret error. That is expected security behavior; use the deployment script for production changes.

### Rotation sequence

1. Add the new version.
2. Change the PostgreSQL role password when rotating the database credential.
3. Deploy.
4. Test health and login.
5. Disable the previous version after validation.
6. Retain it temporarily rather than destroying it immediately.

### Exit check

Deployment and login succeed using latest enabled secrets, and persistent release configuration contains no sensitive values.

## 15. Stage 12 - logging, monitoring, and health alerts

### Objective

Detect service problems and centralize container logs in Google Cloud.

### Ops Agent configuration

The receiver tails Docker JSON logs:

```yaml
logging:
  receivers:
    labsync_docker_logs:
      type: files
      include_paths:
        - /var/lib/docker/containers/*/*.log
```

On the VM:

```bash
sudo systemctl status 'google-cloud-ops-agent*' --no-pager
sudo cat /etc/google-cloud-ops-agent/config.yaml
sudo systemctl restart google-cloud-ops-agent
```

### Generate harmless traffic

Run from any directory on the VM:

```bash
for i in 1 2 3; do
  curl -fsS http://127.0.0.1:3000/api/health
  echo
done
```

### Cloud Logging query

Use Logs Explorer:

```text
resource.type="gce_instance"
log_id("labsync_docker_logs")
```

An instance ID filter can be added when multiple VMs exist.

### Diagnose an agent that runs but sends no logs

On the VM:

```bash
sudo grep -Ei \
  'error|warn|denied|forbidden|permission|failed' \
  /var/log/google-cloud-ops-agent/subagents/logging-module.log \
  | tail -n 100
```

The project encountered:

```text
Permission 'logging.logEntries.create' denied
```

The VM service account needed `roles/logging.logWriter`. After adding it and restarting/retrying, `labsync_docker_logs` appeared.

### Health-check timer

On the VM:

```bash
sudo install -m 0755 \
  /path/to/labsync-healthcheck.sh \
  /usr/local/bin/labsync-healthcheck

sudo install -m 0644 \
  /path/to/labsync-healthcheck.service \
  /etc/systemd/system/labsync-healthcheck.service

sudo install -m 0644 \
  /path/to/labsync-healthcheck.timer \
  /etc/systemd/system/labsync-healthcheck.timer

sudo systemctl daemon-reload
sudo systemctl enable --now labsync-healthcheck.timer
systemctl list-timers labsync-healthcheck.timer --all --no-pager
```

### Function and meaning

- The timer runs every minute.
- The script retries health three times.
- Repeated failure logs `LABSYNC_HEALTHCHECK_FAILED`.
- Log-based alerts can notify on that marker.
- CPU and root-disk alerts cover infrastructure saturation.

### Exit check

Health requests appear in Cloud Logging, the timer is active, and a controlled synthetic failure can trigger the configured alert path.

## 16. Stage 13 - PostgreSQL backups, retention, and restore drill

### Objective

Create verified off-VM backups and prove they can restore without overwriting production.

### Configure the backup service

On the VM:

```bash
printf '%s\n' \
  'LABSYNC_BACKUP_BUCKET=gs://labsync-postgres-backups-643707423333' \
  | sudo tee /etc/labsync-backup.conf > /dev/null

sudo chmod 0644 /etc/labsync-backup.conf
sudo systemctl daemon-reload
sudo systemctl enable --now labsync-backup.timer
```

Run one backup immediately:

```bash
sudo systemctl start labsync-backup.service
sudo journalctl \
  -u labsync-backup.service \
  -n 100 \
  --no-pager \
  -o cat
```

### Function and meaning

The backup script:

- uses `pg_dump --format=custom`;
- rejects an empty file;
- validates it with `pg_restore --list`;
- calculates SHA-256;
- uploads dump and checksum;
- reads the remote checksum back;
- logs success/failure;
- deletes temporary local data.

The timer runs daily around 02:00 UTC with randomized delay. A 30-day bucket lifecycle rule limits retention and cost.

### List backups

On the VM:

```bash
/snap/google-cloud-cli/current/bin/gcloud storage ls \
  --recursive \
  gs://labsync-postgres-backups-643707423333/postgres/
```

### Restore drill

Never restore a drill into production database `labsync`.

Create a protected workspace on the VM:

```bash
RESTORE_DIR=$(mktemp -d /var/tmp/labsync-restore.XXXXXX)
chmod 700 "$RESTORE_DIR"
```

Download the chosen `.dump` and `.sha256`, then validate from that directory:

```bash
cd "$RESTORE_DIR"
sha256sum --check *.sha256
```

Create an isolated database:

```bash
BACKUP_FILE="$(find "$RESTORE_DIR" -maxdepth 1 -name '*.dump' -print -quit)"
RESTORE_DB="labsync_restore_$(date -u +%Y%m%d_%H%M%S)"

docker exec labsync-db-1 \
  createdb --username=labsync "$RESTORE_DB"

docker exec -i labsync-db-1 \
  pg_restore \
    --username=labsync \
    --dbname="$RESTORE_DB" \
    --no-owner \
    --no-privileges \
  < "$BACKUP_FILE"

docker exec labsync-db-1 \
  psql \
    --username=labsync \
    --dbname="$RESTORE_DB" \
    --command='\dt'
```

Expected tables:

```text
alembic_version
appointment_tests
appointments
laboratory_tests
patients
users
```

### Function and meaning

- `mktemp -d` creates a unique, safely permissioned work directory.
- `sha256sum --check` proves the downloaded bytes match the uploaded artifact.
- `createdb` isolates the drill.
- `--no-owner --no-privileges` avoids restoring environment-specific ownership/grants.
- `\dt` proves the schema was reconstructed.

Drop only the validated temporary database after comparison. Never form a destructive command from an unchecked variable.

### Exit check

The checksum passes, all six tables restore into the isolated database, representative row counts match, and production remains healthy.

## 17. Stage 14 - IAM and VM security hardening

### Objective

Remove broad or legacy access after deployment and operations are proven.

### Inspect VM service account and scopes

From local Git Bash:

```bash
gcloud compute instances describe labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --format="yaml(serviceAccounts)"
```

### Inspect IAM roles

```bash
VM_SA="643707423333-compute@developer.gserviceaccount.com"
DEPLOYER_SA="labsync-deployer@labsync-devops.iam.gserviceaccount.com"

gcloud projects get-iam-policy labsync-devops \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${VM_SA}" \
  --format="table(bindings.role)"

gcloud projects get-iam-policy labsync-devops \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${DEPLOYER_SA}" \
  --format="table(bindings.role)"
```

### Check for user-managed service-account keys

```bash
for SA in "$VM_SA" "$DEPLOYER_SA"; do
  echo "Keys for $SA"
  gcloud iam service-accounts keys list \
    --iam-account="$SA" \
    --project=labsync-devops \
    --managed-by=user \
    --format="table(name.basename(),validAfterTime,validBeforeTime)"
done
```

Empty output is the desired result.

### Firewall review

```bash
gcloud compute firewall-rules list \
  --project=labsync-devops \
  --format="table(name,direction,priority,sourceRanges,allowed,targetTags,disabled)"
```

SSH should be allowed from IAP range `35.235.240.0/20` only for the target tag. The public RDP rule remains disabled.

### OS Login verification

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --command="echo OS Login successful"
```

### Remove broad deployer role after proof

```bash
gcloud projects remove-iam-policy-binding labsync-devops \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role="roles/compute.instanceAdmin.v1"
```

Run deployment again after removal. Success proves the role was unnecessary.

### Exit check

- OS Login and IAP succeed.
- Legacy metadata SSH access is removed.
- No user-managed service-account keys exist.
- The deployer lacks Compute Instance Admin but can still deploy.
- Secret and backup permissions are granted on specific resources.

## 18. Stage 15 - release v0.3.4 and controlled rollback

### Objective

Publish a formal release, verify the exact images in production, and prove a bad release does not replace the working service.

### Pre-release validation

Run Backend CI, Frontend CI, and Container CI manually if path filters did not trigger them. All three must be green.

### Tag and publish

From local Git Bash in the repository root:

```bash
git status
git tag -a v0.3.4 -m "LabSync 0.3.4"
git push origin v0.3.4
```

The tag triggers **Publish Container Images**, which calls **Deploy to GCP** after both images publish.

### Verify running images

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --command="sudo -u isuma docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"
```

Backend and frontend must show `:0.3.4` and healthy.

### Verify health

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --command="curl -fsS http://127.0.0.1:3000/api/health"
```

### Controlled rollback test

In GitHub Actions, manually run **Deploy to GCP** with nonexistent semantic version:

```text
99.99.99
```

The workflow should fail because the images do not exist. The deployment error trap restores the prior release configuration and starts the known-good stack.

Repeat the image and health verification commands. Production must remain on `0.3.4` and return `healthy`.

### Function and meaning

- The intentionally red workflow proves rejection of an invalid release.
- Automatic rollback protects application availability when pulling, startup, or health verification fails.
- Database migrations require separate backward-compatibility planning; image rollback alone cannot reverse destructive schema changes.

### Exit check

Release `v0.3.4` is published, deployed, healthy, and preserved after the controlled failure.

## 19. Stage 16 - routine operation and cost control

### Objective

Operate the portfolio environment safely without unnecessary compute cost.

### Start the VM

Run locally:

```bash
gcloud compute instances start labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a
```

### Open the private application tunnel

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --ssh-flag="-L 3000:127.0.0.1:3000"
```

Open `http://localhost:3000` while the SSH session remains active.

### Stop after the demonstration

```bash
gcloud compute instances stop labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a
```

### Routine checklist

- Confirm VM and container health before a demonstration.
- Check the latest backup and timer status.
- Review recent alerts and error logs.
- Confirm the expected release image versions.
- Test login and one representative workflow.
- Stop the VM afterward.
- Review GCP billing even when compute is stopped; disk, storage, logging, and registry resources can still incur charges.

## 20. Command decision guide

| Need | Command or location | Why |
|---|---|---|
| Check local app health | `curl http://localhost:8000/health` | Calls FastAPI directly |
| Check deployed full path | `curl http://127.0.0.1:3000/api/health` on VM | Tests frontend rewrite plus backend |
| See running images | `docker ps --format ...` | Avoids Compose interpolation when secrets are temporary |
| Diagnose a container | `docker logs --since 15m NAME` | Shows recent process output |
| Diagnose systemd service | `journalctl -u SERVICE` | Shows service lifecycle and script errors |
| Validate Compose only | `docker compose ... config --quiet` | Detects syntax/interpolation errors without changes |
| Apply schema | `python -m alembic upgrade head` | Brings database to required revision |
| Validate Python packages | `python -m pip check` | Detects incompatible requirements |
| Reproducible Node install | `npm ci` | Follows lock file exactly |
| Inspect fixable image CVEs | `docker scout cves --only-fixed ...` | Focuses on actionable findings |
| Reach private VM | `gcloud compute ssh ... --tunnel-through-iap` | Uses IAM-controlled IAP path |
| List secret metadata | `gcloud secrets versions list ...` | Reviews rotation without exposing payload |
| Run backup now | `systemctl start labsync-backup.service` | Executes the oneshot backup |
| Check scheduled tasks | `systemctl list-timers ...` | Shows next/last timer runs |

## 21. Common errors and their meanings

| Error | Meaning | Correct response |
|---|---|---|
| `Copy-Item: command not found` | PowerShell command entered in Git Bash | Use `cp` or switch shell |
| `No module named fastapi` | Wrong Python environment ran Pytest | Activate `.venv`; run `python -m pytest` |
| PostgreSQL password failed | Role password and configured URL differ | Reset role password and synchronize config |
| Connection refused to `localhost:5432` in backend container | Container tried to reach itself | Use Compose hostname `db` |
| Docker DB password failed after `.env` change | Existing volume retained old role password | Change DB role password or intentionally recreate volume |
| `No such image: sha256...` | Stale Compose/image metadata | Inspect running containers directly and rebuild cleanly |
| Frontend `/api/health` is 404 | Next.js production rewrite missing/stale | Fix rewrite, rebuild, republish, recreate frontend |
| Version rejected although it looks correct | Hidden leading/trailing whitespace | Trim workflow input before regex validation |
| Ops Agent running but no custom logs | Agent lacks write permission or pipeline mismatch | Inspect agent log; grant exact logging role |
| `storage.objects.* denied` | VM bucket role lacks an operation used by gcloud | Adjust resource-level custom role, not project admin |
| Backup systemd `unknown flag: --env-file` | Wrong Docker/Compose execution context | Use direct `docker exec` in backup script |
| Cloud login says incorrect credentials and `users` is empty | New cloud database has schema but no seed data | Create production administrator or explicitly restore data |
| `cd /opt/labsync: Permission denied` | OS Login username differs from app owner | Run operational command with `sudo -u isuma` |
| Compose reports missing production secrets | Persistent `.env.release` is intentionally secretless | Deploy through `deploy-release.sh` runtime env |

## 22. Stage completion matrix

| Stage | Evidence of completion | Repository/cloud evidence |
|---|---|---|
| Backend and database | Health endpoint and migrations pass | `backend/`, Alembic history |
| Phase 1 application | 30 tests and full role workflow pass | `backend/tests/`, `frontend/` |
| Local containers | Three healthy services with persistent DB | `compose.yaml`, Dockerfiles |
| Container security | Non-root and Scout gate pass | `container-ci.yml` |
| CI | Backend, frontend, container workflows green | `.github/workflows/` |
| Registry | Versioned backend/frontend images exist | GHCR packages |
| Cloud deployment | VM containers and health show release | `deploy-gcp.yml`, deploy script |
| Keyless identity | GitHub deployment has no SA JSON key | WIF provider and IAM policy |
| Secrets | Persistent release env is secretless | Secret Manager and runtime file logic |
| Observability | Custom Docker logs and alerts exist | Ops Agent and health-check files |
| Recovery | Backup checksum and isolated restore pass | Backup script, bucket, restore evidence |
| Hardening | IAP/OS Login, no user keys, reduced deployer role | IAM and firewall review |
| Release | `v0.3.4` healthy; bad version rolls back | tag, GitHub Release, workflow logs |

## 23. What the complete workflow means

The project’s delivery loop can be summarized as:

```text
Plan a small change
  -> implement it in modular application code
  -> validate locally
  -> commit and push
  -> CI tests, builds, audits, and scans
  -> create a semantic release tag
  -> publish immutable images with SBOM/provenance
  -> authenticate keylessly to GCP
  -> retrieve secrets only when required
  -> deploy the exact version
  -> verify health
  -> observe logs and metrics
  -> back up data
  -> rehearse rollback and restore
  -> document what was learned
```

The tools are important, but the workflow’s meaning is more important: every stage adds evidence that the next change can be made safely. Tests protect functionality, image scanning protects the software supply chain, identity controls protect infrastructure, health and rollback protect availability, and restore drills protect data.

## Appendix A - files that implement the workflow

| Workflow area | Files |
|---|---|
| Backend CI | `.github/workflows/backend-ci.yml` |
| Frontend CI | `.github/workflows/frontend-ci.yml` |
| Container CI | `.github/workflows/container-ci.yml` |
| Image publication | `.github/workflows/publish-images.yml` |
| GCP deployment | `.github/workflows/deploy-gcp.yml` |
| Release orchestration | `compose.release.yaml`, `.env.release.example` |
| Health-checked rollback | `scripts/deploy-release.sh` |
| Ops Agent logging | `ops/ops-agent/config.yaml` |
| Health timer | `ops/healthcheck/` |
| Backup timer and script | `ops/backups/` |
| Operational runbooks | `docs/operations/` |

## Appendix B - safety rules

1. Run commands in the shell and directory stated by the stage.
2. Stop when an exit check fails; do not stack later changes on an unknown state.
3. Never use `docker compose down --volumes` during routine operation.
4. Never restore a drill into the production database.
5. Never paste or commit secret values.
6. Never destroy the previous secret version immediately after rotation.
7. Never bypass a security gate without documented risk acceptance.
8. Never use `latest` as the production rollback target.
9. Verify both container state and user-facing health after deployment.
10. Keep the VM stopped when it is not needed, while monitoring residual charges.

