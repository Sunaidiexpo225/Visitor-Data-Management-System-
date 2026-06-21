import { supabase } from './supabase';
import type {
  ActivityEntry,
  AppUser,
  AuditEntry,
  Campaign,
  CallApi,
  CallLogEntry,
  Visitor,
  WatiConnection,
} from '../types';

// ---------------------------------------------------------------------------
// Row → app-type mappers (DB is snake_case; app types are camelCase, and a
// visitor's event is denormalised to its name to match the prototype shape).
// ---------------------------------------------------------------------------

const VISITOR_SELECT =
  'id,name,company,phone,email,status,consent,cleaned,event:events(name),invites(id,event,status,invited_on)';

type VisitorRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: Visitor['status'];
  consent: Visitor['consent'];
  cleaned: boolean;
  event: { name: string } | { name: string }[] | null;
  invites: { id: string; event: string; status: Visitor['invites'][number]['status']; invited_on: string }[] | null;
};

function eventName(ev: VisitorRow['event']): string {
  if (!ev) return '';
  return Array.isArray(ev) ? ev[0]?.name ?? '' : ev.name;
}

function mapVisitor(r: VisitorRow): Visitor {
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    event: eventName(r.event),
    status: r.status,
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
  patch: { name: string; company: string; phone: string; email: string; consent: Visitor['consent']; cleaned: boolean },
): Promise<void> {
  const { error } = await supabase.from('visitors').update(patch).eq('id', id);
  if (error) throw error;
}

export async function eventIdByName(name: string): Promise<string | null> {
  const { data } = await supabase.from('events').select('id').eq('name', name).single();
  return data?.id ?? null;
}

export async function importVisitors(
  rows: { name: string; company: string; phone: string; email: string; eventName: string }[],
): Promise<number> {
  const names = Array.from(new Set(rows.map((r) => r.eventName).filter(Boolean)));
  const { data: evs } = await supabase.from('events').select('id,name').in('name', names.length ? names : ['']);
  const idFor = (n: string) => evs?.find((e) => e.name === n)?.id ?? null;
  const payload = rows.map((r) => ({
    name: r.name, company: r.company, phone: r.phone, email: r.email,
    event_id: idFor(r.eventName), status: 'Pre-registered', consent: 'Pending', cleaned: false,
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
