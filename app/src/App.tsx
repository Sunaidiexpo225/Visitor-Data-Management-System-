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
import EditVisitorModal from './components/modals/EditVisitorModal';
import InviteHistoryModal from './components/modals/InviteHistoryModal';
import NewCampaignModal from './components/modals/NewCampaignModal';
import ActiveCallModal from './components/modals/ActiveCallModal';
import AddUserModal from './components/modals/AddUserModal';
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

  return (
    <div style={{ '--accent': '#1f3c88' } as React.CSSProperties}>
      <Shell state={state}>
        {state.tab === 'dashboard' && <Dashboard {...state} />}
        {state.tab === 'visitors' && <Visitors {...state} />}
        {state.tab === 'cleanup' && <Cleanup {...state} />}
        {state.tab === 'calls' && <Calls {...state} />}
        {state.tab === 'campaigns' && <Campaigns {...state} />}
        {state.tab === 'reports' && <Reports {...state} />}
        {state.tab === 'admin' && state.role === 'Admin' && <Admin {...state} />}
      </Shell>

      <EditVisitorModal {...state} />
      <InviteHistoryModal {...state} />
      <NewCampaignModal {...state} />
      <ActiveCallModal {...state} />
      <AddUserModal {...state} />
      <AddWatiModal {...state} />
      <AddCallApiModal {...state} />
      <RenameEventModal {...state} />
      <Toast message={state.toast} />
    </div>
  );
}

export default App;
