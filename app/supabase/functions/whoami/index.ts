// Edge Function: whoami
// Returns the caller's real client IP (from the edge's forwarded headers) so the
// app can stamp audit-log entries with a real address instead of a placeholder.
// Requires a valid user JWT (verify_jwt = true).

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
  return new Response(JSON.stringify({ ip }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
