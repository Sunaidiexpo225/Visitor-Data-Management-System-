import type { AppState } from '../hooks/useAppState';

export default function Campaigns(state: AppState) {
  const { campaigns, openNewCampaign } = state;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Campaigns
          </h1>
          <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>WhatsApp campaigns sent via WATI.</p>
        </div>
        <button type="button" className="vdm-btn-primary" onClick={openNewCampaign}>
          + New campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="vdm-card" style={{ padding: 40, textAlign: 'center', color: '#7a7873', fontSize: 13 }}>
          No campaigns sent yet. Start one with "+ New campaign".
        </div>
      ) : (
        <div className="vdm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="vdm-th">Campaign</th>
                <th className="vdm-th">Audience</th>
                <th className="vdm-th">WATI line</th>
                <th className="vdm-th">Recipients</th>
                <th className="vdm-th">Sent</th>
                <th className="vdm-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{c.event}</td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{c.wati ?? '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{c.recipients.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, color: '#7a7873' }}>{c.sentAt}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: '#1f6a47', background: '#e6f1ea' }}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
