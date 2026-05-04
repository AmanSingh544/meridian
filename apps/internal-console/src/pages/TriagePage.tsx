import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTicketsQuery,
  useGetUsersQuery,
  useUpdateTicketMutation,
  useBulkUpdateTicketsMutation,
  useGetAIClassificationQuery,
  useGetAIPriorityQuery,
  useGetAssignSuggestionsQuery,
  useGetSystemSettingsQuery,
} from '@3sc/api';
import {
  useDocumentTitle,
  useDebouncedValue,
  useSession,
} from '@3sc/hooks';
import { useToast } from '@3sc/ui';
import {
  Button,
  Card,
  Select,
  Badge,
  Avatar,
  PriorityBadge,
  StatusBadge,
  SLABadge,
  Skeleton,
  SkeletonCard,
  SearchInput,
  Pagination,
} from '@3sc/ui';
import type {
  Ticket,
  TicketPriority,
  TicketCategory,
  TicketStatus,
  User,
  AgentAssignSuggestion,
} from '@3sc/types';
import { TicketPriority as TicketPriorityEnum, TicketCategory as TicketCategoryEnum, TicketStatus as TicketStatusEnum } from '@3sc/types';
import { formatRelativeTime, truncate } from '@3sc/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITIES: TicketPriority[] = [
  TicketPriorityEnum.LOW,
  TicketPriorityEnum.MEDIUM,
  TicketPriorityEnum.HIGH,
  TicketPriorityEnum.CRITICAL,
];

const CATEGORIES: TicketCategory[] = [
  TicketCategoryEnum.SUPPORT,
  TicketCategoryEnum.BUG,
  TicketCategoryEnum.FEATURE_REQUEST,
  TicketCategoryEnum.BILLING,
  TicketCategoryEnum.QUESTION,
  TicketCategoryEnum.INCIDENT,
  TicketCategoryEnum.TASK,
];

const STATUSES: TicketStatus[] = [
  TicketStatusEnum.OPEN,
  TicketStatusEnum.ACKNOWLEDGED,
  TicketStatusEnum.IN_PROGRESS,
  TicketStatusEnum.RESOLVED,
  TicketStatusEnum.CLOSED,
];

const PRIORITY_OPTIONS = [
  { value: '', label: '—' },
  ...PRIORITIES.map((p) => ({ value: p, label: p.replace('_', ' ') })),
];

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  ...CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') })),
];

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

interface TicketAIInsightsProps {
  ticketId: string;
  enabled: boolean;
  onAccept: (updates: { priority?: TicketPriority; category?: TicketCategory; assignedTo?: string }) => void;
}

const TicketAIInsights: React.FC<TicketAIInsightsProps> = ({ ticketId, enabled, onAccept }) => {
  const [expanded, setExpanded] = useState(false);

  const { data: classification, isLoading: classLoading } = useGetAIClassificationQuery(ticketId, {
    skip: !enabled || !expanded,
  });
  const { data: priority, isLoading: prioLoading } = useGetAIPriorityQuery(ticketId, {
    skip: !enabled || !expanded,
  });
  const { data: assignSuggestions, isLoading: assignLoading } = useGetAssignSuggestionsQuery(ticketId, {
    skip: !enabled || !expanded,
  });

  if (!enabled) return null;

  const topAgent = assignSuggestions?.[0];
  const suggestedCategory = classification?.suggestion?.category;
  const suggestedPriority = priority?.suggestion?.priority;

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border)' }}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: 'var(--color-brand-600)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span>✨</span> Show AI suggestions
        </button>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-brand-600)' }}>✨ AI Suggestions</span>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
            >
              Hide
            </button>
          </div>

          {classLoading || prioLoading || assignLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton width="80%" height="0.75rem" />
              <Skeleton width="60%" height="0.75rem" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {suggestedCategory && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Category: <strong>{suggestedCategory.replace('_', ' ')}</strong>
                  {classification?.confidence && (
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                      ({Math.round(classification.confidence * 100)}%)
                    </span>
                  )}
                </div>
              )}
              {suggestedPriority && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Priority: <strong>{suggestedPriority.replace('_', ' ')}</strong>
                  {priority?.confidence && (
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                      ({Math.round(priority.confidence * 100)}%)
                    </span>
                  )}
                </div>
              )}
              {topAgent && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Assign to:
                  <Avatar name={topAgent.agentName || 'Agent'} size={16} />
                  <strong>{topAgent.agentName}</strong>
                  {topAgent.score && (
                    <span style={{ color: 'var(--color-text-muted)' }}>({Math.round(topAgent.score * 100)}%)</span>
                  )}
                </div>
              )}

              {(suggestedCategory || suggestedPriority || topAgent) && (
                <div style={{ marginTop: '0.25rem' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onAccept({
                        category: suggestedCategory,
                        priority: suggestedPriority,
                        assignedTo: topAgent?.agentId,
                      });
                    }}
                  >
                    Accept All Suggestions
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Triage Card
// ═══════════════════════════════════════════════════════════════════════════════

interface TriageCardProps {
  ticket: Ticket;
  agents: User[];
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onUpdate: (id: string, payload: any) => void;
  aiEnabled: boolean;
}

const TriageCard: React.FC<TriageCardProps> = ({ ticket, agents, selected, onSelect, onUpdate, aiEnabled }) => {
  const navigate = useNavigate();

  const agentOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...agents.map((a) => ({
        value: a.id,
        label: `${a.displayName || a.email} (${a.role.replace('_', ' ')})`,
      })),
    ],
    [agents],
  );

  return (
    <Card
      style={{
        position: 'relative',
        opacity: selected ? 1 : undefined,
        borderColor: selected ? 'var(--color-brand-400)' : undefined,
        boxShadow: selected ? '0 0 0 2px var(--color-brand-200)' : undefined,
      }}
    >
      {/* Checkbox */}
      <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(ticket.id, e.target.checked)}
          style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
        />
      </div>

      {/* Priority badge */}
      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        <PriorityBadge priority={ticket.priority} />
      </div>

      <div style={{ paddingLeft: '1.5rem', paddingTop: '0.25rem' }}>
        {/* Ticket number + title */}
        <div
          onClick={() => navigate(`/tickets/${ticket.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-brand-600)', marginBottom: '0.25rem' }}>
            {ticket.ticketNumber}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3, marginBottom: '0.5rem' }}>
            {truncate(ticket.title, 80)}
          </div>
        </div>

        {/* Description snippet */}
        {ticket.description && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginBottom: '0.625rem' }}>
            {truncate(ticket.description, 140)}
          </div>
        )}

        {/* Meta row: reporter + created */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Avatar name={ticket.creator?.displayName || 'Unknown'} size={20} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {ticket.creator?.displayName?.split(' ')[0] || '—'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formatRelativeTime(ticket.created_at)}
          </span>
          {ticket.sla && (
            <SLABadge state={ticket.sla.resolutionState} />
          )}
          <StatusBadge status={ticket.status} />
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <div style={{ minWidth: '7rem', flex: 1 }}>
            <Select
              placeholder="Assign to…"
              options={agentOptions}
              value={ticket.assignedTo || ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate(ticket.id, { assignedTo: val || undefined });
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            />
          </div>
          <div style={{ width: '6.5rem' }}>
            <Select
              placeholder="Priority"
              options={PRIORITY_OPTIONS}
              value={ticket.priority}
              onChange={(e) => {
                onUpdate(ticket.id, { priority: e.target.value as TicketPriority });
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            />
          </div>
          <div style={{ width: '7.5rem' }}>
            <Select
              placeholder="Category"
              options={CATEGORY_OPTIONS}
              value={ticket.category || ''}
              onChange={(e) => {
                onUpdate(ticket.id, { category: e.target.value as TicketCategory || undefined });
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            />
          </div>
        </div>

        {/* AI insights */}
        <TicketAIInsights
          ticketId={ticket.id}
          enabled={aiEnabled}
          onAccept={(updates) => {
            onUpdate(ticket.id, updates);
          }}
        />
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export const TriagePage: React.FC = () => {
  useDocumentTitle('Triage');
  const { toast } = useToast();
  const session = useSession();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: systemSettings } = useGetSystemSettingsQuery();
  const triageEnabled = systemSettings?.aiFeatures?.triageAgentEnabled ?? true;

  const filters = useMemo(
    () => ({
      unassigned: true as const,
      status: statusFilter ? [statusFilter] : ([TicketStatusEnum.OPEN, TicketStatusEnum.ACKNOWLEDGED] as TicketStatus[]),
      search: debouncedSearch || undefined,
      page,
      page_size: 12,
      sortBy: 'created_at',
      sortOrder: 'asc' as const,
    }),
    [debouncedSearch, page, statusFilter],
  );

  const { data: ticketsData, isLoading: ticketsLoading } = useGetTicketsQuery(filters);
  const { data: agentsData } = useGetUsersQuery({ page: 1, role: 'AGENT' });
  const [updateTicket, { isLoading: updating }] = useUpdateTicketMutation();
  const [bulkUpdate, { isLoading: bulkUpdating }] = useBulkUpdateTicketsMutation();

  const agents = agentsData?.data ?? [];
  const tickets = ticketsData?.data ?? [];
  const total = ticketsData?.total ?? 0;

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }, [selectedIds.size, tickets]);

  const handleUpdateSingle = useCallback(
    async (id: string, payload: any) => {
      try {
        await updateTicket({ id, payload }).unwrap();
        toast('Ticket updated', 'success');
      } catch {
        toast('Update failed', 'error');
      }
    },
    [updateTicket, toast],
  );

  const handleBulkUpdate = useCallback(
    async (updates: any) => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      try {
        const result = await bulkUpdate({ ticket_ids: ids, updates }).unwrap();
        setSelectedIds(new Set());
        toast(`${result.updated} tickets updated`, 'success');
      } catch {
        toast('Bulk update failed', 'error');
      }
    },
    [selectedIds, bulkUpdate, toast],
  );

  const isLoading = ticketsLoading || updating || bulkUpdating;

  return (
    <div style={{ position: 'relative', paddingBottom: selectedIds.size > 0 ? '5rem' : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Triage
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Review and assign unassigned tickets
          </p>
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          {total} ticket{total !== 1 ? 's' : ''} need{total === 1 ? 's' : ''} triage
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '12rem' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
        </div>
        <div style={{ width: '9rem' }}>
          <Select
            label="Status"
            options={[
              { value: '', label: 'Open + Acknowledged' },
              ...STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') })),
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as TicketStatus || ''); setPage(1); }}
          />
        </div>
      </div>

      {/* Select all + count */}
      {tickets.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedIds.size === tickets.length && tickets.length > 0}
              onChange={handleSelectAll}
              style={{ cursor: 'pointer' }}
            />
            Select all ({selectedIds.size} selected)
          </label>
        </div>
      )}

      {/* Ticket grid */}
      {isLoading && tickets.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Triage complete!
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            No unassigned tickets need your attention right now.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
            {tickets.map((ticket) => (
              <TriageCard
                key={ticket.id}
                ticket={ticket}
                agents={agents}
                selected={selectedIds.has(ticket.id)}
                onSelect={handleSelect}
                onUpdate={handleUpdateSingle}
                aiEnabled={triageEnabled}
              />
            ))}
          </div>

          {ticketsData && (
            <div style={{ marginTop: '1.5rem' }}>
              <Pagination
                page={ticketsData.page}
                total_pages={ticketsData.total_pages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            maxWidth: '90vw',
          }}
        >
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: '1px', height: '1.25rem', background: 'var(--color-border)' }} />
          <div style={{ width: '10rem' }}>
            <Select
              placeholder="Assign to…"
              options={[
                { value: '', label: '—' },
                ...agents.map((a) => ({ value: a.id, label: a.displayName || a.email })),
              ]}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleBulkUpdate({ assignedTo: val });
              }}
              style={{ fontSize: '0.75rem' }}
            />
          </div>
          <div style={{ width: '7rem' }}>
            <Select
              placeholder="Priority"
              options={PRIORITY_OPTIONS}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleBulkUpdate({ priority: val as TicketPriority });
              }}
              style={{ fontSize: '0.75rem' }}
            />
          </div>
          <div style={{ width: '8rem' }}>
            <Select
              placeholder="Category"
              options={CATEGORY_OPTIONS}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleBulkUpdate({ category: val as TicketCategory });
              }}
              style={{ fontSize: '0.75rem' }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
