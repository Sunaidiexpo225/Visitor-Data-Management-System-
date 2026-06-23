import type { AppState } from '../../hooks/useAppState';
import type { ConsentStatus, VisitorStatus } from '../../types';
import { badgeBase, consentStyle, statusStyle } from '../../lib/styles';
import { maskPhone } from '../../lib/format';
import ModalOverlay from './ModalOverlay';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// registration_date is an ISO 'YYYY-MM-DD' string (or null).
function fmtDate(d: string | null): { year: string; rest: string } {
  if (!d) return { year: '—', rest: 'Date unknown' };
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return { year: d, rest: '' };
  const month = MONTHS[Number(m[2]) - 1] ?? '';
  return { year: m[1], rest: `${Number(m[3])} ${month}` };
}

export default function VisitorTimelineModal(state: AppState) {
  const { timelineOpen, timelineLoading, timeline, closeTimeline } = state;
  if (!timelineOpen) return null;

  const person = timeline?.person;
  const visits = timeline?.visits ?? [];
  const eventCount = new Set(visits.map((v) => v.event).filter(Boolean)).size;

  return (
    <ModalOverlay onClose={closeTimeline} maxWidth={580}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Visitor timeline</h2>
      {person && (
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4, marginBottom: 4 }}>
          {person.name}
          {person.company && <span> · {person.company}</span>}
          {person.phone && <span className="vdm-mono"> · {maskPhone(person.phone)}</span>}
        </p>
      )}

      {timelineLoading ? (
        <div style={{ padding: '24px 0', fontSize: 13, color: '#9a978f' }}>Loading timeline…</div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#5a5853', marginBottom: 16 }}>
            {eventCount === 0
              ? 'No event history found.'
              : `Attended ${eventCount} event${eventCount > 1 ? 's' : ''} across ${visits.length} registration${visits.length > 1 ? 's' : ''}.`}
          </p>

          <div style={{ position: 'relative', paddingLeft: 6 }}>
            {visits.map((v, i) => {
              const { year, rest } = fmtDate(v.date);
              const last = i === visits.length - 1;
              return (
                <div key={v.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {/* date column */}
                  <div style={{ width: 56, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                    <div className="vdm-serif" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1 }}>{year}</div>
                    <div style={{ fontSize: 11, color: '#9a978f' }}>{rest}</div>
                  </div>
                  {/* rail + dot */}
                  <div style={{ position: 'relative', width: 14, flexShrink: 0 }}>
                    <span style={{ position: 'absolute', left: 4, top: 4, width: 10, height: 10, borderRadius: '50%', background: v.current ? 'var(--accent, #1f3c88)' : '#c7c4bd', border: '2px solid #fff', boxShadow: '0 0 0 1px #e6e4de' }} />
                    {!last && <span style={{ position: 'absolute', left: 8, top: 14, bottom: -14, width: 2, background: '#ececec' }} />}
                  </div>
                  {/* content */}
                  <div style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {v.event || 'Unknown event'}
                      {v.current && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent, #1f3c88)', marginLeft: 8 }}>● THIS RECORD</span>}
                    </div>
                    {v.subEvent && <div style={{ fontSize: 12, color: '#9a978f' }}>{v.subEvent}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...badgeBase, ...statusStyle(v.status as VisitorStatus) }}>{v.status}</span>
                      <span style={{ ...badgeBase, ...consentStyle(v.consent as ConsentStatus) }}>{v.consent}</span>
                      {v.cleaned && <span style={{ ...badgeBase, color: '#1f6a47', background: '#e6f1ea' }}>Cleaned</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" className="vdm-btn-primary" onClick={closeTimeline}>Done</button>
      </div>
    </ModalOverlay>
  );
}
