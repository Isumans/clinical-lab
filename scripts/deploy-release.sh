#!/usr/bin/env bash

set -Eeuo pipefail

readonly VERSION="${1:-}"
readonly DEPLOY_DIR="/opt/labsync"
readonly ENV_FILE="${DEPLOY_DIR}/.env.release"
readonly COMPOSE_FILE="${DEPLOY_DIR}/compose.release.yaml"

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 <semantic-version-without-v>" >&2
  exit 2
fi

if [[ ! -f "${ENV_FILE}" || ! -f "${COMPOSE_FILE}" ]]; then
  echo "Release configuration is missing from ${DEPLOY_DIR}." >&2
  exit 1
fi

cd "${DEPLOY_DIR}"

backup_file="$(mktemp "${DEPLOY_DIR}/.env.release.backup.XXXXXX")"
cp --preserve=mode,ownership "${ENV_FILE}" "${backup_file}"

compose=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

rollback() {
  exit_code=$?
  echo "Deployment failed; restoring the previous image configuration." >&2
  cp --preserve=mode,ownership "${backup_file}" "${ENV_FILE}"
  "${compose[@]}" up -d --remove-orphans || true
  rm -f "${backup_file}"
  exit "${exit_code}"
}

trap rollback ERR

sed -i -E "s|^(BACKEND_IMAGE=ghcr.io/isumans/labsync-backend:).*|\1${VERSION}|" "${ENV_FILE}"
sed -i -E "s|^(FRONTEND_IMAGE=ghcr.io/isumans/labsync-frontend:).*|\1${VERSION}|" "${ENV_FILE}"
sed -i -E "s|^LABSYNC_APP_VERSION=.*|LABSYNC_APP_VERSION=${VERSION}|" "${ENV_FILE}"

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
rm -f "${backup_file}"
trap - ERR

echo "LabSync ${VERSION} deployed successfully."
