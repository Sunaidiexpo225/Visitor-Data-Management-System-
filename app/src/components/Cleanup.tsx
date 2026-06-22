import { useMemo, useState } from 'react';
import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';
import { distinctValues } from '../lib/filters';

export default function Cleanup(state: AppState) {
  const {
    visitors, events, subEventsFor, categoryOptions,
    cleanupFilter, setCleanupFilter, cleanupEventFilter, setCleanupEventFilter,
    cleanupSubEvent, setCleanupSubEvent, startCall, openEdit,
  } = state;

  const [filterCountry, setFilterCountry] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const countries = useMemo(() => distinctValues(visitors, (v) => v.country), [visitors]);
  const sources = useMemo(() => distinctValues(visitors, (v) => v.source), [visitors]);
  const categories = useMemo(
    () => Array.from(new Set([...categoryOptions.map((c) => c.name), ...distinctValues(visitors, (v) => v.category)])).sort(),
    [categoryOptions, visitors],
  );

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      if (cleanupEventFilter && v.event !== cleanupEventFilter) return false;
      if (cleanupSubEvent && v.subEvent !== cleanupSubEvent) return false;
      if (filterCountry && v.country !== filterCountry) return false;
      if (filterSource && v.source !== filterSource) return false;
      if (filterCategory && v.category !== filterCategory) return false;
      if (cleanupFilter === 'cleaned' && !v.cleaned) return false;
      if (cleanupFilter === 'not' && v.cleaned) return false;
      return true;
    });
  }, [visitors, cleanupFilter, cleanupEventFilter, cleanupSubEvent, filterCountry, filterSource, filterCategory]);

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
            {countries.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">All sources</option>
            {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
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
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Id</th>
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
            {filtered.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid #f0efe9' }}>
                <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, color: '#7a7873' }}>{v.refId || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{v.name}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, color: '#5a5853' }}>{v.company}</td>
                <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>{maskPhone(v.phone)}</td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.country || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.source || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {v.event}
                  {v.subEvent && <span style={{ fontSize: 11, color: '#9a978f' }}> · {v.subEvent}</span>}
                </td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{v.category || <span style={{ color: '#c7c4bd' }}>—</span>}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, color: v.cleaned ? '#1f6a47' : '#6c6a66', background: v.cleaned ? '#e6f1ea' : '#efeeea' }}>
                    {v.cleaned ? 'Cleaned' : 'Not cleaned'}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
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
