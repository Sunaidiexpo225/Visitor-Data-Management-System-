import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// True only when both build-time env vars were present. main.tsx shows a clear
// configuration screen when this is false instead of letting createClient throw
// (which would render a blank page).
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time. ' +
      'Set them in your host\'s build environment (and locally in .env.local).',
  );
}

// Use a syntactically valid placeholder when unconfigured so importing this
// module never throws; the app will render the config screen instead.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);
