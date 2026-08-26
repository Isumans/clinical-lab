# Backup and restore

## Daily backup

The `labsync-backup.timer` runs at approximately 02:00 UTC with up to 15
minutes of randomized delay. It creates a PostgreSQL custom-format dump,
validates it, uploads the dump and SHA-256 checksum to the private bucket, and
verifies the uploaded checksum. Objects under `postgres/` expire after 30 days.

```bash
systemctl list-timers labsync-backup.timer --all --no-pager
sudo systemctl start labsync-backup.service
sudo journalctl -u labsync-backup.service -n 100 --no-pager -o cat
```

List backups without exposing their contents:

```bash
/snap/google-cloud-cli/current/bin/gcloud storage ls --recursive \
  gs://labsync-postgres-backups-643707423333/postgres/
```

## Restore drill

Never restore a drill directly into the production `labsync` database.

1. Download a `.dump` and matching `.sha256` into a mode-700 temporary
   directory under `/var/tmp`.
2. Run `sha256sum --check` from that directory.
3. Create a database named `labsync_restore_YYYYMMDD_HHMMSS`.
4. Restore with `pg_restore --no-owner --no-privileges`.
5. Compare table and row counts with production.
6. Drop only a database whose name starts with `labsync_restore_`.
7. Remove only the validated temporary restore directory.

Example restore commands:

```bash
docker exec labsync-db-1 createdb --username=labsync "$RESTORE_DB"
docker exec -i labsync-db-1 pg_restore \
  --username=labsync --dbname="$RESTORE_DB" \
  --no-owner --no-privileges < "$BACKUP_FILE"
docker exec labsync-db-1 psql \
  --username=labsync --dbname="$RESTORE_DB" --command='\dt'
```

Treat a backup as usable only after its checksum and restore have both been
validated.

