import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

export default function CredentialModal(state: AppState) {
  const { credModal, closeCredModal } = state;
  const [copied, setCopied] = useState(false);
  if (!credModal) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credModal.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ModalOverlay onClose={closeCredModal} maxWidth={440}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{credModal.title}</h2>
      <p style={{ fontSize: 13, color: '#7a7873', marginBottom: 16 }}>
        Share this temporary password with <strong>{credModal.email}</strong>. It won't be shown again — copy it now.
      </p>

      <div style={{ fontSize: 11, fontWeight: 600, color: '#7a7873', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Temporary password
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <code
          className="vdm-mono"
          style={{
            flex: 1, background: '#f6f5f1', border: '1px solid #e6e4de', borderRadius: 8,
            padding: '11px 14px', fontSize: 15, letterSpacing: '0.04em', userSelect: 'all',
          }}
        >
          {credModal.password}
        </code>
        <button type="button" className="vdm-btn-secondary" onClick={copy} style={{ whiteSpace: 'nowrap' }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="vdm-btn-primary" onClick={closeCredModal}>Done</button>
      </div>
    </ModalOverlay>
  );
}
