import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardQuery, useGetTicketsQuery } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  MetricCard, MetricGrid, Card, StatusBadge, PriorityBadge, SLABadge,
  Button, Skeleton, ErrorState, Icon,
} from '@3sc/ui';
import { Inbox, Ticket, CheckCircle2, TrendingUp, Timer } from 'lucide-react';
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
      <MetricGrid density="compact">
        <MetricCard title="My Queue" value={myTickets?.total ?? 0} icon={<Icon icon={Inbox} />} variant="brand" state={isLoading ? 'loading' : 'ready'} />
        <MetricCard title="Open" value={dashboard?.by_status?.OPEN ?? dashboard?.total ?? 0} icon={<Icon icon={Ticket} />} variant="info" state={isLoading ? 'loading' : 'ready'} />
        <MetricCard title="Resolved Today" value={dashboard?.resolvedToday ?? 0} icon={<Icon icon={CheckCircle2} />} variant="success" state={isLoading ? 'loading' : 'ready'} />
        <MetricCard
          title="SLA Compliance"
          value={dashboard?.slaComplianceRate ? `${Math.round(dashboard.slaComplianceRate * 100)}%` : '—'}
          icon={<Icon icon={TrendingUp} />}
          variant={dashboard?.slaComplianceRate && dashboard.slaComplianceRate < 0.9 ? 'warning' : 'success'}
          state={isLoading ? 'loading' : 'ready'}
        />
        <MetricCard title="Avg resolution" value={dashboard?.avgResolutionTime ?? '—'} icon={<Icon icon={Timer} />} variant="neutral" state={isLoading ? 'loading' : 'ready'} />
      </MetricGrid>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* My Queue */}
        <Card hover>
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
                <Card
                  hover
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.625rem',
                    cursor: 'pointer', fontSize: '0.8125rem',
                  }}
                >
                  <PriorityBadge priority={ticket.priority} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {ticket.title}
                  </span>
                  <StatusBadge status={ticket.status} />
                </Card>
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
        <Card hover>
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
