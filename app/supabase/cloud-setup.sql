-- =============================================================
-- Cloud one-shot setup: run ONCE on a fresh Supabase project
-- (Dashboard → SQL Editor → paste → Run). Combines:
--   migrations/0001_init.sql + migrations/0002_rls.sql + seed.sql
-- After this, run seed-users.mjs and deploy the edge functions.
-- =============================================================

-- ============================================================================
-- Visitor Data Management — core schema
-- Postgres / Supabase. Enums, tables, indexes, triggers.
-- RLS policies live in 0002_rls.sql; seed data in supabase/seed.sql.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type visitor_status as enum ('Category', 'Engaged', 'Pre-registered', 'Pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consent_status as enum ('Opted-in', 'Pending', 'Opted-out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invite_status as enum ('Invited', 'Pending', 'Not interested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('Active', 'Suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_kind as enum ('merge', 'sent', 'edit', 'update', 'cleaned', 'invited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_result as enum ('Success', 'Denied', 'Pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_category as enum (
    'Authentication', 'User Management', 'Data', 'Campaign',
    'Call', 'Integration', 'Export', 'General'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users; holds role, status, granular permissions)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null unique,
  role        text not null default 'Staff',
  status      user_status not null default 'Active',
  can_edit    boolean not null default false,
  can_delete  boolean not null default false,
  can_call    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Convenience: is the current user an Admin?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'Admin' and p.status = 'Active'
  );
$$;

-- Convenience: does the current user hold a given permission (admins always do)?
create or replace function has_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.status = 'Active'
      and (
        p.role = 'Admin'
        or (perm = 'edit'   and p.can_edit)
        or (perm = 'delete' and p.can_delete)
        or (perm = 'call'   and p.can_call)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- visitors
-- ---------------------------------------------------------------------------
create table if not exists visitors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  event_id    uuid references events (id) on delete set null,
  status      visitor_status not null default 'Pre-registered',
  consent     consent_status not null default 'Pending',
  cleaned     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_visitors_event on visitors (event_id);
create index if not exists idx_visitors_consent on visitors (consent);
drop trigger if exists trg_visitors_updated on visitors;
create trigger trg_visitors_updated before update on visitors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- invites  (per-visitor invitation history; event is free text — invitations
-- can target events that are not in the managed events list)
-- ---------------------------------------------------------------------------
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid not null references visitors (id) on delete cascade,
  event       text not null,
  status      invite_status not null default 'Pending',
  invited_on  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_invites_visitor on invites (visitor_id);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  event       text not null default '',
  recipients  integer not null default 0,
  sent_label  text not null default 'Just now',
  status      text not null default 'Delivered',
  wati_sender text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_campaigns_created on campaigns (created_at desc);

-- ---------------------------------------------------------------------------
-- call_log
-- ---------------------------------------------------------------------------
create table if not exists call_log (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid references visitors (id) on delete set null,
  name        text not null,
  company     text not null default '',
  event       text not null default '',
  call_time   text not null default '',
  duration    integer not null default 0,
  outcome     invite_status not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_call_log_created on call_log (created_at desc);

-- ---------------------------------------------------------------------------
-- activity  (recent record-updates feed)
-- ---------------------------------------------------------------------------
create table if not exists activity (
  id          uuid primary key default gen_random_uuid(),
  initials    text not null default '',
  name        text not null,
  detail      text not null default '',
  tag         text not null default '',
  kind        activity_kind not null default 'update',
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_created on activity (created_at desc);

-- ---------------------------------------------------------------------------
-- audit_log  (SOC2-style trail)
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  ts_label    text not null default '',
  actor       text not null default '',
  role        text not null default '',
  action      text not null,
  target      text not null default '',
  category    audit_category not null default 'General',
  ip          text not null default '',
  result      audit_result not null default 'Success',
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on audit_log (created_at desc);
create index if not exists idx_audit_category on audit_log (category);

-- ---------------------------------------------------------------------------
-- wati_connections  (one WhatsApp line per event; admin-managed)
-- ---------------------------------------------------------------------------
create table if not exists wati_connections (
  id          uuid primary key default gen_random_uuid(),
  event       text not null unique,
  sender      text not null default '',
  api         text not null default 'wati_key_••',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- call_apis  (admin-managed call providers; real wiring added later)
-- ---------------------------------------------------------------------------
create table if not exists call_apis (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,
  caller_id   text not null default '',
  api_key     text not null default '',
  connected   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- app_settings  (single-row key/value for things like auto-backup toggle)
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);
insert into app_settings (key, value)
values ('auto_backup', 'true'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- Row-level security
-- Default posture: any active authenticated user can READ; writes are gated by
-- role ('Admin') or granular permissions (edit / delete / call). Audit log is
-- append-only and admin-readable.
-- ============================================================================

-- Auto-provision a profile whenever an auth user is created. Role/name/perms
-- come from user metadata when present (set by the admin "Add user" flow).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, can_edit, can_delete, can_call)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Staff'),
    coalesce((new.raw_user_meta_data ->> 'can_edit')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'can_delete')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'can_call')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Enable RLS everywhere
alter table profiles          enable row level security;
alter table events            enable row level security;
alter table visitors          enable row level security;
alter table invites           enable row level security;
alter table campaigns         enable row level security;
alter table call_log          enable row level security;
alter table activity          enable row level security;
alter table audit_log         enable row level security;
alter table wati_connections  enable row level security;
alter table call_apis         enable row level security;
alter table app_settings      enable row level security;

-- ---- profiles -------------------------------------------------------------
create policy profiles_select on profiles
  for select to authenticated using (true);
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_write on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---- events ---------------------------------------------------------------
create policy events_select on events
  for select to authenticated using (true);
create policy events_admin_write on events
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---- visitors -------------------------------------------------------------
create policy visitors_select on visitors
  for select to authenticated using (true);
create policy visitors_insert on visitors
  for insert to authenticated with check (has_perm('edit'));
create policy visitors_update on visitors
  for update to authenticated using (has_perm('edit')) with check (has_perm('edit'));
create policy visitors_delete on visitors
  for delete to authenticated using (has_perm('delete'));

-- ---- invites --------------------------------------------------------------
create policy invites_select on invites
  for select to authenticated using (true);
create policy invites_write on invites
  for all to authenticated using (has_perm('call')) with check (has_perm('call'));

-- ---- campaigns ------------------------------------------------------------
create policy campaigns_select on campaigns
  for select to authenticated using (true);
create policy campaigns_insert on campaigns
  for insert to authenticated with check (true);

-- ---- call_log -------------------------------------------------------------
create policy call_log_select on call_log
  for select to authenticated using (true);
create policy call_log_insert on call_log
  for insert to authenticated with check (has_perm('call'));

-- ---- activity (app writes feed entries on many actions) -------------------
create policy activity_select on activity
  for select to authenticated using (true);
create policy activity_insert on activity
  for insert to authenticated with check (true);

-- ---- audit_log (append-only; admin-readable) ------------------------------
create policy audit_select on audit_log
  for select to authenticated using (is_admin());
create policy audit_insert on audit_log
  for insert to authenticated with check (true);

-- ---- wati_connections (read for all; admin writes) ------------------------
create policy wati_select on wati_connections
  for select to authenticated using (true);
create policy wati_admin_write on wati_connections
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---- call_apis (admin only, both read and write) --------------------------
create policy call_apis_admin on call_apis
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---- app_settings (read for all; admin writes) ---------------------------
create policy settings_select on app_settings
  for select to authenticated using (true);
create policy settings_admin_write on app_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- ============================================================================
-- Seed data (data tables only — auth users are seeded separately by
-- supabase/seed-users.mjs via the admin API, which is version-robust).
-- Mirrors the in-memory seed used by the frontend prototype.
-- Safe to run repeatedly: clears and repopulates the data tables.
-- ============================================================================

truncate invites, visitors, campaigns, call_log, activity, audit_log,
         wati_connections, call_apis, events restart identity cascade;

-- ---- events ---------------------------------------------------------------
insert into events (name) values
  ('Spring Expo 2026'),
  ('Tech Forum'),
  ('Trade Days'),
  ('Design Week'),
  ('Startup Meet');

-- ---- visitors -------------------------------------------------------------
-- Derive phone/email exactly like the prototype's seedVisitors():
--   phone = '+9665' || digits || '00' || digits
--   email = regexp_replace(lower(name),'[^a-z]','.','g')
--           || '@' || regexp_replace(lower(company),'[^a-z]','','g') || '.com'
--   cleaned = (idx % 3 <> 0)
with rows (idx, name, company, digits, event_name, status, consent) as (
  values
    (0,  'Faisal Khan',  'Reed Technologies', '142', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (1,  'Lina Mansour', 'Orbit Media',       '087', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (2,  'Rami Al-Said', 'Vertex Group',      '309', 'Spring Expo 2026', 'Engaged',        'Opted-in'),
    (3,  'Sara Habib',   'Nexa Labs',         '561', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (4,  'Omar Tariq',   'Helix Industries',  '778', 'Spring Expo 2026', 'Pending',        'Pending'),
    (5,  'Huda Nasser',  'Bright Co',         '234', 'Tech Forum',       'Category',       'Opted-in'),
    (6,  'Yousef Amin',  'Cedar Systems',     '415', 'Tech Forum',       'Pre-registered', 'Opted-in'),
    (7,  'Maha Salem',   'Lumina',            '690', 'Tech Forum',       'Engaged',        'Opted-out'),
    (8,  'Khalid Aziz',  'Pioneer Tech',      '052', 'Trade Days',       'Category',       'Opted-in'),
    (9,  'Nora Fadel',   'Atlas Media',       '331', 'Trade Days',       'Pre-registered', 'Pending'),
    (10, 'Tariq Hassan', 'Summit Group',      '847', 'Trade Days',       'Category',       'Opted-in'),
    (11, 'Dana Khoury',  'Vela Studio',       '218', 'Design Week',      'Engaged',        'Opted-in'),
    (12, 'Sami Rahman',  'Nimbus Co',         '903', 'Design Week',      'Category',       'Opted-in'),
    (13, 'Leen Othman',  'Forma Design',      '176', 'Design Week',      'Pre-registered', 'Opted-in'),
    (14, 'Adel Mansoor', 'Quanta Labs',       '524', 'Startup Meet',     'Category',       'Opted-in'),
    (15, 'Reem Saleh',   'Spark Ventures',    '660', 'Startup Meet',     'Engaged',        'Pending'),
    (16, 'Bilal Noor',   'Onyx Partners',     '288', 'Startup Meet',     'Category',       'Opted-in'),
    (17, 'Jana Aziz',    'Meridian',          '741', 'Tech Forum',       'Pre-registered', 'Opted-in')
)
insert into visitors (id, name, company, phone, email, event_id, status, consent, cleaned)
select
  -- deterministic ids v00000000-...-<idx> so invites can reference them
  ('00000000-0000-0000-0000-' || lpad(r.idx::text, 12, '0'))::uuid,
  r.name,
  r.company,
  '+9665' || r.digits || '00' || r.digits,
  regexp_replace(lower(r.name), '[^a-z]', '.', 'g') || '@'
    || regexp_replace(lower(r.company), '[^a-z]', '', 'g') || '.com',
  e.id,
  r.status::visitor_status,
  r.consent::consent_status,
  (r.idx % 3 <> 0)
from rows r
join events e on e.name = r.event_name;

-- ---- invites (seeded for visitors 0, 2, 5 like the prototype) -------------
insert into invites (visitor_id, event, status, invited_on) values
  ('00000000-0000-0000-0000-000000000000'::uuid, 'Autumn Expo 2026',     'Invited',        '12 Jun'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Winter Showcase 2027', 'Pending',        '14 Jun'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Autumn Expo 2026',     'Not interested', '10 Jun'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'Autumn Expo 2026',     'Invited',        '13 Jun');

-- ---- wati_connections -----------------------------------------------------
insert into wati_connections (event, sender, api, active) values
  ('Spring Expo 2026', '+966 50 111 2026', 'wati_spring_••42',     true),
  ('Tech Forum',       '+966 50 222 7788', 'wati_techforum_••19',  true),
  ('Trade Days',       '+966 50 333 4455', 'wati_tradedays_••07',  true),
  ('Design Week',      '+966 50 444 9090', 'wati_designweek_••63', false),
  ('Startup Meet',     '+966 50 555 1212', 'wati_startup_••88',    true);

-- ---- call_apis ------------------------------------------------------------
insert into call_apis (provider, caller_id, api_key, connected) values
  ('Twilio Voice', '+966 11 200 4040', 'sk_live_••••8842', true),
  ('Knowlarity',   '+966 11 200 5050', 'kl_live_••••3317', false);

-- ---- call_log -------------------------------------------------------------
insert into call_log (name, company, event, call_time, duration, outcome) values
  ('Lina Mansour', 'Orbit Media',      'Spring Expo 2026', '09:12', 142, 'Invited'),
  ('Omar Tariq',   'Helix Industries', 'Spring Expo 2026', '09:31',  64, 'Not interested'),
  ('Yousef Amin',  'Cedar Systems',    'Tech Forum',       '10:04', 208, 'Invited'),
  ('Nora Fadel',   'Atlas Media',      'Trade Days',       '10:22',  47, 'Pending'),
  ('Dana Khoury',  'Vela Studio',      'Design Week',      '11:08', 175, 'Invited');

-- ---- campaigns ------------------------------------------------------------
insert into campaigns (name, event, recipients, sent_label, status, wati_sender) values
  ('Thank You for Visiting', 'Tech Forum',       412,  '2 days ago', 'Delivered', '+966 50 222 7788'),
  ('Catalogue Request',      'Spring Expo 2026', 1180, '5 days ago', 'Delivered', '+966 50 111 2026');

-- ---- activity -------------------------------------------------------------
insert into activity (initials, name, detail, tag, kind) values
  ('LM', 'Lina Mansour',      'Duplicate merged',                  'Merged',  'merge'),
  ('RA', 'Rami Al-Said',      'Consent set to opted-in',           'Updated', 'update'),
  ('FK', 'Faisal Khan',       'Phone number updated',              'Edited',  'edit'),
  ('WA', 'Catalogue Request', 'Campaign sent to 1,180 contacts',   'Sent',    'sent');

-- ---- audit_log ------------------------------------------------------------
insert into audit_log (ts_label, actor, role, action, target, category, ip, result) values
  ('20 Jun 08:02:14', 'admin@sunaidiexpo.com',     'Admin',      'User signed in',          'Session',                  'Authentication',  '10.0.21.4',   'Success'),
  ('20 Jun 08:05:41', 'admin@sunaidiexpo.com',     'Admin',      'Password reset issued',   'calls@sunaidiexpo.com',    'User Management', '10.0.21.4',   'Success'),
  ('20 Jun 08:11:09', 'cleanup@sunaidiexpo.com',   'Data Entry', 'Visitor record updated',  'Faisal Khan',              'Data',            '10.0.18.7',   'Success'),
  ('20 Jun 08:19:55', 'marketing@sunaidiexpo.com', 'Marketing',  'Campaign sent via WATI',  'Spring Expo 2026 — 1,180', 'Campaign',        '10.0.12.2',   'Success'),
  ('20 Jun 08:24:30', 'unknown',                   '—',          'Failed sign-in attempt',  'ops@sunaidiexpo.com',      'Authentication',  '41.92.6.183', 'Denied'),
  ('20 Jun 08:40:12', 'admin@sunaidiexpo.com',     'Admin',      'CSV export generated',    'visitors-all.csv',         'Export',          '10.0.21.4',   'Success');
