# Monitoring and incident response

## Monitoring coverage

Cloud Monitoring and Logging cover:

- application health-check failures;
- high CPU usage;
- high root-disk usage;
- application error logs;
- PostgreSQL backup failures;
- Docker container logs through the Google Cloud Ops Agent.

Docker log query:

```text
resource.type="gce_instance"
resource.labels.instance_id="3617231187814833431"
log_id("labsync_docker_logs")
```

Backup failure query:

```text
resource.type="gce_instance"
resource.labels.instance_id="3617231187814833431"
"Backup failed with exit code"
```

## Initial response

1. Acknowledge the alert and record its timestamp.
2. Confirm VM and container status.
3. Review recent service and container logs.
4. Avoid deleting containers, volumes, backups, or secret versions while
   diagnosing.
5. Roll back only when a deployment caused the incident.
6. Confirm health and user-facing behavior after recovery.

```bash
gcloud compute instances describe labsync-vm \
  --project=labsync-devops --zone=asia-south1-a \
  --format='value(status)'
sudo -u isuma docker ps --filter name=labsync
curl -fsS http://127.0.0.1:3000/api/health
sudo journalctl -u labsync-backup.service -n 100 --no-pager -o cat
```

Document impact, cause, remediation, recovery time, and a preventative action.

