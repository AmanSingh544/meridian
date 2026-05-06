import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetDashboardQuery,
  useGetTicketsQuery,
  useGetProjectsQuery,
  useGetAIDigestQuery,
  useSearchKBQuery,
  useGetSLAComplianceQuery,
  useGetResolutionTrendsQuery,
} from '@3sc/api';
import { useDocumentTitle, useSession, usePermissions } from '@3sc/hooks';
import {
  Card, MetricCard, Button, Badge, StatusBadge, PriorityBadge, SLABadge,
  Skeleton, SkeletonCard, ErrorState, EmptyState,
  AIBanner, PermissionGate,
} from '@3sc/ui';
import { Permission, UserRole, TicketStatus, TicketPriority, TicketCategory, SLAState } from '@3sc/types';
import type { Ticket, Project, DashboardSummary, AIDigest, ActivityItem, SLAComplianceData, ResolutionTrendData } from '@3sc/types';
import { formatRelativeTime } from '@3sc/utils';

// ── Colour maps ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]:         'var(--color-warning)',
  [TicketStatus.ACKNOWLEDGED]: 'var(--color-info)',
  [TicketStatus.IN_PROGRESS]:  'var(--color-brand-500)',
  [TicketStatus.RESOLVED]:     'var(--color-success)',
  [TicketStatus.CLOSED]:       'var(--color-text-muted)',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]:      '#22c55e',
  [TicketPriority.MEDIUM]:   '#f59e0b',
  [TicketPriority.HIGH]:     '#f97316',
  [TicketPriority.CRITICAL]: '#ef4444',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]:         'Open',
  [TicketStatus.ACKNOWLEDGED]: 'Acknowledged',
  [TicketStatus.IN_PROGRESS]:  'In Progress',
  [TicketStatus.RESOLVED]:     'Resolved',
  [TicketStatus.CLOSED]:       'Closed',
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function sectionTitle(text: string) {
  return (
    <h2 style={{
      margin: '0 0 1rem',
      fontSize: '1rem',
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      color: 'var(--color-text)',
    }}>
      {text}
    </h2>
  );
}

// ── CSS bar chart ─────────────────────────────────────────────────────────────

interface BarChartProps {
  rows: Array<{ label: string; value: number; color: string }>;
}

const BarChart: React.FC<BarChartProps> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: '7rem', flexShrink: 0,
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            textAlign: 'right',
          }}>
            {row.label}
          </span>
          <div style={{
            flex: 1, height: '0.875rem',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(row.value / max) * 100}%`,
              height: '100%',
              background: row.color,
              borderRadius: 'var(--radius-sm)',
              transition: 'width 0.5s ease',
              minWidth: row.value > 0 ? '0.25rem' : 0,
            }} />
          </div>
          <span style={{
            width: '1.5rem', flexShrink: 0,
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--color-text)',
            textAlign: 'left',
          }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT_USER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

interface UserDashboardProps {
  firstName: string;
  userId: string;
  tickets: Ticket[];
  digest: AIDigest | undefined;
  isDigestLoading: boolean;
  isTicketsLoading: boolean;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  firstName, userId, tickets, digest, isDigestLoading, isTicketsLoading,
}) => {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [digestDismissed, setDigestDismissed] = useState(false);

  // Derive KB search query from open ticket tags/categories
  const openTicketTags = useMemo(() => {
    const tags: string[] = [];
    tickets
      .filter((t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS)
      .forEach((t) => tags.push(...(t.tags ?? []).slice(0, 2)));
    return [...new Set(tags)].slice(0, 3);
  }, [tickets]);

  const kbQuery = openTicketTags.join(' ');
  const { data: kbSuggestions } = useSearchKBQuery(
    { query: kbQuery, limit: 3 },
    { skip: !permissions.has(Permission.AI_KB_SUGGEST) || kbQuery.length < 3 },
  );

  // Pill counters
  const openCount       = tickets.filter((t) => t.status === TicketStatus.OPEN).length;
  const inProgressCount = tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.ACKNOWLEDGED).length;
  const resolvedCount   = tickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
  const closedCount     = tickets.filter((t) => t.status === TicketStatus.CLOSED).length;

  // "Awaiting reply" heuristic: active ticket, last update was > 6 hours ago
  const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000);
  const awaitingReplyCount = tickets.filter((t) =>
    [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ACKNOWLEDGED].includes(t.status) &&
    new Date(t.updated_at) < sixHoursAgo
  ).length;

  const activeTickets = tickets.filter((t) =>
    [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ACKNOWLEDGED].includes(t.status)
  );

  const pills = [
    { label: 'Open',            count: openCount,          color: 'var(--color-warning)', filter: `?status=${TicketStatus.OPEN}` },
    { label: 'Awaiting Reply',  count: awaitingReplyCount, color: 'var(--color-info)',    filter: `?status=${TicketStatus.OPEN}` },
    { label: 'In Progress',     count: inProgressCount,    color: 'var(--color-brand-500)', filter: `?status=${TicketStatus.IN_PROGRESS}` },
    { label: 'Resolved',        count: resolvedCount,      color: 'var(--color-success)', filter: `?status=${TicketStatus.RESOLVED}` },
  ];

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>

      {/* ── Greeting ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Here's what's happening with your support tickets
          </p>
        </div>
        <Button onClick={() => navigate('/tickets/new')} icon={<span>+</span>}>
          New Ticket
        </Button>
      </div>

      {/* ── AI Needs-Attention Banner ── */}
      <PermissionGate permission={Permission.AI_DIGEST}>
        {!digestDismissed && (
          isDigestLoading ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <AIBanner title="" description="" loading />
            </div>
          ) : digest && digest.needsAttentionCount > 0 ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <AIBanner
                title={`${digest.needsAttentionCount} ticket${digest.needsAttentionCount !== 1 ? 's' : ''} need your attention`}
                description={digest.needsAttentionSummary}
                onAccept={() => navigate('/tickets')}
                onReject={() => setDigestDismissed(true)}
              />
            </div>
          ) : digest ? (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.875rem', color: 'var(--color-text-secondary)',
            }}>
              <span>✅</span>
              <span>All your tickets are on track — nothing needs immediate attention.</span>
              <button
                onClick={() => setDigestDismissed(true)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem' }}
              >✕</button>
            </div>
          ) : null
        )}
      </PermissionGate>

      {/* ── Pill Counters ── */}
      {isTicketsLoading ? (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="3.5rem" style={{ flex: 1, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {pills.map((pill) => (
            <button
              key={pill.label}
              onClick={() => navigate(`/tickets${pill.filter}`)}
              style={{
                flex: '1 1 10rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-bg)',
                border: `1px solid var(--color-border)`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = pill.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pill.color, fontFamily: 'var(--font-display)' }}>
                {pill.count}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {pill.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Active Tickets + KB Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: kbSuggestions && kbSuggestions.length > 0 ? '1fr 16rem' : '1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Active Tickets */}
        <div>
          <Card padding="1.25rem">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              {sectionTitle('My Active Tickets')}
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                View all →
              </Button>
            </div>

            {isTicketsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height="4rem" borderRadius="var(--radius-md)" />
                ))}
              </div>
            ) : activeTickets.length === 0 ? (
              <EmptyState
                title="No active tickets"
                description="You're all caught up! Create a ticket if you need support."
                action={
                  <Button variant="secondary" size="sm" onClick={() => navigate('/tickets/new')}>
                    Create a ticket
                  </Button>
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.875rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                          {ticket.ticketNumber}
                        </span>
                        <PriorityBadge priority={ticket.priority} />
                        {ticket.sla?.resolutionState === SLAState.AT_RISK && (
                          <SLABadge state={ticket.sla.resolutionState} />
                        )}
                      </div>
                      <p style={{
                        margin: 0, fontSize: '0.875rem', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ticket.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                      <StatusBadge status={ticket.status} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {formatRelativeTime(ticket.updated_at)}
                      </span>
                      <Button
                        variant="secondary" size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${ticket.id}`); }}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* KB Suggestions Sidebar */}
        <PermissionGate permission={Permission.AI_KB_SUGGEST}>
          {kbSuggestions && kbSuggestions.length > 0 && (
            <Card padding="1.25rem">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <span style={{ fontSize: '1rem' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Relevant Articles
                </h3>
              </div>
              <p style={{ margin: '0 0 0.875rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Based on your open tickets
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {kbSuggestions.map((result) => (
                  <a
                    key={result.article.id}
                    href={`/knowledge-base/${result.article.slug}`}
                    style={{
                      display: 'block',
                      padding: '0.625rem 0.75rem',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                      transition: 'var(--transition-fast)',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-brand-200)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
                  >
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 }}>
                      {result.article.title}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {result.article.excerpt.slice(0, 80)}…
                    </p>
                  </a>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge-base')} style={{ marginTop: '0.75rem', width: '100%' }}>
                Browse all articles
              </Button>
            </Card>
          )}
        </PermissionGate>

      </div>

      {/* ── Closed/Resolved history ── */}
      {!isTicketsLoading && (openCount + inProgressCount === 0) && resolvedCount + closedCount > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <Card padding="1.25rem">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              {sectionTitle('Recent History')}
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>View all →</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tickets
                .filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED)
                .slice(0, 3)
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.title}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      {formatRelativeTime(ticket.updated_at)}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT_ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

interface AdminDashboardProps {
  firstName: string;
  tickets: Ticket[];
  projects: Project[];
  dashboard: DashboardSummary | undefined;
  digest: AIDigest | undefined;
  slaHistory: SLAComplianceData[];
  resolutionHistory: ResolutionTrendData[];
  isDashboardLoading: boolean;
  isDigestLoading: boolean;
  isTicketsLoading: boolean;
  isProjectsLoading: boolean;
}

// Compute a percentage-point delta between last two periods, capped at ±99
function computeTrend(history: Array<{ value: number }>, higherIsBetter = true): { value: number; isPositive: boolean } | undefined {
  if (history.length < 2) return undefined;
  const prev = history[history.length - 2].value;
  const curr = history[history.length - 1].value;
  if (prev === 0) return undefined;
  const delta = Math.round(Math.abs(((curr - prev) / prev) * 100));
  const improved = curr > prev;
  return { value: Math.min(delta, 99), isPositive: higherIsBetter ? improved : !improved };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  firstName, tickets, projects, dashboard, digest,
  slaHistory, resolutionHistory,
  isDashboardLoading, isDigestLoading, isTicketsLoading, isProjectsLoading,
}) => {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [digestDismissed, setDigestDismissed] = useState(false);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  // Derived KPI values from tickets
  const ticketsThisWeek = tickets.filter((t) => new Date(t.created_at) >= sevenDaysAgo).length;
  const stalledTickets  = tickets.filter((t) =>
    t.status !== TicketStatus.RESOLVED &&
    t.status !== TicketStatus.CLOSED &&
    new Date(t.created_at) < sevenDaysAgo
  ).length;

  // Trend deltas
  const slaTrend = computeTrend(
    slaHistory.map((s) => ({ value: s.resolutionCompliance })),
    true,
  );
  const resTrend = computeTrend(
    resolutionHistory.map((r) => ({ value: r.avgResolutionHours })),
    false, // lower resolution time is better
  );

  // Ticket breakdown data
  const byStatus = (dashboard?.by_status ?? {}) as Partial<Record<TicketStatus, number>>;
  const byPriority = (dashboard?.by_priority ?? {}) as Partial<Record<TicketPriority, number>>;

  const statusRows = [
    TicketStatus.OPEN, TicketStatus.ACKNOWLEDGED, TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED, TicketStatus.CLOSED,
  ].map((s) => ({ label: STATUS_LABELS[s], value: byStatus[s] ?? 0, color: STATUS_COLORS[s] }));

  const priorityRows = [
    TicketPriority.CRITICAL, TicketPriority.HIGH, TicketPriority.MEDIUM, TicketPriority.LOW,
  ].map((p) => ({ label: p.charAt(0) + p.slice(1).toLowerCase(), value: byPriority[p] ?? 0, color: PRIORITY_COLORS[p] }));

  return (
    <div>

      {/* ── Greeting + Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Your organisation's support overview
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <PermissionGate permission={Permission.REPORT_EXPORT}>
            <Button variant="secondary" onClick={() => navigate('/analytics')} icon={<span>📊</span>}>
              Analytics
            </Button>
          </PermissionGate>
          <Button onClick={() => navigate('/tickets/new')} icon={<span>+</span>}>
            New Ticket
          </Button>
        </div>
      </div>

      {/* ── Zone 1: KPI Metric Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {isDashboardLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Open Tickets"
              value={byStatus[TicketStatus.OPEN] ?? 0}
              icon="📂"
              color="var(--color-warning)"
              subtitle="In your organisation"
            />
            <MetricCard
              title="SLA Compliance"
              value={dashboard?.slaComplianceRate != null
                ? `${Math.round(dashboard.slaComplianceRate * 100)}%`
                : '—'}
              icon="📈"
              color="var(--color-success)"
              trend={slaTrend}
              subtitle="This month"
            />
            <MetricCard
              title="Avg Resolution"
              value={dashboard?.avgResolutionTime ?? '—'}
              icon="⏱"
              color="var(--color-brand-500)"
              trend={resTrend}
              subtitle="This month"
            />
            <MetricCard
              title="Tickets This Week"
              value={ticketsThisWeek}
              icon="🎫"
              color="var(--color-info)"
              subtitle="Created last 7 days"
            />
            <MetricCard
              title="Stalled"
              value={stalledTickets}
              icon="⚠️"
              color={stalledTickets > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'}
              subtitle="Unresolved > 7 days"
            />
          </>
        )}
      </div>

      {/* ── Zone 2: AI Digest ── */}
      <PermissionGate permission={Permission.AI_DIGEST}>
        {!digestDismissed && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>🤖</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  AI Digest
                </h2>
                <Badge color="var(--color-brand-600)" bgColor="var(--color-brand-50)">Live</Badge>
              </div>
              <button
                onClick={() => setDigestDismissed(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>

              {/* Needs Attention */}
              <Card padding="1.25rem" style={{ borderLeft: '3px solid var(--color-warning)' }}>
                {isDigestLoading ? (
                  <>
                    <Skeleton height="1rem" width="60%" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="0.75rem" width="90%" />
                    <Skeleton height="0.75rem" width="75%" style={{ marginTop: '0.25rem' }} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🚨</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-warning)' }}>
                        Needs Attention
                      </span>
                    </div>
                    {digest && digest.atRiskTickets.length > 0 ? (
                      <>
                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                          {digest.needsAttentionSummary}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {digest.atRiskTickets.slice(0, 3).map((t) => (
                            <div
                              key={t.ticketId}
                              onClick={() => navigate(`/tickets/${t.ticketId}`)}
                              style={{
                                padding: '0.5rem 0.625rem',
                                background: 'var(--color-bg-subtle)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                                  {t.ticketNumber}
                                </span>
                                <Badge
                                  color={t.urgency === 'high' ? '#b91c1c' : '#b45309'}
                                  bgColor={t.urgency === 'high' ? '#fee2e2' : '#fef3c7'}
                                >
                                  {t.urgency}
                                </Badge>
                              </div>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.title}
                              </p>
                              <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {t.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        No tickets are at SLA risk right now. ✓
                      </p>
                    )}
                  </>
                )}
              </Card>

              {/* Patterns */}
              <Card padding="1.25rem" style={{ borderLeft: '3px solid var(--color-brand-400)' }}>
                {isDigestLoading ? (
                  <>
                    <Skeleton height="1rem" width="60%" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="0.75rem" width="90%" />
                    <Skeleton height="0.75rem" width="80%" style={{ marginTop: '0.25rem' }} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔍</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-brand-600)' }}>
                        Patterns Detected
                      </span>
                    </div>
                    {digest && digest.patterns.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {digest.patterns.map((pattern, i) => (
                          <div key={i} style={{ padding: '0.5rem 0.625rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <Badge color="var(--color-brand-600)" bgColor="var(--color-brand-50)">
                                {pattern.ticketCount} tickets
                              </Badge>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500 }}>{pattern.label}</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {pattern.suggestion}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        No recurring patterns detected this period. ✓
                      </p>
                    )}
                  </>
                )}
              </Card>

              {/* Response Gaps */}
              <Card padding="1.25rem" style={{ borderLeft: '3px solid var(--color-info)' }}>
                {isDigestLoading ? (
                  <>
                    <Skeleton height="1rem" width="60%" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="0.75rem" width="90%" />
                    <Skeleton height="0.75rem" width="70%" style={{ marginTop: '0.25rem' }} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>⏳</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-info)' }}>
                        Response Gaps
                      </span>
                    </div>
                    {digest && digest.responseGaps.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {digest.responseGaps.slice(0, 3).map((gap) => (
                          <div
                            key={gap.ticketId}
                            onClick={() => navigate(`/tickets/${gap.ticketId}`)}
                            style={{
                              padding: '0.5rem 0.625rem',
                              background: 'var(--color-bg-subtle)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                                {gap.ticketNumber}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {gap.waitingDays}d no activity
                              </span>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {gap.title}
                            </p>
                            <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              Waiting for: <strong>{gap.waitingFor}</strong>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        No response gaps detected. All tickets have recent activity. ✓
                      </p>
                    )}
                  </>
                )}
              </Card>

            </div>
          </div>
        )}
      </PermissionGate>

      {/* ── Zone 3: Projects + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 20rem', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'start' }}>

        {/* Project Health Grid */}
        <PermissionGate permission={Permission.PROJECT_VIEW}>
          <Card padding="1.25rem">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              {sectionTitle('Project Health')}
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all →</Button>
            </div>
            {isProjectsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height="5rem" borderRadius="var(--radius-md)" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>No active projects.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {projects.filter((p) => p.status === 'active' || p.status === 'planning').map((project) => {
                  const projectTickets = tickets.filter((t) => t.projectId === project.id);
                  const openCount = projectTickets.filter((t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length;
                  const atRisk = projectTickets.filter((t) => t.sla?.resolutionState === SLAState.AT_RISK).length;
                  const milestones = (project as unknown as { milestones?: Array<{ isCompleted: boolean }> }).milestones ?? [];
                  const completedMilestones = milestones.filter((m) => m.isCompleted).length;
                  const milestonePct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate('/projects')}
                      style={{
                        padding: '0.875rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{project.name}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {openCount} open ticket{openCount !== 1 ? 's' : ''}
                            </span>
                            {atRisk > 0 && (
                              <Badge color="#b91c1c" bgColor="#fee2e2">{atRisk} at risk</Badge>
                            )}
                          </div>
                        </div>
                        <Badge
                          color={project.status === 'active' ? '#065f46' : '#5b21b6'}
                          bgColor={project.status === 'active' ? '#d1fae5' : '#ede9fe'}
                        >
                          {project.status}
                        </Badge>
                      </div>
                      {milestones.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Milestones: {completedMilestones}/{milestones.length}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{milestonePct}%</span>
                          </div>
                          <div style={{ height: '0.375rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${milestonePct}%`, height: '100%',
                              background: 'var(--color-brand-500)',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </PermissionGate>

        {/* Team Activity Feed */}
        <Card padding="1.25rem">
          <div style={{ marginBottom: '1rem' }}>
            {sectionTitle('Team Activity')}
            <p style={{ margin: '-0.75rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Last 48 hours</p>
          </div>
          {isDashboardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="2.5rem" borderRadius="var(--radius-md)" />
              ))}
            </div>
          ) : (
            <ActivityFeed activities={dashboard?.recentActivity ?? []} onNavigate={navigate} />
          )}
        </Card>

      </div>

      {/* ── Zone 4: Ticket Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <Card padding="1.25rem">
          {sectionTitle('Tickets by Status')}
          <BarChart rows={statusRows} />
        </Card>
        <Card padding="1.25rem">
          {sectionTitle('Tickets by Priority')}
          <BarChart rows={priorityRows} />
        </Card>
      </div>

    </div>
  );
};

// ── Activity Feed ─────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  ticket_created:    '🎫',
  status_change:     '🔄',
  comment:           '💬',
  ticket_assigned:   '👤',
  ticket_resolved:   '✅',
  sla_at_risk:       '⚠️',
};

interface ActivityFeedProps {
  activities: ActivityItem[];
  onNavigate: (path: string) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, onNavigate }) => {
  const cutoff = new Date(Date.now() - 48 * 3_600_000);
  const recent = activities.filter((a) => new Date(a.timestamp) >= cutoff);

  if (recent.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
        No team activity in the last 48 hours.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {recent.map((activity) => (
        <div
          key={activity.id}
          onClick={() => activity.resourceType === 'ticket' && onNavigate(`/tickets/${activity.resourceId}`)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
            padding: '0.5rem 0.625rem',
            borderRadius: 'var(--radius-md)',
            cursor: activity.resourceType === 'ticket' ? 'pointer' : 'default',
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => { if (activity.resourceType === 'ticket') (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <span style={{ fontSize: '0.875rem', flexShrink: 0, marginTop: '0.1rem' }}>
            {ACTIVITY_ICONS[activity.type] ?? '📌'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.4 }}>
              <strong>{activity.userName}</strong>{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>{(activity.description ?? '').replace(/^[A-Z0-9-]+ /, '')}</span>
            </p>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TOP-LEVEL ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════════

const DASHBOARD_NOW = new Date().toISOString();
const DASHBOARD_SIXTY_DAYS_AGO = new Date(Date.now() - 60 * 86_400_000).toISOString();

export const DashboardPage: React.FC = () => {
  useDocumentTitle('Dashboard');
  const session = useSession();
  const isAdmin = session?.role === UserRole.CLIENT_ADMIN;

  const now = DASHBOARD_NOW;
  const sixtyDaysAgo = DASHBOARD_SIXTY_DAYS_AGO;

  // ── Queries (all unconditional — hooks cannot be conditional) ──────────────
  const { data: dashboard, isLoading: isDashboardLoading, error: dashboardError, refetch } =
    useGetDashboardQuery(undefined, { skip: !isAdmin });

  const { data: ticketsResult, isLoading: isTicketsLoading } =
    useGetTicketsQuery({ page: 1, page_size: 50, sortBy: 'updated_at', sortOrder: 'desc' });

  const { data: projectsResult, isLoading: isProjectsLoading } =
    useGetProjectsQuery({ page: 1, page_size: 20 }, { skip: !isAdmin });

  const { data: digest, isLoading: isDigestLoading } =
    useGetAIDigestQuery();

  const { data: slaHistory = [] } =
    useGetSLAComplianceQuery({ dateFrom: sixtyDaysAgo, dateTo: now }, { skip: !isAdmin });

  const { data: resolutionHistory = [] } =
    useGetResolutionTrendsQuery({ dateFrom: sixtyDaysAgo, dateTo: now }, { skip: !isAdmin });

  const tickets  = ticketsResult?.data ?? [];
  const projects = projectsResult?.data ?? [];

  if (dashboardError && isAdmin) {
    return <ErrorState onRetry={refetch} />;
  }

  const firstName = session?.displayName?.split(' ')[0] ?? 'there';

  if (isAdmin) {
    return (
      <AdminDashboard
        firstName={firstName}
        tickets={tickets}
        projects={projects}
        dashboard={dashboard}
        digest={digest}
        slaHistory={slaHistory}
        resolutionHistory={resolutionHistory}
        isDashboardLoading={isDashboardLoading}
        isDigestLoading={isDigestLoading}
        isTicketsLoading={isTicketsLoading}
        isProjectsLoading={isProjectsLoading}
      />
    );
  }

  return (
    <UserDashboard
      firstName={firstName}
      userId={session?.userId ?? ''}
      tickets={tickets}
      digest={digest}
      isDigestLoading={isDigestLoading}
      isTicketsLoading={isTicketsLoading}
    />
  );
};
