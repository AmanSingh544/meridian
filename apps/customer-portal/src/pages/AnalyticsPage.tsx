import React, { useState } from 'react';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, MetricCard, Button, Skeleton, PermissionGate, Badge } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { SLAComplianceData } from '@3sc/types';
import {
  useGetMonthlyVolumeQuery,
  useGetCategoryBreakdownQuery,
  useGetSeverityDistributionQuery,
  useGetResolutionBySeverityQuery,
  useGetSLAComplianceQuery,
} from '@3sc/api';

// ── Color maps ───────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#22c55e',
};

const CATEGORY_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#94a3b8'];

// ── Chart primitives ─────────────────────────────────────────────────────────

interface MonthlyVolumeChartProps {
  data: Array<{ month: string; created: number; resolved: number }>;
}

const MonthlyVolumeChart: React.FC<MonthlyVolumeChartProps> = ({ data }) => {
  const max = Math.max(...data.flatMap((d) => [d.created, d.resolved]), 1);
  const H = 110;
  const BAR_W = 10;
  const GAP = 3;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: H + 28, minWidth: `${data.length * 56}px`, paddingBottom: 0 }}>
        {data.map((d) => (
          <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, height: H + 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: GAP, height: H }}>
              <div
                title={`Created: ${d.created}`}
                style={{
                  width: BAR_W,
                  height: `${Math.max((d.created / max) * H, 3)}px`,
                  background: '#6366f1',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
              <div
                title={`Resolved: ${d.resolved}`}
                style={{
                  width: BAR_W,
                  height: `${Math.max((d.resolved / max) * H, 3)}px`,
                  background: '#22c55e',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginTop: 5 }}>{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DonutSlice { label: string; value: number; color: string }

const DonutChart: React.FC<{ slices: DonutSlice[] }> = ({ slices }) => {
  const total = slices.reduce((s, d) => s + d.value, 0);
  let angle = 0;
  const gradient = slices.map((s) => {
    const start = angle;
    angle += (s.value / total) * 360;
    return `${s.color} ${start.toFixed(1)}deg ${angle.toFixed(1)}deg`;
  }).join(', ');

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
      <div style={{
        width: 88, height: 88, flexShrink: 0,
        borderRadius: '50%',
        background: `conic-gradient(${gradient})`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: '22%',
          background: 'var(--color-bg)',
          borderRadius: '50%',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{s.label}</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface HorizBarRow { label: string; value: number; color: string }

const HorizBarChart: React.FC<{ rows: HorizBarRow[]; suffix?: string }> = ({ rows, suffix = '' }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: '4.5rem', flexShrink: 0,
            fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
            textAlign: 'right',
          }}>
            {row.label}
          </span>
          <div style={{
            flex: 1, height: '0.75rem',
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
              minWidth: row.value > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{
            width: '3rem', flexShrink: 0,
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-mono)',
          }}>
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
  loading?: boolean;
  legend?: Array<{ label: string; color: string }>;
  children: React.ReactNode;
}> = ({ title, subtitle, loading, legend, children }) => (
  <Card>
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          {title}
        </h3>
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
      {subtitle && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</p>
      )}
    </div>
    {loading ? <Skeleton height="8rem" /> : children}
  </Card>
);

// ── Compliance badge ─────────────────────────────────────────────────────────

function ComplianceBadge({ value }: { value: number }) {
  const color = value >= 90 ? '#15803d' : value >= 75 ? '#b45309' : '#dc2626';
  const bg    = value >= 90 ? '#dcfce7' : value >= 75 ? '#fef3c7' : '#fee2e2';
  return <Badge color={color} bgColor={bg}>{value}%</Badge>;
}

// ── Main component ───────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { label: '7d',  full: 'Last 7 days' },
  { label: '30d', full: 'Last 30 days' },
  { label: '90d', full: 'Last 90 days' },
];

export const AnalyticsPage: React.FC = () => {
  useDocumentTitle('Analytics');
  const permissions = usePermissions();
  const [range, setRange] = useState('30d');

  const filters = { period: range };

  const { data: monthlyVolume = [], isLoading: loadingVolume }   = useGetMonthlyVolumeQuery(filters);
  const { data: categoryData  = [], isLoading: loadingCategory } = useGetCategoryBreakdownQuery(filters);
  const { data: severityData  = [], isLoading: loadingSeverity } = useGetSeverityDistributionQuery(filters);
  const { data: resolutionData = [], isLoading: loadingResolution } = useGetResolutionBySeverityQuery(filters);
  const { data: rawSlaData, isLoading: loadingSLA } = useGetSLAComplianceQuery(filters);
  const slaData = Array.isArray(rawSlaData) ? rawSlaData : [];

  // KPI summaries derived from query data
  const totalCreated  = monthlyVolume.reduce((s, d) => s + d.created, 0);
  const totalResolved = monthlyVolume.reduce((s, d) => s + d.resolved, 0);
  const avgSLA = slaData.length
    ? Math.round(slaData.reduce((s: number, d: SLAComplianceData) => s + d.responseCompliance, 0) / slaData.length)
    : 0;
  const avgResH = resolutionData.length
    ? (resolutionData.reduce((s, d) => s + d.avgHours, 0) / resolutionData.length).toFixed(1)
    : '—';

  const handleExport = () => {
    const rows = [
      ['Month', 'Created', 'Resolved'],
      ...monthlyVolume.map((d) => [d.month, d.created, d.resolved]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Map API shapes to chart shapes
  const categorySlices = categoryData.map((d, i) => ({
    label: d.category,
    value: d.count,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const severityRows = severityData.map((d) => ({
    label: d.priority.charAt(0) + d.priority.slice(1).toLowerCase(),
    value: d.count,
    color: PRIORITY_COLORS[d.priority] ?? '#94a3b8',
  }));

  const resolutionRows = resolutionData.map((d) => ({
    label: d.priority.charAt(0) + d.priority.slice(1).toLowerCase(),
    value: parseFloat(d.avgHours.toFixed(1)),
    color: PRIORITY_COLORS[d.priority] ?? '#94a3b8',
  }));

  return (
    <div>
      {/* Header */}
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
          <div style={{
            display: 'flex',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setRange(opt.label)}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.8125rem',
                  border: 'none',
                  borderRight: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: range === opt.label ? 'var(--color-brand-600)' : 'transparent',
                  color: range === opt.label ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: range === opt.label ? 600 : 400,
                  transition: 'background 0.15s',
                }}
              >
                {opt.full}
              </button>
            ))}
          </div>
          <PermissionGate permission={Permission.REPORT_EXPORT}>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              ⬇ Export CSV
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MetricCard title="Tickets Created"  value={loadingVolume ? '…' : totalCreated}   icon="🎫" color="var(--color-brand-500)" />
        <MetricCard title="Tickets Resolved" value={loadingVolume ? '…' : totalResolved}  icon="✅" color="var(--color-success)" />
        <MetricCard title="Avg Response SLA" value={loadingSLA ? '…' : `${avgSLA}%`}      icon="📊" color="var(--color-info)" />
        <MetricCard title="Avg Resolution"   value={loadingResolution ? '…' : `${avgResH}h`} icon="⏱" color="var(--color-warning)" />
      </div>

      {/* 4-chart grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>

        <ChartCard
          title="Tickets by Month"
          subtitle="Created vs Resolved — last 7 months"
          loading={loadingVolume}
          legend={[
            { label: 'Created',  color: '#6366f1' },
            { label: 'Resolved', color: '#22c55e' },
          ]}
        >
          <MonthlyVolumeChart data={monthlyVolume} />
        </ChartCard>

        <ChartCard title="Category Breakdown" subtitle="Share of tickets by category" loading={loadingCategory}>
          {categorySlices.length > 0 && <DonutChart slices={categorySlices} />}
        </ChartCard>

        <ChartCard title="Severity Distribution" subtitle="Ticket count by severity" loading={loadingSeverity}>
          <HorizBarChart rows={severityRows} />
        </ChartCard>

        <ChartCard title="Avg Resolution Time" subtitle="Hours from open → resolved, by severity" loading={loadingResolution}>
          <HorizBarChart rows={resolutionRows} suffix="h" />
        </ChartCard>

      </div>

      {/* SLA compliance detail */}
      <Card>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          SLA Compliance Detail
        </h3>
        {loadingSLA ? (
          <Skeleton height="6rem" />
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
                {slaData.map((row: SLAComplianceData, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>{row.period}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}><ComplianceBadge value={row.responseCompliance} /></td>
                    <td style={{ padding: '0.625rem 0.75rem' }}><ComplianceBadge value={row.resolutionCompliance} /></td>
                    <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{row.totalTickets}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span style={{
                        color: row.breachedTickets > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                        fontWeight: 600, fontFamily: 'var(--font-mono)',
                      }}>
                        {row.breachedTickets}
                      </span>
                    </td>
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
