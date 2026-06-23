-- ============================================================================
-- 0007 — Real WATI credentials per event
--   Each event's WATI connection gets its own API endpoint + access token, so
--   sends use the correct WhatsApp account per event. The token is a secret:
--   client roles cannot read it (only the service role used by Edge Functions).
-- Safe to run on a DB that already has 0001–0006 applied.
-- ============================================================================

alter table wati_connections add column if not exists endpoint text not null default '';
alter table wati_connections add column if not exists token    text not null default '';

-- Restrict client reads to the non-secret columns. (A column-level REVOKE does
-- not override a table-level grant, so we revoke the table grant and re-grant
-- only the safe columns.) The `api` column keeps a masked hint for display; the
-- service role used by the Edge Function still reads `token` to send.
revoke select on wati_connections from authenticated;
grant  select (id, event, sender, api, endpoint, active, created_at) on wati_connections to authenticated;
revoke select on wati_connections from anon;
