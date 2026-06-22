import { supabase } from './supabase';
import type {
  ActivityEntry,
  AppUser,
  AuditEntry,
  Campaign,
  CallApi,
  CallLogEntry,
  EventNode,
  MessageTemplate,
  PageKey,
  StatusOption,
  SubEvent,
  Visitor,
  WatiConnection,
} from '../types';

// ---------------------------------------------------------------------------
// Row → app-type mappers (DB is snake_case; app types are camelCase). A
// visitor's event/sub-event are denormalised to their names.
// ---------------------------------------------------------------------------

const VISITOR_SELECT =
  'id,name,company,phone,email,status,category,consent,cleaned,sub_event:sub_events(name,event:events(name)),invites(id,event,status,invited_on)';

type NameRef = { name: string } | { name: string }[] | null;
type SubEventRef = { name: string; event: NameRef } | { name: string; event: NameRef }[] | null;

type VisitorRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: Visitor['status'];
  category: string | null;
  consent: Visitor['consent'];
  cleaned: boolean;
  sub_event: SubEventRef;
  invites: { id: string; event: string; status: Visitor['invites'][number]['status']; invited_on: string }[] | null;
};

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function mapVisitor(r: VisitorRow): Visitor {
  const se = unwrap(r.sub_event);
  const ev = se ? unwrap(se.event) : null;
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    event: ev?.name ?? '',
    subEvent: se?.name ?? '',
    status: r.status,
    category: r.category ?? '',
    consent: r.consent,
    cleaned: r.cleaned,
    invites: (r.invites ?? []).map((i) => ({ id: i.id, event: i.event, status: i.status, date: i.invited_on })),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchEvents(): Promise<string[]> {
  const { data, error } = await supabase.from('events').select('name').order('created_at');
  if (error) throw error;
  return (data ?? []).map((e) => e.name);
}

export async function fetchSubEvents(): Promise<SubEvent[]> {
  const { data, error } = await supabase
    .from('sub_events')
    .select('id,name,event:events(name)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((s) => {
    const ev = unwrap((s as { event: NameRef }).event);
    return { id: s.id, name: s.name, eventName: ev?.name ?? '' };
  });
}

export async function fetchEventTree(): Promise<EventNode[]> {
  const [events, subs] = await Promise.all([fetchEvents(), fetchSubEvents()]);
  return events.map((name) => ({
    name,
    subEvents: subs.filter((s) => s.eventName === name).map((s) => ({ id: s.id, name: s.name })),
  }));
}

export async function fetchStatusOptions(): Promise<StatusOption[]> {
  const { data, error } = await supabase.from('status_options').select('*').order('sort');
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, sort: s.sort }));
}

export async function fetchCategoryOptions(): Promise<StatusOption[]> {
  const { data, error } = await supabase.from('category_options').select('*').order('sort');
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, sort: s.sort }));
}

export async function addCategoryOption(name: string, sort: number): Promise<void> {
  const { error } = await supabase.from('category_options').insert({ name, sort });
  if (error) throw error;
}

export async function renameCategoryOption(id: string, from: string, to: string): Promise<void> {
  const { error } = await supabase.from('category_options').update({ name: to }).eq('id', id);
  if (error) throw error;
  // category has no FK (free text), so propagate the rename to visitors manually.
  await supabase.from('visitors').update({ category: to }).eq('category', from);
}

export async function removeCategoryOption(id: string): Promise<void> {
  const { error } = await supabase.from('category_options').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase.from('templates').select('*').order('sort');
  if (error) throw error;
  return (data ?? []).map((t) => ({ id: t.id, value: t.name, label: t.name, body: t.body }));
}

export async function fetchMyProfile(): Promise<{ role: string; pages: PageKey[]; canCampaign: boolean } | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('role,pages,can_campaign')
    .eq('id', u.user.id)
    .single();
  if (!data) return null;
  return { role: data.role, pages: (data.pages ?? []) as PageKey[], canCampaign: data.can_campaign };
}

export async function fetchVisitors(): Promise<Visitor[]> {
  const { data, error } = await supabase.from('visitors').select(VISITOR_SELECT).order('created_at');
  if (error) throw error;
  return ((data ?? []) as unknown as VisitorRow[]).map(mapVisitor);
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id, name: c.name, event: c.event, recipients: c.recipients,
    sentAt: c.sent_label, status: c.status, wati: c.wati_sender ?? undefined,
  }));
}

export async function fetchCallLog(): Promise<CallLogEntry[]> {
  const { data, error } = await supabase.from('call_log').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id, name: c.name, company: c.company, event: c.event,
    time: c.call_time, duration: c.duration, outcome: c.outcome,
  }));
}

export async function fetchActivity(): Promise<ActivityEntry[]> {
  const { data, error } = await supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((a) => ({ id: a.id, initials: a.initials, name: a.name, detail: a.detail, tag: a.tag, kind: a.kind }));
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id, time: a.ts_label, actor: a.actor, role: a.role, action: a.action,
    target: a.target, category: a.category, ip: a.ip, result: a.result,
  }));
}

export async function fetchWatiConns(): Promise<WatiConnection[]> {
  const { data, error } = await supabase.from('wati_connections').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map((w) => ({ id: w.id, event: w.event, sender: w.sender, api: w.api, active: w.active }));
}

export async function fetchCallApis(): Promise<CallApi[]> {
  const { data, error } = await supabase.from('call_apis').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, provider: c.provider, callerId: c.caller_id, key: c.api_key, connected: c.connected }));
}

export async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id, name: p.name, email: p.email, role: p.role, status: p.status,
    perms: { edit: p.can_edit, delete: p.can_delete, call: p.can_call },
    pages: (p.pages ?? []) as PageKey[],
    canCampaign: p.can_campaign ?? true,
  }));
}

export async function fetchAutoBackup(): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'auto_backup').single();
  return data?.value === true || data?.value === 'true';
}

// ---------------------------------------------------------------------------
// Audit + activity helpers (append-only)
// ---------------------------------------------------------------------------

function stamp(): string {
  const d = new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${m[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function logAudit(entry: {
  actor: string; role: string; action: string; target: string;
  category: AuditEntry['category']; ip?: string; result?: AuditEntry['result'];
}): Promise<void> {
  await supabase.from('audit_log').insert({
    ts_label: stamp(), actor: entry.actor, role: entry.role, action: entry.action,
    target: entry.target, category: entry.category, ip: entry.ip ?? '', result: entry.result ?? 'Success',
  });
}

export async function addActivity(a: Omit<ActivityEntry, 'id'>): Promise<void> {
  await supabase.from('activity').insert({ initials: a.initials, name: a.name, detail: a.detail, tag: a.tag, kind: a.kind });
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

export async function updateVisitor(
  id: string,
  patch: {
    name: string; company: string; phone: string; email: string;
    consent: Visitor['consent']; cleaned: boolean; status: string; category: string; subEventId: string | null;
  },
): Promise<void> {
  const { subEventId, ...rest } = patch;
  const { error } = await supabase
    .from('visitors')
    .update({ ...rest, sub_event_id: subEventId })
    .eq('id', id);
  if (error) throw error;
}

// Resolve "Event / Sub-event" to a sub_events.id, defaulting to the event's
// first/General sub-event when no sub-event name is given.
export async function subEventId(eventName: string, subName?: string): Promise<string | null> {
  const { data: ev } = await supabase.from('events').select('id').eq('name', eventName).single();
  if (!ev) return null;
  let q = supabase.from('sub_events').select('id,name').eq('event_id', ev.id);
  if (subName) q = q.eq('name', subName);
  const { data } = await q.order('created_at').limit(1);
  return data?.[0]?.id ?? null;
}

export async function importVisitors(
  rows: { name: string; company: string; phone: string; email: string; eventName: string; subEventName?: string; category?: string; cleaned?: boolean }[],
  defaultStatus: string,
): Promise<number> {
  const names = Array.from(new Set(rows.map((r) => r.eventName).filter(Boolean)));
  const { data: evs } = await supabase.from('events').select('id,name').in('name', names.length ? names : ['']);
  const evId = (n: string) => evs?.find((e) => e.name === n)?.id ?? null;
  const { data: subs } = await supabase.from('sub_events').select('id,name,event_id');
  const subFor = (eventName: string, subName?: string) => {
    const eid = evId(eventName);
    if (!eid) return null;
    const matches = (subs ?? []).filter((s) => s.event_id === eid);
    const chosen = subName ? matches.find((s) => s.name === subName) : matches[0];
    return chosen?.id ?? matches[0]?.id ?? null;
  };
  const payload = rows.map((r) => ({
    name: r.name, company: r.company, phone: r.phone, email: r.email,
    sub_event_id: subFor(r.eventName, r.subEventName), status: defaultStatus,
    category: r.category ?? '', consent: 'Pending', cleaned: r.cleaned ?? false,
  }));
  const { error } = await supabase.from('visitors').insert(payload);
  if (error) throw error;
  return payload.length;
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export async function addInvite(visitorId: string, event: string, status: string, date: string): Promise<void> {
  const { error } = await supabase.from('invites').insert({ visitor_id: visitorId, event, status, invited_on: date });
  if (error) throw error;
}

export async function setInviteStatus(inviteId: string, status: string): Promise<void> {
  const { error } = await supabase.from('invites').update({ status }).eq('id', inviteId);
  if (error) throw error;
}

export async function removeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invites').delete().eq('id', inviteId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export async function logCall(c: {
  visitorId: string; name: string; company: string; event: string;
  time: string; duration: number; outcome: string;
}): Promise<void> {
  const { error } = await supabase.from('call_log').insert({
    visitor_id: c.visitorId, name: c.name, company: c.company, event: c.event,
    call_time: c.time, duration: c.duration, outcome: c.outcome,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Campaigns — single (Visitors tab) and grouped (New campaign) both go through
// the send-campaign edge function so WATI logic lives server-side.
// ---------------------------------------------------------------------------

export async function sendCampaign(visitorIds: string[], template: string, message: string): Promise<{ total: number; events: number }> {
  const { data, error } = await supabase.functions.invoke('send-campaign', {
    body: { visitorIds, template, message },
  });
  if (error) throw error;
  return { total: data.total, events: data.events };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function createEvent(name: string): Promise<void> {
  const { error } = await supabase.from('events').insert({ name });
  if (error) throw error;
}

export async function renameEvent(from: string, to: string): Promise<void> {
  const { error } = await supabase.from('events').update({ name: to }).eq('name', from);
  if (error) throw error;
  // Campaigns/call_log/wati store event by name; keep them consistent.
  await supabase.from('wati_connections').update({ event: to }).eq('event', from);
}

export async function deleteEvent(name: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('name', name);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// WATI connections
// ---------------------------------------------------------------------------

export async function toggleWati(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('wati_connections').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function addWati(event: string, sender: string, api: string): Promise<void> {
  const { error } = await supabase.from('wati_connections').insert({ event, sender, api: api || 'wati_key_••', active: true });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Call APIs
// ---------------------------------------------------------------------------

export async function addCallApi(provider: string, callerId: string, key: string): Promise<void> {
  const { error } = await supabase.from('call_apis').insert({ provider, caller_id: callerId, api_key: key || 'sk_live_••••0000', connected: true });
  if (error) throw error;
}

export async function toggleCallApi(id: string, connected: boolean): Promise<void> {
  const { error } = await supabase.from('call_apis').update({ connected }).eq('id', id);
  if (error) throw error;
}

export async function removeCallApi(id: string): Promise<void> {
  const { error } = await supabase.from('call_apis').delete().eq('id', id);
  if (error) throw error;
}

export async function testCallApi(id: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('test-call-api', { body: { id } });
  if (error) throw error;
  return data.message as string;
}

// ---------------------------------------------------------------------------
// Users / permissions
// ---------------------------------------------------------------------------

export async function togglePerm(id: string, key: 'edit' | 'delete' | 'call', value: boolean): Promise<void> {
  const col = key === 'edit' ? 'can_edit' : key === 'delete' ? 'can_delete' : 'can_call';
  const { error } = await supabase.from('profiles').update({ [col]: value }).eq('id', id);
  if (error) throw error;
}

export async function setUserStatus(id: string, status: 'Active' | 'Suspended'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function setAutoBackup(value: boolean): Promise<void> {
  await supabase.from('app_settings').update({ value }).eq('key', 'auto_backup');
}

// ---------------------------------------------------------------------------
// App settings (generic) + MFA requirement flag
// ---------------------------------------------------------------------------
export async function getSetting(key: string): Promise<unknown> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
  return data?.value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({ key, value });
  if (error) throw error;
}

export async function getMfaRequired(): Promise<boolean> {
  const v = await getSetting('mfa_required');
  return v === true || v === 'true';
}

// ---------------------------------------------------------------------------
// Multi-factor auth (TOTP) — wraps the Supabase Auth MFA API
// ---------------------------------------------------------------------------
export async function mfaAAL(): Promise<{ currentLevel: string | null; nextLevel: string | null }> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { currentLevel: data.currentLevel ?? null, nextLevel: data.nextLevel ?? null };
}

export async function mfaVerifiedFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const totp = (data.totp ?? []).find((f) => f.status === 'verified') ?? (data.totp ?? [])[0];
  return totp?.id ?? null;
}

export async function mfaEnroll(): Promise<{ factorId: string; qr: string; secret: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function mfaVerify(factorId: string, code: string): Promise<void> {
  const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr) throw cErr;
  const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (vErr) throw vErr;
}

export async function mfaUnenroll(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function adminCreateUser(u: {
  name: string; email: string; role: string;
  can_edit: boolean; can_delete: boolean; can_call: boolean;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'create', ...u },
  });
  if (error) throw error;
  return data.tempPassword as string;
}

export async function adminResetPassword(email: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'reset', email },
  });
  if (error) throw error;
  return data.tempPassword as string;
}

export async function setUserPages(id: string, pages: PageKey[]): Promise<void> {
  const { error } = await supabase.from('profiles').update({ pages }).eq('id', id);
  if (error) throw error;
}

export async function setUserCampaign(id: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ can_campaign: value }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Real client IP (for audit entries) via the whoami edge function
// ---------------------------------------------------------------------------
export async function whoami(): Promise<string> {
  try {
    const { data } = await supabase.functions.invoke('whoami', { body: {} });
    return (data?.ip as string) || '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Sub-events
// ---------------------------------------------------------------------------
export async function addSubEvent(eventName: string, name: string): Promise<void> {
  const { data: ev } = await supabase.from('events').select('id').eq('name', eventName).single();
  if (!ev) throw new Error('Event not found');
  const { error } = await supabase.from('sub_events').insert({ event_id: ev.id, name });
  if (error) throw error;
}

export async function renameSubEvent(id: string, to: string): Promise<void> {
  const { error } = await supabase.from('sub_events').update({ name: to }).eq('id', id);
  if (error) throw error;
}

export async function removeSubEvent(id: string): Promise<void> {
  const { error } = await supabase.from('sub_events').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Status options (visitors.status references status_options.name with ON UPDATE
// CASCADE, so renames propagate; deletes are blocked while a status is in use)
// ---------------------------------------------------------------------------
export async function addStatusOption(name: string, sort: number): Promise<void> {
  const { error } = await supabase.from('status_options').insert({ name, sort });
  if (error) throw error;
}

export async function renameStatusOption(id: string, to: string): Promise<void> {
  const { error } = await supabase.from('status_options').update({ name: to }).eq('id', id);
  if (error) throw error;
}

export async function removeStatusOption(id: string): Promise<void> {
  const { error } = await supabase.from('status_options').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Campaign templates
// ---------------------------------------------------------------------------
export async function addTemplate(name: string, body: string, sort: number): Promise<void> {
  const { error } = await supabase.from('templates').insert({ name, body, sort });
  if (error) throw error;
}

export async function updateTemplate(id: string, name: string, body: string): Promise<void> {
  const { error } = await supabase.from('templates').update({ name, body }).eq('id', id);
  if (error) throw error;
}

export async function removeTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw error;
}
