import { useAppState } from './hooks/useAppState';
import Login from './components/Login';
import Shell from './components/Shell';
import Dashboard from './components/Dashboard';
import Visitors from './components/Visitors';
import Cleanup from './components/Cleanup';
import Calls from './components/Calls';
import Campaigns from './components/Campaigns';
import Reports from './components/Reports';
import Admin from './components/Admin';
import Toast from './components/Toast';
import MfaGate from './components/MfaGate';
import EditVisitorModal from './components/modals/EditVisitorModal';
import VisitorTimelineModal from './components/modals/VisitorTimelineModal';
import InviteHistoryModal from './components/modals/InviteHistoryModal';
import NewCampaignModal from './components/modals/NewCampaignModal';
import ActiveCallModal from './components/modals/ActiveCallModal';
import AddUserModal from './components/modals/AddUserModal';
import CredentialModal from './components/modals/CredentialModal';
import ImportPreviewModal from './components/modals/ImportPreviewModal';
import AddWatiModal from './components/modals/AddWatiModal';
import AddCallApiModal from './components/modals/AddCallApiModal';
import RenameEventModal from './components/modals/RenameEventModal';

function App() {
  const state = useAppState();

  if (!state.authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7873', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!state.loggedIn) {
    return (
      <>
        <Login {...state} />
        <Toast message={state.toast} />
      </>
    );
  }

  // Logged in, but a second factor (or enrollment) is still required.
  if (state.mfaStatus === 'pending') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7873', fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (state.mfaStatus !== 'ok') {
    return (
      <>
        <MfaGate {...state} />
        <Toast message={state.toast} />
      </>
    );
  }

  const isAdmin = state.role === 'Admin';
  const canSee = (p: string) => isAdmin || (state.myPages as string[]).includes(p);
  // Fall back to an allowed page if the active tab isn't permitted.
  const activeTab =
    state.tab === 'admin'
      ? isAdmin ? 'admin' : (state.myPages[0] ?? 'dashboard')
      : canSee(state.tab) ? state.tab : (state.myPages[0] ?? 'dashboard');

  return (
    <div style={{ '--accent': '#1f3c88' } as React.CSSProperties}>
      <Shell state={state}>
        {activeTab === 'dashboard' && <Dashboard {...state} />}
        {activeTab === 'visitors' && <Visitors {...state} />}
        {activeTab === 'cleanup' && <Cleanup {...state} />}
        {activeTab === 'calls' && <Calls {...state} />}
        {activeTab === 'campaigns' && <Campaigns {...state} />}
        {activeTab === 'reports' && <Reports {...state} />}
        {activeTab === 'admin' && isAdmin && <Admin {...state} />}
      </Shell>

      <EditVisitorModal {...state} />
      <VisitorTimelineModal {...state} />
      <InviteHistoryModal {...state} />
      <NewCampaignModal {...state} />
      <ActiveCallModal {...state} />
      <AddUserModal {...state} />
      <CredentialModal {...state} />
      <ImportPreviewModal {...state} />
      <AddWatiModal {...state} />
      <AddCallApiModal {...state} />
      <RenameEventModal {...state} />
      <Toast message={state.toast} />
    </div>
  );
}

export default App;
