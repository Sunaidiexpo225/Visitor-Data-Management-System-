import { useMemo, useState } from 'react';
import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';
import { useVisitorPage } from '../hooks/useVisitorPage';
import Pagination from './Pagination';

const ellipsis = (max: number): React.CSSProperties => ({ maxWidth: max, overflow: 'hidden', textOverflow: 'ellipsis' });

const statusColor: Record<string, string> = {
  'Not contacted': '#9a978f',
  Invited: '#1f6a47',
  Pending: '#b07a1e',
  'Not interested': '#9a4a3a',
};

function latestStatus(invites: { status: string }[]): string {
  return invites.length > 0 ? invites[0].status : 'Not contacted';
}

export default function Calls(state: AppState) {
  const {
    visitorStats, visitorOptions, visitorRefreshKey, subEventIdsFor, events, subEventsFor, categoryOptions,
    callFilter, setCallFilter, callEventFilter, setCallEventFilter, callSubEvent, setCallSubEvent,
    targetEvent, setTargetEvent, targetSubEvent, setTargetSubEvent,
    startCall, openCall,
  } = state;

  const [filterCountry, setFilterCountry] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const categories = useMemo(
    () => Array.from(new Set([...categoryOptions.map((c) => c.name), ...visitorOptions.categories])).sort(),
    [categoryOptions, visitorOptions.categories],
  );

  const { rows, total, page, pageCount, pageSize, loading, setPage } = useVisitorPage(
    {
      subEventIds: subEventIdsFor(callEventFilter, callSubEvent),
      country: filterCountry,
      source: filterSource,
      category: filterCategory,
      invite: callFilter,
    },
    visitorRefreshKey,
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Calls
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>{visitorStats.invited.toLocaleString()} visitors invited so far</p>
      </div>

      <div
        className="vdm-card"
        style={{ background: '#16224d', color: '#fff', padding: 18, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <p style={{ fontSize: 13, color: '#c7cde2', maxWidth: 640 }}>
          "Hi, this is calling from Sunaidi Expo. We met at one of our recent events — I'd love to invite you to our upcoming show. Would you be interested in attending?"
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c7cde2', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
          Inviting to
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={targetEvent} onChange={(e) => { setTargetEvent(e.target.value); setTargetSubEvent(''); }}>
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
          {subEventsFor(targetEvent).length > 0 && (
            <div className="vdm-select-wrap">
              <select className="vdm-select" value={targetSubEvent} onChange={(e) => setTargetSubEvent(e.target.value)}>
                <option value="">Whole event</option>
                {subEventsFor(targetEvent).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
          )}
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={callEventFilter} onChange={(e) => { setCallEventFilter(e.target.value); setCallSubEvent(''); }}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        {callEventFilter && (
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={callSubEvent} onChange={(e) => setCallSubEvent(e.target.value)}>
              <option value="">All sub-events</option>
              {subEventsFor(callEventFilter).map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        )}
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">All countries</option>
            {visitorOptions.countries.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">All sources</option>
            {visitorOptions.sources.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={callFilter} onChange={(e) => setCallFilter(e.target.value)}>
            <option value="">All</option>
            <option value="none">Not contacted</option>
            <option value="pending">Pending</option>
            <option value="invited">Invited</option>
            <option value="notinterested">Not interested</option>
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </div>

      <div className="vdm-card" style={{ overflow: 'auto' }}>
        <table className="vdm-table-wide" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Name</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Company</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Phone</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Country</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Source</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Event</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Category</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Latest status</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Invites</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const latest = latestStatus(v.invites);
              return (
                <tr key={v.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, ...ellipsis(190) }} title={v.name}>{v.name}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13, color: '#5a5853', ...ellipsis(200) }} title={v.company}>{v.company}</td>
                  <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>{maskPhone(v.phone)}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.country || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.source || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>
                    <div>{v.event}</div>
                    {v.subEvent && <div style={{ fontSize: 11, color: '#9a978f' }}>{v.subEvent}</div>}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.category || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[latest] }} />
                      {latest}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.invites.length}</td>
                  <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => startCall(v)}>📞 Call</button>
                    <button type="button" className="vdm-btn-ghost" onClick={() => openCall(v)}>Invites</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, fontSize: 13, color: '#9a978f', textAlign: 'center' }}>{loading ? 'Loading…' : 'No matching records.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}
