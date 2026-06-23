import { useEffect, useRef, useState } from 'react';
import * as api from '../lib/api';
import type { Visitor } from '../types';

export const VISITOR_PAGE_SIZE = 50;

export interface VisitorPageFilters {
  subEventIds?: string[] | null; // null = all (no event filter); [] = none
  status?: string;
  consent?: string;
  country?: string;
  source?: string;
  category?: string;
  cleaned?: boolean | null;
  invite?: string;
  search?: string;
}

export interface VisitorPage {
  rows: Visitor[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  loading: boolean;
  setPage: (p: number) => void;
}

// Server-side paginated/filtered visitor list. Fetches one page at a time so
// the browser never holds the whole dataset — this is what lets the app scale
// past 100k records. Search is debounced; any filter change resets to page 1.
// `refreshKey` lets the owner force a re-fetch after a mutation.
export function useVisitorPage(filters: VisitorPageFilters, refreshKey: number): VisitorPage {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce the free-text search so each keystroke isn't a query.
  const [debounced, setDebounced] = useState(filters.search ?? '');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters.search ?? ''), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // A stable string key over everything that affects the result set.
  const key = JSON.stringify({
    s: filters.subEventIds ?? null,
    st: filters.status ?? '',
    cs: filters.consent ?? '',
    co: filters.country ?? '',
    so: filters.source ?? '',
    ca: filters.category ?? '',
    cl: filters.cleaned ?? null,
    inv: filters.invite ?? '',
    q: debounced,
  });

  // Reset to page 1 whenever the filters/search change (reset during render).
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setPage(1);
  }

  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.fetchVisitorsPage({
          subEventIds: filters.subEventIds ?? null,
          status: filters.status || undefined,
          consent: filters.consent || undefined,
          country: filters.country || undefined,
          source: filters.source || undefined,
          category: filters.category || undefined,
          cleaned: filters.cleaned ?? null,
          invite: filters.invite || undefined,
          search: debounced,
          page,
          pageSize: VISITOR_PAGE_SIZE,
        });
        if (id !== reqId.current) return; // ignore stale responses
        setRows(res.rows);
        setTotal(res.total);
      } catch {
        if (id !== reqId.current) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    };
    run();
    // key encodes every filter input; page/refreshKey trigger explicit reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / VISITOR_PAGE_SIZE));
  return { rows, total, page: Math.min(page, pageCount), pageCount, pageSize: VISITOR_PAGE_SIZE, loading, setPage };
}
