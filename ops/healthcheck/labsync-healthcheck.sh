#!/usr/bin/env bash

set -u

readonly HEALTH_URL="http://127.0.0.1:3000/api/health"

for attempt in 1 2 3; do
  if curl --fail --silent --show-error --max-time 5 "${HEALTH_URL}" >/dev/null; then
    exit 0
  fi

  if [[ "${attempt}" -lt 3 ]]; then
    sleep 5
  fi
done

logger --priority daemon.err --tag labsync-healthcheck \
  "LABSYNC_HEALTHCHECK_FAILED endpoint=${HEALTH_URL} attempts=3"

exit 1
