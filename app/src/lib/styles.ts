import type { ActivityKind, ConsentStatus, VisitorStatus } from '../types';
import type { CSSProperties } from 'react';

const KNOWN_STATUS: Record<string, [string, string]> = {
  Category: ['#1f6a47', '#e6f1ea'],
  Engaged: ['#b07a1e', '#f6efe0'],
  'Pre-registered': ['#1f3c88', '#eef1fa'],
  Pending: ['#6c6a66', '#efeeea'],
};

// A small palette so admin-created statuses still get a stable, distinct colour.
const STATUS_PALETTE: [string, string][] = [
  ['#1f6a47', '#e6f1ea'],
  ['#b07a1e', '#f6efe0'],
  ['#1f3c88', '#eef1fa'],
  ['#6c6a66', '#efeeea'],
  ['#9a4a3a', '#f5e8e4'],
  ['#5a3ea8', '#efeafa'],
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function statusStyle(s: VisitorStatus): CSSProperties {
  const [color, background] = KNOWN_STATUS[s] ?? STATUS_PALETTE[hashIndex(s || '', STATUS_PALETTE.length)];
  return { color, background };
}

export function consentStyle(c: ConsentStatus): CSSProperties {
  const map: Record<ConsentStatus, [string, string]> = {
    'Opted-in': ['#1f6a47', '#e6f1ea'],
    Pending: ['#b07a1e', '#f6efe0'],
    'Opted-out': ['#9a4a3a', '#f5e8e4'],
  };
  const [color, background] = map[c] ?? map.Pending;
  return { color, background };
}

export function tagStyle(kind: ActivityKind): CSSProperties {
  const map: Record<ActivityKind, [string, string]> = {
    merge: ['#1f3c88', '#eef1fa'],
    sent: ['#1f8a4c', '#e6f4ec'],
    edit: ['#b07a1e', '#f6efe0'],
    update: ['#6c6a66', '#efeeea'],
    cleaned: ['#1f6a47', '#e6f1ea'],
    invited: ['#1f3c88', '#eef1fa'],
  };
  const [color, background] = map[kind] ?? map.update;
  return { color, background };
}

export function iconStyle(kind: ActivityKind): CSSProperties {
  const map: Record<ActivityKind, [string, string]> = {
    merge: ['#1f3c88', '#eef1fa'],
    sent: ['#1f8a4c', '#e6f4ec'],
    edit: ['#b07a1e', '#f6efe0'],
    update: ['#6c6a66', '#efeeea'],
    cleaned: ['#1f6a47', '#e6f1ea'],
    invited: ['#1f3c88', '#eef1fa'],
  };
  const [color, background] = map[kind] ?? map.update;
  return { color, background };
}

export const badgeBase: CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  padding: '4px 9px',
  borderRadius: 20,
};
