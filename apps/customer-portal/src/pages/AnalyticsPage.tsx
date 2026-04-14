import React, { useState } from 'react';
import {
  useGetTicketVolumeQuery,
  useGetSLAComplianceQuery,
  useGetResolutionTrendsQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, MetricCard, Button, Skeleton, ErrorState, PermissionGate, Badge } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { TicketVolumeData, SLAComplianceData, ResolutionTrendData } from '@3sc/types';

// ── Mock data — replace with live API when ready ──────────────────
const ticketVolumeMock: TicketVolumeData[] = [
  { date: '2026-04-07', created: 12, resolved: 8, closed: 5 },
  { date: '2026-04-08', created: 9, resolved: 11, closed: 7 },
  { date: '2026-04-09', created: 15, resolved: 10, closed: 6 },
  { date: '2026-04-10', created: 7, resolved: 13, closed: 9 },
  { date: '2026-04-11', created: 18, resolved: 9, closed: 4 },
  { date: '2026-04-12', created: 11, resolved: 12, closed: 8 },
  { date: '2026-04-13', created: 14, resolved: 10, closed: 6 },
];

const slaMock: SLAComplianceData[] = [
  { period: 'Week 1 Apr', responseCompliance: 94, resolutionCompliance: 88, totalTickets: 72, breachedTickets: 8 },
  { period: 'Week 2 Apr', responseCompliance: 91, resolutionCompliance: 85, totalTickets: 86, breachedTickets: 12 },
  { period: 'Week 3 Apr', responseCompliance: 96, resolutionCompliance: 92, totalTickets: 65, breachedTickets: 5 },
];

const resolutionMock: ResolutionTrendData[] = [
  { period: 'Week 1 Apr', avgResolutionHours: 5.2, medianResolutionHours: 4.1, p95ResolutionHours: 14.0 },
  { period: 'Week 2 Apr', avgResolutionHours: 6.8, medianResolutionHours: 5.5, p95ResolutionHours: 18.2 },
  { period: 'Week 3 Apr', avgResolutionHours: 4.5, medianResolutionHours: 3.8, p95ResolutionHours: 11.5 },
];

const dateRangeOptions = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ComplianceBadge({ value }: { value: number }) {
  const color = value >= 90 ? '#15803d' : value >= 75 ? '#b45309' : '#dc2626';
  const bg = value >= 90 ? '#dcfce7' : value >= 75 ? '#fef3c7' : '#fee2e2';
  return <Badge color={color} bgColor={bg}>{value}%</Badge>;
}

export const AnalyticsPage: React.FC = () => {
  useDocumentTitle('Analytics');
  const permissions = usePermissions();
  const [range, setRange] = useState('7d');

  const now = new Date().toISOString();
  const from = new Date(Date.now() - (range === '7d' ? 7 : range === '30d' ? 30 : 90) * 86400000).toISOString();
  const analyticsFilters = { dateFrom: from, dateTo: now };

  // Live queries — commented out until API is ready
  // const { data: volumeData, isLoading: volLoading, error: volError } = useGetTicketVolumeQuery(analyticsFilters);
  // const { data: slaData, isLoading: slaLoading, error: slaError } = useGetSLAComplianceQuery(analyticsFilters);
  // const { data: resData, isLoading: resLoading, error: resError } = useGetResolutionTrendsQuery(analyticsFilters);
  const { data: volumeData, isLoading: volLoading, error: volError } = { data: ticketVolumeMock, isLoading: false, error: null };
  const { data: slaData, isLoading: slaLoading, error: slaError } = { data: slaMock, isLoading: false, error: null };
  const { data: resData, isLoading: resLoading, error: resError } = { data: resolutionMock, isLoading: false, error: null };

  const totalCreated = (volumeData ?? []).reduce((s, d) => s + d.created, 0);
  const totalResolved = (volumeData ?? []).reduce((s, d) => s + d.resolved, 0);
  const avgResponse = slaData && slaData.length > 0
    ? Math.round(slaData.reduce((s, d) => s + d.responseCompliance, 0) / slaData.length)
    : 0;
  const avgResolution = resData && resData.length > 0
    ? (resData.reduce((s, d) => s + d.avgResolutionHours, 0) / resData.length).toFixed(1)
    : '—';

  const handleExport = () => {
    // TODO: wire up analytics export API when endpoint is ready
    const csv = [
      'Date,Created,Resolved,Closed',
      ...(volumeData ?? []).map((d) => `${d.date},${d.created},${d.resolved},${d.closed}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Analytics
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Ticket volume, SLA compliance, and resolution trends
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Date range selector */}
          <div style={{ display: 'flex', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {dateRangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  border: 'none',
                  borderRight: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: range === opt.value ? 'var(--color-brand-600)' : 'transparent',
                  color: range === opt.value ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: range === opt.value ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Export — gated on REPORT_EXPORT (CLIENT_ADMIN, LEAD, ADMIN) */}
          <PermissionGate permission={Permission.REPORT_EXPORT}>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              ⬇ Export CSV
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MetricCard title="Tickets Created" value={totalCreated} icon="🎫" color="var(--color-brand-500)" />
        <MetricCard title="Tickets Resolved" value={totalResolved} icon="✅" color="var(--color-success)" />
        <MetricCard title="Avg Response SLA" value={`${avgResponse}%`} icon="📊" color="var(--color-info)" />
        <MetricCard title="Avg Resolution Time" value={`${avgResolution}h`} icon="⏱" color="var(--color-warning)" />
      </div>

      {/* Ticket Volume */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>Ticket Volume</h3>
        {volLoading ? (
          <Skeleton height="10rem" />
        ) : volError ? (
          <ErrorState title="Failed to load volume data" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Date', 'Created', 'Resolved', 'Closed', 'Net'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(volumeData ?? []).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{formatDate(row.date)}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.created}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-success)' }}>{row.resolved}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-text-muted)' }}>{row.closed}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span style={{ color: row.created - row.resolved > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                        {row.created - row.resolved > 0 ? '+' : ''}{row.created - row.resolved}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SLA Compliance */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>SLA Compliance</h3>
        {slaLoading ? (
          <Skeleton height="8rem" />
        ) : slaError ? (
          <ErrorState title="Failed to load SLA data" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Period', 'Response SLA', 'Resolution SLA', 'Total Tickets', 'Breached'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(slaData ?? []).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.period}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}><ComplianceBadge value={row.responseCompliance} /></td>
                    <td style={{ padding: '0.625rem 0.75rem' }}><ComplianceBadge value={row.resolutionCompliance} /></td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.totalTickets}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-danger)' }}>{row.breachedTickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resolution Trends */}
      <Card>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>Resolution Trends</h3>
        {resLoading ? (
          <Skeleton height="8rem" />
        ) : resError ? (
          <ErrorState title="Failed to load resolution data" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Period', 'Avg Resolution', 'Median', 'P95'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(resData ?? []).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.period}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.avgResolutionHours.toFixed(1)}h</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.medianResolutionHours.toFixed(1)}h</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-text-muted)' }}>{row.p95ResolutionHours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
