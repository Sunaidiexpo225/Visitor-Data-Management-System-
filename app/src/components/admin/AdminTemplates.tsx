import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';

export default function AdminTemplates(state: AppState) {
  const { templatesList, createTemplate, updateTemplate, deleteTemplate } = state;
  const [drafts, setDrafts] = useState<Record<string, { name: string; body: string }>>({});
  const [newTpl, setNewTpl] = useState({ name: '', body: '' });

  const draftFor = (id: string, name: string, body: string) => drafts[id] ?? { name, body };

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Campaign templates</h2>
      <p style={{ fontSize: 12, color: '#7a7873', marginBottom: 12 }}>
        Reusable WhatsApp/WATI message templates. Use <code>{'{name}'}</code> to insert the recipient's name.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {templatesList.map((t) => {
          const d = draftFor(t.id, t.label, t.body);
          const dirty = d.name !== t.label || d.body !== t.body;
          return (
            <div key={t.id} className="vdm-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="vdm-input"
                value={d.name}
                onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, name: e.target.value } })}
              />
              <textarea
                className="vdm-input"
                rows={3}
                value={d.body}
                onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, body: e.target.value } })}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="vdm-btn-ghost" onClick={() => deleteTemplate(t.id)}>Delete</button>
                <button type="button" className="vdm-btn-secondary" disabled={!dirty} onClick={() => updateTemplate(t.id, d.name, d.body)}>Save</button>
              </div>
            </div>
          );
        })}

        <div className="vdm-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5853' }}>New template</div>
          <input className="vdm-input" placeholder="Template name" value={newTpl.name} onChange={(e) => setNewTpl({ ...newTpl, name: e.target.value })} />
          <textarea className="vdm-input" rows={3} placeholder="Hi {name}, …" value={newTpl.body} onChange={(e) => setNewTpl({ ...newTpl, body: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="vdm-btn-primary"
              onClick={() => { createTemplate(newTpl.name, newTpl.body); setNewTpl({ name: '', body: '' }); }}
            >
              Add template
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
