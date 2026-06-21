import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

export default function RenameEventModal(state: AppState) {
  const { editEventOpen, closeEditEvent, editEventName, setEditEventName, saveEditEvent } = state;
  if (!editEventOpen) return null;

  return (
    <ModalOverlay onClose={closeEditEvent} maxWidth={380}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Rename event</h2>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
        Event name
        <input className="vdm-input" value={editEventName} onChange={(e) => setEditEventName(e.target.value)} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeEditEvent}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={saveEditEvent}>Save</button>
      </div>
    </ModalOverlay>
  );
}
