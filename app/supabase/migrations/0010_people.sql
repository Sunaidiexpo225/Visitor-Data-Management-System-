-- ============================================================================
-- 0010 — People overview.
-- One row per *person* (collapsing the multiple visitor rows a person has when
-- they register for several events), keyed by phone (or email when the phone
-- is blank). Powers the dedicated People page: aggregate details + a link into
-- each person's event timeline.
-- security_invoker = on  => row-level security applies to the querying user,
-- so a scoped user only aggregates the events they're allowed to see.
-- Safe to run on a DB that already has 0001–0009 applied (idempotent).
-- ============================================================================

create or replace view people_overview with (security_invoker = on) as
with keyed as (
  select
    v.*,
    case
      when coalesce(v.phone_digits, '') <> '' then 'p:' || v.phone_digits
      when coalesce(v.email, '')        <> '' then 'e:' || lower(v.email)
      else 'i:' || v.id::text
    end as person_key,
    se.event_id as ev_id
  from visitors v
  left join sub_events se on se.id = v.sub_event_id
)
select
  person_key,
  (array_agg(name         order by registration_date desc nulls last, created_at desc))[1] as name,
  (array_agg(company      order by registration_date desc nulls last, created_at desc))[1] as company,
  (array_agg(phone        order by registration_date desc nulls last, created_at desc))[1] as phone,
  (array_agg(email        order by registration_date desc nulls last, created_at desc))[1] as email,
  (array_agg(phone_digits order by registration_date desc nulls last, created_at desc))[1] as phone_digits,
  (array_agg(id           order by registration_date desc nulls last, created_at desc))[1] as latest_id,
  count(*)                       as registrations,
  count(distinct ev_id)          as events,
  min(registration_date)         as first_seen,
  max(registration_date)         as last_seen,
  bool_or(consent = 'Opted-in')  as opted_in
from keyed
group by person_key;

grant select on people_overview to authenticated;

notify pgrst, 'reload schema';
