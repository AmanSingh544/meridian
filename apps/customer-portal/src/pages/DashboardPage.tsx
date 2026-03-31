import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardQuery, useGetTicketsQuery } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  MetricCard,
  Card,
  StatusBadge,
  PriorityBadge,
  SLABadge,
  Button,
  Skeleton,
  SkeletonCard,
  ErrorState,
} from '@3sc/ui';
import { TicketStatus, TicketPriority, SLAState } from '@3sc/types';
import { formatRelativeTime } from '@3sc/utils';

export const DashboardPage: React.FC = () => {
  useDocumentTitle('Dashboard');
  const session = useSession();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, error, refetch } = useGetDashboardQuery();
  const { data: recentTickets } = useGetTicketsQuery({
    page: 1,
    pageSize: 5,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
          }}>
            Welcome back, {session?.displayName?.split(' ')[0]}
          </h1>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}>
            Here's your support overview
          </p>
        </div>
        <Button onClick={() => navigate('/tickets/new')} icon={<span>+</span>}>
          New Ticket
        </Button>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Open Tickets"
              value={dashboard?.openTickets ?? 0}
              icon="🎫"
              color="var(--color-brand-500)"
            />
            <MetricCard
              title="Resolved Today"
              value={dashboard?.resolvedToday ?? 0}
              icon="✅"
              color="var(--color-success)"
            />
            <MetricCard
              title="Avg Resolution"
              value={dashboard?.avgResolutionTime ?? '—'}
              icon="⏱"
              color="var(--color-warning)"
            />
            <MetricCard
              title="SLA Compliance"
              value={dashboard?.slaComplianceRate ? `${Math.round(dashboard.slaComplianceRate * 100)}%` : '—'}
              icon="📈"
              color="var(--color-info)"
            />
          </>
        )}
      </div>

      {/* Recent Tickets */}
      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
          }}>
            Recent Tickets
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
            View All →
          </Button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height="3.5rem" borderRadius="var(--radius-md)" />
            ))}
          </div>
        ) : recentTickets?.data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <p>No tickets yet</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/tickets/new')} style={{ marginTop: '0.75rem' }}>
              Create your first ticket
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentTickets?.data.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}>
                      {ticket.ticketNumber}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p style={{
                    margin: 0,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ticket.title}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <StatusBadge status={ticket.status} />
                  {ticket.sla && <SLABadge state={ticket.sla.resolutionState} />}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {formatRelativeTime(ticket.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
