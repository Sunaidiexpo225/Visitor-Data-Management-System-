import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';
import { usePeoplePage } from '../hooks/usePeoplePage';
import Pagination from './Pagination';

const ellipsis = (max: number): React.CSSProperties => ({ maxWidth: max, overflow: 'hidden', textOverflow: 'ellipsis' });

function year(d: string | null): string {
  if (!d) return '—';
  const m = /^(\d{4})/.exec(d);
  return m ? m[1] : d;
}

export default function People(state: AppState) {
  const { peopleSearch, setPeopleSearch, visitorRefreshKey, openTimelineById } = state;
  const { rows, total, page, pageCount, pageSize, loading, setPage } = usePeoplePage(peopleSearch, visitorRefreshKey);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>People</h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>
          {total.toLocaleString()} unique {total === 1 ? 'person' : 'people'} · matched by phone or email across every event. Open the timeline to see each person's full history.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="vdm-input"
          placeholder="Search name, company, email, phone…"
          value={peopleSearch}
          onChange={(e) => setPeopleSearch(e.target.value)}
          style={{ flex: '1 1 260px' }}
        />
      </div>

      <div className="vdm-card" style={{ overflow: 'auto' }}>
        <table className="vdm-table-wide" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Name</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Company</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Phone</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Email</th>
              <th className="vdm-th" style={{ padding: '8px 10px', textAlign: 'center' }}>Events</th>
              <th className="vdm-th" style={{ padding: '8px 10px', textAlign: 'center' }}>Records</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>First seen</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Last seen</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Consent</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.personKey} style={{ borderTop: '1px solid #f0efe9' }}>
                <td style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, ...ellipsis(200) }} title={p.name}>{p.name}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, color: '#5a5853', ...ellipsis(190) }} title={p.company}>{p.company || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>{maskPhone(p.phone)}</td>
                <td style={{ padding: '6px 10px', fontSize: 12, color: '#5a5853', ...ellipsis(190) }} title={p.email}>{p.email || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, textAlign: 'center' }}>
                  {p.events > 1
                    ? <span style={{ fontWeight: 600, color: 'var(--accent, #1f3c88)' }}>{p.events}</span>
                    : p.events}
                </td>
                <td style={{ padding: '6px 10px', fontSize: 13, textAlign: 'center', color: '#7a7873' }}>{p.registrations}</td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{year(p.firstSeen)}</td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{year(p.lastSeen)}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: p.optedIn ? '#1f6a47' : '#6c6a66', background: p.optedIn ? '#e6f1ea' : '#efeeea' }}>
                    {p.optedIn ? 'Opted-in' : 'Not opted-in'}
                  </span>
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openTimelineById(p.latestId)}>🕓 Timeline</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, fontSize: 13, color: '#9a978f', textAlign: 'center' }}>{loading ? 'Loading…' : 'No people found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}
