import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Icon } from './Icon';
import { Card } from './Card';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

let _tableStylesInjected = false;

function injectTableStyles() {
  if (_tableStylesInjected || typeof document === 'undefined') return;

  _tableStylesInjected = true;

  const el = document.createElement('style');
  el.id = '__datatable-styles';

  el.textContent = `
    .__datatable-wrapper {
      overflow-x: auto;
      background: var(--color-bg);
    }

    .__datatable {
      width: max-content;
      min-width: 100%;
}

    .__datatable-head th {
      position: sticky;
      top: 0;
      z-index: 2;

      padding: 0.875rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;

      color: var(--color-text-secondary);
      background:
        color-mix(in srgb, var(--color-bg-subtle) 92%, transparent);

      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
      user-select: none;

      backdrop-filter: blur(10px);

      transition:
        background 180ms ease,
        color 180ms ease;
    }

    .__datatable-head th.sortable {
      cursor: pointer;
    }

    .__datatable-head th.sortable:hover {
      color: var(--color-text);
      background:
        color-mix(in srgb, var(--color-brand-500) 5%, var(--color-bg-subtle));
    }

    .__datatable-row {
      transition:
        background 180ms cubic-bezier(0.4,0,0.2,1),
        transform 180ms cubic-bezier(0.4,0,0.2,1),
        box-shadow 180ms cubic-bezier(0.4,0,0.2,1);
      position: relative;
    }

    .__datatable-row:nth-child(even) {
      background:
        color-mix(in srgb, var(--color-bg-subtle) 35%, transparent);
    }

    .__datatable-row--interactive {
      cursor: pointer;
    }

    .__datatable-row--interactive:hover {
      background:
        linear-gradient(
          to right,
          color-mix(in srgb, var(--color-brand-500) 5%, transparent),
          transparent
        );

      box-shadow:
        inset 3px 0 0 var(--color-brand-500);

      transform: translateX(2px);
    }

    .__datatable-row--interactive:active {
      transform: translateX(1px) scale(0.998);
    }

    .__datatable-cell {
      padding: 0.875rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      vertical-align: middle;

      white-space: nowrap;
      transition:
        color 160ms ease,
        background 160ms ease;
    }

    .__datatable-row:hover .__datatable-cell {
      color: var(--color-text);
    }

    .__datatable-empty {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-muted);
    }

    .__datatable-skeleton {
      height: 1rem;
      background: var(--color-bg-muted);
      border-radius: var(--radius-sm);
      animation: __datatable-pulse 1.5s ease-in-out infinite;
    }

    .__datatable-sort-icon {
      margin-left: 0.25rem;
      display: inline-flex;
      vertical-align: middle;
      transition: transform 180ms ease;
    }

    @keyframes __datatable-pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .__datatable-row,
      .__datatable-cell,
      .__datatable-head th,
      .__datatable-sort-icon {
        transition: none !important;
        animation: none !important;
        transform: none !important;
      }
    }
  `;

  document.head.appendChild(el);
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  loading,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  if (typeof document !== 'undefined') {
    injectTableStyles();
  }

  return (
    <Card
      padding="0"
      hover={false}
      style={{
        overflow: 'hidden',
      }}
    >
      <div className="__datatable-wrapper">
        <table className="__datatable">
          <thead className="__datatable-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {col.header}

                    {col.sortable && sortBy === col.key && (
                      <span
                        className="__datatable-sort-icon"
                        style={{
                          transform:
                            sortOrder === 'asc'
                              ? 'rotate(0deg)'
                              : 'rotate(180deg)',
                        }}
                      >
                        <Icon
                          icon={ChevronUp}
                          size="sm"
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="__datatable-cell"
                    >
                      <div className="__datatable-skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="__datatable-cell __datatable-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`__datatable-row ${onRowClick
                      ? '__datatable-row--interactive'
                      : ''
                    }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="__datatable-cell"
                    >
                      {col.render
                        ? col.render(item)
                        : String(
                          (item as Record<string, unknown>)[
                          col.key
                          ] ?? ''
                        )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}