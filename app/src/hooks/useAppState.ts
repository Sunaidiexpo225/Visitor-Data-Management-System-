import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ActiveCall,
  ActivityEntry,
  AppUser,
  AuditEntry,
  Campaign,
  CallApi,
  CallLogEntry,
  ConsentStatus,
  InviteStatus,
  MessageTemplate,
  PageKey,
  StatusOption,
  SubEvent,
  TabKey,
  Visitor,
  WatiConnection,
} from '../types';
import { combinePhone, fakeIp, nowStamp, parseImportDate, splitCsvLine, today } from '../lib/format';
import { exportVisitorsCsv, downloadCsv } from '../lib/csv';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

export interface EditDraft {
  refId: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  country: string;
  source: string;
  registrationDate: string;
  consent: ConsentStatus;
  cleaned: boolean;
  status: string;
  category: string;
  event: string;
  subEvent: string;
}

const ALL_PAGES: PageKey[] = ['dashboard', 'visitors', 'people', 'cleanup', 'calls', 'campaigns', 'reports'];

export interface ImportRow {
  name: string;
  company: string;
  phone: string;
  email: string;
  eventName: string;
  subEventName?: string;
  category?: string;
  cleaned?: boolean;
  refId?: string;
  country?: string;
  source?: string;
  registrationDate?: string;
  consent?: string;
  warn?: string;
}

function parseConsent(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (/opt.?ed.?in|opt.?in|^in$|^yes$|^y$|subscribed|consented/.test(s)) return 'Opted-in';
  if (/opt.?ed.?out|opt.?out|^out$|^no$|unsubscribed/.test(s)) return 'Opted-out';
  return 'Pending';
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase();
}

export function useAppState() {
  // ---- auth / session ----
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<string>('Staff');
  const [myPages, setMyPages] = useState<PageKey[]>(ALL_PAGES);
  const [canCampaign, setCanCampaign] = useState(true);
  const [myEventScope, setMyEventScope] = useState<string[]>([]);
  const [loginAs, setLoginAs] = useState<'Staff' | 'Admin'>('Staff');
  const [sessionIp, setSessionIp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA (TOTP) — admin can require it; users with a factor are challenged at login.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<'pending' | 'ok' | 'challenge' | 'enroll'>('pending');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaEnrollData, setMfaEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('dashboard');

  // ---- server-backed collections ----
  // Visitors are never all loaded into the browser (would break at 100k+); the
  // list pages fetch one page at a time via useVisitorPage. We keep only
  // aggregate stats + filter options + a refresh counter here.
  const [visitorStats, setVisitorStats] = useState<api.VisitorStats>({ total: 0, optedIn: 0, invited: 0, cleaned: 0, byEvent: [], bySubEvent: [] });
  const [visitorOptions, setVisitorOptions] = useState<{ countries: string[]; sources: string[]; categories: string[] }>({ countries: [], sources: [], categories: [] });
  const [visitorRefreshKey, setVisitorRefreshKey] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<StatusOption[]>([]);
  const [templatesList, setTemplatesList] = useState<MessageTemplate[]>([]);
  const [watiConns, setWatiConns] = useState<WatiConnection[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [callApis, setCallApis] = useState<CallApi[]>([]);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // ---- UI / filter state ----
  const [filterEvent, setFilterEvent] = useState('');
  const [filterSubEvent, setFilterSubEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConsent, setFilterConsent] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState('');
  const [message, setMessage] = useState('');

  const [cleanupFilter, setCleanupFilter] = useState('');
  const [cleanupEventFilter, setCleanupEventFilter] = useState('');
  const [cleanupSubEvent, setCleanupSubEvent] = useState('');

  const [callFilter, setCallFilter] = useState('');
  const [callEventFilter, setCallEventFilter] = useState('');
  const [callSubEvent, setCallSubEvent] = useState('');
  const [targetEvent, setTargetEvent] = useState('');
  const [targetSubEvent, setTargetSubEvent] = useState('');

  const [callingId, setCallingId] = useState<string | null>(null);
  const [callingVisitor, setCallingVisitor] = useState<Visitor | null>(null);
  const [addInviteEvent, setAddInviteEvent] = useState('');
  const [addInviteStatus, setAddInviteStatus] = useState<InviteStatus>('Pending');

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ncOpen, setNcOpen] = useState(false);
  const [ncEvents, setNcEvents] = useState<string[]>([]);
  const [ncSubEvent, setNcSubEvent] = useState('');
  const [ncTemplate, setNcTemplate] = useState('');
  const [ncMessage, setNcMessage] = useState('');
  const [ncSelectedIds, setNcSelectedIds] = useState<string[]>([]);

  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleReturningOnly, setPeopleReturningOnly] = useState(true);

  const [reportEvent, setReportEvent] = useState('');
  const [reportSubEvent, setReportSubEvent] = useState('');
  const [repCat, setRepCat] = useState<'Cleanup' | 'Calls' | 'Campaigns'>('Cleanup');
  const [repStatus, setRepStatus] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editOrigCleaned, setEditOrigCleaned] = useState(false);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState<api.VisitorTimeline | null>(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Marketing' });
  const [credModal, setCredModal] = useState<{ title: string; email: string; password: string } | null>(null);
  const [importPreview, setImportPreview] = useState<{ rows: ImportRow[]; fileName: string; forcedEvent?: string } | null>(null);

  const [addWatiOpen, setAddWatiOpen] = useState(false);
  const [editWatiId, setEditWatiId] = useState<string | null>(null);
  const [newWati, setNewWati] = useState({ event: '', sender: '', endpoint: '', token: '' });

  const [addCallApiOpen, setAddCallApiOpen] = useState(false);
  const [newCallApi, setNewCallApi] = useState({ provider: '', callerId: '', key: '' });

  const [newEventName, setNewEventName] = useState('');
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventOrig, setEditEventOrig] = useState('');
  const [editEventName, setEditEventName] = useState('');

  const [autoBackup, setAutoBackup] = useState(true);
  const [auditCat, setAuditCat] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // ---- reloaders ----
  // Refresh the visitor-derived data: bump the page key so visible list pages
  // re-fetch, and reload the aggregate stats + filter options.
  const reloadVisitors = useCallback(async () => {
    setVisitorRefreshKey((k) => k + 1);
    await Promise.all([
      api.fetchVisitorStats().then(setVisitorStats).catch((e) => flash(`Stats failed: ${errMsg(e, 'unknown error')}`)),
      api.fetchVisitorOptions().then(setVisitorOptions).catch((e) => flash(`Filter options failed: ${errMsg(e, 'unknown error')}`)),
    ]);
  }, []);
  const reloadEvents = useCallback(async () => setEvents(await api.fetchEvents()), []);
  const reloadSubEvents = useCallback(async () => setSubEvents(await api.fetchSubEvents()), []);
  const reloadStatusOptions = useCallback(async () => setStatusOptions(await api.fetchStatusOptions()), []);
  const reloadCategoryOptions = useCallback(async () => setCategoryOptions(await api.fetchCategoryOptions()), []);
  const reloadTemplates = useCallback(async () => setTemplatesList(await api.fetchTemplates()), []);
  const reloadCampaigns = useCallback(async () => setCampaigns(await api.fetchCampaigns()), []);
  const reloadCallLog = useCallback(async () => setCallLog(await api.fetchCallLog()), []);
  const reloadActivity = useCallback(async () => setActivity(await api.fetchActivity()), []);
  const reloadAudit = useCallback(async () => {
    try { setAuditLog(await api.fetchAuditLog()); } catch { /* non-admins can't read the audit log */ }
  }, []);
  const reloadWati = useCallback(async () => setWatiConns(await api.fetchWatiConns()), []);
  const reloadCallApis = useCallback(async () => {
    try { setCallApis(await api.fetchCallApis()); } catch { /* admin-only */ }
  }, []);
  const reloadUsers = useCallback(async () => {
    try { setUsers(await api.fetchUsers()); } catch { /* admin-only view */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, subs, tpls, statuses] = await Promise.all([
        api.fetchEvents(), api.fetchSubEvents(), api.fetchTemplates(), api.fetchStatusOptions(),
      ]);
      setEvents(ev);
      setSubEvents(subs);
      setTemplatesList(tpls);
      setStatusOptions(statuses);
      // Stats/options come from RPCs added in migration 0008 — keep them
      // non-fatal so the app still loads if the migration hasn't run yet, but
      // surface the reason so an empty dashboard / empty filters isn't silent.
      api.fetchVisitorStats().then(setVisitorStats).catch((e) => flash(`Stats failed: ${errMsg(e, 'unknown error')}`));
      api.fetchVisitorOptions().then(setVisitorOptions).catch((e) => flash(`Filter options failed: ${errMsg(e, 'unknown error')}`));
      reloadCategoryOptions();
      setTargetEvent((t) => t || ev[0] || '');
      setAddInviteEvent((t) => t || ev[0] || '');
      setNewWati((w) => (w.event ? w : { ...w, event: ev[0] ?? '' }));
      if (tpls[0]) {
        setTemplate((t) => t || tpls[0].value);
        setMessage((m) => m || tpls[0].body);
        setNcTemplate((t) => t || tpls[0].value);
        setNcMessage((m) => m || tpls[0].body);
      }
      await Promise.all([
        reloadCampaigns(), reloadCallLog(), reloadActivity(), reloadWati(),
        reloadUsers(), reloadAudit(), reloadCallApis(),
        api.fetchAutoBackup().then(setAutoBackup),
      ]);
    } finally {
      setLoading(false);
    }
  }, [reloadCampaigns, reloadCallLog, reloadActivity, reloadWati, reloadUsers, reloadAudit, reloadCallApis, reloadCategoryOptions]);

  // Audit helper (server insert + refresh).
  const audit = useCallback(
    (action: string, target: string, category: AuditEntry['category'], result: AuditEntry['result'] = 'Success') => {
      api
        .logAudit({ actor: email || 'unknown', role, action, target, category, ip: sessionIp || fakeIp(), result })
        .then(reloadAudit)
        .catch(() => {});
    },
    [email, role, sessionIp, reloadAudit],
  );

  // ---- session bootstrap ----
  const applySession = useCallback(
    async (sessionEmail: string | null, userId: string | null) => {
      if (!sessionEmail || !userId) {
        setLoggedIn(false);
        return;
      }
      setEmail(sessionEmail);
      const profile = await api.fetchMyProfile();
      setRole(profile?.role ?? 'Staff');
      setMyPages(profile?.pages?.length ? profile.pages : ALL_PAGES);
      setCanCampaign(profile?.canCampaign ?? true);
      setMyEventScope(profile?.eventScope ?? []);
      setSessionIp((ip) => ip || fakeIp());
      setLoggedIn(true);

      // Decide whether a second factor is needed before showing the app.
      try {
        const [required, aal] = await Promise.all([api.getMfaRequired(), api.mfaAAL()]);
        setMfaRequired(required);
        if (aal.currentLevel === 'aal2') {
          setMfaStatus('ok');
          await loadAll();
        } else if (aal.nextLevel === 'aal2') {
          // A verified factor exists — step up to AAL2.
          setMfaFactorId(await api.mfaVerifiedFactorId());
          setMfaStatus('challenge');
        } else if (required) {
          setMfaStatus('enroll');
        } else {
          setMfaStatus('ok');
          await loadAll();
        }
      } catch {
        // If the MFA API is unavailable, don't lock anyone out.
        setMfaStatus('ok');
        await loadAll();
      }
    },
    [loadAll],
  );

  function resetMfa() {
    setMfaStatus('pending');
    setMfaFactorId(null);
    setMfaEnrollData(null);
    setMfaError(null);
  }

  async function passMfa() {
    setMfaStatus('ok');
    setMfaError(null);
    await loadAll();
  }

  async function startMfaEnroll() {
    setMfaBusy(true);
    setMfaError(null);
    try {
      setMfaEnrollData(await api.mfaEnroll());
    } catch (e) {
      setMfaError(errMsg(e, 'Could not start 2FA setup. Ensure TOTP is enabled in the project.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function submitMfaEnroll(code: string) {
    if (!mfaEnrollData) return;
    setMfaBusy(true);
    setMfaError(null);
    try {
      await api.mfaVerify(mfaEnrollData.factorId, code.trim());
      await passMfa();
    } catch (e) {
      setMfaError(errMsg(e, 'Invalid code, try again.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function submitMfaChallenge(code: string) {
    if (!mfaFactorId) return;
    setMfaBusy(true);
    setMfaError(null);
    try {
      await api.mfaVerify(mfaFactorId, code.trim());
      await passMfa();
    } catch (e) {
      setMfaError(errMsg(e, 'Invalid code, try again.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function toggleMfaRequired() {
    const next = !mfaRequired;
    setMfaRequired(next);
    try {
      await api.setSetting('mfa_required', next);
      audit(next ? 'MFA requirement enabled' : 'MFA requirement disabled', 'Security', 'User Management');
    } catch (e) {
      setMfaRequired(!next);
      flash(errMsg(e, 'Could not update MFA setting.'));
    }
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      applySession(s?.user?.email ?? null, s?.user?.id ?? null).finally(() => setAuthReady(true));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setLoggedIn(false);
        resetMfa();
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const em = session.user.email ?? null;
        const uid = session.user.id;
        // Defer out of the auth callback: awaiting other Supabase calls
        // directly inside onAuthStateChange deadlocks the auth client's
        // internal lock, which stalls the post-relogin load (no data shown).
        setTimeout(() => { applySession(em, uid); }, 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function watiFor(ev: string): WatiConnection | undefined {
    return watiConns.find((w) => w.event === ev);
  }

  // Resolve event/sub-event names to the sub_event ids the server filters on.
  // null = no event filter (all); [] = an event with no sub-events (matches none).
  function subEventIdsFor(eventName: string, subName?: string): string[] | null {
    if (!eventName) return null;
    return subEvents.filter((s) => s.eventName === eventName && (!subName || s.name === subName)).map((s) => s.id);
  }
  function subEventIdsForEvents(evs: string[], subName?: string): string[] {
    return subEvents.filter((s) => evs.includes(s.eventName) && (!subName || s.name === subName)).map((s) => s.id);
  }

  function tplBody(value: string): string {
    return templatesList.find((t) => t.value === value)?.body ?? '';
  }

  function subEventsFor(eventName: string): SubEvent[] {
    return subEvents.filter((s) => s.eventName === eventName);
  }

  // ---------- Auth ----------
  function pickLoginAs(which: 'Staff' | 'Admin') {
    setLoginAs(which);
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      flash(error.message || 'Sign-in failed.');
      return;
    }
    setTab('dashboard');
    // Capture the real client IP for this session's audit entries.
    api.whoami().then((ip) => { if (ip) setSessionIp(ip); });
    setTimeout(() => audit('User signed in', 'Session', 'Authentication'), 400);
  }

  async function signOut() {
    audit('User signed out', 'Session', 'Authentication');
    await supabase.auth.signOut();
    setLoggedIn(false);
    resetMfa();
    setSelectedIds([]);
    setTab('dashboard');
  }

  function goCampaigns() {
    setTab('campaigns');
  }

  // ---------- Visitors ----------
  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllVisitors(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id)) && ids.length > 0;
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      const merged = new Set(prev);
      ids.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }

  function onTemplate(v: string) {
    setTemplate(v);
    setMessage(tplBody(v));
  }

  async function sendCampaign() {
    const selected = await api.fetchVisitorsByIds(selectedIds);
    const recipients = selected.filter((v) => v.consent === 'Opted-in');
    if (recipients.length === 0) {
      flash('Select at least one opted-in recipient.');
      return;
    }
    const tplLabel = templatesList.find((t) => t.value === template)?.label ?? template;
    try {
      const { total } = await api.sendCampaign(recipients.map((v) => v.id), tplLabel, message);
      await Promise.all([reloadCampaigns(), reloadActivity(), reloadAudit()]);
      flash(`Campaign sent to ${total} contacts.`);
      setSelectedIds([]);
    } catch (e) {
      flash(errMsg(e, 'Failed to send campaign.'));
    }
  }

  async function exportAll() {
    flash('Preparing export…');
    try {
      const rows = await api.fetchAllVisitors();
      exportVisitorsCsv(rows, 'visitors-all.csv');
      audit('CSV export generated', 'visitors-all.csv', 'Export');
      flash(`Exported ${rows.length.toLocaleString()} records.`);
    } catch (e) {
      flash(errMsg(e, 'Could not export.'));
    }
  }

  // Export everything matching an event scope (event name + optional sub-event).
  async function exportEvent(ev: string, subName?: string) {
    flash('Preparing export…');
    try {
      const ids = ev ? subEventIdsForEvents([ev], subName) : null;
      const rows = await api.fetchAllVisitors(ids);
      const label = ev ? ev.toLowerCase().replace(/\s+/g, '-') : 'all';
      exportVisitorsCsv(rows, `visitors-${label}.csv`);
      audit('CSV export generated', `visitors-${ev || 'all'}.csv`, 'Export');
      flash(`Exported ${rows.length.toLocaleString()} records.`);
    } catch (e) {
      flash(errMsg(e, 'Could not export.'));
    }
  }

  // ---------- Edit modal ----------
  function openEdit(v: Visitor) {
    setEditingId(v.id);
    setEditOrigCleaned(v.cleaned);
    setEditDraft({
      refId: v.refId, name: v.name, company: v.company, phone: v.phone, email: v.email,
      country: v.country, source: v.source, registrationDate: v.registrationDate,
      consent: v.consent, cleaned: v.cleaned, status: v.status, category: v.category, event: v.event, subEvent: v.subEvent,
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  // ---------- Visitor timeline (events this person attended) ----------
  async function openTimelineById(id: string) {
    setTimelineOpen(true);
    setTimelineLoading(true);
    setTimeline(null);
    try {
      setTimeline(await api.fetchVisitorTimeline(id));
    } catch (e) {
      setTimelineOpen(false);
      flash(errMsg(e, 'Could not load timeline (run migration 0009).'));
    } finally {
      setTimelineLoading(false);
    }
  }
  function openTimeline(v: Visitor) {
    openTimelineById(v.id);
  }

  function closeTimeline() {
    setTimelineOpen(false);
    setTimeline(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    const cleanedChanged = editOrigCleaned !== editDraft.cleaned;
    try {
      const subId = await api.subEventId(editDraft.event, editDraft.subEvent);
      await api.updateVisitor(editingId, {
        refId: editDraft.refId, name: editDraft.name, company: editDraft.company, phone: editDraft.phone, email: editDraft.email,
        country: editDraft.country, source: editDraft.source, registrationDate: editDraft.registrationDate,
        consent: editDraft.consent, cleaned: editDraft.cleaned, status: editDraft.status,
        category: editDraft.category, subEventId: subId,
      });
      await api.addActivity({
        initials: initialsOf(editDraft.name),
        name: editDraft.name,
        detail: cleanedChanged ? (editDraft.cleaned ? 'Marked as cleaned' : 'Marked as not cleaned') : 'Visitor record updated',
        tag: cleanedChanged ? 'Cleaned' : 'Edited',
        kind: cleanedChanged ? 'cleaned' : 'edit',
      });
      audit('Visitor record updated', editDraft.name, 'Data');
      await Promise.all([reloadVisitors(), reloadActivity()]);
      flash('Visitor record saved.');
      closeEdit();
    } catch (e) {
      flash(errMsg(e, 'Could not save (check your permissions).'));
    }
  }

  // ---------- Calls ----------
  function startCall(v: Visitor) {
    setActiveCall({ id: v.id, name: v.name, company: v.company, phone: v.phone, event: v.event });
    setCallSeconds(0);
    timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function endCall(outcome: InviteStatus) {
    if (!activeCall) return;
    const call = activeCall;
    const duration = callSeconds;
    clearTimer();
    setActiveCall(null);
    setCallSeconds(0);
    try {
      await api.logCall({
        visitorId: call.id, name: call.name, company: call.company, event: call.event,
        time: nowStamp().split(' ').slice(1).join(' '), duration, outcome,
      });
      const inviteTarget = targetSubEvent ? `${targetEvent} · ${targetSubEvent}` : targetEvent;
      await api.addInvite(call.id, inviteTarget, outcome, today());
      await api.addActivity({
        initials: initialsOf(call.name),
        name: call.name,
        detail: `Call outcome: ${outcome}`,
        tag: outcome === 'Invited' ? 'Invited' : outcome,
        kind: outcome === 'Invited' ? 'invited' : 'update',
      });
      audit('Call logged', `${call.name} — ${outcome}`, 'Call');
      await Promise.all([reloadCallLog(), reloadVisitors(), reloadActivity()]);
      flash(`Call logged: ${outcome}.`);
    } catch (e) {
      flash(errMsg(e, 'Could not log call (check your permissions).'));
    }
  }

  function cancelCall() {
    clearTimer();
    setActiveCall(null);
    setCallSeconds(0);
  }

  function openCall(v: Visitor) {
    setCallingId(v.id);
    setCallingVisitor(v);
  }

  function closeCall() {
    setCallingId(null);
    setCallingVisitor(null);
  }

  // Re-fetch the single visitor being viewed so its invite list stays current
  // after an invite is added/changed/removed (and refresh aggregate stats).
  async function refreshCallingVisitor() {
    if (!callingId) return;
    const [v] = await Promise.all([api.fetchVisitorById(callingId), reloadVisitors()]);
    if (v) setCallingVisitor(v);
  }

  async function addInvite() {
    if (!callingId) return;
    try {
      await api.addInvite(callingId, addInviteEvent, addInviteStatus, today());
      await refreshCallingVisitor();
      flash('Invitation added.');
    } catch (e) {
      flash(errMsg(e, 'Could not add invitation.'));
    }
  }

  async function setInviteStatus(iid: string, val: InviteStatus) {
    try {
      await api.setInviteStatus(iid, val);
      await refreshCallingVisitor();
    } catch (e) {
      flash(errMsg(e, 'Could not update invitation.'));
    }
  }

  async function removeInvite(iid: string) {
    try {
      await api.removeInvite(iid);
      await refreshCallingVisitor();
    } catch (e) {
      flash(errMsg(e, 'Could not remove invitation.'));
    }
  }

  // ---------- New campaign modal ----------
  function openNewCampaign() {
    setNcEvents(filterEvent ? [filterEvent] : []);
    setNcSubEvent('');
    setNcSelectedIds([]); // the modal fetches the opted-in pool and pre-selects it
    if (templatesList[0]) {
      setNcTemplate(templatesList[0].value);
      setNcMessage(templatesList[0].body);
    }
    setNcOpen(true);
  }

  function closeNewCampaign() {
    setNcOpen(false);
  }

  function toggleNcEvent(ev: string) {
    setNcSubEvent('');
    setNcEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  function toggleNcSelect(id: string) {
    setNcSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleNcAll(ids: string[]) {
    setNcSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id)) && ids.length > 0;
      return allSelected ? [] : [...ids];
    });
  }

  function onNcTemplate(v: string) {
    setNcTemplate(v);
    setNcMessage(tplBody(v));
  }

  async function sendNewCampaign() {
    // ncSelectedIds already holds opted-in, scope-resolved ids from the modal.
    if (ncSelectedIds.length === 0) {
      flash('Select at least one recipient.');
      return;
    }
    const tplLabel = templatesList.find((t) => t.value === ncTemplate)?.label ?? ncTemplate;
    try {
      const { total, events: evCount } = await api.sendCampaign(ncSelectedIds, tplLabel, ncMessage);
      await Promise.all([reloadCampaigns(), reloadActivity(), reloadAudit()]);
      flash(`Campaign sent to ${total} contacts across ${evCount} event(s).`);
      setNcOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Failed to send campaign.'));
    }
  }

  // ---------- Reports ----------
  function downloadPdf() {
    flash('Preparing PDF…');
    setTimeout(() => window.print(), 400);
  }

  // ---------- Admin: users ----------
  function openAddUser() {
    setNewUser({ name: '', email: '', role: 'Marketing' });
    setAddUserOpen(true);
  }
  function closeAddUser() {
    setAddUserOpen(false);
  }
  async function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      flash('Name and email are required.');
      return;
    }
    try {
      const tempPassword = await api.adminCreateUser({
        name: newUser.name, email: newUser.email, role: newUser.role,
        can_edit: true, can_delete: false, can_call: false,
      });
      audit('User created', newUser.email, 'User Management');
      await reloadUsers();
      setAddUserOpen(false);
      setCredModal({ title: 'User created', email: newUser.email, password: tempPassword });
    } catch (e) {
      flash(errMsg(e, 'Could not create user.'));
    }
  }
  async function resetPassword(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    try {
      const tempPassword = await api.adminResetPassword(u.email);
      audit('Password reset issued', u.email, 'User Management');
      setCredModal({ title: 'Password reset', email: u.email, password: tempPassword });
    } catch (e) {
      flash(errMsg(e, 'Could not reset password.'));
    }
  }
  async function toggleUser(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const next = u.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.setUserStatus(id, next);
      audit(next === 'Suspended' ? 'User suspended' : 'User activated', u.email, 'User Management');
      await reloadUsers();
    } catch (e) {
      flash(errMsg(e, 'Could not update user.'));
    }
  }
  async function togglePerm(id: string, key: 'edit' | 'delete' | 'call') {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    try {
      await api.togglePerm(id, key, !u.perms[key]);
      await reloadUsers();
    } catch (e) {
      flash(errMsg(e, 'Could not update permissions.'));
    }
  }
  async function toggleUserPage(id: string, page: PageKey) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const next = u.pages.includes(page) ? u.pages.filter((p) => p !== page) : [...u.pages, page];
    try {
      await api.setUserPages(id, next);
      await reloadUsers();
    } catch (e) {
      flash(errMsg(e, 'Could not update page access.'));
    }
  }
  async function toggleUserCampaign(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    try {
      await api.setUserCampaign(id, !u.canCampaign);
      await reloadUsers();
    } catch (e) {
      flash(errMsg(e, 'Could not update campaign access.'));
    }
  }
  async function toggleUserEvent(id: string, eventName: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const next = u.eventScope.includes(eventName) ? u.eventScope.filter((e) => e !== eventName) : [...u.eventScope, eventName];
    try {
      await api.setUserEvents(id, next);
      audit('User event access updated', `${u.email}: ${next.length ? next.join(', ') : 'all events'}`, 'User Management');
      await reloadUsers();
    } catch (e) {
      flash(errMsg(e, 'Could not update event access.'));
    }
  }

  // ---------- Admin: status options (fields) ----------
  async function createStatusOption(name: string) {
    const n = name.trim();
    if (!n) return;
    if (statusOptions.some((s) => s.name.toLowerCase() === n.toLowerCase())) {
      flash('That status already exists.');
      return;
    }
    try {
      await api.addStatusOption(n, statusOptions.length);
      audit('Status option added', n, 'Data');
      await reloadStatusOptions();
      flash('Status added.');
    } catch (e) {
      flash(errMsg(e, 'Could not add status.'));
    }
  }
  async function renameStatusOption(id: string, to: string) {
    const n = to.trim();
    if (!n) return;
    try {
      await api.renameStatusOption(id, n);
      audit('Status option renamed', n, 'Data');
      await Promise.all([reloadStatusOptions(), reloadVisitors()]);
      flash('Status renamed.');
    } catch (e) {
      flash(errMsg(e, 'Could not rename status.'));
    }
  }
  async function deleteStatusOption(id: string) {
    try {
      await api.removeStatusOption(id);
      audit('Status option removed', '', 'Data');
      await reloadStatusOptions();
      flash('Status removed.');
    } catch (e) {
      flash(errMsg(e, 'Cannot remove a status that is still in use.'));
    }
  }

  // ---------- Admin: category options (fields) ----------
  async function createCategoryOption(name: string) {
    const n = name.trim();
    if (!n) return;
    if (categoryOptions.some((s) => s.name.toLowerCase() === n.toLowerCase())) {
      flash('That category already exists.');
      return;
    }
    try {
      await api.addCategoryOption(n, categoryOptions.length);
      audit('Category option added', n, 'Data');
      await reloadCategoryOptions();
      flash('Category added.');
    } catch (e) {
      flash(errMsg(e, 'Could not add category.'));
    }
  }
  async function renameCategoryOption(id: string, to: string) {
    const n = to.trim();
    const opt = categoryOptions.find((c) => c.id === id);
    if (!n || !opt) return;
    try {
      await api.renameCategoryOption(id, opt.name, n);
      audit('Category option renamed', n, 'Data');
      await Promise.all([reloadCategoryOptions(), reloadVisitors()]);
      flash('Category renamed.');
    } catch (e) {
      flash(errMsg(e, 'Could not rename category.'));
    }
  }
  async function deleteCategoryOption(id: string) {
    try {
      await api.removeCategoryOption(id);
      audit('Category option removed', '', 'Data');
      await reloadCategoryOptions();
      flash('Category removed.');
    } catch (e) {
      flash(errMsg(e, 'Could not remove category.'));
    }
  }

  // ---------- Admin: templates ----------
  async function createTemplate(name: string, body: string) {
    if (!name.trim()) {
      flash('Template name is required.');
      return;
    }
    try {
      await api.addTemplate(name.trim(), body, templatesList.length);
      audit('Template created', name.trim(), 'Campaign');
      await reloadTemplates();
      flash('Template created.');
    } catch (e) {
      flash(errMsg(e, 'Could not create template.'));
    }
  }
  async function updateTemplate(id: string, name: string, body: string) {
    try {
      await api.updateTemplate(id, name.trim(), body);
      audit('Template updated', name.trim(), 'Campaign');
      await reloadTemplates();
      flash('Template saved.');
    } catch (e) {
      flash(errMsg(e, 'Could not save template.'));
    }
  }
  async function deleteTemplate(id: string) {
    try {
      await api.removeTemplate(id);
      audit('Template removed', '', 'Campaign');
      await reloadTemplates();
      flash('Template removed.');
    } catch (e) {
      flash(errMsg(e, 'Could not remove template.'));
    }
  }

  // ---------- Admin: import ----------
  // Header-based CSV parse: columns are matched by their header name (any
  // order, extra columns ignored). Supports a separate "Phone Code" column.
  function parseCsv(text: string, forcedEvent?: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const find = (...names: string[]) => {
      for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
      for (const n of names) { const i = header.findIndex((h) => h.includes(n)); if (i >= 0) return i; }
      return -1;
    };
    const col = {
      name: find('name', 'full name', 'visitor name'),
      company: find('company', 'organization', 'organisation'),
      phoneCode: find('phone code', 'dial code', 'dialing code', 'country code', 'code'),
      phone: find('phone', 'mobile', 'contact number'),
      email: find('email', 'e-mail'),
      event: find('event'),
      sub: find('sub-event', 'sub event', 'subevent'),
      category: find('category'),
      cleaned: find('cleanup status', 'cleaned', 'cleanup'),
      consent: find('consent', 'opt-in', 'opt in', 'opted in', 'subscription'),
      id: find('id', 'reference', 'reg id', 'registration id', 'ref'),
      country: find('country'),
      source: find('source'),
      regDate: find('registration date', 'reg date', 'registered on', 'date'),
    };
    if (col.name < 0) return []; // no recognizable header → treat as no rows

    const get = (cols: string[], i: number) => (i >= 0 ? cols[i] ?? '' : '');
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      const name = get(cols, col.name);
      if (!name) continue;
      const rawPhone = get(cols, col.phone);
      const phone = combinePhone(get(cols, col.phoneCode), rawPhone);
      const emailCol = get(cols, col.email);
      // Flag dubious phone values for the import preview.
      let warn: string | undefined;
      if (/\de\+?\d/i.test(rawPhone)) warn = 'Scientific notation — digits likely lost; re-enter from source';
      else {
        const d = phone.replace(/\D/g, '');
        if (!d) warn = 'No phone number';
        else if (d.length < 9 || d.length > 15) warn = `Unusual length (${d.length} digits)`;
      }
      rows.push({
        name,
        company: get(cols, col.company),
        phone,
        email: emailCol || name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
        eventName: forcedEvent || get(cols, col.event) || events[0] || '',
        subEventName: get(cols, col.sub) || undefined,
        category: get(cols, col.category) || undefined,
        cleaned: /^(cleaned|yes|true|y|1|done)$/i.test(get(cols, col.cleaned)),
        refId: get(cols, col.id) || undefined,
        country: get(cols, col.country) || undefined,
        source: get(cols, col.source) || undefined,
        registrationDate: parseImportDate(get(cols, col.regDate)) || undefined,
        consent: parseConsent(get(cols, col.consent)),
        warn,
      });
    }
    return rows;
  }

  function importFile(file: File, forcedEvent?: string) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''), forcedEvent);
      if (rows.length === 0) {
        flash('No rows found — make sure the file has a header row with a Name column.');
        return;
      }
      setImportPreview({ rows, fileName: file.name, forcedEvent });
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!importPreview) return;
    const { rows } = importPreview;
    setImportPreview(null);
    try {
      const n = await api.importVisitors(rows, statusOptions[0]?.name ?? 'Pre-registered');
      audit('Visitor data imported', `${n} record(s)`, 'Data');
      await reloadVisitors();
      flash(`Imported ${n} record(s).`);
    } catch (e) {
      flash(errMsg(e, 'Import failed (check your permissions).'));
    }
  }

  function cancelImport() {
    setImportPreview(null);
  }



  // ---------- Admin: events + sub-events ----------
  async function createEvent() {
    const name = newEventName.trim();
    if (!name) return;
    if (events.includes(name)) {
      flash('Event already exists.');
      return;
    }
    try {
      await api.createEvent(name);
      audit('Event created', name, 'Data');
      await reloadEvents();
      flash('Event created.');
      setNewEventName('');
    } catch (e) {
      flash(errMsg(e, 'Could not create event.'));
    }
  }

  async function createSubEvent(eventName: string, name: string) {
    const n = name.trim();
    if (!n) return;
    try {
      await api.addSubEvent(eventName, n);
      audit('Sub-event created', `${eventName} / ${n}`, 'Data');
      await reloadSubEvents();
      flash('Sub-event created.');
    } catch (e) {
      flash(errMsg(e, 'Could not create sub-event.'));
    }
  }
  async function renameSubEvent(id: string, to: string) {
    const n = to.trim();
    if (!n) return;
    try {
      await api.renameSubEvent(id, n);
      audit('Sub-event renamed', n, 'Data');
      await Promise.all([reloadSubEvents(), reloadVisitors()]);
      flash('Sub-event renamed.');
    } catch (e) {
      flash(errMsg(e, 'Could not rename sub-event.'));
    }
  }
  async function deleteSubEvent(id: string) {
    try {
      await api.removeSubEvent(id);
      audit('Sub-event removed', '', 'Data');
      await Promise.all([reloadSubEvents(), reloadVisitors()]);
      flash('Sub-event removed.');
    } catch (e) {
      flash(errMsg(e, 'Could not remove sub-event.'));
    }
  }

  function importIntoEvent(ev: string) {
    return (file: File) => importFile(file, ev);
  }

  function openEditEvent(name: string) {
    setEditEventOrig(name);
    setEditEventName(name);
    setEditEventOpen(true);
  }
  function closeEditEvent() {
    setEditEventOpen(false);
  }
  async function saveEditEvent() {
    const next = editEventName.trim();
    if (!next || next === editEventOrig) {
      setEditEventOpen(false);
      return;
    }
    if (events.includes(next)) {
      flash('Event already exists.');
      return;
    }
    try {
      await api.renameEvent(editEventOrig, next);
      if (filterEvent === editEventOrig) setFilterEvent(next);
      if (reportEvent === editEventOrig) setReportEvent(next);
      setNcEvents((prev) => prev.map((e) => (e === editEventOrig ? next : e)));
      audit('Event renamed', `${editEventOrig} → ${next}`, 'Data');
      await Promise.all([reloadEvents(), reloadSubEvents(), reloadVisitors(), reloadWati()]);
      flash('Event renamed.');
      setEditEventOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Could not rename event.'));
    }
  }
  async function deleteEvent(name: string) {
    const removedCount = visitorStats.byEvent.find((b) => b.event === name)?.count ?? 0;
    try {
      await api.deleteEvent(name);
      if (filterEvent === name) setFilterEvent('');
      if (reportEvent === name) setReportEvent('');
      audit('Event deleted', `${name} (${removedCount} record(s) removed)`, 'Data');
      await Promise.all([reloadEvents(), reloadSubEvents(), reloadVisitors(), reloadWati()]);
      flash('Event deleted.');
    } catch (e) {
      flash(errMsg(e, 'Could not delete event.'));
    }
  }

  async function clearSubEventRecords(id: string, label: string) {
    if (!window.confirm(`Delete ALL visitor records under sub-event "${label}"? This cannot be undone. The sub-event is kept.`)) return;
    try {
      const n = await api.deleteVisitorsBySubEvent(id);
      audit('Sub-event records cleared', `${label} (${n} record(s) removed)`, 'Data');
      await reloadVisitors();
      flash(`Removed ${n} record(s) from ${label}.`);
    } catch (e) {
      flash(errMsg(e, 'Could not clear records.'));
    }
  }

  async function clearEventRecords(name: string) {
    if (!window.confirm(`Delete ALL visitor records under "${name}"? This cannot be undone. The event and its sub-events are kept.`)) return;
    try {
      const n = await api.deleteVisitorsByEvent(name);
      audit('Event records cleared', `${name} (${n} record(s) removed)`, 'Data');
      await reloadVisitors();
      flash(`Removed ${n} record(s) from ${name}.`);
    } catch (e) {
      flash(errMsg(e, 'Could not clear records.'));
    }
  }

  // ---------- Admin: WATI ----------
  async function toggleWati(ev: string) {
    const conn = watiConns.find((w) => w.event === ev);
    if (!conn?.id) return;
    try {
      await api.toggleWati(conn.id, !conn.active);
      audit('WATI connection toggled', ev, 'Integration');
      await reloadWati();
    } catch (e) {
      flash(errMsg(e, 'Could not update WATI connection.'));
    }
  }
  function openAddWati() {
    setEditWatiId(null);
    setNewWati({ event: events[0] ?? '', sender: '', endpoint: '', token: '' });
    setAddWatiOpen(true);
  }
  function openEditWati(id: string) {
    const conn = watiConns.find((w) => w.id === id);
    if (!conn) return;
    setEditWatiId(id);
    setNewWati({ event: conn.event, sender: conn.sender, endpoint: conn.endpoint, token: '' });
    setAddWatiOpen(true);
  }
  function closeAddWati() {
    setAddWatiOpen(false);
  }
  async function addWati() {
    if (!newWati.event || !newWati.sender.trim()) {
      flash('Event and sender number are required.');
      return;
    }
    try {
      if (editWatiId) {
        await api.updateWati(editWatiId, { sender: newWati.sender, endpoint: newWati.endpoint, token: newWati.token || undefined });
        audit('WATI connection updated', newWati.event, 'Integration');
      } else {
        await api.addWati(newWati.event, newWati.sender, newWati.endpoint, newWati.token);
        audit('WATI connection added', newWati.event, 'Integration');
      }
      await reloadWati();
      flash(editWatiId ? 'WATI connection updated.' : 'WATI connection added.');
      setAddWatiOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Could not save WATI connection.'));
    }
  }

  // ---------- Admin: Call APIs ----------
  async function toggleCallApi(id: string) {
    const c = callApis.find((x) => x.id === id);
    if (!c) return;
    try {
      await api.toggleCallApi(id, !c.connected);
      audit(c.connected ? 'Call API disconnected' : 'Call API connected', c.provider, 'Integration');
      await reloadCallApis();
    } catch (e) {
      flash(errMsg(e, 'Could not update call API.'));
    }
  }
  async function testCallApi(id: string) {
    try {
      const msg = await api.testCallApi(id);
      flash(msg);
    } catch (e) {
      flash(errMsg(e, 'Test failed.'));
    }
  }
  async function removeCallApi(id: string) {
    const c = callApis.find((x) => x.id === id);
    try {
      await api.removeCallApi(id);
      if (c) audit('Call API removed', c.provider, 'Integration');
      await reloadCallApis();
    } catch (e) {
      flash(errMsg(e, 'Could not remove call API.'));
    }
  }
  function openAddCallApi() {
    setNewCallApi({ provider: '', callerId: '', key: '' });
    setAddCallApiOpen(true);
  }
  function closeAddCallApi() {
    setAddCallApiOpen(false);
  }
  async function addCallApi() {
    if (!newCallApi.provider.trim() || !newCallApi.callerId.trim()) {
      flash('Provider and caller ID are required.');
      return;
    }
    try {
      await api.addCallApi(newCallApi.provider, newCallApi.callerId, newCallApi.key);
      audit('Call API added', newCallApi.provider, 'Integration');
      await reloadCallApis();
      flash('Call API added.');
      setAddCallApiOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Could not add call API.'));
    }
  }

  // ---------- Admin: backup / audit ----------
  async function toggleAutoBackup() {
    const next = !autoBackup;
    setAutoBackup(next);
    try {
      await api.setAutoBackup(next);
    } catch {
      setAutoBackup(!next);
    }
  }
  function exportAuditCsv(rows: AuditEntry[]) {
    const header = ['Time', 'Actor', 'Role', 'Action', 'Target', 'Category', 'IP', 'Result'];
    downloadCsv(
      [header, ...rows.map((r) => [r.time, r.actor, r.role, r.action, r.target, r.category, r.ip, r.result])],
      'audit-log.csv'
    );
    audit('Audit log exported', 'audit-log.csv', 'Export');
    flash('Audit log exported.');
  }

  // Non-admin users limited to specific events only see those in dropdowns.
  const scopedEvents = role === 'Admin' || myEventScope.length === 0 ? events : events.filter((e) => myEventScope.includes(e));

  return {
    // auth
    loggedIn, authReady, loading, role, myPages, canCampaign, myEventScope, loginAs, sessionIp, email, password,
    setEmail, setPassword, pickLoginAs, signIn, signOut,
    // mfa
    mfaRequired, mfaStatus, mfaEnrollData, mfaBusy, mfaError,
    startMfaEnroll, submitMfaEnroll, submitMfaChallenge, toggleMfaRequired,
    // shell
    tab, setTab, goCampaigns,
    // data
    visitorStats, visitorOptions, visitorRefreshKey, subEventIdsFor, subEventIdsForEvents,
    events: scopedEvents, allEvents: events, subEvents, subEventsFor, statusOptions, categoryOptions, templatesList,
    watiConns, users, callApis, callLog, campaigns, activity, auditLog,
    // visitors tab
    filterEvent, setFilterEvent, filterSubEvent, setFilterSubEvent, filterStatus, setFilterStatus,
    filterConsent, setFilterConsent, search, setSearch,
    selectedIds, toggleSelect, toggleAllVisitors, template, message, onTemplate, setMessage, sendCampaign,
    exportAll, exportEvent,
    // edit modal
    editingId, editDraft, setEditDraft, openEdit, closeEdit, saveEdit,
    // visitor timeline + people page
    timelineOpen, timelineLoading, timeline, openTimeline, openTimelineById, closeTimeline,
    peopleSearch, setPeopleSearch, peopleReturningOnly, setPeopleReturningOnly,
    // cleanup
    cleanupFilter, setCleanupFilter, cleanupEventFilter, setCleanupEventFilter, cleanupSubEvent, setCleanupSubEvent,
    // calls
    callFilter, setCallFilter, callEventFilter, setCallEventFilter, callSubEvent, setCallSubEvent,
    targetEvent, setTargetEvent, targetSubEvent, setTargetSubEvent,
    startCall, endCall, cancelCall, activeCall, callSeconds,
    callingId, callingVisitor, openCall, closeCall, addInviteEvent, setAddInviteEvent, addInviteStatus, setAddInviteStatus,
    addInvite, setInviteStatus, removeInvite,
    // campaigns
    ncOpen, ncEvents, ncSubEvent, setNcSubEvent, ncTemplate, ncMessage, ncSelectedIds, setNcSelectedIds, watiFor,
    openNewCampaign, closeNewCampaign, toggleNcEvent, toggleNcSelect, toggleNcAll, onNcTemplate, setNcMessage, sendNewCampaign,
    // reports
    reportEvent, setReportEvent, reportSubEvent, setReportSubEvent, repCat, setRepCat, repStatus, setRepStatus, downloadPdf,
    // admin: users
    addUserOpen, newUser, setNewUser, openAddUser, closeAddUser, addUser, resetPassword, toggleUser, togglePerm,
    toggleUserPage, toggleUserCampaign, toggleUserEvent,
    credModal, closeCredModal: () => setCredModal(null),
    // admin: fields (status + category options)
    createStatusOption, renameStatusOption, deleteStatusOption,
    createCategoryOption, renameCategoryOption, deleteCategoryOption,
    // admin: templates
    createTemplate, updateTemplate, deleteTemplate,
    // admin: import
    importFile, importPreview, confirmImport, cancelImport,
    // admin: events + sub-events
    newEventName, setNewEventName, createEvent, importIntoEvent,
    createSubEvent, renameSubEvent, deleteSubEvent, clearEventRecords, clearSubEventRecords,
    editEventOpen, editEventName, setEditEventName, openEditEvent, closeEditEvent, saveEditEvent, deleteEvent,
    // admin: wati
    addWatiOpen, editWatiId, newWati, setNewWati, openAddWati, openEditWati, closeAddWati, addWati, toggleWati,
    // admin: call apis
    addCallApiOpen, newCallApi, setNewCallApi, openAddCallApi, closeAddCallApi, addCallApi, toggleCallApi, testCallApi, removeCallApi,
    // admin: backup/audit
    autoBackup, toggleAutoBackup, auditCat, setAuditCat, auditSearch, setAuditSearch, exportAuditCsv,
    // toast
    toast, flash,
  };
}

function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}

export type AppState = ReturnType<typeof useAppState>;
