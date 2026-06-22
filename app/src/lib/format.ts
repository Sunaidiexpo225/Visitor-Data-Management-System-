export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export function maskPhone(p: string): string {
  const last3 = p.slice(-3);
  return '+966 5•• ••• ' + last3;
}

// Normalise a phone for dialing / call-provider APIs: keep only digits and a
// single leading '+', stripping spaces, dashes, parentheses, etc. (E.164-ish).
export function dialDigits(p: string): string {
  const plus = p.trim().startsWith('+') ? '+' : '';
  return plus + p.replace(/\D/g, '');
}

// Split one CSV line, honouring double-quoted fields that may contain commas.
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Parse an import date in DD.MM.YYYY (also tolerates / or - separators, and an
// already-ISO YYYY-MM-DD) into the ISO YYYY-MM-DD that the date column stores.
// Returns '' for blank/unrecognised values.
export function parseImportDate(s: string): string {
  const t = s.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return '';
}
// Handles leading national-trunk zeros and avoids doubling the country code
// when the local part already includes it.
export function combinePhone(code: string, phone: string): string {
  const codeDigits = code.replace(/\D/g, '');
  const local = phone.replace(/\D/g, '');
  if (!local) return '';
  if (!codeDigits) {
    return (phone.trim().startsWith('+') ? '+' : '') + local;
  }
  // Local already looks international (already carries the country code).
  if (local.startsWith(codeDigits) && local.length > codeDigits.length + 5) {
    return '+' + local;
  }
  // Drop a national trunk prefix (leading zeros) then prepend the code.
  return '+' + codeDigits + local.replace(/^0+/, '');
}

export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function nowStamp(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd} ${mm} ${hh}:${mi}:${ss}`;
}

export function today(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
}

export function genPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'Sx-' + s;
}

export function fakeIp(): string {
  return `10.0.${Math.floor(Math.random() * 30)}.${Math.floor(Math.random() * 250)}`;
}

export function uid(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}
