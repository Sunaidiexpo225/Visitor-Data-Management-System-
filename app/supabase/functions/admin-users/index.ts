// Edge Function: admin-users
// Admin-only user provisioning that needs the service-role key (creating auth
// users and resetting passwords can't be done from the browser with the anon
// key). The caller's JWT is verified to belong to an Admin profile before any
// privileged action runs.
//
// Actions:
//   { action: 'create', email, name, role, can_edit, can_delete, can_call }
//   { action: 'reset',  email }
// Both return a generated temporary password.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1) Identify caller and confirm they are an Admin (RLS-respecting client).
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: who } = await asCaller.auth.getUser();
  if (!who?.user) return json({ error: 'Unauthorized' }, 401);
  const { data: profile } = await asCaller
    .from('profiles').select('role').eq('id', who.user.id).single();
  if (profile?.role !== 'Admin') return json({ error: 'Admin only' }, 403);

  // 2) Privileged client (service role) for the actual operation.
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const tempPassword = genPassword();

  if (body.action === 'create') {
    if (!body.email || !body.name) return json({ error: 'Name and email are required' }, 400);
    const { error } = await admin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: body.name,
        role: body.role ?? 'Staff',
        can_edit: !!body.can_edit,
        can_delete: !!body.can_delete,
        can_call: !!body.can_call,
      },
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, tempPassword });
  }

  if (body.action === 'reset') {
    if (!body.email) return json({ error: 'Email is required' }, 400);
    const { data: list } = await admin.auth.admin.listUsers();
    const target = list?.users.find((u) => u.email?.toLowerCase() === String(body.email).toLowerCase());
    if (!target) return json({ error: 'User not found' }, 404);
    const { error } = await admin.auth.admin.updateUserById(target.id, { password: tempPassword });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, tempPassword });
  }

  return json({ error: 'Unknown action' }, 400);
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function genPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'Sx-' + s;
}
