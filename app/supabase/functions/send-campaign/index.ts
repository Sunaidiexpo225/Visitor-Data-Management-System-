// Edge Function: send-campaign
// Sends an approved WhatsApp template to the chosen recipients, grouped by event,
// using EACH event's own WATI endpoint + token. The template name passed from the
// app must match an approved template name in that event's WATI account.
//
// - Recipients are read with the caller's JWT (so RLS / event-scope applies).
// - The secret WATI token is read with the service role (it's hidden from clients).
// - If an event has no endpoint/token configured, the send is simulated (logged
//   only) so the rest of the app keeps working before credentials are added.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Body {
  visitorIds: string[];
  template: string; // approved WATI template name (also our template label)
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const asService = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: userData } = await asUser.auth.getUser();
  const actor = userData?.user?.email ?? 'unknown';

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const { visitorIds, template, message } = body;
  if (!Array.isArray(visitorIds) || visitorIds.length === 0) return json({ error: 'No recipients selected' }, 400);

  // Recipients (RLS-scoped to the caller).
  const { data: recipients, error: rErr } = await asUser
    .from('visitors')
    .select('id, name, phone, sub_event:sub_events(name, event:events(name))')
    .in('id', visitorIds);
  if (rErr) return json({ error: rErr.message }, 400);

  const unwrap = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  type Rec = { name: string; phone: string };
  const byEvent = new Map<string, Rec[]>();
  for (const r of recipients ?? []) {
    const se = unwrap((r as { sub_event: unknown }).sub_event) as { event?: unknown } | null;
    const ev = (unwrap(se?.event) as { name?: string } | null)?.name ?? 'Unknown';
    const list = byEvent.get(ev) ?? [];
    list.push({ name: (r as { name: string }).name, phone: (r as { phone: string }).phone });
    byEvent.set(ev, list);
  }

  // WATI connections (incl. secret token) via the service role.
  const { data: conns } = await asService
    .from('wati_connections')
    .select('event, sender, endpoint, token, active');
  const connFor = (ev: string) => conns?.find((c) => c.event === ev);

  let total = 0;
  let realSends = 0;
  const results: { event: string; count: number; delivered: boolean; note?: string }[] = [];

  for (const [ev, list] of byEvent) {
    const conn = connFor(ev);
    let delivered = false;
    let note: string | undefined;

    if (conn?.active && conn.endpoint && conn.token) {
      try {
        const res = await fetch(`${conn.endpoint.replace(/\/$/, '')}/api/v1/sendTemplateMessages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${conn.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: template,
            broadcast_name: `${template}-${Date.now()}`,
            receivers: list.map((r) => ({
              whatsappNumber: r.phone.replace(/\D/g, ''),
              // Template uses a named variable: Hello {{name}}, …
              customParams: [{ name: 'name', value: r.name }],
            })),
          }),
        });
        delivered = res.ok;
        if (!res.ok) note = `WATI ${res.status}: ${(await res.text()).slice(0, 200)}`;
        else realSends += list.length;
      } catch (e) {
        note = `WATI request failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      note = 'simulated (no WATI endpoint/token configured for this event)';
    }

    await asUser.from('campaigns').insert({
      name: template, event: ev, recipients: list.length, sent_label: 'Just now',
      status: delivered ? 'Delivered' : (conn ? 'Failed' : 'Simulated'),
      wati_sender: conn?.sender ?? null,
    });
    await asUser.from('activity').insert({
      initials: 'WA', name: template,
      detail: `Campaign ${delivered ? 'sent' : 'logged'} to ${list.length} contacts (${ev})`,
      tag: 'Sent', kind: 'sent',
    });
    total += list.length;
    results.push({ event: ev, count: list.length, delivered, note });
  }

  await asUser.from('audit_log').insert({
    ts_label: stamp(), actor, role: '', action: 'Campaign sent via WATI',
    target: `${byEvent.size} event(s) — ${total} (${realSends} delivered)`, category: 'Campaign',
    ip: req.headers.get('x-forwarded-for') ?? '', result: 'Success',
  });

  return json({ ok: true, total, events: byEvent.size, realSends, results, message });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function stamp() {
  const d = new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${m[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
