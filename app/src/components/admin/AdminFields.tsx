import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';

export default function AdminFields(state: AppState) {
  const { statusOptions, createStatusOption, renameStatusOption, deleteStatusOption } = state;
  const [newName, setNewName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Fields — Visitor status</h2>
      <p style={{ fontSize: 12, color: '#7a7873', marginBottom: 12 }}>
        These values populate the Status dropdown on every visitor record. Renames apply everywhere; a status in use can't be removed.
      </p>
      <div className="vdm-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {statusOptions.map((s) => {
          const draft = drafts[s.id] ?? s.name;
          return (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="vdm-input"
                style={{ flex: 1, maxWidth: 280 }}
                value={draft}
                onChange={(e) => setDrafts({ ...drafts, [s.id]: e.target.value })}
              />
              <button
                type="button"
                className="vdm-btn-ghost"
                disabled={draft.trim() === s.name}
                onClick={() => renameStatusOption(s.id, draft)}
              >
                Save
              </button>
              <button type="button" className="vdm-btn-ghost" onClick={() => deleteStatusOption(s.id)}>Remove</button>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, borderTop: '1px solid #f0efe9', paddingTop: 12 }}>
          <input
            className="vdm-input"
            style={{ flex: 1, maxWidth: 280 }}
            placeholder="New status (e.g. VIP)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className="vdm-btn-secondary"
            onClick={() => { createStatusOption(newName); setNewName(''); }}
          >
            Add status
          </button>
        </div>
      </div>
    </section>
  );
}
