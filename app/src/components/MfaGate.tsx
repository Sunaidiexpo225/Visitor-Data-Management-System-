import { useEffect, useState } from 'react';
import type { AppState } from '../hooks/useAppState';

export default function MfaGate(state: AppState) {
  const { mfaStatus, mfaEnrollData, mfaBusy, mfaError, startMfaEnroll, submitMfaEnroll, submitMfaChallenge, signOut } = state;
  const [code, setCode] = useState('');
  const isEnroll = mfaStatus === 'enroll';

  // Kick off enrollment (generates the QR) once when the enroll screen appears.
  useEffect(() => {
    if (isEnroll && !mfaEnrollData) startMfaEnroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnroll]);

  const submit = () => {
    if (code.trim().length < 6) return;
    if (isEnroll) submitMfaEnroll(code);
    else submitMfaChallenge(code);
    setCode('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="vdm-card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div className="vdm-serif" style={{ fontSize: 22, fontWeight: 500 }}>
          {isEnroll ? 'Set up two-factor authentication' : 'Two-factor authentication'}
        </div>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 6, lineHeight: 1.55 }}>
          {isEnroll
            ? 'Your administrator requires 2FA. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code.'
            : 'Enter the 6-digit code from your authenticator app to continue.'}
        </p>

        {isEnroll && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '18px 0' }}>
            {mfaEnrollData ? (
              <>
                <div
                  style={{ width: 180, height: 180, background: '#fff', borderRadius: 8 }}
                  // Supabase returns the QR as an inline SVG string.
                  dangerouslySetInnerHTML={{ __html: mfaEnrollData.qr }}
                />
                <div style={{ fontSize: 11, color: '#7a7873' }}>Or enter this secret manually:</div>
                <code className="vdm-mono" style={{ fontSize: 12, background: '#f6f5f1', padding: '6px 10px', borderRadius: 6, userSelect: 'all', wordBreak: 'break-all' }}>
                  {mfaEnrollData.secret}
                </code>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#9a978f' }}>Preparing…</div>
            )}
          </div>
        )}

        <input
          className="vdm-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={{ width: '100%', textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, marginTop: isEnroll ? 0 : 18 }}
        />

        {mfaError && <div style={{ fontSize: 12, color: '#9a4a3a', marginTop: 8 }}>{mfaError}</div>}

        <button
          type="button"
          className="vdm-btn-primary"
          onClick={submit}
          disabled={mfaBusy || code.trim().length < 6}
          style={{ width: '100%', marginTop: 14, padding: '11px 15px', opacity: mfaBusy ? 0.7 : 1 }}
        >
          {mfaBusy ? 'Verifying…' : 'Verify'}
        </button>

        <button
          type="button"
          onClick={signOut}
          style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: '#7a7873', fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
