# Architecture

## Overview

SAN SOLUTION SIM Management is a monorepo with three deployable units:

1. **Web application** (`apps/web`) — React SPA served by the API in production.
2. **API** (`apps/api`) — Express REST API, Prisma ORM, PostgreSQL.
3. **Worker** (`apps/api` worker entry) — pg-boss consumer for expiry scans and email delivery.

## Request flow

```text
Browser (React SPA)
  -> HTTPS same-origin /api/*
    -> Express (helmet, CORS, request context, rate limit, origin check)
      -> Route modules (auth, RBAC middleware)
        -> Service layer (transactions, audit logging)
          -> Prisma -> PostgreSQL
```

## Key design decisions

- **Date-only handling:** business dates are stored as PostgreSQL `DATE` (UTC midnight) and
  serialized as `YYYY-MM-DD`. Validity status is derived from the expiry date; operational
  status is stored separately.
- **Sessions:** opaque tokens are generated with `crypto.randomBytes`, hashed with
  HMAC-SHA256 (peppered with `SESSION_SECRET`) and stored in the `sessions` table.
- **Idempotency:** expiry reminder keys are `sim:<id>:expiry:<date>:type:<type>:days:<n>:channel:EMAIL`,
  enforced by a unique index.
- **Soft deletion:** companies, contacts, machines, SIMs and users are archived via
  `archivedAt`; history tables are never deleted.
- **Audit:** every mutating operation writes an `activity_logs` row inside the same
  database transaction.
- **Time zone:** application dates use `Asia/Kolkata`; the daily scan runs at `0 9 * * *`
  in `Asia/Kolkata` (03:30 UTC).
- **Queue:** pg-boss reuses the application PostgreSQL database (schema `pgboss`), so no
  separate broker is required.

## Background jobs

- `expiry-scan` queue: daily scheduled scan plus manual trigger. Creates idempotent
  notification rows and re-queues failed/pending deliveries.
- `email-send` queue: delivers one notification email with exponential backoff retries.
- Worker performs a startup catch-up scan when no scan has been recorded for the current day.

## Security

- Argon2id password hashing with OWASP-recommended parameters.
- RBAC permissions stored on roles and copied into the session at authentication time.
- CSRF defence-in-depth via `Origin`/`Referer` validation on unsafe methods.
- Rate limiting on authentication, imports, reports and global API traffic.
- Security headers via Helmet, including a restrictive Content Security Policy.
