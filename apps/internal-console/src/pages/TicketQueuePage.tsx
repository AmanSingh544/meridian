import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTicketsQuery, useGetUsersQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, useSession, usePermissions } from '@3sc/hooks';
import {
  Button, DataTable, SearchInput, StatusBadge, PriorityBadge,
  SLABadge, Pagination, Select, Avatar, Badge, Tabs,
} from '@3sc/ui';
import type { Ticket, TicketFilters, TicketStatus, TicketPriority } from '@3sc/types';
import { formatRelativeTime, truncate } from '@3sc/utils';

export const TicketQueuePage: React.FC = () => {
  useDocumentTitle('Ticket Queue');
  const navigate = useNavigate();
  const session = useSession();
  const permissions = usePermissions();

  const [view, setView] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: TicketFilters = useMemo(() => ({
    search:     debouncedSearch || undefined,
    status:     statusFilter   ? [statusFilter   as TicketStatus]   : undefined,
    priority:   priorityFilter ? [priorityFilter as TicketPriority] : undefined,
    // 'mine' — filter by current user; 'unassigned' — assignedTo=null sentinel handled by API
    assignedTo: view === 'mine'       ? session?.userId : undefined,
    unassigned: view === 'unassigned' ? true            : undefined,
    sortBy,
    sortOrder,
    page,
    page_size: 25,
  }), [debouncedSearch, statusFilter, priorityFilter, sortBy, sortOrder, page, view, session?.userId]);

  const { data, isLoading } = useGetTicketsQuery(filters);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const columns = [
    {
      key: 'ticketNumber', header: '#', width: '6rem', sortable: true,
      render: (t: Ticket) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-brand-600)' }}>
          {t.ticketNumber}
        </span>
      ),
    },
    {
      key: 'priority', header: 'P', width: '4rem',
      render: (t: Ticket) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'title', header: 'Subject', sortable: true,
      render: (t: Ticket) => (
        <div>
          <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{truncate(t.title, 55)}</span>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.125rem' }}>
            {t.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: '0.625rem', padding: '0 0.375rem',
                background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-full)',
                color: 'var(--color-text-muted)',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: '7.5rem',
      render: (t: Ticket) => <StatusBadge status={t.status} />,
    },
    {
      key: 'sla', header: 'SLA', width: '6rem',
      render: (t: Ticket) =>
        t.sla ? <SLABadge state={t.sla.resolutionState} /> :
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>,
    },
    {
      key: 'assignee', header: 'Assignee', width: '8rem',
      render: (t: Ticket) => t.assignee ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Avatar name={t.assignee.displayName} size={20} />
          <span style={{ fontSize: '0.75rem' }}>{t.assignee.displayName.split(' ')[0]}</span>
        </div>
      ) : (
        <Badge color="var(--color-warning)" bgColor="var(--color-warning-light)">Unassigned</Badge>
      ),
    },
    {
      key: 'creator', header: 'Reporter', width: '7rem',
      render: (t: Ticket) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {t.creator?.displayName?.split(' ')[0] || '—'}
        </span>
      ),
    },
    {
      key: 'updated_at', header: 'Updated', width: '6rem', sortable: true,
      render: (t: Ticket) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {formatRelativeTime(t.updated_at)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Ticket Queue
        </h1>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          {data?.total ?? 0} tickets
        </span>
      </div>

      {/* View toggle */}
      <Tabs
        tabs={[
          { key: 'all', label: 'All Tickets' },
          { key: 'mine', label: 'My Queue' },
          { key: 'unassigned', label: 'Unassigned' },
        ]}
        activeTab={view}
        onChange={(v) => { setView(v as 'all' | 'mine' | 'unassigned'); setPage(1); }}
      />

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '0.625rem', marginBottom: '0.875rem',
        flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, minWidth: '12rem' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search tickets..." />
        </div>
        <div style={{ width: '9rem' }}>
          <Select
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ width: '8rem' }}>
          <Select
            options={[
              { value: '', label: 'All Priority' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(t) => t.id}
        onRowClick={(t) => navigate(`/tickets/${t.id}`)}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No tickets match your filters"
      />

      {data && (
        <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
};
