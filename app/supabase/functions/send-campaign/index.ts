// Edge Function: send-campaign
// MOCKED WATI delivery. Groups the chosen recipients by event, records one
// campaign row per event using that event's WATI connection, writes activity +
// audit entries, and returns a summary. Real WATI API calls are added later
// (read the per-event api key from wati_connections and POST to WATI here).
//
// Auth: requires a valid user JWT (verify_jwt = true in config.toml). The
// caller's bearer token is forwarded to PostgREST so RLS applies.

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Body {
  visitorIds: string[];
  template: string; // label, for the campaign name
  message: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData } = await supabase.auth.getUser();
  const actor = userData?.user?.email ?? 'unknown';

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { visitorIds, template, message } = body;
  if (!Array.isArray(visitorIds) || visitorIds.length === 0) {
    return json({ error: 'No recipients selected' }, 400);
  }

  // Pull the selected recipients with their event name.
  const { data: recipients, error: rErr } = await supabase
    .from('visitors')
    .select('id, name, event:events(name)')
    .in('id', visitorIds);
  if (rErr) return json({ error: rErr.message }, 400);

  // Group by event.
  const byEvent = new Map<string, number>();
  for (const r of recipients ?? []) {
    const ev = (r as { event?: { name?: string } }).event?.name ?? 'Unknown';
    byEvent.set(ev, (byEvent.get(ev) ?? 0) + 1);
  }

  // One campaign per event, using that event's WATI sender.
  const { data: conns } = await supabase
    .from('wati_connections')
    .select('event, sender, active');
  const senderFor = (ev: string) =>
    conns?.find((c) => c.event === ev)?.sender ?? null;

  let total = 0;
  for (const [ev, count] of byEvent) {
    // TODO(real WATI): look up api key for `ev`, POST `message` to WATI here.
    await supabase.from('campaigns').insert({
      name: template,
      event: ev,
      recipients: count,
      sent_label: 'Just now',
      status: 'Delivered',
      wati_sender: senderFor(ev),
    });
    await supabase.from('activity').insert({
      initials: 'WA',
      name: template,
      detail: `Campaign sent to ${count} contacts (${ev})`,
      tag: 'Sent',
      kind: 'sent',
    });
    total += count;
  }

  await supabase.from('audit_log').insert({
    ts_label: stamp(),
    actor,
    role: '',
    action: 'Campaign sent via WATI',
    target: `${byEvent.size} event(s) — ${total}`,
    category: 'Campaign',
    ip: req.headers.get('x-forwarded-for') ?? '',
    result: 'Success',
  });

  return json({ ok: true, total, events: byEvent.size, message });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stamp() {
  const d = new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${m[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
