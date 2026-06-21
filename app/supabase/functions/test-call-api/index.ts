// Edge Function: test-call-api
// MOCKED call-provider connectivity test. Looks up the call API record and
// returns a simulated "connection OK". Real provider verification (e.g. a
// Twilio credentials check) is added later where noted.
//
// Auth: requires a valid user JWT (verify_jwt = true). RLS on call_apis is
// admin-only, so only admins can read the record through the forwarded token.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let id: string | undefined;
  try {
    ({ id } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!id) return json({ error: 'Missing call API id' }, 400);

  const { data: api, error } = await supabase
    .from('call_apis')
    .select('id, provider, caller_id')
    .eq('id', id)
    .single();
  if (error || !api) return json({ error: error?.message ?? 'Not found' }, 404);

  // TODO(real provider): perform an actual credentials/health check here.
  return json({
    ok: true,
    provider: api.provider,
    callerId: api.caller_id,
    message: `Testing ${api.provider}… connection OK.`,
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
