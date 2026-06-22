import { useMemo } from 'react';
import type { AppState } from '../hooks/useAppState';
import { maskPhone } from '../lib/format';

const statusColor: Record<string, string> = {
  'Not contacted': '#9a978f',
  Invited: '#1f6a47',
  Pending: '#b07a1e',
  'Not interested': '#9a4a3a',
};

function latestStatus(invites: { status: string }[]): string {
  return invites.length > 0 ? invites[0].status : 'Not contacted';
}

export default function Calls(state: AppState) {
  const {
    visitors, events, subEventsFor,
    callFilter, setCallFilter, callEventFilter, setCallEventFilter, callSubEvent, setCallSubEvent,
    targetEvent, setTargetEvent, targetSubEvent, setTargetSubEvent,
    startCall, openCall,
  } = state;

  const invitedCount = useMemo(() => visitors.filter((v) => v.invites.some((i) => i.status === 'Invited')).length, [visitors]);

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      if (callEventFilter && v.event !== callEventFilter) return false;
      if (callSubEvent && v.subEvent !== callSubEvent) return false;
      const latest = latestStatus(v.invites);
      if (callFilter === 'none' && latest !== 'Not contacted') return false;
      if (callFilter === 'pending' && !v.invites.some((i) => i.status === 'Pending')) return false;
      if (callFilter === 'invited' && !v.invites.some((i) => i.status === 'Invited')) return false;
      if (callFilter === 'notinterested' && !v.invites.some((i) => i.status === 'Not interested')) return false;
      return true;
    });
  }, [visitors, callEventFilter, callSubEvent, callFilter]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="vdm-serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Calls
        </h1>
        <p style={{ fontSize: 13, color: '#7a7873', marginTop: 4 }}>{invitedCount} visitors invited so far</p>
      </div>

      <div
        className="vdm-card"
        style={{ background: '#16224d', color: '#fff', padding: 18, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <p style={{ fontSize: 13, color: '#c7cde2', maxWidth: 640 }}>
          "Hi, this is calling from Sunaidi Expo. We met at one of our recent events — I'd love to invite you to our upcoming show. Would you be interested in attending?"
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c7cde2', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
          Inviting to
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={targetEvent} onChange={(e) => { setTargetEvent(e.target.value); setTargetSubEvent(''); }}>
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
          {subEventsFor(targetEvent).length > 0 && (
            <div className="vdm-select-wrap">
              <select className="vdm-select" value={targetSubEvent} onChange={(e) => setTargetSubEvent(e.target.value)}>
                <option value="">Whole event</option>
                {subEventsFor(targetEvent).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <span className="vdm-caret">▾</span>
            </div>
          )}
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={callEventFilter} onChange={(e) => { setCallEventFilter(e.target.value); setCallSubEvent(''); }}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <span className="vdm-caret">▾</span>
        </div>
        {callEventFilter && (
          <div className="vdm-select-wrap">
            <select className="vdm-select" value={callSubEvent} onChange={(e) => setCallSubEvent(e.target.value)}>
              <option value="">All sub-events</option>
              {subEventsFor(callEventFilter).map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <span className="vdm-caret">▾</span>
          </div>
        )}
        <div className="vdm-select-wrap">
          <select className="vdm-select" value={callFilter} onChange={(e) => setCallFilter(e.target.value)}>
            <option value="">All</option>
            <option value="none">Not contacted</option>
            <option value="pending">Has pending</option>
            <option value="invited">Has invited</option>
            <option value="notinterested">Not interested</option>
          </select>
          <span className="vdm-caret">▾</span>
        </div>
      </div>

      <div className="vdm-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th className="vdm-th">Visitor</th>
              <th className="vdm-th">Phone</th>
              <th className="vdm-th">Event</th>
              <th className="vdm-th">Latest status</th>
              <th className="vdm-th">Invitations</th>
              <th className="vdm-th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const latest = latestStatus(v.invites);
              return (
                <tr key={v.id} style={{ borderTop: '1px solid #f0efe9' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: '#7a7873' }}>{v.company}</div>
                  </td>
                  <td className="vdm-mono" style={{ padding: '10px 8px', fontSize: 12 }}>{maskPhone(v.phone)}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{v.event}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[latest] }} />
                      {latest}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{v.invites.length}</td>
                  <td style={{ padding: '10px 8px', display: 'flex', gap: 6 }}>
                    <button type="button" className="vdm-btn-ghost" onClick={() => startCall(v.id)}>📞 Call</button>
                    <button type="button" className="vdm-btn-ghost" onClick={() => openCall(v.id)}>Invites</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
