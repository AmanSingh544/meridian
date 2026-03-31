import React, { useState } from 'react';
import { useGetOrganizationsQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { DataTable, Pagination, Badge, Avatar } from '@3sc/ui';
import type { Organization } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

export const OrganizationsPage: React.FC = () => {
  useDocumentTitle('Organizations');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetOrganizationsQuery({ page });

  const columns = [
    {
      key: 'name', header: 'Organization', width: '18rem',
      render: (o: Organization) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={o.name} size={30} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{o.slug}</div>
          </div>
        </div>
      ),
    },
    { key: 'domain', header: 'Domain', width: '12rem',
      render: (o: Organization) => <span style={{ fontSize: '0.8125rem' }}>{o.domain || '—'}</span>,
    },
    { key: 'plan', header: 'Plan', width: '6rem',
      render: (o: Organization) => o.plan ? <Badge>{o.plan}</Badge> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    { key: 'status', header: 'Status', width: '6rem',
      render: (o: Organization) => (
        <Badge
          color={o.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={o.isActive ? 'var(--color-success-light)' : 'var(--color-bg-muted)'}
        >{o.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    { key: 'createdAt', header: 'Created', width: '10rem',
      render: (o: Organization) => <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatDateTime(o.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        Organizations
      </h1>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        emptyMessage="No organizations found"
      />
      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />}
    </div>
  );
};
