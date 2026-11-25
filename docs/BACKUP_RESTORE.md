# Backup and restore

## Database backups

Use standard PostgreSQL tooling:

```bash
# Backup
pg_dump --format=custom --file=san_sim_$(date +%F).dump "$DATABASE_URL"

# Restore
pg_restore --clean --if-exists --dbname="$DATABASE_URL" san_sim_YYYY-MM-DD.dump
```

For Supabase, use the built-in daily backups or `pg_dump` against the connection string.

## Application data

- Uploaded import files are processed in memory and are not stored.
- Email delivery metadata is stored in the `notifications` table.
- Audit history is stored in `activity_logs`.

## Recommended schedule

- Daily automated `pg_dump` to object storage.
- Weekly restore drill into a staging database.
- Keep at least 30 days of backups.

## Disaster recovery

1. Provision a new PostgreSQL database.
2. Restore the latest dump.
3. Update `DATABASE_URL`.
4. Redeploy the API and worker.
5. Run `npm run db:deploy -w @san/api` to ensure migrations are current.
6. Verify `/api/health` and sign in.
