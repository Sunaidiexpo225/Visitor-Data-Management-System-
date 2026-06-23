import { useMemo, useState } from 'react';
import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';
import { useVisitorPage } from '../hooks/useVisitorPage';
import Pagination from './Pagination';

const ellipsis = (max: number): React.CSSProperties => ({ maxWidth: max, overflow: 'hidden', textOverflow: 'ellipsis' });

export default function Cleanup(state: AppState) {
  const {
    visitorStats, visitorOptions, visitorRefreshKey, subEventIdsFor, events, subEventsFor, categoryOptions,
    cleanupFilter, setCleanupFilter, cleanupEventFilter, setCleanupEventFilter,
    cleanupSubEvent, setCleanupSubEvent, startCall, openEdit, openTimeline,
  } = state;

  const [filterCountry, setFilterCountry] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const categories = useMemo(
    () => Array.from(new Set([...categoryOptions.map((c) => c.name), ...visitorOptions.categories])).sort(),
    [categoryOptions, visitorOptions.categories],
  );

  const cleaned = cleanupFilter === 'cleaned' ? true : cleanupFilter === 'not' ? false : null;
  const { rows, total, page, pageCount, pageSize, loading, setPage } = useVisitorPage(
    {
      subEventIds: subEventIdsFor(cleanupEventFilter, cleanupSubEvent),
      country: filterCountry,
      source: filterSource,
      category: filterCategory,
      cleaned,
    },
    visitorRefreshKey,
  );

  const kpiTotal = visitorStats.total;
  const cleanedCount = visitorStats.cleaned;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Cleanup
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>
          {cleanedCount.toLocaleString()} of {kpiTotal.toLocaleString()} cleaned
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={cleanupEventFilter} onChange={(e) => { setCleanupEventFilter(e.target.value); setCleanupSubEvent(''); }}>
            <option value="">All events</option>
            {events.map((ev) => (<option key={ev} value={ev}>{ev}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        {cleanupEventFilter && (
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={cleanupSubEvent} onChange={(e) => setCleanupSubEvent(e.target.value)}>
              <option value="">All sub-events</option>
              {subEventsFor(cleanupEventFilter).map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
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
          <select className="vdm-select" value={cleanupFilter} onChange={(e) => setCleanupFilter(e.target.value)}>
            <option value="">All</option>
            <option value="cleaned">Cleaned</option>
            <option value="not">Not cleaned</option>
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
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Cleanup status</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
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
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: v.cleaned ? '#1f6a47' : '#6c6a66', background: v.cleaned ? '#e6f1ea' : '#efeeea' }}>
                    {v.cleaned ? 'Cleaned' : 'Not cleaned'}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openTimeline(v)} title="Event history">🕓</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => startCall(v)}>📞 Call</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openEdit(v)}>Edit</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, fontSize: 13, color: '#9a978f', textAlign: 'center' }}>{loading ? 'Loading…' : 'No matching records.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}
