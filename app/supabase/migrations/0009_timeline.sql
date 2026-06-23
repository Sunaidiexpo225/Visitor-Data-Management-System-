-- ============================================================================
-- 0009 — Per-visitor timeline.
-- A person who attends several events exists as several `visitors` rows (one
-- registration per event), tied together by phone number (or email when the
-- phone is blank). visitor_timeline() returns every event a given person has
-- registered for, in chronological order, so the UI can show their history.
-- Safe to run on a DB that already has 0001–0008 applied (idempotent).
-- ============================================================================

-- Exact-match index for the phone-number identity lookup.
create index if not exists idx_visitors_phone_digits on visitors (phone_digits);
create index if not exists idx_visitors_email_lower   on visitors (lower(email));

-- SECURITY INVOKER (default) so the caller only sees events they're allowed to
-- (a scoped user won't see this person's records from other events).
create or replace function visitor_timeline(p_id uuid) returns json
  language sql stable as $$
  with anchor as (
    select id, name, company, phone, email, phone_digits, lower(email) as email_l
    from visitors where id = p_id
  ),
  matches as (
    select v.*
    from visitors v
    join anchor a on
         v.id = a.id
      or (coalesce(a.phone_digits, '') <> '' and v.phone_digits = a.phone_digits)
      or (coalesce(a.phone_digits, '') = '' and coalesce(a.email_l, '') <> '' and lower(v.email) = a.email_l)
  )
  select json_build_object(
    'person', (select json_build_object('name', name, 'company', company, 'phone', phone, 'email', email) from anchor),
    'visits', coalesce((
      select json_agg(json_build_object(
        'id', m.id,
        'event', e.name,
        'subEvent', se.name,
        'date', m.registration_date,
        'consent', m.consent,
        'status', m.status,
        'cleaned', m.cleaned,
        'current', (m.id = p_id)
      ) order by m.registration_date asc nulls last, m.created_at asc)
      from matches m
      left join sub_events se on se.id = m.sub_event_id
      left join events e on e.id = se.event_id
    ), '[]'::json)
  );
$$;

grant execute on function visitor_timeline(uuid) to authenticated;

notify pgrst, 'reload schema';
