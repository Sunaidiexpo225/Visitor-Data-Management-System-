import type { AppState } from '../hooks/useAppState';

export default function Login(state: AppState) {
  const { loginAs, pickLoginAs, email, setEmail, password, setPassword, signIn } = state;

  return (
    <div
      className="vdm-login"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="vdm-card"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 920,
          overflow: 'hidden',
        }}
      >
        <div
          className="vdm-login-brand"
          style={{
            flex: 1,
            background: '#16224d',
            color: '#fff',
            padding: 44,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="vdm-serif" style={{ fontSize: 22, fontWeight: 500 }}>
              Sunaidi Expo
            </div>
            <div className="vdm-serif" style={{ fontSize: 30, fontWeight: 500, marginTop: 28, lineHeight: 1.3 }}>
              Visitor Data Management
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, color: '#c7cde2' }}>
            <li>Centralize visitor records across every event</li>
            <li>Clean, enrich and de-duplicate data with confidence</li>
            <li>Reach contacts on WhatsApp via WATI, fully tracked</li>
          </ul>
        </div>

        <div style={{ flex: 1, padding: 44, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>Sign in</h1>
            <p style={{ fontSize: 13, color: '#7a7873', marginTop: 6 }}>Access your visitor management workspace.</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={loginAs === 'Staff' ? 'vdm-btn-primary' : 'vdm-btn-secondary'}
              style={{ flex: 1 }}
              onClick={() => pickLoginAs('Staff')}
            >
              Staff
            </button>
            <button
              type="button"
              className={loginAs === 'Admin' ? 'vdm-btn-primary' : 'vdm-btn-secondary'}
              style={{ flex: 1 }}
              onClick={() => pickLoginAs('Admin')}
            >
              Admin
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Email
            <input className="vdm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#5a5853', fontWeight: 500 }}>
            Password
            <input className="vdm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#5a5853' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" defaultChecked /> Keep me signed in
            </label>
            <span style={{ color: '#1f3c88', cursor: 'pointer' }}>Forgot password?</span>
          </div>

          <button type="button" className="vdm-btn-primary" style={{ marginTop: 4, padding: '11px 15px' }} onClick={signIn}>
            Sign In
          </button>

          <p style={{ fontSize: 11, color: '#9a978f', marginTop: 8 }}>
            Access is restricted to authorized Sunaidi Expo staff. All sign-ins are logged for security and compliance.
          </p>
        </div>
      </div>
    </div>
  );
}
