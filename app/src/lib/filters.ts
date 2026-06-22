import type { Visitor } from '../types';

// Distinct, sorted, non-empty values of a visitor field — used to populate the
// Country / Source / Category filter dropdowns from the loaded data.
export function distinctValues(visitors: Visitor[], pick: (v: Visitor) => string): string[] {
  return Array.from(new Set(visitors.map((v) => pick(v).trim()).filter(Boolean))).sort();
}
