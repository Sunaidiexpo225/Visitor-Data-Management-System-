import type { AppState } from '../../hooks/useAppState';
import type { InviteStatus } from '../../types';
import ModalOverlay from './ModalOverlay';

const statuses: InviteStatus[] = ['Invited', 'Pending', 'Not interested'];

export default function InviteHistoryModal(state: AppState) {
  const {
    callingId, closeCall, visitors, events,
    addInviteEvent, setAddInviteEvent, addInviteStatus, setAddInviteStatus,
    addInvite, setInviteStatus, removeInvite,
  } = state;
  if (!callingId) return null;
  const visitor = visitors.find((v) => v.id === callingId);
  if (!visitor) return null;

  return (
    <ModalOverlay onClose={closeCall} maxWidth={520}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Invitation history</h2>
      <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4, marginBottom: 16 }}>{visitor.name} · {visitor.company}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {visitor.invites.length === 0 && <div style={{ fontSize: 13, color: '#9a978f' }}>No invitations logged yet.</div>}
        {visitor.invites.map((inv) => (
          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #f0efe9', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.event}</div>
              <div style={{ fontSize: 11, color: '#7a7873' }}>{inv.date}</div>
            </div>
            <div className="vdm-select-wrap">
              <select className="vdm-select" value={inv.status} onChange={(e) => setInviteStatus(visitor.id, inv.id, e.target.value as InviteStatus)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
            <button type="button" className="vdm-btn-ghost" onClick={() => removeInvite(visitor.id, inv.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #e6e4de', paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5853', marginBottom: 8 }}>Log a new invitation</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="vdm-select-wrap" style={{ flex: 1 }}>
            <select className="vdm-select" style={{ width: '100%' }} value={addInviteEvent} onChange={(e) => setAddInviteEvent(e.target.value)}>
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={addInviteStatus} onChange={(e) => setAddInviteStatus(e.target.value as InviteStatus)}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
          <button type="button" className="vdm-btn-secondary" onClick={addInvite}>Add</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="vdm-btn-primary" onClick={closeCall}>Done</button>
      </div>
    </ModalOverlay>
  );
}
