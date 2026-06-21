import { useMemo } from 'react';
import type { AppState } from '../hooks/useAppState';
import { badgeBase, consentStyle, statusStyle } from '../lib/styles';
import { maskPhone } from '../lib/format';
import { templates } from '../data/seed';
import type { ConsentStatus, VisitorStatus } from '../types';

export default function Visitors(state: AppState) {
  const {
    visitors, events,
    filterEvent, setFilterEvent, filterStatus, setFilterStatus, filterConsent, setFilterConsent, search, setSearch,
    selectedIds, toggleSelect, toggleAllVisitors,
    template, onTemplate, message, setMessage, sendCampaign,
    exportFiltered, openEdit,
  } = state;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visitors.filter((v) => {
      if (filterEvent && v.event !== filterEvent) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      if (filterConsent && v.consent !== filterConsent) return false;
      if (q && !(v.name.toLowerCase().includes(q) || v.company.toLowerCase().includes(q) || v.email.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [visitors, filterEvent, filterStatus, filterConsent, search]);

  const filteredIds = filtered.map((v) => v.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const recipientsCount = visitors.filter((v) => selectedIds.includes(v.id) && v.consent === 'Opted-in').length;

  const statuses: VisitorStatus[] = ['Category', 'Engaged', 'Pre-registered', 'Pending'];
  const consents: ConsentStatus[] = ['Opted-in', 'Pending', 'Opted-out'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Visitors
          </h1>
          <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>{filtered.length} of {visitors.length} records</p>
        </div>
        <button type="button" className="vdm-btn-secondary" onClick={() => exportFiltered(filtered)}>
          Export filtered
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="vdm-input" placeholder="Search name, company, email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 220px' }} />
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterConsent} onChange={(e) => setFilterConsent(e.target.value)}>
            <option value="">All consent</option>
            {consents.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </div>

      <div className="vdm-split" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'flex-start' }}>
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th"><input type="checkbox" checked={allSelected} onChange={() => toggleAllVisitors(filteredIds)} /></th>
                <th className="vdm-th">Name / Company</th>
                <th className="vdm-th">Phone</th>
                <th className="vdm-th">Event</th>
                <th className="vdm-th">Status</th>
                <th className="vdm-th">Consent</th>
                <th className="vdm-th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px' }}><input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} /></td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: '#7a7873' }}>{v.company}</div>
                  </td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{v.event}</td>
                  <td style={{ padding: '10px 8px' }}><span style={{ ...badgeBase, ...statusStyle(v.status) }}>{v.status}</span></td>
                  <td style={{ padding: '10px 8px' }}><span style={{ ...badgeBase, ...consentStyle(v.consent) }}>{v.consent}</span></td>
                  <td style={{ padding: '10px 8px' }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => openEdit(v.id)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="vdm-card" style={{ padding: 20, position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Send via WATI</h2>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Template
            <div className="vdm-select-wrap">
              <select className="vdm-select" value={template} onChange={(e) => onTemplate(e.target.value)} style={{ width: '100%' }}>
                {templates.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Message
            <textarea className="vdm-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <div style={{ fontSize: 12, color: '#7a7873' }}>Recipients (opted-in): <strong>{recipientsCount}</strong></div>
          <button
            type="button"
            style={{ fontSize: 13, color: '#fff', background: '#1f8a4c', border: 'none', borderRadius: 8, padding: '10px 15px', fontWeight: 500 }}
            onClick={sendCampaign}
          >
            Send via WATI
          </button>
        </div>
      </div>
    </div>
  );
}
