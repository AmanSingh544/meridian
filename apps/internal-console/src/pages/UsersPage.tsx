import React, { useState } from 'react';
import { useGetUsersQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue } from '@3sc/hooks';
import { DataTable, SearchInput, Select, Avatar, Badge, Pagination, Button, EmptyState } from '@3sc/ui';
import type { User } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

export const UsersPage: React.FC = () => {
  useDocumentTitle('Users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useGetUsersQuery({
    page,
    role: roleFilter || undefined,
    search: debouncedSearch || undefined,
  });

  const roleColors: Record<string, string> = {
    admin: '#ef4444',
    lead: '#8b5cf6',
    agent: '#3b82f6',
    customer_admin: '#f59e0b',
    customer_user: '#6b7280',
  };

  const columns = [
    {
      key: 'name', header: 'User', width: '16rem',
      render: (u: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{u.displayName}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role', width: '8rem',
      render: (u: User) => (
        <Badge
          color={roleColors[u.role] || '#6b7280'}
          bgColor={`${roleColors[u.role] || '#6b7280'}18`}
        >
          {u.role.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Status', width: '6rem',
      render: (u: User) => (
        <Badge
          color={u.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={u.isActive ? 'var(--color-success-light)' : 'var(--color-bg-muted)'}
        >
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Login', width: '10rem',
      render: (u: User) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Users
        </h1>
        <Button icon={<span>+</span>}>Add User</Button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
        <div style={{ width: '10rem' }}>
          <Select
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'lead', label: 'Lead' },
              { value: 'agent', label: 'Agent' },
              { value: 'customer_admin', label: 'Customer Admin' },
              { value: 'customer_user', label: 'Customer User' },
            ]}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        emptyMessage="No users found"
      />

      {data && (
        <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
};
