import React from 'react';

export interface PaginationProps {
  page: number;
  total_pages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, total_pages, onPageChange }) => {
  if (total_pages <= 0) return null;
  const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-body)',
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-brand-600)' : 'var(--color-bg)',
    color: active ? '#fff' : 'var(--color-text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  });

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= total_pages; i++) {
    if (i === 1 || i === total_pages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.5rem' }}>
      <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onPageChange(page - 1)}>←</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e-${i}`} style={{ padding: '0 0.25rem', color: 'var(--color-text-muted)' }}>…</span>
        ) : (
          <button key={p} style={btnStyle(p === page, false)} onClick={() => onPageChange(p as number)}>{p}</button>
        )
      )}
      <button style={btnStyle(false, page === total_pages)} disabled={page === total_pages} onClick={() => onPageChange(page + 1)}>→</button>
    </div>
  );
};
