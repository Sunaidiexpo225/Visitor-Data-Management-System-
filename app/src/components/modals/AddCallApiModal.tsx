import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

export default function AddCallApiModal(state: AppState) {
  const { addCallApiOpen, closeAddCallApi, newCallApi, setNewCallApi, addCallApi } = state;
  if (!addCallApiOpen) return null;

  return (
    <ModalOverlay onClose={closeAddCallApi} maxWidth={420}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add call API</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Provider
          <input className="vdm-input" value={newCallApi.provider} onChange={(e) => setNewCallApi({ ...newCallApi, provider: e.target.value })} placeholder="Twilio Voice" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Caller ID
          <input className="vdm-input" value={newCallApi.callerId} onChange={(e) => setNewCallApi({ ...newCallApi, callerId: e.target.value })} placeholder="+966 11 200 0000" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          API key
          <input className="vdm-input" value={newCallApi.key} onChange={(e) => setNewCallApi({ ...newCallApi, key: e.target.value })} placeholder="sk_live_••••0000" />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeAddCallApi}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={addCallApi}>Add call API</button>
      </div>
    </ModalOverlay>
  );
}
