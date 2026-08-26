# Security and access

## VM access

The VM uses OS Login and IAP. Port 22 accepts traffic only from the IAP TCP
forwarding range. The application binds to `127.0.0.1:3000` and is not publicly
exposed.

```bash
gcloud compute ssh labsync-vm \
  --project=labsync-devops \
  --zone=asia-south1-a \
  --tunnel-through-iap
```

Do not re-enable metadata SSH keys or the public RDP firewall rule.

## Workload identities

- GitHub Actions uses Workload Identity Federation restricted to
  `Isumans/clinical-lab`.
- The deployer uses OS Login, IAP, and service-account-user permissions; it
  does not have Compute Instance Admin.
- The VM service account has logging and monitoring roles at project scope.
- Secret access and backup upload access are granted on individual resources.
- Neither service account should have user-managed keys.

## Secrets

The PostgreSQL password and JWT signing secret live in Secret Manager. The
persistent `/opt/labsync/.env.release` file must not contain:

```text
POSTGRES_PASSWORD
LABSYNC_DATABASE_URL
LABSYNC_JWT_SECRET_KEY
```

Deployments retrieve the latest enabled secret versions into a mode-600
temporary file and remove it on exit. Rotate secrets by adding a version,
deploying and testing, then disabling—not immediately destroying—the previous
version.

## GHCR

The VM credential must use a classic GitHub PAT with only `read:packages`, an
expiration date, and mode-600 Docker configuration. GitHub Actions publishes
with its short-lived `GITHUB_TOKEN`.

