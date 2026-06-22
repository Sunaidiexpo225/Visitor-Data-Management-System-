import { useMemo, useRef } from 'react';
import type { AppState } from '../hooks/useAppState';
import type { PageKey } from '../types';
import { initials } from '../lib/format';
import AdminFields from './admin/AdminFields';
import AdminTemplates from './admin/AdminTemplates';
import AdminEventsTree from './admin/AdminEventsTree';

const PAGE_KEYS: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: 'Dash' },
  { key: 'visitors', label: 'Visit' },
  { key: 'cleanup', label: 'Clean' },
  { key: 'calls', label: 'Calls' },
  { key: 'campaigns', label: 'Camp' },
  { key: 'reports', label: 'Rep' },
];

export default function Admin(state: AppState) {
  const {
    users, openAddUser, resetPassword, toggleUser, togglePerm, toggleUserPage, toggleUserCampaign,
    importFile, watiConns,
    callApis, openAddCallApi, toggleCallApi, testCallApi, removeCallApi,
    openAddWati, toggleWati,
    autoBackup, toggleAutoBackup, exportAll,
    mfaRequired, toggleMfaRequired,
    auditLog, auditCat, setAuditCat, auditSearch, setAuditSearch, exportAuditCsv,
  } = state;

  const importInputRef = useRef<HTMLInputElement>(null);

  const auditCategories = useMemo(() => Array.from(new Set(auditLog.map((a) => a.category))), [auditLog]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLog.filter((a) => {
      if (auditCat && a.category !== auditCat) return false;
      if (q && !(a.actor.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.target.toLowerCase().includes(q) || a.ip.includes(q))) return false;
      return true;
    });
  }, [auditLog, auditCat, auditSearch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Admin
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>Manage users, events, integrations and security.</p>
      </div>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Users &amp; access</h2>
          <button type="button" className="vdm-btn-secondary" onClick={openAddUser}>+ Add user</button>
        </div>
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th">User</th>
                <th className="vdm-th">Role</th>
                <th className="vdm-th">Permissions</th>
                <th className="vdm-th">Page access &amp; campaigns</th>
                <th className="vdm-th">Status</th>
                <th className="vdm-th"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eef1fa', color: '#1f3c88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#7a7873' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{u.role}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['edit', 'delete', 'call'] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePerm(u.id, key)}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            padding: '4px 9px',
                            borderRadius: 20,
                            border: 'none',
                            color: u.perms[key] ? '#1f6a47' : '#9a978f',
                            background: u.perms[key] ? '#e6f1ea' : '#efeeea',
                          }}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 240 }}>
                      {PAGE_KEYS.map(({ key, label }) => {
                        const on = u.pages.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            title={key}
                            onClick={() => toggleUserPage(u.id, key)}
                            style={{
                              fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 6, border: 'none',
                              color: on ? '#1f3c88' : '#9a978f', background: on ? '#eef1fa' : '#efeeea',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        title="Send WATI campaigns"
                        onClick={() => toggleUserCampaign(u.id)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 6, border: 'none',
                          color: u.canCampaign ? '#1f8a4c' : '#9a978f', background: u.canCampaign ? '#e6f4ec' : '#efeeea',
                        }}
                      >
                        WATI
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: 20,
                        color: u.status === 'Active' ? '#1f6a47' : '#9a4a3a',
                        background: u.status === 'Active' ? '#e6f1ea' : '#f5e8e4',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', display: 'flex', gap: 6 }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => resetPassword(u.id)}>Reset password</button>
                    <button type="button" className="vdm-btn-ghost" onClick={() => toggleUser(u.id)}>{u.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="vdm-admin2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Import visitor data</h2>
          <div className="vdm-card" style={{ padding: 20 }}>
            <p style={{ fontSize: 13, color: '#7a7873', marginBottom: 12 }}>CSV with a header row. Recognised columns (any order): Name, Company, Phone Code, Phone, Email, Event, Sub-event, Category, Consent, Cleanup status, Id, Country, Source, Registration Date. Phone Code is combined with Phone automatically; Consent accepts Opted-in / Opted-out / Pending.</p>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = '';
              }}
            />
            <button type="button" className="vdm-btn-secondary" onClick={() => importInputRef.current?.click()}>Choose CSV file</button>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Security &amp; backup</h2>
          <div className="vdm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={mfaRequired} onChange={toggleMfaRequired} style={{ marginTop: 2 }} />
              <span>
                Require two-factor authentication (2FA)
                <span style={{ display: 'block', fontSize: 12, color: '#7a7873', marginTop: 2 }}>
                  Users without 2FA will be prompted to set up an authenticator app at next sign-in.
                </span>
              </span>
            </label>
            <div style={{ borderTop: '1px solid #f0efe9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={autoBackup} onChange={toggleAutoBackup} /> Enable automatic daily backups
              </label>
              <button type="button" className="vdm-btn-secondary" onClick={exportAll} style={{ alignSelf: 'flex-start' }}>Export all (CSV)</button>
            </div>
          </div>
        </section>
      </div>

      <AdminFields {...state} />

      <AdminTemplates {...state} />

      <AdminEventsTree {...state} />

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Call APIs</h2>
          <button type="button" className="vdm-btn-secondary" onClick={openAddCallApi}>+ Add call API</button>
        </div>
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th">Provider</th>
                <th className="vdm-th">Caller ID</th>
                <th className="vdm-th">Key</th>
                <th className="vdm-th">Status</th>
                <th className="vdm-th"></th>
              </tr>
            </thead>
            <tbody>
              {callApis.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 500 }}>{c.provider}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{c.callerId}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{c.key}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: c.connected ? '#1f6a47' : '#9a978f', background: c.connected ? '#e6f1ea' : '#efeeea' }}>
                      {c.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', display: 'flex', gap: 6 }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => testCallApi(c.id)}>Test</button>
                    <button type="button" className="vdm-btn-ghost" onClick={() => toggleCallApi(c.id)}>{c.connected ? 'Disconnect' : 'Connect'}</button>
                    <button type="button" className="vdm-btn-ghost" onClick={() => removeCallApi(c.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>WATI WhatsApp connections</h2>
          <button type="button" className="vdm-btn-secondary" onClick={openAddWati}>+ Add connection</button>
        </div>
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th">Event</th>
                <th className="vdm-th">Sender</th>
                <th className="vdm-th">API key</th>
                <th className="vdm-th">Status</th>
                <th className="vdm-th"></th>
              </tr>
            </thead>
            <tbody>
              {watiConns.map((w) => (
                <tr key={w.event} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 500 }}>{w.event}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{w.sender}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{w.api}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: w.active ? '#1f6a47' : '#9a978f', background: w.active ? '#e6f1ea' : '#efeeea' }}>
                      {w.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => toggleWati(w.event)}>{w.active ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Audit trail</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input className="vdm-input" placeholder="Search actor, action, target, IP…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} style={{ flex: '1 1 220px' }} />
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={auditCat} onChange={(e) => setAuditCat(e.target.value)}>
              <option value="">All categories</option>
              {auditCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
          <button type="button" className="vdm-btn-secondary" onClick={() => exportAuditCsv(filteredAudit)}>Export log</button>
        </div>
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th">Timestamp</th>
                <th className="vdm-th">Actor</th>
                <th className="vdm-th">Action</th>
                <th className="vdm-th">Target</th>
                <th className="vdm-th">Category</th>
                <th className="vdm-th">Source IP</th>
                <th className="vdm-th">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{a.time}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{a.actor} <span style={{ color: '#7a7873' }}>· {a.role}</span></td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{a.action}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{a.target}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{a.category}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{a.ip}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: 20,
                        color: a.result === 'Success' ? '#1f6a47' : a.result === 'Denied' ? '#9a4a3a' : '#b07a1e',
                        background: a.result === 'Success' ? '#e6f1ea' : a.result === 'Denied' ? '#f5e8e4' : '#f6efe0',
                      }}
                    >
                      {a.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
