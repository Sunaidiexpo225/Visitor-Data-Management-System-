-- ============================================================================
-- 0005 — Extra visitor fields: external Id, Country, Source, Registration date
-- Safe to run on a DB that already has 0001–0004 applied.
-- ============================================================================

alter table visitors add column if not exists ref_id            text not null default '';
alter table visitors add column if not exists country           text not null default '';
alter table visitors add column if not exists source            text not null default '';
alter table visitors add column if not exists registration_date date;
