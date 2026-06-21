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
