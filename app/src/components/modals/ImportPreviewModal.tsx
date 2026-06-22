import type { AppState } from '../../hooks/useAppState';
import ModalOverlay from './ModalOverlay';

const MAX_SHOWN = 200;

export default function ImportPreviewModal(state: AppState) {
  const { importPreview, confirmImport, cancelImport } = state;
  if (!importPreview) return null;

  const { rows, fileName } = importPreview;
  const warnCount = rows.filter((r) => r.warn).length;
  const shown = rows.slice(0, MAX_SHOWN);

  return (
    <ModalOverlay onClose={cancelImport} maxWidth={920}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Review import</h2>
      <p style={{ fontSize: 13, color: '#7a7873', marginBottom: 12 }}>
        <strong>{fileName}</strong> — {rows.length} record(s) to import
        {warnCount > 0 && (
          <span style={{ color: '#9a4a3a' }}> · {warnCount} row(s) need attention</span>
        )}
        . Nothing is saved until you confirm.
      </p>

      {warnCount > 0 && (
        <div style={{ fontSize: 12, color: '#9a4a3a', background: '#f9ece8', border: '1px solid #f0d8d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          Highlighted rows have phone-number issues (scientific notation or an unusual length). You can still import — fix them later via Edit — but values shown in scientific notation are likely already corrupted in the source file.
        </div>
      )}

      <div className="vdm-card" style={{ overflow: 'auto', maxHeight: '50vh' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th" style={{ padding: '8px 10px' }}></th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Id</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Name</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Company</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Phone</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Country</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Source</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Event</th>
              <th className="vdm-th" style={{ padding: '8px 10px' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #f0efe9', background: r.warn ? '#fbf3f0' : undefined }}>
                <td style={{ padding: '6px 10px', fontSize: 13 }} title={r.warn || ''}>{r.warn ? '⚠️' : ''}</td>
                <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, color: '#7a7873' }}>{r.refId || '—'}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, color: '#5a5853' }}>{r.company}</td>
                <td className="vdm-mono" style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap', color: r.warn ? '#9a4a3a' : undefined }}>
                  {r.phone || '—'}
                  {r.warn && <span style={{ display: 'block', fontSize: 10 }}>{r.warn}</span>}
                </td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{r.country || '—'}</td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{r.source || '—'}</td>
                <td style={{ padding: '6px 10px', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {r.eventName}
                  {r.subEventName && <span style={{ fontSize: 11, color: '#9a978f' }}> · {r.subEventName}</span>}
                </td>
                <td style={{ padding: '6px 10px', fontSize: 13 }}>{r.category || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_SHOWN && (
        <p style={{ fontSize: 12, color: '#9a978f', marginTop: 8 }}>Showing first {MAX_SHOWN} of {rows.length} rows. All {rows.length} will be imported.</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button type="button" className="vdm-btn-secondary" onClick={cancelImport}>Cancel</button>
        <button type="button" className="vdm-btn-primary" onClick={confirmImport}>Import {rows.length} record(s)</button>
      </div>
    </ModalOverlay>
  );
}
