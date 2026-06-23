-- ============================================================================
-- 0006 — Per-user event access scope
--   A user can be limited to specific events; they then only see (via RLS) the
--   visitor records under those events. An empty scope means "all events".
-- Safe to run on a DB that already has 0001–0005 applied.
-- ============================================================================

alter table profiles add column if not exists event_scope text[] not null default '{}';

-- Can the current user see a visitor that sits under the given sub-event?
create or replace function can_see_event(sub_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and (
        coalesce(array_length(p.event_scope, 1), 0) = 0          -- no scope = all events
        or exists (
          select 1 from sub_events se join events e on e.id = se.event_id
          where se.id = sub_id and e.name = any (p.event_scope)
        )
      )
  );
$$;

-- Scope visitor reads to the user's allowed events.
drop policy if exists visitors_select on visitors;
create policy visitors_select on visitors for select to authenticated using (can_see_event(sub_event_id));
