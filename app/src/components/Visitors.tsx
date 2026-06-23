import { useMemo, useState } from 'react';
import type { AppState } from '../hooks/useAppState';
import { badgeBase, consentStyle, statusStyle } from '../lib/styles';
import { maskPhone } from '../lib/format';
import { useVisitorPage } from '../hooks/useVisitorPage';
import Pagination from './Pagination';
import type { ConsentStatus } from '../types';

const ellipsis = (max: number): React.CSSProperties => ({ maxWidth: max, overflow: 'hidden', textOverflow: 'ellipsis' });

export default function Visitors(state: AppState) {
  const {
    visitorStats, visitorOptions, visitorRefreshKey, subEventIdsFor, events, subEventsFor, statusOptions, categoryOptions,
    filterEvent, setFilterEvent, filterSubEvent, setFilterSubEvent,
    filterStatus, setFilterStatus, filterConsent, setFilterConsent, search, setSearch,
    openEdit,
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
      subEventIds: subEventIdsFor(filterEvent, filterSubEvent),
      status: filterStatus,
      consent: filterConsent,
      country: filterCountry,
      source: filterSource,
      category: filterCategory,
      search,
    },
    visitorRefreshKey,
  );

  const consents: ConsentStatus[] = ['Opted-in', 'Pending', 'Opted-out'];
  const subOptions = filterEvent ? subEventsFor(filterEvent) : [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Visitors
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>
          {total.toLocaleString()} matching · {visitorStats.total.toLocaleString()} total
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="vdm-input" placeholder="Search id, name, company, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px' }} />
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterEvent} onChange={(e) => { setFilterEvent(e.target.value); setFilterSubEvent(''); }}>
            <option value="">All events</option>
            {events.map((ev) => (<option key={ev} value={ev}>{ev}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        {filterEvent && (
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={filterSubEvent} onChange={(e) => setFilterSubEvent(e.target.value)}>
              <option value="">All sub-events</option>
              {subOptions.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
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
          <select className="vdm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterConsent} onChange={(e) => setFilterConsent(e.target.value)}>
            <option value="">All consent</option>
            {consents.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </div>

      <div className="vdm-card" style={{ overflow: 'auto', position: 'relative' }}>
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
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Status</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Consent</th>
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
                <td style={{ padding: '6px 10px' }}><span style={{ ...badgeBase, ...statusStyle(v.status) }}>{v.status}</span></td>
                <td style={{ padding: '6px 10px' }}><span style={{ ...badgeBase, ...consentStyle(v.consent) }}>{v.consent}</span></td>
                <td style={{ padding: '6px 10px' }}>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openEdit(v)}>Edit</button>
                </td>
              </tr>
            ))}
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
