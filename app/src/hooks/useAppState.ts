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
  TabKey,
  Visitor,
  WatiConnection,
} from '../types';
import { templates, tplMessage } from '../data/seed';
import { fakeIp, nowStamp, today } from '../lib/format';
import { exportVisitorsCsv, downloadCsv } from '../lib/csv';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

export interface EditDraft {
  name: string;
  company: string;
  phone: string;
  email: string;
  consent: ConsentStatus;
  cleaned: boolean;
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase();
}

export function useAppState() {
  // ---- auth / session ----
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<string>('Staff');
  const [loginAs, setLoginAs] = useState<'Staff' | 'Admin'>('Staff');
  const [sessionIp, setSessionIp] = useState('');
  const [email, setEmail] = useState('marketing@sunaidiexpo.com');
  const [password, setPassword] = useState('expo2026');
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<TabKey>('dashboard');

  // ---- server-backed collections ----
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [watiConns, setWatiConns] = useState<WatiConnection[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [callApis, setCallApis] = useState<CallApi[]>([]);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // ---- UI / filter state ----
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConsent, setFilterConsent] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState(templates[0].value);
  const [message, setMessage] = useState(tplMessage(templates[0].value));

  const [cleanupFilter, setCleanupFilter] = useState('');
  const [cleanupEventFilter, setCleanupEventFilter] = useState('');

  const [callFilter, setCallFilter] = useState('');
  const [callEventFilter, setCallEventFilter] = useState('');
  const [targetEvent, setTargetEvent] = useState('');

  const [callingId, setCallingId] = useState<string | null>(null);
  const [addInviteEvent, setAddInviteEvent] = useState('');
  const [addInviteStatus, setAddInviteStatus] = useState<InviteStatus>('Pending');

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ncOpen, setNcOpen] = useState(false);
  const [ncEvents, setNcEvents] = useState<string[]>([]);
  const [ncTemplate, setNcTemplate] = useState(templates[0].value);
  const [ncMessage, setNcMessage] = useState(tplMessage(templates[0].value));
  const [ncSelectedIds, setNcSelectedIds] = useState<string[]>([]);

  const [reportEvent, setReportEvent] = useState('');
  const [repCat, setRepCat] = useState<'Cleanup' | 'Calls' | 'Campaigns'>('Cleanup');
  const [repStatus, setRepStatus] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Marketing' });

  const [addWatiOpen, setAddWatiOpen] = useState(false);
  const [newWati, setNewWati] = useState({ event: '', sender: '', api: '' });

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
  const reloadVisitors = useCallback(async () => setVisitors(await api.fetchVisitors()), []);
  const reloadEvents = useCallback(async () => setEvents(await api.fetchEvents()), []);
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
  const reloadUsers = useCallback(async () => setUsers(await api.fetchUsers()), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, vis] = await Promise.all([api.fetchEvents(), api.fetchVisitors()]);
      setEvents(ev);
      setVisitors(vis);
      setTargetEvent((t) => t || ev[0] || '');
      setAddInviteEvent((t) => t || ev[0] || '');
      setNewWati((w) => (w.event ? w : { ...w, event: ev[0] ?? '' }));
      await Promise.all([
        reloadCampaigns(), reloadCallLog(), reloadActivity(), reloadWati(),
        reloadUsers(), reloadAudit(), reloadCallApis(),
        api.fetchAutoBackup().then(setAutoBackup),
      ]);
    } finally {
      setLoading(false);
    }
  }, [reloadCampaigns, reloadCallLog, reloadActivity, reloadWati, reloadUsers, reloadAudit, reloadCallApis]);

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
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
      setRole(profile?.role ?? 'Staff');
      setSessionIp((ip) => ip || fakeIp());
      setLoggedIn(true);
      await loadAll();
    },
    [loadAll],
  );

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
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        applySession(session.user.email ?? null, session.user.id);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // applySession is stable for our purposes (loadAll deps are stable callbacks)
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

  function optedInIds(evs: string[]): string[] {
    return visitors.filter((v) => evs.includes(v.event) && v.consent === 'Opted-in').map((v) => v.id);
  }

  // ---------- Auth ----------
  function pickLoginAs(which: 'Staff' | 'Admin') {
    setLoginAs(which);
    setEmail(which === 'Admin' ? 'admin@sunaidiexpo.com' : 'marketing@sunaidiexpo.com');
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
    // applySession runs from the auth listener; log the sign-in once loaded.
    setTimeout(() => audit('User signed in', 'Session', 'Authentication'), 300);
  }

  async function signOut() {
    audit('User signed out', 'Session', 'Authentication');
    await supabase.auth.signOut();
    setLoggedIn(false);
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
    setMessage(tplMessage(v));
  }

  async function sendCampaign() {
    const recipients = visitors.filter((v) => selectedIds.includes(v.id) && v.consent === 'Opted-in');
    if (recipients.length === 0) {
      flash('Select at least one opted-in recipient.');
      return;
    }
    const tplLabel = templates.find((t) => t.value === template)?.label ?? template;
    try {
      const { total } = await api.sendCampaign(recipients.map((v) => v.id), tplLabel, message);
      await Promise.all([reloadCampaigns(), reloadActivity(), reloadAudit()]);
      flash(`Campaign sent to ${total} contacts.`);
      setSelectedIds([]);
    } catch (e) {
      flash(errMsg(e, 'Failed to send campaign.'));
    }
  }

  function exportAll() {
    exportVisitorsCsv(visitors, 'visitors-all.csv');
    audit('CSV export generated', 'visitors-all.csv', 'Export');
    flash('Export ready.');
  }

  function exportFiltered(rows: Visitor[]) {
    exportVisitorsCsv(rows, 'visitors-filtered.csv');
    audit('CSV export generated', 'visitors-filtered.csv', 'Export');
    flash('Export ready.');
  }

  function exportEvent(rows: Visitor[], ev: string) {
    exportVisitorsCsv(rows, `visitors-${ev.toLowerCase().replace(/\s+/g, '-')}.csv`);
    audit('CSV export generated', `visitors-${ev}.csv`, 'Export');
    flash('Export ready.');
  }

  // ---------- Edit modal ----------
  function openEdit(id: string) {
    const v = visitors.find((x) => x.id === id);
    if (!v) return;
    setEditingId(id);
    setEditDraft({ name: v.name, company: v.company, phone: v.phone, email: v.email, consent: v.consent, cleaned: v.cleaned });
  }

  function closeEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    const before = visitors.find((v) => v.id === editingId);
    const cleanedChanged = before && before.cleaned !== editDraft.cleaned;
    try {
      await api.updateVisitor(editingId, {
        name: editDraft.name, company: editDraft.company, phone: editDraft.phone,
        email: editDraft.email, consent: editDraft.consent, cleaned: editDraft.cleaned,
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
  function startCall(id: string) {
    const v = visitors.find((x) => x.id === id);
    if (!v) return;
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
      await api.addInvite(call.id, targetEvent, outcome, today());
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

  function openCall(id: string) {
    setCallingId(id);
  }

  function closeCall() {
    setCallingId(null);
  }

  async function addInvite() {
    if (!callingId) return;
    try {
      await api.addInvite(callingId, addInviteEvent, addInviteStatus, today());
      await reloadVisitors();
      flash('Invitation added.');
    } catch (e) {
      flash(errMsg(e, 'Could not add invitation.'));
    }
  }

  async function setInviteStatus(iid: string, val: InviteStatus) {
    try {
      await api.setInviteStatus(iid, val);
      await reloadVisitors();
    } catch (e) {
      flash(errMsg(e, 'Could not update invitation.'));
    }
  }

  async function removeInvite(iid: string) {
    try {
      await api.removeInvite(iid);
      await reloadVisitors();
    } catch (e) {
      flash(errMsg(e, 'Could not remove invitation.'));
    }
  }

  // ---------- New campaign modal ----------
  function openNewCampaign() {
    setNcEvents(filterEvent ? [filterEvent] : []);
    setNcSelectedIds(optedInIds(filterEvent ? [filterEvent] : []));
    setNcTemplate(templates[0].value);
    setNcMessage(tplMessage(templates[0].value));
    setNcOpen(true);
  }

  function closeNewCampaign() {
    setNcOpen(false);
  }

  function toggleNcEvent(ev: string) {
    setNcEvents((prev) => {
      const next = prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev];
      setNcSelectedIds(optedInIds(next));
      return next;
    });
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
    setNcMessage(tplMessage(v));
  }

  async function sendNewCampaign() {
    if (ncSelectedIds.length === 0) {
      flash('Select at least one recipient.');
      return;
    }
    const tplLabel = templates.find((t) => t.value === ncTemplate)?.label ?? ncTemplate;
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
      flash(`User added. Temporary password: ${tempPassword}`);
      setAddUserOpen(false);
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
      flash(`Temporary password: ${tempPassword}`);
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

  // ---------- Admin: import ----------
  function parseCsv(text: string, forcedEvent?: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const startIdx = /name/i.test(lines[0]) ? 1 : 0;
    const rows: { name: string; company: string; phone: string; email: string; eventName: string }[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const [name = '', company = '', phone = '', emailCol = '', eventCol = ''] = cols;
      if (!name) continue;
      rows.push({
        name, company, phone,
        email: emailCol || name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
        eventName: forcedEvent || eventCol || events[0] || '',
      });
    }
    return rows;
  }

  function importFile(file: File, forcedEvent?: string) {
    const reader = new FileReader();
    reader.onload = async () => {
      const rows = parseCsv(String(reader.result ?? ''), forcedEvent);
      if (rows.length === 0) {
        flash('No rows found in file.');
        return;
      }
      try {
        const n = await api.importVisitors(rows);
        audit('Visitor data imported', `${n} record(s)`, 'Data');
        await reloadVisitors();
        flash(`Imported ${n} record(s).`);
      } catch (e) {
        flash(errMsg(e, 'Import failed (check your permissions).'));
      }
    };
    reader.readAsText(file);
  }

  // ---------- Admin: events ----------
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
      await Promise.all([reloadEvents(), reloadVisitors(), reloadWati()]);
      flash('Event renamed.');
      setEditEventOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Could not rename event.'));
    }
  }
  async function deleteEvent(name: string) {
    const removedCount = visitors.filter((v) => v.event === name).length;
    try {
      await api.deleteEvent(name);
      if (filterEvent === name) setFilterEvent('');
      if (reportEvent === name) setReportEvent('');
      audit('Event deleted', `${name} (${removedCount} record(s) removed)`, 'Data');
      await Promise.all([reloadEvents(), reloadVisitors(), reloadWati()]);
      flash('Event deleted.');
    } catch (e) {
      flash(errMsg(e, 'Could not delete event.'));
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
    setNewWati({ event: events[0] ?? '', sender: '', api: '' });
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
      await api.addWati(newWati.event, newWati.sender, newWati.api);
      audit('WATI connection added', newWati.event, 'Integration');
      await reloadWati();
      flash('WATI connection added.');
      setAddWatiOpen(false);
    } catch (e) {
      flash(errMsg(e, 'Could not add WATI connection.'));
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
      setAutoBackup(!next); // revert on failure
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

  return {
    // auth
    loggedIn, authReady, loading, role, loginAs, sessionIp, email, password,
    setEmail, setPassword, pickLoginAs, signIn, signOut,
    // shell
    tab, setTab, goCampaigns,
    // data
    visitors, setVisitors, events, watiConns, users, callApis, callLog, campaigns, activity, auditLog,
    // visitors tab
    filterEvent, setFilterEvent, filterStatus, setFilterStatus, filterConsent, setFilterConsent, search, setSearch,
    selectedIds, toggleSelect, toggleAllVisitors, template, message, onTemplate, setMessage, sendCampaign,
    exportAll, exportFiltered, exportEvent,
    // edit modal
    editingId, editDraft, setEditDraft, openEdit, closeEdit, saveEdit,
    // cleanup
    cleanupFilter, setCleanupFilter, cleanupEventFilter, setCleanupEventFilter,
    // calls
    callFilter, setCallFilter, callEventFilter, setCallEventFilter, targetEvent, setTargetEvent,
    startCall, endCall, cancelCall, activeCall, callSeconds,
    callingId, openCall, closeCall, addInviteEvent, setAddInviteEvent, addInviteStatus, setAddInviteStatus,
    addInvite, setInviteStatus, removeInvite,
    // campaigns
    ncOpen, ncEvents, ncTemplate, ncMessage, ncSelectedIds, optedInIds, watiFor,
    openNewCampaign, closeNewCampaign, toggleNcEvent, toggleNcSelect, toggleNcAll, onNcTemplate, setNcMessage, sendNewCampaign,
    // reports
    reportEvent, setReportEvent, repCat, setRepCat, repStatus, setRepStatus, downloadPdf,
    // admin: users
    addUserOpen, newUser, setNewUser, openAddUser, closeAddUser, addUser, resetPassword, toggleUser, togglePerm,
    // admin: import
    importFile,
    // admin: events
    newEventName, setNewEventName, createEvent, importIntoEvent,
    editEventOpen, editEventName, setEditEventName, openEditEvent, closeEditEvent, saveEditEvent, deleteEvent,
    // admin: wati
    addWatiOpen, newWati, setNewWati, openAddWati, closeAddWati, addWati, toggleWati,
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
