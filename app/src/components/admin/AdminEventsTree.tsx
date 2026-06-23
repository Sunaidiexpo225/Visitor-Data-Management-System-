import { useRef, useState } from 'react';
import type { AppState } from '../../hooks/useAppState';

export default function AdminEventsTree(state: AppState) {
  const {
    events, subEventsFor, visitorStats,
    newEventName, setNewEventName, createEvent, importIntoEvent, openEditEvent, deleteEvent, clearEventRecords,
    createSubEvent, renameSubEvent, deleteSubEvent, clearSubEventRecords,
  } = state;

  const importRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Events &amp; sub-events</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((ev) => {
          const subs = subEventsFor(ev);
          const count = visitorStats.byEvent.find((b) => b.event === ev)?.count ?? 0;
          return (
            <div key={ev} className="vdm-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ev}</div>
                  <div style={{ fontSize: 12, color: '#7a7873' }}>{count} visitor(s) · {subs.length} sub-event(s)</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    ref={(el) => { importRefs.current[ev] = el; }}
                    type="file" accept=".csv" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) importIntoEvent(ev)(f); e.target.value = ''; }}
                  />
                  <button type="button" className="vdm-btn-ghost" onClick={() => importRefs.current[ev]?.click()}>Import</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => openEditEvent(ev)}>Rename</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => clearEventRecords(ev)} style={{ color: '#9a4a3a' }}>Clear records</button>
                  <button type="button" className="vdm-btn-ghost" onClick={() => deleteEvent(ev)}>Delete</button>
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid #f0efe9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subs.map((s) => {
                  const draft = subDrafts[s.id] ?? s.name;
                  return (
                    <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 12 }}>
                      <span style={{ color: '#c7c4bd' }}>└</span>
                      <input
                        className="vdm-input"
                        style={{ flex: 1, maxWidth: 260 }}
                        value={draft}
                        onChange={(e) => setSubDrafts({ ...subDrafts, [s.id]: e.target.value })}
                      />
                      <button type="button" className="vdm-btn-ghost" disabled={draft.trim() === s.name} onClick={() => renameSubEvent(s.id, draft)}>Save</button>
                      <button type="button" className="vdm-btn-ghost" onClick={() => clearSubEventRecords(s.id, s.name)} style={{ color: '#9a4a3a' }}>Clear records</button>
                      <button type="button" className="vdm-btn-ghost" onClick={() => deleteSubEvent(s.id)}>Remove</button>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 8, paddingLeft: 24, marginTop: 2 }}>
                  <input
                    className="vdm-input"
                    style={{ flex: 1, maxWidth: 240 }}
                    placeholder="New sub-event"
                    value={newSub[ev] ?? ''}
                    onChange={(e) => setNewSub({ ...newSub, [ev]: e.target.value })}
                  />
                  <button
                    type="button"
                    className="vdm-btn-ghost"
                    onClick={() => { createSubEvent(ev, newSub[ev] ?? ''); setNewSub({ ...newSub, [ev]: '' }); }}
                  >
                    Add sub-event
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input className="vdm-input" placeholder="New event name" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} style={{ flex: 1, maxWidth: 280 }} />
        <button type="button" className="vdm-btn-secondary" onClick={createEvent}>Create event</button>
      </div>
    </section>
  );
}
