# Visitor Data Management — Sunaidi Expo

A React + Vite + TypeScript app backed by **Supabase** (Postgres + Auth + RLS).
The UI is a faithful rebuild of the original design prototype; data, authentication
and authorization now run against a real database.

## Prerequisites

- Node 20+ (developed on Node 22)
- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker (for the local stack)

## 1. Start the backend (Supabase)

```bash
cd app
supabase start              # boots Postgres, Auth, Studio, Edge Functions locally
supabase db reset           # applies migrations (supabase/migrations) + seed.sql
```

`supabase start` prints your local **API URL**, **anon key** and **service_role
key** (also available any time via `supabase status`).

Seed the four demo users (creates the auth accounts; the DB trigger creates their
profiles with roles/permissions):

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`> \
node supabase/seed-users.mjs
```

Serve the Edge Functions (WATI send + call-API test + admin user provisioning):

```bash
supabase functions serve
```

## 2. Configure the frontend

```bash
cp .env.example .env.local
# then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from `supabase status`
```

## 3. Run the app

```bash
npm install
npm run dev          # http://localhost:5173/
```

### Demo logins (all use password `expo2026`)

| Email                       | Role        | Permissions             |
|-----------------------------|-------------|-------------------------|
| `admin@sunaidiexpo.com`     | Admin       | full + Admin tab        |
| `marketing@sunaidiexpo.com` | Marketing   | edit                    |
| `cleanup@sunaidiexpo.com`   | Data Entry  | edit, delete, call      |
| `calls@sunaidiexpo.com`     | Tele-caller | call                    |

The login screen is prefilled — click **Sign In** for the marketing user, or toggle
**Admin** to prefill the admin account.

## Other scripts

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
npm run lint      # eslint
```

## Project structure

### Frontend (`src/`)
- `hooks/useAppState.ts` — app state + handlers (auth, loads, mutations via the API layer)
- `lib/supabase.ts` — Supabase browser client
- `lib/api.ts` — data-access layer (reads/writes, row ↔ type mappers)
- `components/` — one component per tab (Dashboard, Visitors, Cleanup, Calls,
  Campaigns, Reports, Admin) plus the app shell and toast
- `components/modals/` — edit visitor, invitation history, new campaign, active
  call, add user / WATI / call API, rename event
- `data/seed.ts` — message templates (and reference copy of the seed data)

### Backend (`supabase/`)
- `migrations/0001_init.sql` — schema: enums, tables, triggers, helper functions
- `migrations/0002_rls.sql` — row-level security policies + new-user trigger
- `seed.sql` — seed data for the data tables (run by `supabase db reset`)
- `seed-users.mjs` — creates the demo auth users via the admin API
- `functions/send-campaign` — groups recipients by event, records campaigns using
  each event's WATI line (**WATI delivery is mocked** — real send wired later)
- `functions/test-call-api` — simulated call-provider connectivity check
- `functions/admin-users` — admin-only user create / password reset (service role)

## Authorization model

RLS enforces access in the database, not just the UI:
- Everyone authenticated can **read** core data; the **audit log** is admin-only.
- Writes are gated by role (`Admin`) or granular permissions (`edit` / `delete` /
  `call`) stored per-profile and toggled from Admin → Users & access.
- Admin-only tables: events, call APIs, WATI connections, settings, profiles.

## Integrations (added later from the Admin dashboard)

WATI WhatsApp and the call provider are **admin-managed config**: connection
records (sender numbers, API keys, caller IDs) are stored and edited in the Admin
tab, and sends/tests are simulated by the Edge Functions until real credentials are
plugged in (see the `TODO(real …)` markers in `supabase/functions/`).

## Scope notes

- Only the App design was implemented; the four PDF "Report" design files are out of scope.
- Reporting/analytics is computed client-side from the loaded data for now.
