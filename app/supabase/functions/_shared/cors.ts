// Shared CORS headers for browser-invoked Edge Functions. Allowing all origins
// is fine here because every function still requires a valid user JWT
// (verify_jwt = true) and enforces RLS / admin checks server-side.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
