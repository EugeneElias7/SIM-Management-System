# Database schema

The canonical schema is defined in `apps/api/prisma/schema.prisma` and applied through
Prisma migrations. All primary keys are UUIDs.

## Core entities

- `roles`, `users`, `sessions`, `password_reset_tokens`
- `companies`, `contacts`
- `machines`
- `sims`
- `sim_assignments` (permanent assignment history)
- `sim_renewals` (permanent renewal history)
- `notification_settings`, `notifications`
- `activity_logs`
- `system_settings`

## Important constraints

- Unique: `users.email`, `companies.name`, `machines.serialNumber`, `sims.internalId`,
  `sims.mobileNumber`, `sims.iccid`, `sims.imsi`, `sessions.tokenHash`,
  `password_reset_tokens.tokenHash`, `notifications.idempotencyKey`, `roles.name`.
- Partial unique indexes (added in the initial migration):
  - one active `sim_assignment` per SIM (`WHERE "isActive" = true`)
  - one primary `contact` per company (`WHERE "isPrimary" = true AND "archivedAt" IS NULL`)
- `sims.machineId` is unique, so a machine can host at most one SIM.
- `sim_internal_id_seq` generates `SIM-0001`, `SIM-0002`, … when no internal ID is supplied.

## Archival

Business records are never hard-deleted by application operations. Companies, contacts,
machines, SIMs and users carry an `archivedAt` timestamp; archived rows are excluded from
normal lists but retained for history, reporting and audit.

## Migrations

Migrations live in `apps/api/prisma/migrations`. See [MIGRATIONS.md](MIGRATIONS.md).
