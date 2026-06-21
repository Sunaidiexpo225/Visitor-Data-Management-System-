import type { ReactNode, MouseEvent } from 'react';

export default function ModalOverlay({
  onClose,
  children,
  maxWidth = 480,
}: {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }
  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,24,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div className="vdm-card" style={{ width: '100%', maxWidth, padding: 24, maxHeight: '88vh', overflow: 'auto' }} onClick={stop}>
        {children}
      </div>
    </div>
  );
}
