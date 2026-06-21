import { useMemo } from 'react';
import type { AppState } from '../hooks/useAppState';
import { fmtDur } from '../lib/format';

const cats: ('Cleanup' | 'Calls' | 'Campaigns')[] = ['Cleanup', 'Calls', 'Campaigns'];

export default function Reports(state: AppState) {
  const {
    visitors, events, callLog, campaigns,
    reportEvent, setReportEvent, repCat, setRepCat, repStatus, setRepStatus,
    downloadPdf, exportEvent,
  } = state;

  const isRepCalls = repCat === 'Calls';

  const scopedVisitors = useMemo(() => (reportEvent ? visitors.filter((v) => v.event === reportEvent) : visitors), [visitors, reportEvent]);
  const scopedCallLog = useMemo(() => (reportEvent ? callLog.filter((c) => c.event === reportEvent) : callLog), [callLog, reportEvent]);
  const scopedCampaigns = useMemo(() => (reportEvent ? campaigns.filter((c) => c.event === reportEvent) : campaigns), [campaigns, reportEvent]);

  const cleanedCount = scopedVisitors.filter((v) => v.cleaned).length;
  const notCleanedCount = scopedVisitors.length - cleanedCount;
  const cleanedPct = scopedVisitors.length ? Math.round((cleanedCount / scopedVisitors.length) * 100) : 0;

  const callsLogged = scopedCallLog.length;
  const totalTalk = scopedCallLog.reduce((sum, c) => sum + c.duration, 0);
  const avgCall = callsLogged ? Math.round(totalTalk / callsLogged) : 0;
  const outcomes = ['Invited', 'Pending', 'Not interested'] as const;
  const outcomeCounts = outcomes.map((o) => ({ outcome: o, count: scopedCallLog.filter((c) => c.outcome === o).length }));
  const maxOutcome = Math.max(1, ...outcomeCounts.map((o) => o.count));
  const filteredCallLog = repStatus ? scopedCallLog.filter((c) => c.outcome === repStatus) : scopedCallLog;

  const campaignsSent = scopedCampaigns.length;
  const messagesDelivered = scopedCampaigns.reduce((sum, c) => sum + c.recipients, 0);
  const eventsCovered = new Set(scopedCampaigns.map((c) => c.event)).size;
  const byEvent = events.map((ev) => ({ event: ev, count: campaigns.filter((c) => c.event === ev).reduce((s, c) => s + c.recipients, 0) }));
  const maxByEvent = Math.max(1, ...byEvent.map((b) => b.count));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Reports
          </h1>
          <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>Analytics across cleanup, calls and campaigns.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="vdm-btn-secondary" onClick={() => exportEvent(scopedVisitors, reportEvent || 'all')}>
            Export CSV
          </button>
          <button type="button" className="vdm-btn-secondary" onClick={downloadPdf}>
            Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={reportEvent} onChange={(e) => setReportEvent(e.target.value)}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        {isRepCalls && (
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={repStatus} onChange={(e) => setRepStatus(e.target.value)}>
              <option value="">All outcomes</option>
              {outcomes.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e6e4de' }}>
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setRepCat(c)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: repCat === c ? '2px solid var(--accent, #1f3c88)' : '2px solid transparent',
              color: repCat === c ? 'var(--accent, #1f3c88)' : '#7a7873',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {repCat === 'Cleanup' && (
        <div>
          <div className="vdm-kpi3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 16 }}>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Cleaned</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{cleanedCount} <span style={{ fontSize: 13, color: '#7a7873' }}>({cleanedPct}%)</span></div>
              <div style={{ height: 8, background: '#efeeea', borderRadius: 6, marginTop: 10 }}>
                <div style={{ height: 8, width: `${cleanedPct}%`, background: '#1f6a47', borderRadius: 6 }} />
              </div>
            </div>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Not cleaned</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{notCleanedCount} <span style={{ fontSize: 13, color: '#7a7873' }}>({100 - cleanedPct}%)</span></div>
              <div style={{ height: 8, background: '#efeeea', borderRadius: 6, marginTop: 10 }}>
                <div style={{ height: 8, width: `${100 - cleanedPct}%`, background: '#6c6a66', borderRadius: 6 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {repCat === 'Calls' && (
        <div>
          <div className="vdm-kpi3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Calls logged</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{callsLogged}</div>
            </div>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Total talk time</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{fmtDur(totalTalk)}</div>
            </div>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Avg. call length</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{fmtDur(avgCall)}</div>
            </div>
          </div>

          <div className="vdm-card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Outcomes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {outcomeCounts.map((o) => (
                <div key={o.outcome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{o.outcome}</span>
                    <span className="vdm-mono" style={{ color: '#7a7873' }}>{o.count}</span>
                  </div>
                  <div style={{ height: 8, background: '#efeeea', borderRadius: 6 }}>
                    <div style={{ height: 8, width: `${(o.count / maxOutcome) * 100}%`, background: 'var(--accent, #1f3c88)', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="vdm-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="vdm-th">Visitor</th>
                  <th className="vdm-th">Event</th>
                  <th className="vdm-th">Time</th>
                  <th className="vdm-th">Duration</th>
                  <th className="vdm-th">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredCallLog.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f0efe9' }}>
                    <td style={{ padding: '10px 8px', fontSize: 13 }}>{c.name} <span style={{ color: '#7a7873' }}>· {c.company}</span></td>
                    <td style={{ padding: '10px 8px', fontSize: 13 }}>{c.event}</td>
                    <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{c.time}</td>
                    <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{fmtDur(c.duration)}</td>
                    <td style={{ padding: '10px 8px', fontSize: 13 }}>{c.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {repCat === 'Campaigns' && (
        <div>
          <div className="vdm-kpi3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Campaigns sent</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{campaignsSent}</div>
            </div>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Messages delivered</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{messagesDelivered.toLocaleString()}</div>
            </div>
            <div className="vdm-card" style={{ padding: 20 }}>
              <div className="vdm-th">Events covered</div>
              <div className="vdm-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 6 }}>{eventsCovered}</div>
            </div>
          </div>

          <div className="vdm-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Messages by event</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byEvent.map((b) => (
                <div key={b.event}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{b.event}</span>
                    <span className="vdm-mono" style={{ color: '#7a7873' }}>{b.count}</span>
                  </div>
                  <div style={{ height: 8, background: '#efeeea', borderRadius: 6 }}>
                    <div style={{ height: 8, width: `${(b.count / maxByEvent) * 100}%`, background: 'var(--accent, #1f3c88)', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
