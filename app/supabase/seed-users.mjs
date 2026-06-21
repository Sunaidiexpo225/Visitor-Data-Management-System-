// Seed the four demo auth users via the Supabase admin API.
// The `handle_new_user` trigger creates the matching profile row (with role and
// permissions taken from user metadata).
//
// Usage (after `supabase start`):
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`> \
//   node supabase/seed-users.mjs
//
// All demo users share the password below for convenience — change for any
// non-local environment.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD || 'expo2026';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Get it from `supabase status`.');
  process.exit(1);
}

const admin = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: 'marketing@sunaidiexpo.com', name: 'Marketing User', role: 'Marketing',   can_edit: true,  can_delete: false, can_call: false },
  { email: 'cleanup@sunaidiexpo.com',   name: 'Data Cleanup',   role: 'Data Entry',  can_edit: true,  can_delete: true,  can_call: true  },
  { email: 'calls@sunaidiexpo.com',     name: 'Call Agent',     role: 'Tele-caller', can_edit: false, can_delete: false, can_call: true  },
  { email: 'admin@sunaidiexpo.com',     name: 'Administrator',  role: 'Admin',       can_edit: true,  can_delete: true,  can_call: true  },
];

for (const u of users) {
  const { error } = await admin.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: u.name,
      role: u.role,
      can_edit: u.can_edit,
      can_delete: u.can_delete,
      can_call: u.can_call,
    },
  });
  if (error && !/already.*registered|exists/i.test(error.message)) {
    console.error(`✗ ${u.email}: ${error.message}`);
  } else {
    console.log(`✓ ${u.email} (${u.role})`);
  }
}

console.log(`\nDone. All demo users use password: ${PASSWORD}`);
