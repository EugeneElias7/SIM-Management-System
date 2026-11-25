# Administrator guide

## Roles

- **Administrator** — full access, including users, roles and settings.
- **Manager** — manages SIMs, companies, machinery, renewals and notifications.
- **Viewer** — read-only access to operational data and reports.

Roles and their permissions are seeded by `prisma/seed.ts` and can be reviewed on the
Settings page. Permission strings are defined in `packages/shared/src/enums.ts`.

## Initial administrator

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the seed. The seed creates
the account only if it does not already exist and never overwrites an existing password.

## Notification settings

Configure on the Notifications page:

- enable/disable reminders
- reminder days before expiry (default 30, 15, 7)
- on-expiry notification
- post-expiry weekly follow-ups and interval
- recipient and CC email lists
- test email delivery
- manual scan trigger

The daily scan runs at 09:00 IST. The worker performs a catch-up scan on startup if no
scan has been recorded for the current day.

## SMTP

Set `EMAIL_TRANSPORT=smtp` and the `SMTP_*` variables. With `EMAIL_TRANSPORT=log`,
emails are written to the API log and no network delivery is attempted.

## Archival

Archived records are hidden from normal lists but retained for history, reporting and
audit. Archive a SIM only after reassigning its active assignments.
