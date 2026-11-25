# Migration history

## 20261125060040_init

Initial database schema for SAN SOLUTION SIM Management:

- roles, users, sessions, password_reset_tokens
- companies, contacts, machines
- sims, sim_assignments, sim_renewals
- notification_settings, notifications
- activity_logs, system_settings
- enums for providers, statuses, reminder types and notification statuses
- partial unique indexes for active assignments and primary contacts
- `sim_internal_id_seq` sequence for auto-generated SIM IDs

Apply in production with:

```bash
npm run db:deploy -w @san/api
```
