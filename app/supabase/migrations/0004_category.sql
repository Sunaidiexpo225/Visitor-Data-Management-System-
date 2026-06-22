-- ============================================================================
-- 0004 — Visitor "Category" field
--   A second admin-managed classification, separate from Status. Free text on
--   the visitor (so imports can bring any value); category_options drives the
--   dropdown of suggested values in the UI.
-- Safe to run on a DB that already has 0001–0003 applied.
-- ============================================================================

create table if not exists category_options (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table visitors add column if not exists category text not null default '';

alter table category_options enable row level security;

do $$ begin
  create policy category_select on category_options for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy category_admin on category_options for all to authenticated using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
