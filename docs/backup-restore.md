# SQLite backup & restore

## Manual backup

Uses SQLite online backup API (not `cp` of a live DB):

```bash
pnpm db:backup
```

Creates `backups/app-<timestamp>.db`.

## Daily backup (cron example)

```cron
15 3 * * * cd /opt/gemkbr && pnpm db:backup >> /var/log/gemkbr-backup.log 2>&1
```

Store backups with personal data on infrastructure that meets RF personal data localization requirements.

## Before production migration

```bash
pnpm db:backup
pnpm db:migrate
```

## Restore procedure (must be tested)

1. Stop the app (`docker compose stop app outbox-worker`).
2. Keep the latest known-good backup aside.
3. Restore:

```bash
pnpm db:restore backups/app-YYYY-MM-DD.db
```

4. Start app and verify:
   - `/health/ready` returns 200
   - open catalog / create a test order in staging
5. Document the restore drill date in ops notes.

A backup without a verified restore drill is not considered complete.
