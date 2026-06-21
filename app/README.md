# Visitor Data Management — Sunaidi Expo

A React + Vite + TypeScript rebuild of the **Visitor Data Management App** design
prototype. Frontend-only: all data lives in in-memory React state (seeded with the
same sample data as the prototype), so login, CRUD, calls, campaigns and CSV export
all work without a backend.

## Run locally

Requires Node 20+ (developed on Node 22).

```bash
cd app
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173/).

The login screen is prefilled with demo credentials — click **Sign In** for a Staff
session, or toggle **Admin** first to unlock the Admin tab.

## Other scripts

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
npm run lint      # eslint
```

## Structure

- `src/hooks/useAppState.ts` — all application state and handlers
- `src/data/seed.ts` — seed data (visitors, events, users, WATI lines, audit log…)
- `src/components/` — one component per tab (Dashboard, Visitors, Cleanup, Calls,
  Campaigns, Reports, Admin) plus the app shell and toast
- `src/components/modals/` — edit visitor, invitation history, new campaign, active
  call, add user / WATI / call API, rename event
- `src/lib/` — formatting, badge styles, CSV export helpers

## Scope notes

- Frontend only; no Supabase/WATI/call-API wiring yet (in-memory simulation).
- Only the App design was implemented; the four PDF "Report" design files are out of scope.
