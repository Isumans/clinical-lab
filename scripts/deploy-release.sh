#!/usr/bin/env bash

set -Eeuo pipefail

readonly VERSION="${1:-}"
readonly DEPLOY_DIR="/opt/labsync"
readonly ENV_FILE="${DEPLOY_DIR}/.env.release"
readonly COMPOSE_FILE="${DEPLOY_DIR}/compose.release.yaml"
readonly GCLOUD_BIN="${LABSYNC_GCLOUD_BIN:-/snap/google-cloud-cli/current/bin/gcloud}"
readonly GCP_PROJECT_ID="labsync-devops"
readonly DB_PASSWORD_SECRET="labsync-postgres-password"
readonly JWT_SECRET="labsync-jwt-secret"

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 <semantic-version-without-v>" >&2
  exit 2
fi

if [[ ! -f "${ENV_FILE}" || ! -f "${COMPOSE_FILE}" ]]; then
  echo "Release configuration is missing from ${DEPLOY_DIR}." >&2
  exit 1
fi

if [[ ! -x "${GCLOUD_BIN}" ]]; then
  echo "Google Cloud CLI is not executable at ${GCLOUD_BIN}." >&2
  exit 1
fi

cd "${DEPLOY_DIR}"

backup_file="$(mktemp "${DEPLOY_DIR}/.env.release.backup.XXXXXX")"
cp --preserve=mode,ownership "${ENV_FILE}" "${backup_file}"
runtime_file="$(mktemp /var/tmp/labsync-runtime.XXXXXX)"
chmod 600 "${runtime_file}"

cleanup() {
  rm -f -- "${backup_file}" "${runtime_file}"
}

build_runtime_env() {
  local db_password jwt_secret

  db_password="$(
    "${GCLOUD_BIN}" secrets versions access latest \
      --secret="${DB_PASSWORD_SECRET}" \
      --project="${GCP_PROJECT_ID}"
  )"
  jwt_secret="$(
    "${GCLOUD_BIN}" secrets versions access latest \
      --secret="${JWT_SECRET}" \
      --project="${GCP_PROJECT_ID}"
  )"

  if [[ -z "${db_password}" || -z "${jwt_secret}" ]]; then
    echo "Secret Manager returned an empty secret." >&2
    return 1
  fi

  if [[ ! "${db_password}" =~ ^[A-Za-z0-9._~-]+$ ]]; then
    echo "The database password must remain URL-safe." >&2
    return 1
  fi

  if [[ "${jwt_secret}" == *$'\n'* || "${jwt_secret}" == *$'\r'* ]]; then
    echo "The JWT secret cannot contain line breaks." >&2
    return 1
  fi

  grep -Ev \
    '^(POSTGRES_PASSWORD|LABSYNC_DATABASE_URL|LABSYNC_JWT_SECRET_KEY)=' \
    "${ENV_FILE}" > "${runtime_file}"

  {
    printf 'POSTGRES_PASSWORD=%s\n' "${db_password}"
    printf 'LABSYNC_DATABASE_URL=postgresql+psycopg://labsync:%s@db:5432/labsync\n' \
      "${db_password}"
    printf 'LABSYNC_JWT_SECRET_KEY=%s\n' "${jwt_secret}"
  } >> "${runtime_file}"

  unset db_password jwt_secret
}

compose=(docker compose --env-file "${runtime_file}" -f "${COMPOSE_FILE}")

rollback() {
  exit_code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous image configuration." >&2
  cp --preserve=mode,ownership "${backup_file}" "${ENV_FILE}"
  build_runtime_env || true
  "${compose[@]}" up -d --remove-orphans || true
  exit "${exit_code}"
}

trap cleanup EXIT
trap rollback ERR

sed -i -E "s|^(BACKEND_IMAGE=ghcr.io/isumans/labsync-backend:).*|\1${VERSION}|" "${ENV_FILE}"
sed -i -E "s|^(FRONTEND_IMAGE=ghcr.io/isumans/labsync-frontend:).*|\1${VERSION}|" "${ENV_FILE}"
sed -i -E "s|^LABSYNC_APP_VERSION=.*|LABSYNC_APP_VERSION=${VERSION}|" "${ENV_FILE}"

build_runtime_env
"${compose[@]}" config --quiet
"${compose[@]}" pull
"${compose[@]}" up -d --remove-orphans

healthy=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error \
    "http://127.0.0.1:3000/api/health" >/dev/null; then
    healthy=true
    break
  fi
  sleep 5
done

if [[ "${healthy}" != "true" ]]; then
  echo "LabSync did not become healthy within 150 seconds." >&2
  false
fi

"${compose[@]}" ps
trap - ERR

echo "LabSync ${VERSION} deployed successfully."
