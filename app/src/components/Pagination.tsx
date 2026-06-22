interface Props {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, pageCount, total, pageSize, onPage }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: '#7a7873', flexWrap: 'wrap', gap: 8 }}>
      <span>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="vdm-btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ opacity: page <= 1 ? 0.5 : 1 }}>
          ‹ Prev
        </button>
        <span>Page {page} of {pageCount}</span>
        <button type="button" className="vdm-btn-ghost" disabled={page >= pageCount} onClick={() => onPage(page + 1)} style={{ opacity: page >= pageCount ? 0.5 : 1 }}>
          Next ›
        </button>
      </div>
    </div>
  );
}
