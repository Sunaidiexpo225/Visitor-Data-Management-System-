-- ============================================================================
-- 0008 — Scale to 100k+ visitors.
-- Adds indexes, a normalized phone-digits column, a denormalized
-- latest-invite-status column (kept current by trigger), and aggregate
-- RPCs so the app can paginate/filter/search server-side instead of
-- loading every row into the browser.
-- Safe to run on a DB that already has 0001–0007 applied (idempotent).
-- ============================================================================

-- Trigram matching for fast case-insensitive "contains" search (ilike '%x%').
create extension if not exists pg_trgm;

-- --------------------------------------------------------------------------
-- Normalized phone digits (e.g. "+966 50 123" -> "96650123") for phone search.
-- --------------------------------------------------------------------------
alter table visitors add column if not exists phone_digits text
  generated always as (regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) stored;

-- --------------------------------------------------------------------------
-- Denormalized latest invite status so the Calls page can filter/sort by it
-- without scanning the invites relation for every row.
-- --------------------------------------------------------------------------
alter table visitors add column if not exists latest_invite_status text not null default 'Not contacted';

create or replace function refresh_latest_invite() returns trigger
  language plpgsql security definer set search_path = public as $$
declare vid uuid;
begin
  vid := coalesce(new.visitor_id, old.visitor_id);
  update visitors set latest_invite_status = coalesce(
    (select status::text from invites where visitor_id = vid order by created_at desc limit 1),
    'Not contacted'
  ) where id = vid;
  return null;
end $$;

drop trigger if exists trg_invites_latest on invites;
create trigger trg_invites_latest after insert or update or delete on invites
  for each row execute function refresh_latest_invite();

-- Backfill existing rows.
update visitors v set latest_invite_status = coalesce(
  (select status::text from invites i where i.visitor_id = v.id order by i.created_at desc limit 1),
  'Not contacted'
);

-- --------------------------------------------------------------------------
-- Indexes for filters, sort and search.
-- --------------------------------------------------------------------------
create index if not exists idx_visitors_status         on visitors (status);
create index if not exists idx_visitors_country        on visitors (country);
create index if not exists idx_visitors_source         on visitors (source);
create index if not exists idx_visitors_category       on visitors (category);
create index if not exists idx_visitors_cleaned        on visitors (cleaned);
create index if not exists idx_visitors_latest_invite  on visitors (latest_invite_status);
create index if not exists idx_visitors_created        on visitors (created_at);

create index if not exists idx_visitors_name_trgm    on visitors using gin (name gin_trgm_ops);
create index if not exists idx_visitors_company_trgm on visitors using gin (company gin_trgm_ops);
create index if not exists idx_visitors_email_trgm   on visitors using gin (email gin_trgm_ops);
create index if not exists idx_visitors_phone_trgm   on visitors using gin (phone_digits gin_trgm_ops);

-- --------------------------------------------------------------------------
-- Aggregate stats for the dashboard / reports / KPIs — one round-trip.
-- SECURITY INVOKER (default) so row-level security still applies to the caller.
-- --------------------------------------------------------------------------
create or replace function visitor_stats() returns json
  language sql stable as $$
  select json_build_object(
    'total',   (select count(*) from visitors),
    'optedIn', (select count(*) from visitors where consent = 'Opted-in'),
    'invited', (select count(*) from visitors where latest_invite_status = 'Invited'),
    'cleaned', (select count(*) from visitors where cleaned),
    'byEvent', coalesce((
      select json_agg(json_build_object('event', e.name, 'count', c.cnt) order by e.name)
      from events e
      cross join lateral (
        select count(*) cnt from visitors v
        join sub_events se on se.id = v.sub_event_id
        where se.event_id = e.id
      ) c
    ), '[]'::json),
    'bySubEvent', coalesce((
      select json_agg(json_build_object(
        'event', e.name, 'subEvent', se.name, 'subEventId', se.id,
        'count', c.cnt, 'cleaned', c.cln) order by e.name, se.name)
      from sub_events se
      join events e on e.id = se.event_id
      cross join lateral (
        select count(*) cnt, count(*) filter (where v.cleaned) cln
        from visitors v where v.sub_event_id = se.id
      ) c
    ), '[]'::json)
  );
$$;

-- --------------------------------------------------------------------------
-- Distinct dropdown values (country / source / category) without scanning
-- the whole table on the client.
-- --------------------------------------------------------------------------
create or replace function visitor_options() returns json
  language sql stable as $$
  select json_build_object(
    'countries',  coalesce((select json_agg(x order by x) from (select distinct country  x from visitors where coalesce(country,'')  <> '') t), '[]'::json),
    'sources',    coalesce((select json_agg(x order by x) from (select distinct source   x from visitors where coalesce(source,'')   <> '') t), '[]'::json),
    'categories', coalesce((select json_agg(x order by x) from (select distinct category x from visitors where coalesce(category,'') <> '') t), '[]'::json)
  );
$$;

grant execute on function visitor_stats()   to authenticated;
grant execute on function visitor_options() to authenticated;

-- Refresh PostgREST's schema cache so the new columns/RPCs are visible.
notify pgrst, 'reload schema';
