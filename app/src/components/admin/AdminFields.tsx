import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';
import type { StatusOption } from '../../types';

function OptionList({
  title, description, placeholder, options, onCreate, onRename, onDelete,
}: {
  title: string;
  description: string;
  placeholder: string;
  options: StatusOption[];
  onCreate: (name: string) => void;
  onRename: (id: string, to: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</h3>
      <p style={{ fontSize: 12, color: '#7a7873', marginBottom: 10 }}>{description}</p>
      <div className="vdm-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.length === 0 && <div style={{ fontSize: 12, color: '#9a978f' }}>None yet — add one below.</div>}
        {options.map((s) => {
          const draft = drafts[s.id] ?? s.name;
          return (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="vdm-input"
                style={{ flex: 1, maxWidth: 280 }}
                value={draft}
                onChange={(e) => setDrafts({ ...drafts, [s.id]: e.target.value })}
              />
              <button type="button" className="vdm-btn-ghost" disabled={draft.trim() === s.name} onClick={() => onRename(s.id, draft)}>Save</button>
              <button type="button" className="vdm-btn-ghost" onClick={() => onDelete(s.id)}>Remove</button>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, borderTop: '1px solid #f0efe9', paddingTop: 12 }}>
          <input
            className="vdm-input"
            style={{ flex: 1, maxWidth: 280 }}
            placeholder={placeholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="button" className="vdm-btn-secondary" onClick={() => { onCreate(newName); setNewName(''); }}>Add</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFields(state: AppState) {
  const {
    statusOptions, createStatusOption, renameStatusOption, deleteStatusOption,
    categoryOptions, createCategoryOption, renameCategoryOption, deleteCategoryOption,
  } = state;

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Fields</h2>
      <div className="vdm-admin2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <OptionList
          title="Visitor status"
          description="Populates the Status dropdown on every visitor. Renames apply everywhere; in-use values can't be removed."
          placeholder="New status (e.g. VIP)"
          options={statusOptions}
          onCreate={createStatusOption}
          onRename={renameStatusOption}
          onDelete={deleteStatusOption}
        />
        <OptionList
          title="Visitor category"
          description="Shown as the Category column. Set per visitor in the edit modal or via the import file's Category column."
          placeholder="New category (e.g. Buyer)"
          options={categoryOptions}
          onCreate={createCategoryOption}
          onRename={renameCategoryOption}
          onDelete={deleteCategoryOption}
        />
      </div>
    </section>
  );
}
