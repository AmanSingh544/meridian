import React, { useState } from 'react';
import { useGetAuditLogsQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { DataTable, Pagination, Select, Card, Badge } from '@3sc/ui';
import type { AuditLogEntry } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

export const AuditLogPage: React.FC = () => {
  useDocumentTitle('Audit Log');
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState('');

  const { data, isLoading } = useGetAuditLogsQuery({
    page,
    page_size: 20,
    resourceType: resourceType || undefined,
  });

  const columns = [
    {
      key: 'timestamp', header: 'Timestamp', width: '11rem',
      render: (e: AuditLogEntry) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          {formatDateTime(e.created_at)}
        </span>
      ),
    },
    {
      key: 'user', header: 'User', width: '10rem',
      render: (e: AuditLogEntry) => (
        <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{e.userName}</span>
      ),
    },
    {
      key: 'action', header: 'Action', width: '8rem',
      render: (e: AuditLogEntry) => <Badge>{e.action}</Badge>,
    },
    {
      key: 'resource', header: 'Resource', width: '8rem',
      render: (e: AuditLogEntry) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {e.resourceType}
        </span>
      ),
    },
    {
      key: 'changes', header: 'Changes',
      render: (e: AuditLogEntry) => (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {e.changes
            ? Object.entries(e.changes)
                .slice(0, 2)
                .map(([key, val]) => {
                  // Backend stores either raw values or { from, to } diffs
                  if (val && typeof val === 'object' && 'from' in val && 'to' in val) {
                    return `${key}: ${String(val.from)} → ${String(val.to)}`;
                  }
                  return `${key}: ${JSON.stringify(val)}`;
                })
                .join(', ')
            : '—'}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Audit Log
        </h1>
        <div style={{ width: '10rem' }}>
          <Select
            options={[
              { value: '', label: 'All Resources' },
              { value: 'ticket', label: 'Tickets' },
              { value: 'user', label: 'Users' },
              { value: 'organization', label: 'Organizations' },
              { value: 'routing_rule', label: 'Routing Rules' },
            ]}
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(e) => e.id}
        loading={isLoading}
        emptyMessage="No audit log entries"
      />

      {data && (
        <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
};
