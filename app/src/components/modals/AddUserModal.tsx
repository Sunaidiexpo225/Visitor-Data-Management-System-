import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

const roles = ['Marketing', 'Data Entry', 'Tele-caller', 'Admin'];

export default function AddUserModal(state: AppState) {
  const { addUserOpen, closeAddUser, newUser, setNewUser, addUser } = state;
  if (!addUserOpen) return null;

  return (
    <ModalOverlay onClose={closeAddUser} maxWidth={420}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add user</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Name
          <input className="vdm-input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Email
          <input className="vdm-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
          Role
          <div className="vdm-select-wrap">
            <select className="vdm-select" style={{ width: '100%' }} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="vdm-btn-secondary" onClick={closeAddUser}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={addUser}>Add user</button>
      </div>
    </ModalOverlay>
  );
}
