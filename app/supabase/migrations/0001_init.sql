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
