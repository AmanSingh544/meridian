import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTicketsQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, usePagination } from '@3sc/hooks';
import {
  Button, DataTable, SearchInput, StatusBadge, PriorityBadge,
  SLABadge, Pagination, Select, EmptyState, ErrorState,
} from '@3sc/ui';
import { Ticket, TicketFilters, TicketStatus, TicketPriority } from '@3sc/types';
import { formatRelativeTime, truncate } from '@3sc/utils';

export const TicketListPage: React.FC = () => {
  useDocumentTitle('Tickets');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: TicketFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter ? [statusFilter as TicketStatus] : undefined,
    priority: priorityFilter ? [priorityFilter as TicketPriority] : undefined,
    sortBy,
    sortOrder,
    page,
    page_size: 20,
  }), [debouncedSearch, statusFilter, priorityFilter, sortBy, sortOrder, page]);

  const { data, isLoading, error, refetch } = useGetTicketsQuery(filters);

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
      key: 'ticketNumber',
      header: 'Ticket',
      width: '7rem',
      sortable: true,
      render: (t: Ticket) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-brand-600)' }}>
          {"TCK- " + t.id}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Subject',
      sortable: true,
      render: (t: Ticket) => (
        <span style={{ fontWeight: 500 }}>{truncate(t.title, 60)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '8rem',
      render: (t: Ticket) => <StatusBadge status={t.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '6rem',
      render: (t: Ticket) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'sla',
      header: 'SLA',
      width: '7rem',
      render: (t: Ticket) =>
        t.sla ? <SLABadge state={t.sla.resolutionState} /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      key: 'updated_at',
      header: 'Updated',
      width: '8rem',
      sortable: true,
      render: (t: Ticket) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {formatRelativeTime(t.updated_at)}
        </span>
      ),
    },
  ];

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Tickets
        </h1>
        <Button onClick={() => navigate('/tickets/new')} icon={<span>+</span>}>
          New Ticket
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1rem',
        flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, minWidth: '12rem' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tickets..."
          />
        </div>
        <div style={{ width: '10rem' }}>
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: TicketStatus.OPEN, label: 'Open' },
              { value: TicketStatus.ACKNOWLEDGED, label: 'Acknowledged' },
              { value: TicketStatus.IN_PROGRESS, label: 'In Progress' },
              { value: TicketStatus.RESOLVED, label: 'Resolved' },
              { value: TicketStatus.CLOSED, label: 'Closed' },
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ width: '9rem' }}>
          <Select
            options={[
              { value: '', label: 'All Priorities' },
              { value: TicketPriority.LOW, label: 'Low' },
              { value: TicketPriority.MEDIUM, label: 'Medium' },
              { value: TicketPriority.HIGH, label: 'High' },
              { value: TicketPriority.CRITICAL, label: 'Critical' },
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
        <Pagination
          page={data.page}
          total_pages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};
