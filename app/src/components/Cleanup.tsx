import { useMemo } from 'react';
import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';

export default function Cleanup(state: AppState) {
  const { visitors, events, cleanupFilter, setCleanupFilter, cleanupEventFilter, setCleanupEventFilter, startCall, openEdit } = state;

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      if (cleanupEventFilter && v.event !== cleanupEventFilter) return false;
      if (cleanupFilter === 'cleaned' && !v.cleaned) return false;
      if (cleanupFilter === 'not' && v.cleaned) return false;
      return true;
    });
  }, [visitors, cleanupFilter, cleanupEventFilter]);

  const kpiTotal = visitors.length;
  const cleanedCount = visitors.filter((v) => v.cleaned).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Cleanup
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>
          {cleanedCount} of {kpiTotal} cleaned
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={cleanupEventFilter} onChange={(e) => setCleanupEventFilter(e.target.value)}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={cleanupFilter} onChange={(e) => setCleanupFilter(e.target.value)}>
            <option value="">All</option>
            <option value="cleaned">Cleaned</option>
            <option value="not">Not cleaned</option>
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </div>

      <div className="vdm-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th">Visitor</th>
              <th className="vdm-th">Phone</th>
              <th className="vdm-th">Event</th>
              <th className="vdm-th">Cleanup status</th>
              <th className="vdm-th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid #f0efe9' }}>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#7a7873' }}>{v.company}</div>
                </td>
                <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                <td style={{ padding: '10px 8px', fontSize: 13 }}>{v.event}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 9px',
                      borderRadius: 20,
                      color: v.cleaned ? '#1f6a47' : '#6c6a66',
                      background: v.cleaned ? '#e6f1ea' : '#efeeea',
                    }}
                  >
                    {v.cleaned ? 'Cleaned' : 'Not cleaned'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 6 }}>
                  <button type="button" className="vdm-btn-ghost" onClick={() => startCall(v.id)}>📞 Call</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openEdit(v.id)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
