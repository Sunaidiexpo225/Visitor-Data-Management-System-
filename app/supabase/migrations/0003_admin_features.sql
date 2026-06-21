-- ============================================================================
-- 0003 — Admin features
--   1. Editable Status options (enum -> lookup table)
--   2. Event > Sub-event hierarchy (visitors attach to a sub-event)
--   3. Dynamic campaign templates
--   4. Per-user page access + "send campaigns" feature flag
-- Safe to run on an existing DB that already has 0001 + 0002 applied.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Editable Status options
-- ---------------------------------------------------------------------------
create table if not exists status_options (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into status_options (name, sort) values
  ('Category', 0), ('Engaged', 1), ('Pre-registered', 2), ('Pending', 3)
on conflict (name) do nothing;

-- Convert visitors.status from the enum to text referencing the lookup table.
alter table visitors alter column status drop default;
alter table visitors alter column status type text using status::text;
alter table visitors alter column status set default 'Pre-registered';

-- FK keeps renames in sync (cascade) and blocks deleting an in-use option.
do $$ begin
  alter table visitors
    add constraint visitors_status_fk
    foreign key (status) references status_options (name)
    on update cascade on delete restrict;
exception when duplicate_object then null; end $$;

-- The old enum is no longer referenced (call_log.outcome uses invite_status).
drop type if exists visitor_status;

-- ---------------------------------------------------------------------------
-- 2) Event > Sub-event hierarchy
-- ---------------------------------------------------------------------------
create table if not exists sub_events (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (event_id, name)
);

-- Give every existing event a default sub-event so current visitors have a home.
insert into sub_events (event_id, name)
select id, 'General' from events
on conflict (event_id, name) do nothing;

alter table visitors add column if not exists sub_event_id uuid references sub_events (id) on delete set null;

-- Move existing visitors under their event's default sub-event.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'visitors' and column_name = 'event_id') then
    update visitors v
      set sub_event_id = se.id
      from sub_events se
      join events e on e.id = se.event_id
      where se.name = 'General' and e.id = v.event_id and v.sub_event_id is null;
    alter table visitors drop column event_id;
  end if;
end $$;

create index if not exists idx_visitors_subevent on visitors (sub_event_id);

-- ---------------------------------------------------------------------------
-- 3) Dynamic campaign templates
-- ---------------------------------------------------------------------------
create table if not exists templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  body        text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into templates (name, body, sort) values
  ('Spring Expo — Follow-up', 'Hi {name}, thank you for visiting Sunaidi Expo Spring 2026! Here''s the catalogue you requested — reply YES to book a follow-up meeting.', 0),
  ('Thank You for Visiting',   'Hi {name}, thank you for visiting the Sunaidi Expo stand. It was great to meet you — we''ll be in touch soon!', 1),
  ('Event Invitation',         'Hi {name}, you''re invited to our next Sunaidi Expo event. Reply JOIN to reserve your place.', 2),
  ('Catalogue Request',        'Hi {name}, as requested here is our latest product catalogue. Reply if you''d like a personalised quote.', 3)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) Per-user page access + campaign feature flag
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists pages text[] not null
  default array['dashboard','visitors','cleanup','calls','campaigns','reports'];
alter table profiles add column if not exists can_campaign boolean not null default true;

create or replace function can_campaign()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.status = 'Active'
      and (p.role = 'Admin' or p.can_campaign)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS for the new tables + tighten campaign insert to require the flag
-- ---------------------------------------------------------------------------
alter table status_options enable row level security;
alter table sub_events     enable row level security;
alter table templates      enable row level security;

do $$ begin
  create policy status_select on status_options for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy status_admin on status_options for all to authenticated using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy subevents_select on sub_events for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy subevents_admin on sub_events for all to authenticated using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy templates_select on templates for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy templates_admin on templates for all to authenticated using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

drop policy if exists campaigns_insert on campaigns;
create policy campaigns_insert on campaigns for insert to authenticated with check (can_campaign());
