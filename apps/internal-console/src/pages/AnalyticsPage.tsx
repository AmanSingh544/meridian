import React, { useState } from 'react';
import {
  useGetMonthlyVolumeQuery,
  useGetCategoryBreakdownQuery,
  useGetSeverityDistributionQuery,
  useGetResolutionBySeverityQuery,
  useGetAgentPerformanceQuery,
  useGetSLAComplianceQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, MetricCard, DataTable, Skeleton, ErrorState, Button, PermissionGate } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { AgentPerformance } from '@3sc/types';

// ── Chart primitives (pure CSS — no external charting lib) ───────────────────

/** Grouped bar chart: two bars per month (created vs resolved) */
const MonthlyVolumeChart: React.FC<{
  data: Array<{ month: string; created: number; resolved: number }>;
}> = ({ data }) => {
  const max = Math.max(...data.flatMap((d) => [d.created, d.resolved]), 1);
  const H = 120;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: H + 28 }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H }}>
            <div
              title={`Created: ${d.created}`}
              style={{
                flex: 1, minWidth: 6,
                height: `${(d.created / max) * H}px`,
                background: 'var(--color-brand-400)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.4s ease',
                minHeight: 2,
              }}
            />
            <div
              title={`Resolved: ${d.resolved}`}
              style={{
                flex: 1, minWidth: 6,
                height: `${(d.resolved / max) * H}px`,
                background: '#22c55e',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.4s ease',
                minHeight: 2,
              }}
            />
          </div>
          <span style={{ fontSize: '0.5625rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {d.month.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
};

/** CSS donut chart via conic-gradient */
const DonutChart: React.FC<{
  slices: Array<{ label: string; percentage: number; color: string }>;
}> = ({ slices }) => {
  let angle = 0;
  const gradient = slices.map((s) => {
    const start = angle;
    angle += (s.percentage / 100) * 360;
    return `${s.color} ${start.toFixed(1)}deg ${angle.toFixed(1)}deg`;
  }).join(', ');

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
      <div style={{
        width: 96, height: 96, flexShrink: 0,
        borderRadius: '50%',
        background: `conic-gradient(${gradient})`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: '22%', background: 'var(--color-bg)', borderRadius: '50%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{s.label}</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
              {s.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Horizontal bar chart */
const HorizBarChart: React.FC<{
  rows: Array<{ label: string; value: number; color: string }>;
  suffix?: string;
}> = ({ rows, suffix = '' }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '4.5rem', flexShrink: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
            {row.label}
          </span>
          <div style={{ flex: 1, height: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{
              width: `${(row.value / max) * 100}%`, height: '100%',
              background: row.color, borderRadius: 'var(--radius-sm)',
              transition: 'width 0.5s ease', minWidth: row.value > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{ width: '3rem', flexShrink: 0, fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
            {row.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  legend?: Array<{ label: string; color: string }>;
  loading?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, legend, loading, children }) => (
  <Card>
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{title}</h3>
        {legend && (
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            {legend.map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {subtitle && <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</p>}
    </div>
    {loading ? <Skeleton height="8rem" /> : children}
  </Card>
);

// ── Priority colour map ───────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e',
};

const CATEGORY_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#94a3b8'];

// ── Date range options ────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { label: '7d',  full: 'Last 7 days',  days: 7   },
  { label: '30d', full: 'Last 30 days', days: 30  },
  { label: '90d', full: 'Last 90 days', days: 90  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export const AnalyticsPage: React.FC = () => {
  useDocumentTitle('Analytics');
  const permissions = usePermissions();
  const [rangeKey, setRangeKey] = useState('30d');

  const { data: monthlyVolume,     isLoading: volLoading }  = useGetMonthlyVolumeQuery({ period: rangeKey });
  const { data: categoryBreakdown, isLoading: catLoading }  = useGetCategoryBreakdownQuery({ period: rangeKey });
  const { data: severityDist,      isLoading: sevLoading }  = useGetSeverityDistributionQuery({ period: rangeKey });
  const { data: resByPriority,     isLoading: resLoading }  = useGetResolutionBySeverityQuery({ period: rangeKey });
  const { data: agents,            isLoading: agentLoading }= useGetAgentPerformanceQuery({ period: rangeKey });
  const { data: slaData }                                   = useGetSLAComplianceQuery({ period: rangeKey });

  // KPI summary derived from fetched data
  const totalCreated  = monthlyVolume?.reduce((s, d) => s + d.created,  0) ?? 0;
  const totalResolved = monthlyVolume?.reduce((s, d) => s + d.resolved, 0) ?? 0;
  const avgSLA = slaData && slaData.length > 0
    ? Math.round(slaData.reduce((s, d) => s + d.resolutionCompliance, 0) / slaData.length)
    : null;
  const avgResH = resByPriority && resByPriority.length > 0
    ? (resByPriority.reduce((s, d) => s + d.avgHours, 0) / resByPriority.length).toFixed(1)
    : null;

  const handleExport = () => {
    if (!monthlyVolume) return;
    const rows = [
      ['Month', 'Created', 'Resolved'],
      ...monthlyVolume.map((d) => [d.month, d.created, d.resolved]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Analytics</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Ticket trends, SLA performance, and team insights
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Date range pills */}
          <div style={{ display: 'flex', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setRangeKey(opt.label)}
                style={{
                  padding: '0.375rem 0.875rem', fontSize: '0.8125rem',
                  border: 'none', borderRight: '1px solid var(--color-border)', cursor: 'pointer',
                  background: rangeKey === opt.label ? 'var(--color-brand-600)' : 'transparent',
                  color:      rangeKey === opt.label ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: rangeKey === opt.label ? 600 : 400,
                  transition: 'background 0.15s',
                }}
              >
                {opt.full}
              </button>
            ))}
          </div>
          <PermissionGate permission={Permission.REPORT_EXPORT}>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!monthlyVolume}>
              ⬇ Export CSV
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <MetricCard title="Tickets Created"  value={volLoading ? '…' : totalCreated}            icon="📥" color="var(--color-info)" />
        <MetricCard title="Tickets Resolved" value={volLoading ? '…' : totalResolved}           icon="✅" color="var(--color-success)" />
        <MetricCard title="SLA Compliance"   value={avgSLA != null ? `${avgSLA}%` : '…'}        icon="📊" color="var(--color-warning)" />
        <MetricCard title="Avg Resolution"   value={avgResH != null ? `${avgResH}h` : '…'}      icon="⏱" color="var(--color-text-muted)" />
      </div>

      {/* 4-chart grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>

        <ChartCard
          title="Tickets by Month"
          subtitle="Created vs Resolved — last 7 months"
          loading={volLoading}
          legend={[
            { label: 'Created',  color: 'var(--color-brand-400)' },
            { label: 'Resolved', color: '#22c55e' },
          ]}
        >
          {monthlyVolume && <MonthlyVolumeChart data={monthlyVolume} />}
        </ChartCard>

        <ChartCard title="Category Breakdown" subtitle="Share of tickets by category" loading={catLoading}>
          {categoryBreakdown && (
            <DonutChart
              slices={categoryBreakdown.map((d, i) => ({
                label:      d.category,
                percentage: d.percentage,
                color:      CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }))}
            />
          )}
        </ChartCard>

        <ChartCard title="Severity Distribution" subtitle="Ticket count by severity level" loading={sevLoading}>
          {severityDist && (
            <HorizBarChart
              rows={severityDist.map((d) => ({
                label: d.priority.charAt(0) + d.priority.slice(1).toLowerCase(),
                value: d.count,
                color: PRIORITY_COLORS[d.priority] ?? '#94a3b8',
              }))}
            />
          )}
        </ChartCard>

        <ChartCard title="Avg Resolution Time" subtitle="Hours from open → resolved, by severity" loading={resLoading}>
          {resByPriority && (
            <HorizBarChart
              suffix="h"
              rows={resByPriority.map((d) => ({
                label: d.priority.charAt(0) + d.priority.slice(1).toLowerCase(),
                value: +d.avgHours.toFixed(1),
                color: PRIORITY_COLORS[d.priority] ?? '#94a3b8',
              }))}
            />
          )}
        </ChartCard>

      </div>

      {/* Agent Performance table */}
      <Card>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          Agent Performance
        </h3>
        <DataTable
          columns={[
            {
              key: 'agentName', header: 'Agent',
              render: (a: AgentPerformance) => <span style={{ fontWeight: 500 }}>{a.agentName}</span>,
            },
            { key: 'ticketsAssigned', header: 'Assigned', width: '6rem' },
            { key: 'ticketsResolved', header: 'Resolved', width: '6rem' },
            {
              key: 'avgResolutionHours', header: 'Avg Resolution', width: '9rem',
              render: (a: AgentPerformance) => (
                <span style={{ fontFamily: 'var(--font-mono)' }}>{(a.avgResolutionHours ?? 0).toFixed(1)}h</span>
              ),
            },
            {
              key: 'slaCompliance', header: 'SLA %', width: '8rem',
              render: (a: AgentPerformance) => {
                const pct   = Math.round(a.slaCompliance * 100);
                const color = pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: '0.375rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxWidth: '4rem' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <span style={{ fontWeight: 600, color, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{pct}%</span>
                  </div>
                );
              },
            },
          ]}
          data={agents ?? []}
          keyExtractor={(a) => a.agentId}
          loading={agentLoading}
          emptyMessage="No agent data available"
        />
      </Card>
    </div>
  );
};
