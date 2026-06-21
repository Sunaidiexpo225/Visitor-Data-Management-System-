export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translate(-50%,0)',
        background: '#16224d',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 10,
        fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 1000,
        animation: 'toastIn .25s ease',
      }}
    >
      {message}
    </div>
  );
}
