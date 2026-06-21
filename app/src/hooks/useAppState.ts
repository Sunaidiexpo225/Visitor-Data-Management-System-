import { useEffect, useRef, useState } from 'react';
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
import {
  seedActivity,
  seedAuditLog,
  seedCallApis,
  seedCallLog,
  seedCampaigns,
  seedEvents,
  seedUsers,
  seedVisitors,
  seedWatiConns,
  templates,
  tplMessage,
} from '../data/seed';
import { fakeIp, genPassword, nowStamp, today, uid } from '../lib/format';
import { exportVisitorsCsv, downloadCsv } from '../lib/csv';

export interface EditDraft {
  name: string;
  company: string;
  phone: string;
  email: string;
  consent: ConsentStatus;
  cleaned: boolean;
}

export function useAppState() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string>('Staff');
  const [loginAs, setLoginAs] = useState<'Staff' | 'Admin'>('Staff');
  const [sessionIp, setSessionIp] = useState('');
  const [email, setEmail] = useState('marketing@sunaidiexpo.com');
  const [password, setPassword] = useState('expo2026');

  const [tab, setTab] = useState<TabKey>('dashboard');

  const [visitors, setVisitors] = useState<Visitor[]>(() => seedVisitors());
  const [events, setEvents] = useState<string[]>(() => [...seedEvents]);
  const [watiConns, setWatiConns] = useState<WatiConnection[]>(() => [...seedWatiConns]);
  const [users, setUsers] = useState<AppUser[]>(() => [...seedUsers]);
  const [callApis, setCallApis] = useState<CallApi[]>(() => [...seedCallApis]);
  const [callLog, setCallLog] = useState<CallLogEntry[]>(() => [...seedCallLog]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [...seedCampaigns]);
  const [activity, setActivity] = useState<ActivityEntry[]>(() => [...seedActivity]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => [...seedAuditLog]);

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
  const [targetEvent, setTargetEvent] = useState(seedEvents[0]);

  const [callingId, setCallingId] = useState<string | null>(null);
  const [addInviteEvent, setAddInviteEvent] = useState(seedEvents[0]);
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
  const [newWati, setNewWati] = useState({ event: seedEvents[0], sender: '', api: '' });

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  function logAudit(action: string, target: string, category: AuditEntry['category'], result: AuditEntry['result'] = 'Success') {
    setAuditLog((prev) => [
      { id: uid('au'), time: `${today()} ${nowStamp().split(' ').slice(1).join(' ')}`, actor: email || 'unknown', role, action, target, category, ip: sessionIp || fakeIp(), result },
      ...prev,
    ]);
  }

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

  function signIn() {
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const resolvedRole = matched ? matched.role : /admin/i.test(email) ? 'Admin' : 'Staff';
    const ip = fakeIp();
    setRole(resolvedRole);
    setSessionIp(ip);
    setLoggedIn(true);
    setTab('dashboard');
    setAuditLog((prev) => [
      { id: uid('au'), time: `${today()} ${nowStamp().split(' ').slice(1).join(' ')}`, actor: email, role: resolvedRole, action: 'User signed in', target: 'Session', category: 'Authentication', ip, result: 'Success' },
      ...prev,
    ]);
  }

  function signOut() {
    logAudit('User signed out', 'Session', 'Authentication');
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

  function sendCampaign() {
    const recipients = visitors.filter((v) => selectedIds.includes(v.id) && v.consent === 'Opted-in');
    if (recipients.length === 0) {
      flash('Select at least one opted-in recipient.');
      return;
    }
    const evSet = new Set(recipients.map((v) => v.event));
    const eventLabel = evSet.size === 1 ? recipients[0].event : 'Multiple events';
    const conn = evSet.size === 1 ? watiFor(recipients[0].event) : undefined;
    const tplLabel = templates.find((t) => t.value === template)?.label ?? template;
    setCampaigns((prev) => [
      { id: uid('c'), name: tplLabel, event: eventLabel, recipients: recipients.length, sentAt: 'Just now', status: 'Delivered', wati: conn?.sender },
      ...prev,
    ]);
    setActivity((prev) => [
      { id: uid('a'), initials: 'WA', name: tplLabel, detail: `Campaign sent to ${recipients.length} contacts`, tag: 'Sent', kind: 'sent' },
      ...prev,
    ]);
    logAudit('Campaign sent via WATI', `${eventLabel} — ${recipients.length}`, 'Campaign');
    flash(`Campaign sent to ${recipients.length} contacts.`);
    setSelectedIds([]);
  }

  function exportAll() {
    exportVisitorsCsv(visitors, 'visitors-all.csv');
    logAudit('CSV export generated', 'visitors-all.csv', 'Export');
    flash('Export ready.');
  }

  function exportFiltered(rows: Visitor[]) {
    exportVisitorsCsv(rows, 'visitors-filtered.csv');
    logAudit('CSV export generated', 'visitors-filtered.csv', 'Export');
    flash('Export ready.');
  }

  function exportEvent(rows: Visitor[], ev: string) {
    exportVisitorsCsv(rows, `visitors-${ev.toLowerCase().replace(/\s+/g, '-')}.csv`);
    logAudit('CSV export generated', `visitors-${ev}.csv`, 'Export');
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

  function saveEdit() {
    if (!editingId || !editDraft) return;
    const before = visitors.find((v) => v.id === editingId);
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === editingId
          ? { ...v, name: editDraft.name, company: editDraft.company, phone: editDraft.phone, email: editDraft.email, consent: editDraft.consent, cleaned: editDraft.cleaned }
          : v
      )
    );
    const cleanedChanged = before && before.cleaned !== editDraft.cleaned;
    setActivity((prev) => [
      {
        id: uid('a'),
        initials: editDraft.name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .toUpperCase(),
        name: editDraft.name,
        detail: cleanedChanged ? (editDraft.cleaned ? 'Marked as cleaned' : 'Marked as not cleaned') : 'Visitor record updated',
        tag: cleanedChanged ? 'Cleaned' : 'Edited',
        kind: cleanedChanged ? 'cleaned' : 'edit',
      },
      ...prev,
    ]);
    logAudit('Visitor record updated', editDraft.name, 'Data');
    flash('Visitor record saved.');
    closeEdit();
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

  function endCall(outcome: InviteStatus) {
    if (!activeCall) return;
    const call = activeCall;
    const duration = callSeconds;
    setCallLog((prev) => [
      { id: uid('cl'), name: call.name, company: call.company, event: call.event, time: nowStamp().split(' ').slice(1).join(' '), duration, outcome },
      ...prev,
    ]);
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === call.id
          ? { ...v, invites: [{ id: uid('i'), event: targetEvent, status: outcome, date: today() }, ...v.invites] }
          : v
      )
    );
    setActivity((prev) => [
      {
        id: uid('a'),
        initials: call.name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .toUpperCase(),
        name: call.name,
        detail: `Call outcome: ${outcome}`,
        tag: outcome === 'Invited' ? 'Invited' : outcome,
        kind: outcome === 'Invited' ? 'invited' : 'update',
      },
      ...prev,
    ]);
    logAudit('Call logged', `${call.name} — ${outcome}`, 'Call');
    flash(`Call logged: ${outcome}.`);
    clearTimer();
    setActiveCall(null);
    setCallSeconds(0);
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

  function addInvite() {
    if (!callingId) return;
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === callingId
          ? { ...v, invites: [{ id: uid('i'), event: addInviteEvent, status: addInviteStatus, date: today() }, ...v.invites] }
          : v
      )
    );
    flash('Invitation added.');
  }

  function setInviteStatus(vid: string, iid: string, val: InviteStatus) {
    setVisitors((prev) =>
      prev.map((v) => (v.id === vid ? { ...v, invites: v.invites.map((i) => (i.id === iid ? { ...i, status: val } : i)) } : v))
    );
  }

  function removeInvite(vid: string, iid: string) {
    setVisitors((prev) => prev.map((v) => (v.id === vid ? { ...v, invites: v.invites.filter((i) => i.id !== iid) } : v)));
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

  function sendNewCampaign() {
    const recipients = visitors.filter((v) => ncSelectedIds.includes(v.id));
    if (recipients.length === 0) {
      flash('Select at least one recipient.');
      return;
    }
    const byEvent = new Map<string, Visitor[]>();
    recipients.forEach((v) => {
      const list = byEvent.get(v.event) ?? [];
      list.push(v);
      byEvent.set(v.event, list);
    });
    const tplLabel = templates.find((t) => t.value === ncTemplate)?.label ?? ncTemplate;
    let totalSent = 0;
    const newCampaigns: Campaign[] = [];
    const newActivity: ActivityEntry[] = [];
    byEvent.forEach((list, ev) => {
      const conn = watiFor(ev);
      newCampaigns.push({ id: uid('c'), name: tplLabel, event: ev, recipients: list.length, sentAt: 'Just now', status: 'Delivered', wati: conn?.sender });
      newActivity.push({ id: uid('a'), initials: 'WA', name: tplLabel, detail: `Campaign sent to ${list.length} contacts (${ev})`, tag: 'Sent', kind: 'sent' });
      totalSent += list.length;
    });
    setCampaigns((prev) => [...newCampaigns, ...prev]);
    setActivity((prev) => [...newActivity, ...prev]);
    logAudit('Campaign sent via WATI', `${byEvent.size} events — ${totalSent}`, 'Campaign');
    flash(`Campaign sent to ${totalSent} contacts across ${byEvent.size} event(s).`);
    setNcOpen(false);
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
  function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      flash('Name and email are required.');
      return;
    }
    setUsers((prev) => [
      ...prev,
      { id: uid('u'), name: newUser.name, email: newUser.email, role: newUser.role, status: 'Active', perms: { edit: true, delete: false, call: false } },
    ]);
    logAudit('User created', newUser.email, 'User Management');
    flash(`User added. Temporary password: ${genPassword()}`);
    setAddUserOpen(false);
  }
  function resetPassword(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    logAudit('Password reset issued', u.email, 'User Management');
    flash(`Temporary password sent: ${genPassword()}`);
  }
  function toggleUser(id: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u)));
    const u = users.find((x) => x.id === id);
    if (u) logAudit(u.status === 'Active' ? 'User suspended' : 'User activated', u.email, 'User Management');
  }
  function togglePerm(id: string, key: 'edit' | 'delete' | 'call') {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, perms: { ...u.perms, [key]: !u.perms[key] } } : u)));
  }

  // ---------- Admin: import ----------
  function importVisitors(text: string, forcedEvent?: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;
    const startIdx = /name/i.test(lines[0]) ? 1 : 0;
    const added: Visitor[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const [name = '', company = '', phone = '', emailCol = '', eventCol = ''] = cols;
      if (!name) continue;
      added.push({
        id: uid('v'),
        name,
        company,
        phone,
        email: emailCol || name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
        event: forcedEvent || eventCol || events[0],
        status: 'Pre-registered',
        consent: 'Pending',
        cleaned: false,
        invites: [],
      });
    }
    if (added.length === 0) {
      flash('No rows found in file.');
      return;
    }
    setVisitors((prev) => [...added, ...prev]);
    logAudit('Visitor data imported', `${added.length} record(s)`, 'Data');
    flash(`Imported ${added.length} record(s).`);
  }

  function importFile(file: File, forcedEvent?: string) {
    const reader = new FileReader();
    reader.onload = () => importVisitors(String(reader.result ?? ''), forcedEvent);
    reader.readAsText(file);
  }

  // ---------- Admin: events ----------
  function createEvent() {
    const name = newEventName.trim();
    if (!name) return;
    if (events.includes(name)) {
      flash('Event already exists.');
      return;
    }
    setEvents((prev) => [...prev, name]);
    logAudit('Event created', name, 'Data');
    flash('Event created.');
    setNewEventName('');
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
  function saveEditEvent() {
    const next = editEventName.trim();
    if (!next || next === editEventOrig) {
      setEditEventOpen(false);
      return;
    }
    if (events.includes(next)) {
      flash('Event already exists.');
      return;
    }
    setEvents((prev) => prev.map((e) => (e === editEventOrig ? next : e)));
    setVisitors((prev) => prev.map((v) => (v.event === editEventOrig ? { ...v, event: next } : v)));
    setWatiConns((prev) => prev.map((w) => (w.event === editEventOrig ? { ...w, event: next } : w)));
    if (filterEvent === editEventOrig) setFilterEvent(next);
    if (reportEvent === editEventOrig) setReportEvent(next);
    setNcEvents((prev) => prev.map((e) => (e === editEventOrig ? next : e)));
    logAudit('Event renamed', `${editEventOrig} → ${next}`, 'Data');
    flash('Event renamed.');
    setEditEventOpen(false);
  }
  function deleteEvent(name: string) {
    const removedCount = visitors.filter((v) => v.event === name).length;
    setEvents((prev) => prev.filter((e) => e !== name));
    setVisitors((prev) => prev.filter((v) => v.event !== name));
    setWatiConns((prev) => prev.filter((w) => w.event !== name));
    if (filterEvent === name) setFilterEvent('');
    if (reportEvent === name) setReportEvent('');
    logAudit('Event deleted', `${name} (${removedCount} record(s) removed)`, 'Data');
    flash('Event deleted.');
  }

  // ---------- Admin: WATI ----------
  function toggleWati(ev: string) {
    setWatiConns((prev) => prev.map((w) => (w.event === ev ? { ...w, active: !w.active } : w)));
    logAudit('WATI connection toggled', ev, 'Integration');
  }
  function openAddWati() {
    setNewWati({ event: events[0] ?? '', sender: '', api: '' });
    setAddWatiOpen(true);
  }
  function closeAddWati() {
    setAddWatiOpen(false);
  }
  function addWati() {
    if (!newWati.event || !newWati.sender.trim()) {
      flash('Event and sender number are required.');
      return;
    }
    setWatiConns((prev) => [...prev, { event: newWati.event, sender: newWati.sender, api: newWati.api || 'wati_key_••', active: true }]);
    logAudit('WATI connection added', newWati.event, 'Integration');
    flash('WATI connection added.');
    setAddWatiOpen(false);
  }

  // ---------- Admin: Call APIs ----------
  function toggleCallApi(id: string) {
    setCallApis((prev) => prev.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c)));
    const c = callApis.find((x) => x.id === id);
    if (c) logAudit(c.connected ? 'Call API disconnected' : 'Call API connected', c.provider, 'Integration');
  }
  function testCallApi(id: string) {
    const c = callApis.find((x) => x.id === id);
    flash(`Testing ${c?.provider ?? 'API'}… connection OK.`);
  }
  function removeCallApi(id: string) {
    const c = callApis.find((x) => x.id === id);
    setCallApis((prev) => prev.filter((x) => x.id !== id));
    if (c) logAudit('Call API removed', c.provider, 'Integration');
  }
  function openAddCallApi() {
    setNewCallApi({ provider: '', callerId: '', key: '' });
    setAddCallApiOpen(true);
  }
  function closeAddCallApi() {
    setAddCallApiOpen(false);
  }
  function addCallApi() {
    if (!newCallApi.provider.trim() || !newCallApi.callerId.trim()) {
      flash('Provider and caller ID are required.');
      return;
    }
    setCallApis((prev) => [
      ...prev,
      { id: uid('ca'), provider: newCallApi.provider, callerId: newCallApi.callerId, key: newCallApi.key || 'sk_live_••••0000', connected: true },
    ]);
    logAudit('Call API added', newCallApi.provider, 'Integration');
    flash('Call API added.');
    setAddCallApiOpen(false);
  }

  // ---------- Admin: backup / audit ----------
  function toggleAutoBackup() {
    setAutoBackup((v) => !v);
  }
  function exportAuditCsv(rows: AuditEntry[]) {
    const header = ['Time', 'Actor', 'Role', 'Action', 'Target', 'Category', 'IP', 'Result'];
    downloadCsv(
      [header, ...rows.map((r) => [r.time, r.actor, r.role, r.action, r.target, r.category, r.ip, r.result])],
      'audit-log.csv'
    );
    flash('Audit log exported.');
  }

  return {
    // auth
    loggedIn, role, loginAs, sessionIp, email, password,
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

export type AppState = ReturnType<typeof useAppState>;
