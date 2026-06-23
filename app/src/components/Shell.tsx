import type { ReactNode } from 'react';
import type { AppState } from '../hooks/useAppState';
import type { TabKey } from '../types';
import { initials } from '../lib/format';

const navItems: { key: TabKey; label: string; adminOnly?: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'visitors', label: 'Visitors' },
  { key: 'people', label: 'People' },
  { key: 'cleanup', label: 'Cleanup' },
  { key: 'calls', label: 'Calls' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'reports', label: 'Reports' },
  { key: 'admin', label: 'Admin', adminOnly: true },
];

export default function Shell({ state, children }: { state: AppState; children: ReactNode }) {
  const { tab, setTab, role, email, signOut, myPages } = state;
  const visibleItems = navItems.filter((n) => {
    if (n.adminOnly) return role === 'Admin';
    if (role === 'Admin') return true; // admins see every page
    return (myPages as string[]).includes(n.key);
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        className="vdm-topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 60,
          background: '#16224d',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, minWidth: 0, flex: 1 }}>
          <span className="vdm-serif" style={{ fontSize: 17, fontWeight: 500, flexShrink: 0 }}>
            Visitor Management
          </span>
          <nav className="vdm-nav" style={{ display: 'flex', gap: 4, minWidth: 0, overflowX: 'auto' }}>
            {visibleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '8px 14px',
                  borderRadius: 7,
                  border: 'none',
                  background: tab === item.key ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span
            className="vdm-hide-sm"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 20,
              background: role === 'Admin' ? '#1f8a4c' : 'rgba(255,255,255,0.14)',
            }}
          >
            {role}
          </span>
          <span className="vdm-hide-sm" style={{ fontSize: 13, color: '#c7cde2' }}>
            {email}
          </span>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#1f3c88',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {initials(email.split('@')[0].replace(/[._]/g, ' '))}
          </div>
          <button type="button" className="vdm-btn-secondary" onClick={signOut} style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
            Sign out
          </button>
        </div>
      </div>

      <main className="vdm-main" style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 24px 60px' }}>{children}</main>
    </div>
  );
}
