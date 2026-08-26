# Deployment and rollback

## Normal release

1. Confirm backend, frontend, and container CI are green.
2. Publish a semantic image version through the release workflow.
3. Run the `Deploy to GCP` workflow with the published version, such as
   `0.3.4`.
4. Confirm the workflow's health verification succeeds.
5. Open an IAP tunnel and perform the smoke tests below.

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap \
  --ssh-flag="-L 3000:127.0.0.1:3000"
```

From another terminal:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

In a private browser window, verify login, dashboard, patients, appointments,
test catalog, and reports at `http://localhost:3000`.

## Automatic rollback

`scripts/deploy-release.sh` preserves the prior non-secret release settings.
If image pulling, container startup, or the 150-second health check fails, it
restores the prior image configuration and starts the previous release.

## Manual rollback

Run the `Deploy to GCP` workflow with the last known-good image version. Do not
change database or JWT secrets during an image rollback.

After rollback, verify health and review:

```bash
sudo -u isuma docker ps --filter name=labsync
sudo -u isuma docker logs --since 15m labsync-backend-1
sudo -u isuma docker logs --since 15m labsync-frontend-1
```

Record the failed version, error, rollback version, start time, recovery time,
and follow-up action.

