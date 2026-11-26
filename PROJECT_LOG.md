# PROJECT LOG — SAN SOLUTION SIM Management

## Implementation summary

### Backend
- Express + Prisma + PostgreSQL with full CRUD for companies, SIMs, machinery, users.
- Assignment and renewal history preserved permanently.
- Expiry scan with pg-boss: daily 09:00 IST cron, manual trigger, startup catch-up.
- Idempotent notifications with retry/backoff; cancel obsolete reminders.
- Reports: inventory, company-wise, expiry, renewals, custom; CSV/XLSX/PDF.
- SIM import (CSV/XLSX) with dry-run and validation.
- Settings: organization profile, app preferences, notification settings.
- RBAC, audit logging, soft archival, health endpoint.

### Frontend
- React + Vite SPA with all required pages.
- Premium soft minimalism surface system: `#F5F6F8` background, `#FCFCFD` surfaces, `#315F9D` primary, `#202B3A` text, `#788496` secondary, `#E7EAF0` borders.
- Mobile drawer navigation, partitioned scrolling, responsive tables/forms/dialogs.
- Motion: 150–250 ms transitions, `prefers-reduced-motion` respected.
- Country-code phone field with real flags, country/state dropdowns.
- Login screen: full-background industrial image, GSAP animations, solid white logo container.

### Tests
- 7 unit tests (expiry reminder logic, idempotency keys).
- 4 integration tests (health, auth, protected routes).
- Playwright smoke test.
- All workspaces typecheck and build successfully.

### Verification
- API health: ok, database up.
- Notifications: 35 sent, 1 failed, 0 pending.
- Desktop/tablet/mobile layouts reviewed; no horizontal overflow.
- Reduced-motion media query verified in CSS.


### Dashboard redesign
- Asymmetric 12-column grid: hero total SIMs card (5 cols), active (3), expiring (4).
- Second row: companies, machines, notifications, last scan as MiniStat cards.
- Charts: expiry timeline bar chart with vertical gradient + rounded corners; status distribution donut with center space, legend and tooltip.
- Bottom row: upcoming expiries table (7 cols) + recent activity (5 cols).
- Premium typography, generous spacing, soft shadows, restrained blue/semantic palette.
- Fully responsive: stacks to single column on mobile.


### Command centre dashboard redesign
- SIM Estate Overview with allocation progress and suspended/faulty/unassigned counts.
- Connectivity & Machinery Allocation: provider distribution (real data from SIM snapshot), companies, machines, assigned/unassigned stock; explicit note that live telemetry is not collected.
- Expiry & Renewal Intelligence: timeline, buckets, upcoming renewals, urgent expiry list.
- Notification Centre with sent/failed/pending from real notification stats, enabled status and last scan.
- SIM Inventory Snapshot compact table.
- Recent Activity timeline.
- Fully responsive stacked layout.


### ICCID and IMSI removal
- Removed fields from Prisma schema, shared types/schemas, mappers, SIM service, import/export, reports, search, seed data and frontend.
- Migration 20261126000000_remove_iccid_imsi drops iccid and imsi columns and their unique indexes without data loss.
- Duplicate detection now uses mobile number and internal SIM ID only.
- Import/export templates and preview updated.
- No application references remain (build artifacts regenerated).
- Tests: 11 API tests passed; typecheck and builds passed.

### Known follow-ups
- Configure production SMTP.
- Install Playwright browsers (`npx playwright install`).
- Production deploy and seed.
- Restore drill from backup.



