import React, { useState } from 'react';
import { useGetAuditLogsQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import {
  Card, Skeleton, EmptyState, ErrorState, SearchInput, Badge, Pagination, Icon,
} from '@3sc/ui';
import { ClipboardList } from 'lucide-react';
import type { AuditLogEntry } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

// ── Mock data — replace with live API when ready ──────────────────
const auditMock = {
  data: [
    {
      id: 'al001',
      action: 'ticket.created',
      resourceType: 'ticket',
      resourceId: 't001',
      userId: 'u001',
      userName: 'Alice Johnson',
      organizationId: 'org001',
      changes: undefined,
      metadata: { ticketNumber: 'TK-0042' },
      ipAddress: '192.168.1.10',
      created_at: '2026-04-13T09:15:00Z',
    },
    {
      id: 'al002',
      action: 'ticket.status_changed',
      resourceType: 'ticket',
      resourceId: 't001',
      userId: 'u002',
      userName: 'Bob Smith',
      organizationId: 'org001',
      changes: { status: { from: 'OPEN', to: 'IN_PROGRESS' } },
      metadata: { ticketNumber: 'TK-0042' },
      ipAddress: '10.0.0.5',
      created_at: '2026-04-13T10:30:00Z',
    },
    {
      id: 'al003',
      action: 'user.role_changed',
      resourceType: 'user',
      resourceId: 'u003',
      userId: 'u001',
      userName: 'Alice Johnson',
      organizationId: 'org001',
      changes: { role: { from: 'customer_user', to: 'customer_admin' } },
      metadata: {},
      ipAddress: '192.168.1.10',
      created_at: '2026-04-12T14:00:00Z',
    },
    {
      id: 'al004',
      action: 'comment.created',
      resourceType: 'comment',
      resourceId: 'c001',
      userId: 'u002',
      userName: 'Bob Smith',
      organizationId: 'org001',
      changes: undefined,
      metadata: { ticketNumber: 'TK-0041', isInternal: false },
      ipAddress: '10.0.0.5',
      created_at: '2026-04-12T11:20:00Z',
    },
    {
      id: 'al005',
      action: 'organization.settings_updated',
      resourceType: 'organization',
      resourceId: 'org001',
      userId: 'u001',
      userName: 'Alice Johnson',
      organizationId: 'org001',
      changes: { name: { from: 'ACME Corp', to: 'Acme Corporation' } },
      metadata: {},
      ipAddress: '192.168.1.10',
      created_at: '2026-04-11T16:45:00Z',
    },
    {
      id: 'al006',
      action: 'ticket.closed',
      resourceType: 'ticket',
      resourceId: 't005',
      userId: 'u004',
      userName: 'Dan Lee',
      organizationId: 'org001',
      changes: { status: { from: 'RESOLVED', to: 'CLOSED' } },
      metadata: { ticketNumber: 'TK-0038' },
      ipAddress: '172.16.0.3',
      created_at: '2026-04-11T09:05:00Z',
    },
  ] as AuditLogEntry[],
  total: 6,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const actionColorMap: Record<string, { color: string; bg: string }> = {
  created: { color: '#15803d', bg: '#dcfce7' },
  updated: { color: '#1d4ed8', bg: '#dbeafe' },
  settings_updated: { color: '#1d4ed8', bg: '#dbeafe' },
  status_changed: { color: '#b45309', bg: '#fef3c7' },
  role_changed: { color: '#7c3aed', bg: '#ede9fe' },
  closed: { color: '#6b7280', bg: '#f3f4f6' },
  deleted: { color: '#dc2626', bg: '#fee2e2' },
};

function getActionStyle(action: string): { color: string; bg: string } {
  const suffix = action.split('.').pop() ?? '';
  return actionColorMap[suffix] ?? { color: '#374151', bg: '#f3f4f6' };
}

function formatAction(action: string): string {
  return action.replace(/\./g, ' › ').replace(/_/g, ' ');
}

export const AuditLogPage: React.FC = () => {
  useDocumentTitle('Audit Log');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

   const { data, isLoading, error, refetch } = useGetAuditLogsQuery({ page, page_size: 20 });
  const filtered = (data?.data ?? []).filter((entry) => {
    const q = search.toLowerCase();
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.userName.toLowerCase().includes(q) ||
      entry.resourceType.toLowerCase().includes(q) ||
      entry.resourceId.toLowerCase().includes(q)
    );
  });

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Audit Log
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Track all actions taken within your organization
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by action, user, or resource..."
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="4rem" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Icon icon={ClipboardList} size="xl" />} title="No audit entries found" description="Try adjusting your search." />
      ) : (
        <Card padding="0">
          {filtered.map((entry, idx) => {
            const { color, bg } = getActionStyle(entry.action);
            return (
              <div
                key={entry.id}
                style={{
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: '0.375rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <Badge color={color} bgColor={bg}>
                      {formatAction(entry.action)}
                    </Badge>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                      {entry.userName}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      on <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {entry.resourceType}/{entry.resourceId}
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                    <span>{formatDateTime(entry.created_at)}</span>
                  </div>
                </div>

                {/* Changes diff */}
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                  }}>
                    {Object.entries(entry.changes).map(([field, change]) => {
                      const c = change as { from: unknown; to: unknown };
                      return (
                        <span key={field} style={{ color: 'var(--color-text-secondary)' }}>
                          <strong>{field}:</strong>{' '}
                          <span style={{ color: 'var(--color-danger)', textDecoration: 'line-through' }}>
                            {String(c.from)}
                          </span>
                          {' → '}
                          <span style={{ color: 'var(--color-success)' }}>
                            {String(c.to)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* Pagination */}
      {(data?.total_pages ?? 1) > 1 && (
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            page={page}
            total_pages={data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
