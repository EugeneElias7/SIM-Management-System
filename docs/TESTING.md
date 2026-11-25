# Testing

## API

```bash
npm run test -w @san/api
```

- Unit tests: `apps/api/src/jobs/expiry-scan.test.ts` covers reminder candidate logic
  and idempotency key generation.
- Integration tests: `apps/api/src/tests/integration.test.ts` uses Supertest against the
  Express app and a PostgreSQL test database.

## Web type checking and build

```bash
npm run typecheck -w @san/web
npm run build -w @san/web
```

## End-to-end

```bash
npm run test:e2e -w @san/web
```

Playwright starts the Vite dev server (and the API through the Vite proxy) and runs
`tests/e2e/smoke.spec.ts`.

## Manual verification checklist

- Sign in and sign out
- Create, edit, assign, unassign, renew and archive a SIM
- Create a company with a primary contact and view its tabs
- Register and archive machinery
- Run an expiry scan and retry a failed notification
- Generate CSV, Excel and PDF reports
- Import a CSV/XLSX file (dry run and commit)
- Update organization and preference settings
- Create and archive a user account
