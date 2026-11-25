# Deployment

## Render (recommended)

The repository ships a `render.yaml` blueprint that provisions:

- one web service running the API and serving the built SPA
- one background worker running the pg-boss consumer
- one managed PostgreSQL 17 database

### Steps

1. Push the repository to GitHub.
2. In Render, choose **New + > Blueprint** and select the repository.
3. Fill in the `sync: false` environment variables (app URL, SMTP, seed admin credentials).
4. Set `SEED_DEMO_DATA=false` in production.
5. After the first deploy, run the seed once if you need the initial administrator:

   ```bash
   npm run db:seed -w @san/api
   ```

   or create the administrator through a one-off shell in Render.

### Build and start commands

- Web service build: `npm install && npm run build -w @san/api && npm run build -w @san/web`
- Web service start: `node apps/api/dist/index.js`
- Worker build: `npm install && npm run build -w @san/api`
- Worker start: `node apps/api/dist/worker.js`

`SERVE_WEB=true` makes the API serve `apps/web/dist` and fall back to `index.html`
for client-side routes.

## Supabase PostgreSQL

The application uses standard PostgreSQL features only. To use Supabase:

1. Create a project and copy the connection string.
2. Set `DATABASE_URL` to the Supabase connection string (with `sslmode=require`).
3. Run `npm run db:deploy -w @san/api`.
4. Run the seed if required.

No Supabase-specific client or feature is used, so the application can move to any
PostgreSQL provider without code changes.
