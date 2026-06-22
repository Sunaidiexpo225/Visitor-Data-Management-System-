import type { AppState } from '../../hooks/useAppState';
import type { ConsentStatus } from '../../types';
import ModalOverlay from './ModalOverlay';

export default function EditVisitorModal(state: AppState) {
  const { editingId, editDraft, setEditDraft, closeEdit, saveEdit, events, subEventsFor, statusOptions, categoryOptions } = state;
  if (!editingId || !editDraft) return null;

  const consents: ConsentStatus[] = ['Opted-in', 'Pending', 'Opted-out'];
  const subs = subEventsFor(editDraft.event);

  return (
    <ModalOverlay onClose={closeEdit} maxWidth={460}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit visitor record</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Name
          <input className="vdm-input" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Company
          <input className="vdm-input" value={editDraft.company} onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Phone
          <input className="vdm-input" value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Email
          <input className="vdm-input" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Status
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
              {statusOptions.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
              {!statusOptions.some((s) => s.name === editDraft.status) && editDraft.status && (
                <option value={editDraft.status}>{editDraft.status}</option>
              )}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Category
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
              <option value="">— none —</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              {editDraft.category && !categoryOptions.some((c) => c.name === editDraft.category) && (
                <option value={editDraft.category}>{editDraft.category}</option>
              )}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Event
            <div className="vdm-select-wrap">
              <select
                className="vdm-select"
                style={{ width: '100%' }}
                value={editDraft.event}
                onChange={(e) => {
                  const ev = e.target.value;
                  const firstSub = subEventsFor(ev)[0]?.name ?? '';
                  setEditDraft({ ...editDraft, event: ev, subEvent: firstSub });
                }}
              >
                {events.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Sub-event
            <div className="vdm-select-wrap">
              <select className="vdm-select" style={{ width: '100%' }} value={editDraft.subEvent} onChange={(e) => setEditDraft({ ...editDraft, subEvent: e.target.value })}>
                {subs.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                {subs.length === 0 && <option value="">— none —</option>}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Consent
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={editDraft.consent} onChange={(e) => setEditDraft({ ...editDraft, consent: e.target.value as ConsentStatus })}>
              {consents.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Mark cleaned
          <div className="vdm-select-wrap">
            <select
              className="vdm-select"
              style={{ width: '100%' }}
              value={editDraft.cleaned ? 'yes' : 'no'}
              onChange={(e) => setEditDraft({ ...editDraft, cleaned: e.target.value === 'yes' })}
            >
              <option value="no">Not cleaned</option>
              <option value="yes">Cleaned</option>
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeEdit}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={saveEdit}>Save</button>
      </div>
    </ModalOverlay>
  );
}
