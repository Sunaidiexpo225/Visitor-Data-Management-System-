import { useEffect, useRef, useState } from 'react';
import * as api from '../lib/api';
import type { Person } from '../lib/api';

export const PEOPLE_PAGE_SIZE = 50;

export interface PeoplePage {
  rows: Person[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  loading: boolean;
  setPage: (p: number) => void;
}

// Server-side paginated/searched list of distinct people (people_overview view).
// Search is debounced; a search change resets to page 1; refreshKey forces a
// reload after a mutation elsewhere in the app.
export function usePeoplePage(search: string, returningOnly: boolean, refreshKey: number): PeoplePage {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when the search text or the returning-only filter changes.
  const key = `${returningOnly ? 1 : 0}|${debounced}`;
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
        const res = await api.fetchPeoplePage({ search: debounced, returningOnly, page, pageSize: PEOPLE_PAGE_SIZE });
        if (id !== reqId.current) return;
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
  }, [debounced, returningOnly, page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / PEOPLE_PAGE_SIZE));
  return { rows, total, page: Math.min(page, pageCount), pageCount, pageSize: PEOPLE_PAGE_SIZE, loading, setPage };
}
