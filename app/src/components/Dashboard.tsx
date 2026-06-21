import { useMemo } from 'react';
import type { AppState } from '../hooks/useAppState';
import { iconStyle, tagStyle } from '../lib/styles';

export default function Dashboard(state: AppState) {
  const { visitors, events, campaigns, activity, exportAll } = state;

  const totalRecords = visitors.length;
  const optedIn = visitors.filter((v) => v.consent === 'Opted-in').length;
  const reachablePct = totalRecords ? Math.round((optedIn / totalRecords) * 100) : 0;
  const campaignsSent = campaigns.length;

  const eventStats = useMemo(() => {
    const max = Math.max(1, ...events.map((ev) => visitors.filter((v) => v.event === ev).length));
    return events.map((ev) => {
      const count = visitors.filter((v) => v.event === ev).length;
      return { event: ev, count, pct: Math.round((count / max) * 100) };
    });
  }, [events, visitors]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>Overview of your visitor data across all events.</p>
        </div>
        <button type="button" className="vdm-btn-secondary" onClick={exportAll}>
          Export CSV
        </button>
      </div>

      <div className="vdm-kpi3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="vdm-card" style={{ padding: 20 }}>
          <div className="vdm-th">Total Records</div>
          <div className="vdm-serif" style={{ fontSize: 28, fontWeight: 500, marginTop: 6 }}>
            {totalRecords.toLocaleString()}
          </div>
        </div>
        <div className="vdm-card" style={{ padding: 20 }}>
          <div className="vdm-th">Opted-in Contacts</div>
          <div className="vdm-serif" style={{ fontSize: 28, fontWeight: 500, marginTop: 6 }}>
            {optedIn.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#7a7873', marginTop: 2 }}>{reachablePct}% reachable</div>
        </div>
        <div className="vdm-card" style={{ padding: 20 }}>
          <div className="vdm-th">Campaigns Sent</div>
          <div className="vdm-serif" style={{ fontSize: 28, fontWeight: 500, marginTop: 6 }}>
            {campaignsSent.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="vdm-split" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div className="vdm-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Visitors by event</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {eventStats.map((s) => (
              <div key={s.event}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{s.event}</span>
                  <span className="vdm-mono" style={{ color: '#7a7873' }}>
                    {s.count}
                  </span>
                </div>
                <div style={{ height: 8, background: '#efeeea', borderRadius: 6 }}>
                  <div style={{ height: 8, width: `${s.pct}%`, background: 'var(--accent, #1f3c88)', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="vdm-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                    ...iconStyle(a.kind),
                  }}
                >
                  {a.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: '#7a7873' }}>{a.detail}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, ...tagStyle(a.kind) }}>{a.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
