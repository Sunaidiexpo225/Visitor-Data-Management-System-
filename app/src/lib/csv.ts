import type { Visitor } from '../types';

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function downloadCsv(rows: string[][], filename: string) {
  const text = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportVisitorsCsv(visitors: Visitor[], filename: string) {
  const header = ['Name', 'Company', 'Phone', 'Email', 'Event', 'Status', 'Consent', 'Cleaned', 'Invitations'];
  const rows = visitors.map((v) => [
    v.name,
    v.company,
    v.phone,
    v.email,
    v.event,
    v.status,
    v.consent,
    v.cleaned ? 'Yes' : 'No',
    v.invites.map((i) => `${i.event} (${i.status})`).join('; '),
  ]);
  downloadCsv([header, ...rows], filename);
}
