# API reference

All endpoints are mounted under `/api`. Authentication uses an HTTP-only session cookie.
Unsafe methods require a valid browser origin (CSRF defence-in-depth).

## Authentication

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `PATCH /api/auth/profile`

## Dashboard

- `GET /api/dashboard`

## SIMs

- `GET /api/sims` (search, provider, companyId, status, validity, sort, page, pageSize)
- `POST /api/sims`
- `GET /api/sims/:id`
- `PATCH /api/sims/:id`
- `POST /api/sims/:id/assign`
- `POST /api/sims/:id/unassign`
- `POST /api/sims/:id/renew`
- `POST /api/sims/:id/archive`
- `GET /api/sims/:id/assignments`
- `GET /api/sims/:id/renewals`
- `GET /api/sims/export?format=csv|xlsx`
- `GET /api/sims/import-template?format=csv|xlsx`
- `POST /api/sims/import` (multipart `file`, optional `dryRun`)

## Companies

- `GET /api/companies`
- `POST /api/companies`
- `GET /api/companies/:id`
- `PATCH /api/companies/:id`
- `POST /api/companies/:id/archive`
- `GET /api/companies/:id/contacts`
- `GET /api/companies/:id/sims`
- `GET /api/companies/:id/renewals`

## Machinery

- `GET /api/machines`
- `POST /api/machines`
- `GET /api/machines/:id`
- `PATCH /api/machines/:id`
- `POST /api/machines/:id/archive`

## Expiry and renewals

- `GET /api/expiry/summary`
- `GET /api/expiry/upcoming`
- `GET /api/expiry/expired`
- `GET /api/expiry/renewals`
- `GET /api/expiry/renewal-stats`
- `GET /api/renewals`

## Notifications

- `GET /api/notifications`
- `GET /api/notifications/:id`
- `GET /api/notifications/stats`
- `GET /api/notifications/settings`
- `PUT /api/notifications/settings`
- `GET /api/notifications/email-config`
- `POST /api/notifications/test-email`
- `POST /api/notifications/scan`
- `POST /api/notifications/:id/retry`

## Reports

- `GET /api/reports` (reportType, format=json|csv|xlsx|pdf, filters)

## Activity

- `GET /api/activity`

## Users and roles

- `GET /api/users/roles`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `POST /api/users/:id/reset-password`
- `POST /api/users/:id/archive`

## Settings

- `GET /api/settings`
- `PUT /api/settings/organization`
- `PUT /api/settings/preferences`

## Lookups

- `GET /api/lookups/companies`
- `GET /api/lookups/companies/:companyId/machines`
- `GET /api/lookups/companies/:companyId/contacts`

## Health

- `GET /api/health`
- `GET /health`

All list endpoints return `{ items, pagination }`. Mutating endpoints return the affected
resource or `204 No Content`.
