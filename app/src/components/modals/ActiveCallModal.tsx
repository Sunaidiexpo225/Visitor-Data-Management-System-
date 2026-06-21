import type { AppState } from '../../hooks/useAppState';
import { fmtDur, initials } from '../../lib/format';
import type { MouseEvent } from 'react';

export default function ActiveCallModal(state: AppState) {
  const { activeCall, callSeconds, endCall, cancelCall } = state;
  if (!activeCall) return null;

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fade-in"
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
      onClick={cancelCall}
    >
      <div
        style={{ width: '100%', maxWidth: 380, background: '#16224d', color: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}
        onClick={stop}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 600,
            margin: '0 auto 16px',
          }}
        >
          {initials(activeCall.name)}
        </div>
        <div className="vdm-serif" style={{ fontSize: 20, fontWeight: 500 }}>{activeCall.name}</div>
        <div style={{ fontSize: 13, color: '#c7cde2', marginTop: 4 }}>{activeCall.company}</div>
        <div style={{ fontSize: 12, color: '#9aa3c4', marginTop: 2 }}>{activeCall.event}</div>

        <div className="vdm-mono" style={{ fontSize: 32, fontWeight: 600, margin: '24px 0' }}>{fmtDur(callSeconds)}</div>

        <a
          href={`tel:${activeCall.phone}`}
          style={{ display: 'inline-block', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.14)', borderRadius: 8, padding: '9px 16px', marginBottom: 20, textDecoration: 'none' }}
        >
          Dial on this device
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={() => endCall('Invited')} style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#1f8a4c', border: 'none', borderRadius: 8, padding: '10px 15px' }}>
            Invited
          </button>
          <button type="button" onClick={() => endCall('Pending')} style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#b07a1e', border: 'none', borderRadius: 8, padding: '10px 15px' }}>
            Pending
          </button>
          <button type="button" onClick={() => endCall('Not interested')} style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#9a4a3a', border: 'none', borderRadius: 8, padding: '10px 15px' }}>
            Not interested
          </button>
          <button type="button" onClick={cancelCall} style={{ fontSize: 13, fontWeight: 500, color: '#c7cde2', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '10px 15px' }}>
            Discard call
          </button>
        </div>
      </div>
    </div>
  );
}
