# SAN SOLUTION — SIM Management System

A production-ready web application for managing SIM cards across client companies, machinery,
renewals, expiry notifications, reports and audit history.

## Stack

- **Web:** React 19, TypeScript, Vite 6, Tailwind CSS, shadcn/ui, React Router, TanStack Query,
  React Hook Form, Zod, Recharts
- **API:** Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Background jobs:** pg-boss (PostgreSQL-backed queue, scheduled daily scan at 09:00 IST)
- **Email:** Nodemailer (SMTP or development log transport)
- **Security:** Argon2id passwords, opaque hashed session tokens, RBAC, CSRF origin checks, rate limiting
- **Tests:** Vitest, Supertest, Playwright

## Repository layout

```text
apps/
  api/        Express + Prisma + pg-boss API and worker
  web/        React + Vite single-page application
packages/
  shared/     Shared enums, date helpers, Zod schemas and DTO types
docs/         Architecture, schema, API, deployment, backup, admin and test guides
render.yaml   Render deployment blueprint
```

## Quick start (local)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL 17 and create the development database:

   ```bash
   # any local PostgreSQL 17 instance on port 5433
   createdb -U postgres san_sim_dev
   ```

3. Configure the API:

   ```bash
   cp apps/api/.env.example apps/api/.env
   # edit apps/api/.env and set SESSION_SECRET (>= 32 chars)
   ```

4. Generate the Prisma client, run migrations and seed demo data:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start the API and worker (two terminals):

   ```bash
   npm run dev -w @san/api
   npm run dev:worker -w @san/api
   ```

6. Start the web application:

   ```bash
   npm run dev -w @san/web
   ```

7. Open `http://localhost:5173` and sign in with the seeded administrator account
   (`admin@sansolution.in` / `Admin@12345` by default).

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run API and web together |
| `npm run build` | Build API and web for production |
| `npm run typecheck` | Type-check all workspaces |
| `npm run test -w @san/api` | Run API unit and integration tests |
| `npm run test:e2e -w @san/web` | Run Playwright end-to-end tests |
| `npm run db:migrate -w @san/api` | Create/apply a development migration |
| `npm run db:deploy -w @san/api` | Apply migrations in production |
| `npm run db:seed -w @san/api` | Seed roles, administrator and demo data |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Backup and restore](docs/BACKUP_RESTORE.md)
- [Administrator guide](docs/ADMIN_GUIDE.md)
- [Testing](docs/TESTING.md)
- [Development checklist](docs/DEVELOPMENT_CHECKLIST.md)
- [Migration history](docs/MIGRATIONS.md)

## Security notes

- SMTP credentials are read only from environment variables; no production credentials are committed.
- Session tokens are opaque, HMAC-SHA256 hashed and stored in PostgreSQL with expiry and revocation.
- Business records are archived (soft-deleted), never hard-deleted by normal operations.
- The API never exposes raw database access; the React client calls authenticated REST endpoints only.
