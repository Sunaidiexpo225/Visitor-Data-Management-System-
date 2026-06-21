import { useMemo } from 'react';
import type { AppState } from '../../hooks/useAppState';
import { templates } from '../../data/seed';
import ModalOverlay from './ModalOverlay';

export default function NewCampaignModal(state: AppState) {
  const {
    ncOpen, closeNewCampaign, events, watiFor, visitors,
    ncEvents, toggleNcEvent, ncSelectedIds, toggleNcSelect, toggleNcAll,
    ncTemplate, onNcTemplate, ncMessage, setNcMessage, sendNewCampaign,
  } = state;
  const pool = useMemo(() => visitors.filter((v) => ncEvents.includes(v.event) && v.consent === 'Opted-in'), [visitors, ncEvents]);
  if (!ncOpen) return null;

  const poolIds = pool.map((v) => v.id);
  const allSelected = poolIds.length > 0 && poolIds.every((id) => ncSelectedIds.includes(id));

  return (
    <ModalOverlay onClose={closeNewCampaign} maxWidth={620}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New WhatsApp campaign</h2>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5853', marginBottom: 8 }}>Events</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {events.map((ev) => {
            const active = ncEvents.includes(ev);
            return (
              <button
                key={ev}
                type="button"
                onClick={() => toggleNcEvent(ev)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: active ? 'none' : '1px solid #dcdad4',
                  background: active ? 'var(--accent, #1f3c88)' : '#fff',
                  color: active ? '#fff' : '#5a5853',
                }}
              >
                {ev}
              </button>
            );
          })}
        </div>
      </div>

      {ncEvents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {ncEvents.map((ev) => {
            const conn = watiFor(ev);
            const count = pool.filter((v) => v.event === ev && ncSelectedIds.includes(v.id)).length;
            return (
              <div key={ev} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, border: '1px solid #f0efe9', borderRadius: 8, padding: '8px 10px' }}>
                <span>{ev} <span className="vdm-mono" style={{ color: '#7a7873' }}>· {conn?.sender ?? 'No WATI line'}</span></span>
                <span style={{ color: '#7a7873' }}>{count} selected</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5853' }}>Recipients</div>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={allSelected} onChange={() => toggleNcAll(poolIds)} /> {ncSelectedIds.length} of {pool.length} selected
          </label>
        </div>
        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #f0efe9', borderRadius: 8 }}>
          {pool.length === 0 && <div style={{ padding: 12, fontSize: 13, color: '#9a978f' }}>No opted-in contacts for the selected events.</div>}
          {pool.map((v) => (
            <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f6f5f1' }}>
              <input type="checkbox" checked={ncSelectedIds.includes(v.id)} onChange={() => toggleNcSelect(v.id)} />
              <span style={{ flex: 1 }}>{v.name} <span style={{ color: '#7a7873' }}>· {v.company}</span></span>
              <span style={{ fontSize: 11, color: '#7a7873' }}>{v.event}</span>
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500, marginBottom: 12 }}>
        Template
        <div className="vdm-select-wrap">
          <select className="vdm-select" style={{ width: '100%' }} value={ncTemplate} onChange={(e) => onNcTemplate(e.target.value)}>
            {templates.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500, marginBottom: 16 }}>
        Message
        <textarea className="vdm-input" rows={4} value={ncMessage} onChange={(e) => setNcMessage(e.target.value)} />
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeNewCampaign}>Cancel</button>
        <button
          type="button"
          style={{ fontSize: 13, color: '#fff', background: '#1f8a4c', border: 'none', borderRadius: 8, padding: '9px 15px', fontWeight: 500 }}
          onClick={sendNewCampaign}
        >
          Send campaign
        </button>
      </div>
    </ModalOverlay>
  );
}
