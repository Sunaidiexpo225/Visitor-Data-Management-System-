import type { AppState } from '../../hooks/useAppState';
import type { ConsentStatus, VisitorStatus } from '../../types';
import type { TimelineVisit } from '../../lib/api';
import { badgeBase, consentStyle, statusStyle } from '../../lib/styles';
import { maskPhone } from '../../lib/format';
import ModalOverlay from './ModalOverlay';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ymd(d: string): { y: string; mo: string; day: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? { y: m[1], mo: MONTHS[Number(m[2]) - 1] ?? '', day: String(Number(m[3])) } : null;
}

// One event may have several registrations on different dates — show the span.
function fmtRange(first: string | null, last: string | null): { year: string; rest: string } {
  const a = first ? ymd(first) : null;
  const b = last ? ymd(last) : null;
  if (!a && !b) return { year: '—', rest: 'Date unknown' };
  if (a && b && first !== last) {
    const year = a.y === b.y ? a.y : `${a.y}–${b.y}`;
    const rest = a.y === b.y ? `${a.day} ${a.mo} – ${b.day} ${b.mo}` : `${a.day} ${a.mo} ${a.y} – ${b.day} ${b.mo} ${b.y}`;
    return { year, rest };
  }
  const one = a ?? b!;
  return { year: one.y, rest: `${one.day} ${one.mo}` };
}

interface EventGroup {
  event: string;
  subEvents: string[];
  first: string | null;
  last: string | null;
  count: number;
  consent: string;
  status: string;
  cleaned: boolean;
  current: boolean;
}

// Collapse the per-registration rows into one entry per event, keeping the
// date span and how many times the person registered.
function groupByEvent(visits: TimelineVisit[]): EventGroup[] {
  const map = new Map<string, TimelineVisit[]>();
  for (const v of visits) {
    const k = v.event || 'Unknown event';
    const arr = map.get(k) ?? [];
    arr.push(v);
    map.set(k, arr);
  }
  const groups: EventGroup[] = [];
  for (const [event, vs] of map) {
    const dates = vs.map((v) => v.date).filter((d): d is string => !!d).sort();
    const latest = [...vs].sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''))[vs.length - 1];
    groups.push({
      event,
      subEvents: Array.from(new Set(vs.map((v) => v.subEvent).filter(Boolean))),
      first: dates[0] ?? null,
      last: dates[dates.length - 1] ?? null,
      count: vs.length,
      consent: latest.consent,
      status: latest.status,
      cleaned: latest.cleaned,
      current: vs.some((v) => v.current),
    });
  }
  groups.sort((a, b) => (a.first ?? '9999').localeCompare(b.first ?? '9999'));
  return groups;
}

export default function VisitorTimelineModal(state: AppState) {
  const { timelineOpen, timelineLoading, timeline, closeTimeline } = state;
  if (!timelineOpen) return null;

  const person = timeline?.person;
  const visits = timeline?.visits ?? [];
  const groups = groupByEvent(visits);

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
            {groups.length === 0
              ? 'No event history found.'
              : `Attended ${groups.length} event${groups.length > 1 ? 's' : ''} across ${visits.length} registration${visits.length > 1 ? 's' : ''}.`}
          </p>

          <div style={{ position: 'relative', paddingLeft: 6 }}>
            {groups.map((g, i) => {
              const { year, rest } = fmtRange(g.first, g.last);
              const last = i === groups.length - 1;
              return (
                <div key={g.event} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {/* date column */}
                  <div style={{ width: 64, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                    <div className="vdm-serif" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1 }}>{year}</div>
                    <div style={{ fontSize: 11, color: '#9a978f' }}>{rest}</div>
                  </div>
                  {/* rail + dot */}
                  <div style={{ position: 'relative', width: 14, flexShrink: 0 }}>
                    <span style={{ position: 'absolute', left: 4, top: 4, width: 10, height: 10, borderRadius: '50%', background: g.current ? 'var(--accent, #1f3c88)' : '#c7c4bd', border: '2px solid #fff', boxShadow: '0 0 0 1px #e6e4de' }} />
                    {!last && <span style={{ position: 'absolute', left: 8, top: 14, bottom: -18, width: 2, background: '#ececec' }} />}
                  </div>
                  {/* content */}
                  <div style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {g.event}
                      {g.current && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent, #1f3c88)', marginLeft: 8 }}>● THIS RECORD</span>}
                    </div>
                    {g.subEvents.length > 0 && <div style={{ fontSize: 12, color: '#9a978f' }}>{g.subEvents.join(', ')}</div>}
                    {g.count > 1 && <div style={{ fontSize: 11, color: '#b07a1e', marginTop: 2 }}>{g.count} registrations</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...badgeBase, ...statusStyle(g.status as VisitorStatus) }}>{g.status}</span>
                      <span style={{ ...badgeBase, ...consentStyle(g.consent as ConsentStatus) }}>{g.consent}</span>
                      {g.cleaned && <span style={{ ...badgeBase, color: '#1f6a47', background: '#e6f1ea' }}>Cleaned</span>}
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
