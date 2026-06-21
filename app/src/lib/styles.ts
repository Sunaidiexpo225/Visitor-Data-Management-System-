import type { ActivityKind, ConsentStatus, VisitorStatus } from '../types';
import type { CSSProperties } from 'react';

export function statusStyle(s: VisitorStatus): CSSProperties {
  const map: Record<VisitorStatus, [string, string]> = {
    Category: ['#1f6a47', '#e6f1ea'],
    Engaged: ['#b07a1e', '#f6efe0'],
    'Pre-registered': ['#1f3c88', '#eef1fa'],
    Pending: ['#6c6a66', '#efeeea'],
  };
  const [color, background] = map[s] ?? map.Pending;
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
