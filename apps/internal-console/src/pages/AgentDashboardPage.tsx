import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardQuery, useGetTicketsQuery } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  MetricCard, Card, StatusBadge, PriorityBadge, SLABadge,
  Button, Skeleton, SkeletonCard, ErrorState,
} from '@3sc/ui';
import { TicketStatus, SLAState } from '@3sc/types';
import { formatRelativeTime } from '@3sc/utils';

export const AgentDashboardPage: React.FC = () => {
  useDocumentTitle('Dashboard');
  const session = useSession();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, error, refetch } = useGetDashboardQuery();
  const { data: myTickets } = useGetTicketsQuery({
    assignedTo: session?.userId,
    status: [TicketStatus.OPEN, TicketStatus.ACKNOWLEDGED, TicketStatus.IN_PROGRESS],
    sortBy: 'priority',
    sortOrder: 'desc',
    page: 1,
    page_size: 8,
  });
  const { data: atRiskTickets } = useGetTicketsQuery({
    status: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
    sortBy: 'updated_at',
    sortOrder: 'asc',
    page: 1,
    page_size: 5,
  });

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Agent Dashboard
        </h1>
        <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Welcome, {session?.displayName?.split(' ')[0]}
        </p>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
        gap: '0.875rem',
        marginBottom: '1.5rem',
      }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard title="My Queue" value={myTickets?.meta.total ?? 0} icon="📬" color="var(--color-brand-500)" />
            <MetricCard title="Open" value={dashboard?.openTickets ?? 0} icon="🎫" color="var(--color-info)" />
            <MetricCard title="Resolved Today" value={dashboard?.resolvedToday ?? 0} icon="✅" color="var(--color-success)" />
            <MetricCard
              title="SLA Compliance"
              value={dashboard?.slaComplianceRate ? `${Math.round(dashboard.slaComplianceRate * 100)}%` : '—'}
              icon="📈"
              color={dashboard?.slaComplianceRate && dashboard.slaComplianceRate < 0.9 ? 'var(--color-warning)' : 'var(--color-success)'}
            />
            <MetricCard title="Avg Resolution" value={dashboard?.avgResolutionTime ?? '—'} icon="⏱" color="var(--color-text-muted)" />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* My Queue */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              My Assigned Tickets
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tickets?assignedToMe=true')}>
              View All →
            </Button>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="3rem" />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {myTickets?.data.slice(0, 6).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '0.8125rem',
                    border: '1px solid var(--color-border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <PriorityBadge priority={ticket.priority} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {ticket.title}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
              {myTickets?.data.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem 0', fontSize: '0.8125rem' }}>
                  No tickets assigned to you
                </p>
              )}
            </div>
          )}
        </Card>

        {/* SLA At Risk */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              ⚠️ SLA At Risk
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {atRiskTickets?.data
              .filter((t) => t.sla && (t.sla.resolutionState === SLAState.AT_RISK || t.sla.resolutionState === SLAState.BREACHED))
              .slice(0, 5)
              .map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.625rem', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '0.8125rem',
                    border: `1px solid ${ticket.sla?.resolutionState === SLAState.BREACHED ? '#fca5a5' : '#fcd34d'}`,
                    background: ticket.sla?.resolutionState === SLAState.BREACHED ? '#fef2f2' : '#fffbeb',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {ticket.ticketNumber}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.title}
                  </span>
                  {ticket.sla && <SLABadge state={ticket.sla.resolutionState} />}
                </div>
              )) || (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem 0', fontSize: '0.8125rem' }}>
                No SLA risks detected
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
