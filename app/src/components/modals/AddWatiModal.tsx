import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

export default function AddWatiModal(state: AppState) {
  const { addWatiOpen, editWatiId, closeAddWati, newWati, setNewWati, addWati, events } = state;
  if (!addWatiOpen) return null;
  const editing = !!editWatiId;

  return (
    <ModalOverlay onClose={closeAddWati} maxWidth={460}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{editing ? 'Edit WATI connection' : 'Add WATI connection'}</h2>
      <p style={{ fontSize: 12, color: '#7a7873', marginBottom: 16 }}>
        From your WATI dashboard (API Docs): the tenant API endpoint and the access token. Each event can use its own WATI account.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Event
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={newWati.event} disabled={editing} onChange={(e) => setNewWati({ ...newWati, event: e.target.value })}>
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
          API endpoint
          <input className="vdm-input" value={newWati.endpoint} onChange={(e) => setNewWati({ ...newWati, endpoint: e.target.value })} placeholder="https://live-server-xxxxx.wati.io" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Access token {editing && <span style={{ color: '#9a978f', fontWeight: 400 }}>(leave blank to keep current)</span>}
          <input className="vdm-input" type="password" value={newWati.token} onChange={(e) => setNewWati({ ...newWati, token: e.target.value })} placeholder={editing ? '••••••' : 'Bearer token from WATI'} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeAddWati}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={addWati}>{editing ? 'Save' : 'Add connection'}</button>
      </div>
    </ModalOverlay>
  );
}
