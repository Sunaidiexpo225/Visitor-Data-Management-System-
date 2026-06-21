import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

export default function AddWatiModal(state: AppState) {
  const { addWatiOpen, closeAddWati, newWati, setNewWati, addWati, events } = state;
  if (!addWatiOpen) return null;

  return (
    <ModalOverlay onClose={closeAddWati} maxWidth={420}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add WATI connection</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Event
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={newWati.event} onChange={(e) => setNewWati({ ...newWati, event: e.target.value })}>
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Sender number
          <input className="vdm-input" value={newWati.sender} onChange={(e) => setNewWati({ ...newWati, sender: e.target.value })} placeholder="+966 50 000 0000" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          API key
          <input className="vdm-input" value={newWati.api} onChange={(e) => setNewWati({ ...newWati, api: e.target.value })} placeholder="wati_key_••" />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeAddWati}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={addWati}>Add connection</button>
      </div>
    </ModalOverlay>
  );
}
