#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

BUCKET="${LABSYNC_BACKUP_BUCKET:?LABSYNC_BACKUP_BUCKET must be configured}"
GCLOUD_BIN="${LABSYNC_GCLOUD_BIN:-/snap/google-cloud-cli/current/bin/gcloud}"
DB_CONTAINER="${LABSYNC_DB_CONTAINER:-labsync-db-1}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_NAME="labsync-${TIMESTAMP}.dump"
WORK_DIR="$(mktemp -d /var/tmp/labsync-backup.XXXXXX)"
BACKUP_FILE="${WORK_DIR}/${BACKUP_NAME}"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
REMOTE_PREFIX="${BUCKET%/}/postgres/daily/$(date -u +%Y/%m/%d)"

cleanup() {
  rm -rf -- "$WORK_DIR"
}

on_error() {
  local exit_code=$?
  logger -t labsync-backup "Backup failed with exit code ${exit_code}"
  exit "$exit_code"
}

trap cleanup EXIT
trap on_error ERR

if [[ ! -x "$GCLOUD_BIN" ]]; then
  echo "Google Cloud CLI is not executable at ${GCLOUD_BIN}" >&2
  exit 1
fi

logger -t labsync-backup "Starting PostgreSQL backup ${BACKUP_NAME}"

docker exec "$DB_CONTAINER" \
  pg_dump \
    --username=labsync \
    --dbname=labsync \
    --format=custom \
    --no-owner \
    --no-privileges \
  > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "PostgreSQL produced an empty backup" >&2
  exit 1
fi

docker exec -i "$DB_CONTAINER" \
  pg_restore --list \
  < "$BACKUP_FILE" \
  > /dev/null

(
  cd "$WORK_DIR"
  sha256sum "$BACKUP_NAME" > "${BACKUP_NAME}.sha256"
)

"$GCLOUD_BIN" storage cp \
  "$BACKUP_FILE" \
  "$CHECKSUM_FILE" \
  "${REMOTE_PREFIX}/"

LOCAL_HASH="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
REMOTE_HASH="$("$GCLOUD_BIN" storage cat "${REMOTE_PREFIX}/${BACKUP_NAME}.sha256" | awk '{print $1}')"

if [[ "$LOCAL_HASH" != "$REMOTE_HASH" ]]; then
  echo "Uploaded backup checksum verification failed" >&2
  exit 1
fi

logger -t labsync-backup "Backup uploaded and verified: ${REMOTE_PREFIX}/${BACKUP_NAME}"
