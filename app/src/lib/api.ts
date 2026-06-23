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
  'id,ref_id,name,company,phone,email,country,source,registration_date,status,category,consent,cleaned,sub_event:sub_events(name,event:events(name)),invites(id,event,status,invited_on)';

type NameRef = { name: string } | { name: string }[] | null;
type SubEventRef = { name: string; event: NameRef } | { name: string; event: NameRef }[] | null;

type VisitorRow = {
  id: string;
  ref_id: string | null;
  name: string;
  company: string;
  phone: string;
  email: string;
  country: string | null;
  source: string | null;
  registration_date: string | null;
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
    refId: r.ref_id ?? '',
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    country: r.country ?? '',
    source: r.source ?? '',
    registrationDate: r.registration_date ?? '',
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

// Server-side counts so dashboard KPIs stay correct beyond the API row cap.
export interface VisitorStats {
  total: number;
  optedIn: number;
  invited: number;
  cleaned: number;
  byEvent: { event: string; count: number }[];
  bySubEvent: { event: string; subEvent: string; subEventId: string; count: number; cleaned: number }[];
}

const EMPTY_STATS: VisitorStats = { total: 0, optedIn: 0, invited: 0, cleaned: 0, byEvent: [], bySubEvent: [] };

// Single round-trip via the visitor_stats() RPC. If that RPC is unreachable
// (e.g. PostgREST's schema cache hasn't picked it up yet after a migration),
// fall back to plain count queries so the dashboard still works.
export async function fetchVisitorStats(): Promise<VisitorStats> {
  const { data, error } = await supabase.rpc('visitor_stats');
  if (!error && data) return { ...EMPTY_STATS, ...(data as Partial<VisitorStats>) };
  return fetchVisitorStatsFallback();
}

async function visitorCount(apply?: (q: ReturnType<typeof statsBaseQuery>) => ReturnType<typeof statsBaseQuery>): Promise<number> {
  let q = statsBaseQuery();
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
function statsBaseQuery() {
  return supabase.from('visitors').select('*', { count: 'exact', head: true });
}

async function fetchVisitorStatsFallback(): Promise<VisitorStats> {
  const [total, optedIn, cleaned, subs] = await Promise.all([
    visitorCount(),
    visitorCount((q) => q.eq('consent', 'Opted-in')),
    visitorCount((q) => q.eq('cleaned', true)),
    fetchSubEvents(),
  ]);
  // latest_invite_status is a 0008 column; if it isn't cached yet, treat as 0.
  let invited = 0;
  try { invited = await visitorCount((q) => q.eq('latest_invite_status', 'Invited')); } catch { /* pre-0008 */ }

  // Per-sub-event counts in parallel (only runs in the rare fallback path).
  const subCounts = await Promise.all(
    subs.map(async (s) => ({ s, count: await visitorCount((q) => q.eq('sub_event_id', s.id)) })),
  );
  const evMap = new Map<string, number>();
  const bySubEvent = subCounts.map(({ s, count }) => {
    evMap.set(s.eventName, (evMap.get(s.eventName) ?? 0) + count);
    return { event: s.eventName, subEvent: s.name, subEventId: s.id, count, cleaned: 0 };
  });
  const byEvent = Array.from(evMap, ([event, count]) => ({ event, count }));
  return { total, optedIn, invited, cleaned, byEvent, bySubEvent };
}

// Distinct Country / Source / Category values for the filter dropdowns.
export async function fetchVisitorOptions(): Promise<{ countries: string[]; sources: string[]; categories: string[] }> {
  const { data, error } = await supabase.rpc('visitor_options');
  if (error) throw error;
  const d = (data ?? {}) as { countries?: string[]; sources?: string[]; categories?: string[] };
  return { countries: d.countries ?? [], sources: d.sources ?? [], categories: d.categories ?? [] };
}

// --- server-side, paginated visitor browsing (the core of 100k scalability) ---
export interface VisitorQuery {
  subEventIds?: string[] | null; // null = no event filter; [] = match nothing
  status?: string;
  consent?: string;
  country?: string;
  source?: string;
  category?: string;
  cleaned?: boolean | null;
  invite?: string; // '', 'none', 'pending', 'invited', 'notinterested'
  search?: string;
  page: number;
  pageSize: number;
}

const INVITE_STATUS: Record<string, string> = {
  none: 'Not contacted', pending: 'Pending', invited: 'Invited', notinterested: 'Not interested',
};

export async function fetchVisitorsPage(q: VisitorQuery): Promise<{ rows: Visitor[]; total: number }> {
  if (q.subEventIds && q.subEventIds.length === 0) return { rows: [], total: 0 };
  let query = supabase.from('visitors').select(VISITOR_SELECT, { count: 'exact' });
  if (q.subEventIds) query = query.in('sub_event_id', q.subEventIds);
  if (q.status) query = query.eq('status', q.status);
  if (q.consent) query = query.eq('consent', q.consent);
  if (q.country) query = query.eq('country', q.country);
  if (q.source) query = query.eq('source', q.source);
  if (q.category) query = query.eq('category', q.category);
  if (q.cleaned != null) query = query.eq('cleaned', q.cleaned);
  if (q.invite && INVITE_STATUS[q.invite]) query = query.eq('latest_invite_status', INVITE_STATUS[q.invite]);

  const raw = (q.search ?? '').trim();
  if (raw) {
    // Strip PostgREST `or()` delimiters so user input can't break the filter.
    const safe = raw.replace(/[,()*%]/g, ' ').trim();
    const digits = raw.replace(/\D/g, '');
    const ors: string[] = [];
    if (safe) ors.push(`name.ilike.%${safe}%`, `company.ilike.%${safe}%`, `email.ilike.%${safe}%`, `ref_id.ilike.%${safe}%`);
    if (digits) ors.push(`phone_digits.ilike.%${digits}%`);
    if (ors.length) query = query.or(ors.join(','));
  }

  query = query.order('created_at').range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: ((data ?? []) as unknown as VisitorRow[]).map(mapVisitor), total: count ?? 0 };
}

// Per-visitor timeline: every event this person (matched by phone, or email
// when phone is blank) has registered for, in chronological order.
export interface TimelineVisit {
  id: string;
  event: string;
  subEvent: string;
  date: string | null;
  consent: string;
  status: string;
  cleaned: boolean;
  current: boolean;
}
export interface VisitorTimeline {
  person: { name: string; company: string; phone: string; email: string };
  visits: TimelineVisit[];
}

// One row per person (collapsing multi-event registrations) for the People page.
export interface Person {
  personKey: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  latestId: string;
  registrations: number;
  events: number;
  firstSeen: string | null;
  lastSeen: string | null;
  optedIn: boolean;
}

type PersonRow = {
  person_key: string; name: string | null; company: string | null; phone: string | null;
  email: string | null; latest_id: string; registrations: number; events: number;
  first_seen: string | null; last_seen: string | null; opted_in: boolean;
};
function mapPerson(r: PersonRow): Person {
  return {
    personKey: r.person_key, name: r.name ?? '', company: r.company ?? '', phone: r.phone ?? '',
    email: r.email ?? '', latestId: r.latest_id, registrations: r.registrations, events: r.events,
    firstSeen: r.first_seen, lastSeen: r.last_seen, optedIn: r.opted_in,
  };
}

export async function fetchPeoplePage(q: { search?: string; page: number; pageSize: number }): Promise<{ rows: Person[]; total: number }> {
  let query = supabase.from('people_overview').select('*', { count: 'exact' });
  const raw = (q.search ?? '').trim();
  if (raw) {
    const safe = raw.replace(/[,()*%]/g, ' ').trim();
    const digits = raw.replace(/\D/g, '');
    const ors: string[] = [];
    if (safe) ors.push(`name.ilike.%${safe}%`, `company.ilike.%${safe}%`, `email.ilike.%${safe}%`);
    if (digits) ors.push(`phone_digits.ilike.%${digits}%`);
    if (ors.length) query = query.or(ors.join(','));
  }
  query = query.order('last_seen', { ascending: false, nullsFirst: false }).range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: ((data ?? []) as PersonRow[]).map(mapPerson), total: count ?? 0 };
}

export async function fetchVisitorTimeline(id: string): Promise<VisitorTimeline> {
  const { data, error } = await supabase.rpc('visitor_timeline', { p_id: id });
  if (error) throw error;
  const d = (data ?? {}) as Partial<VisitorTimeline>;
  return {
    person: d.person ?? { name: '', company: '', phone: '', email: '' },
    visits: (d.visits ?? []).map((v) => ({ ...v, event: v.event ?? '', subEvent: v.subEvent ?? '' })),
  };
}

export async function fetchVisitorById(id: string): Promise<Visitor | null> {
  const { data, error } = await supabase.from('visitors').select(VISITOR_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapVisitor(data as unknown as VisitorRow) : null;
}

export async function fetchVisitorsByIds(ids: string[]): Promise<Visitor[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('visitors').select(VISITOR_SELECT).in('id', ids);
  if (error) throw error;
  return ((data ?? []) as unknown as VisitorRow[]).map(mapVisitor);
}

// Opted-in recipients for a campaign — id + display fields only (lightweight).
export async function fetchOptedInPool(subEventIds: string[]): Promise<{ id: string; name: string; company: string; event: string }[]> {
  if (subEventIds.length === 0) return [];
  const { data, error } = await supabase
    .from('visitors')
    .select('id,name,company,sub_event:sub_events(event:events(name))')
    .eq('consent', 'Opted-in')
    .in('sub_event_id', subEventIds)
    .order('name')
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((r) => {
    const row = r as { id: string; name: string; company: string; sub_event: SubEventRef };
    const se = unwrap(row.sub_event);
    const ev = se ? unwrap((se as { event: NameRef }).event) : null;
    return { id: row.id, name: row.name, company: row.company, event: ev?.name ?? '' };
  });
}

// Delete every visitor record under a single sub-event (keeps the sub-event).
export async function deleteVisitorsBySubEvent(subEventId: string): Promise<number> {
  const { error, count } = await supabase.from('visitors').delete({ count: 'exact' }).eq('sub_event_id', subEventId);
  if (error) throw error;
  return count ?? 0;
}

// Delete every visitor record under an event (keeps the event + sub-events).
export async function deleteVisitorsByEvent(eventName: string): Promise<number> {
  const { data: ev } = await supabase.from('events').select('id').eq('name', eventName).single();
  if (!ev) return 0;
  const { data: subs } = await supabase.from('sub_events').select('id').eq('event_id', ev.id);
  const ids = (subs ?? []).map((s) => s.id);
  if (ids.length === 0) return 0;
  const { error, count } = await supabase.from('visitors').delete({ count: 'exact' }).in('sub_event_id', ids);
  if (error) throw error;
  return count ?? 0;
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

export async function fetchMyProfile(): Promise<{ role: string; pages: PageKey[]; canCampaign: boolean; eventScope: string[] } | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('role,pages,can_campaign,event_scope')
    .eq('id', u.user.id)
    .single();
  if (!data) return null;
  return {
    role: data.role,
    pages: (data.pages ?? []) as PageKey[],
    canCampaign: data.can_campaign,
    eventScope: (data.event_scope ?? []) as string[],
  };
}

export async function fetchVisitors(): Promise<Visitor[]> {
  const { data, error } = await supabase.from('visitors').select(VISITOR_SELECT).order('created_at');
  if (error) throw error;
  return ((data ?? []) as unknown as VisitorRow[]).map(mapVisitor);
}

// Stream every matching visitor in 1000-row chunks. Only used for CSV export
// (a user-initiated action), never on load — browsing is server-paginated.
export async function fetchAllVisitors(subEventIds?: string[] | null): Promise<Visitor[]> {
  if (subEventIds && subEventIds.length === 0) return [];
  const chunk = 1000;
  const all: Visitor[] = [];
  for (let from = 0; ; from += chunk) {
    let q = supabase.from('visitors').select(VISITOR_SELECT).order('created_at').range(from, from + chunk - 1);
    if (subEventIds) q = q.in('sub_event_id', subEventIds);
    const { data, error } = await q;
    if (error) throw error;
    const mapped = ((data ?? []) as unknown as VisitorRow[]).map(mapVisitor);
    all.push(...mapped);
    if (mapped.length < chunk) break;
  }
  return all;
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
  // Never select `token` (revoked from client roles anyway).
  const { data, error } = await supabase
    .from('wati_connections')
    .select('id,event,sender,api,endpoint,active')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((w) => ({ id: w.id, event: w.event, sender: w.sender, api: w.api, endpoint: w.endpoint ?? '', active: w.active }));
}

function maskToken(token: string): string {
  return token ? '••' + token.slice(-4) : 'wati_key_••';
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
    eventScope: (p.event_scope ?? []) as string[],
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
    refId: string; name: string; company: string; phone: string; email: string;
    country: string; source: string; registrationDate: string;
    consent: Visitor['consent']; cleaned: boolean; status: string; category: string; subEventId: string | null;
  },
): Promise<void> {
  const { subEventId, refId, registrationDate, ...rest } = patch;
  const { error } = await supabase
    .from('visitors')
    .update({
      ...rest,
      ref_id: refId,
      registration_date: registrationDate || null,
      sub_event_id: subEventId,
    })
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
  rows: { name: string; company: string; phone: string; email: string; eventName: string; subEventName?: string; category?: string; cleaned?: boolean; refId?: string; country?: string; source?: string; registrationDate?: string; consent?: string }[],
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
    ref_id: r.refId ?? '', name: r.name, company: r.company, phone: r.phone, email: r.email,
    country: r.country ?? '', source: r.source ?? '', registration_date: r.registrationDate || null,
    sub_event_id: subFor(r.eventName, r.subEventName), status: defaultStatus,
    category: r.category ?? '', consent: r.consent ?? 'Pending', cleaned: r.cleaned ?? false,
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

export async function addWati(event: string, sender: string, endpoint: string, token: string): Promise<void> {
  const { error } = await supabase.from('wati_connections').insert({
    event, sender, endpoint, token, api: maskToken(token), active: true,
  });
  if (error) throw error;
}

export async function updateWati(id: string, patch: { sender: string; endpoint: string; token?: string }): Promise<void> {
  const update: Record<string, unknown> = { sender: patch.sender, endpoint: patch.endpoint };
  if (patch.token) {
    update.token = patch.token;
    update.api = maskToken(patch.token);
  }
  const { error } = await supabase.from('wati_connections').update(update).eq('id', id);
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

export async function setUserEvents(id: string, events: string[]): Promise<void> {
  const { error } = await supabase.from('profiles').update({ event_scope: events }).eq('id', id);
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
