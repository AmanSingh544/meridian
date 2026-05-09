import React, { useState } from 'react';
import {
  useGetCsatKpisQuery,
  useGetCsatTrendsQuery,
  useGetNpsBreakdownQuery,
  useGetFeedbackThemesQuery,
} from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, MetricCard, MetricGrid, Skeleton, Button, Icon } from '@3sc/ui';
import { Star, TrendingUp, MessageSquare, BarChart3, Smile, Flag } from 'lucide-react';

// ── Chart primitives ─────────────────────────────────────────────────────────

/** CSS donut chart via conic-gradient */
const DonutChart: React.FC<{
  slices: Array<{ label: string; percentage: number; color: string }>;
}> = ({ slices }) => {
  let angle = 0;
  const gradient = slices
    .map((s) => {
      const start = angle;
      angle += (s.percentage / 100) * 360;
      return `${s.color} ${start.toFixed(1)}deg ${angle.toFixed(1)}deg`;
    })
    .join(', ');

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 140,
          height: 140,
          flexShrink: 0,
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '30%',
            background: 'var(--color-bg)',
            borderRadius: '50%',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 120 }}>
        {slices.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>
              {s.label}
            </span>
            <span
              style={{
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text)',
              }}
            >
              {s.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** SVG line + area chart for CSAT & NPS trends */
const TrendChart: React.FC<{
  data: Array<{ date: string; csat: number; nps: number }>;
}> = ({ data }) => {
  if (data.length < 2) return null;

  const W = 500;
  const H = 180;
  const pad = { top: 10, right: 10, bottom: 30, left: 30 };
  const gw = W - pad.left - pad.right;
  const gh = H - pad.top - pad.bottom;

  const maxCsat = 5;
  const maxNps = 100;

  const xFor = (i: number) => pad.left + (i / (data.length - 1)) * gw;
  const yForCsat = (v: number) => pad.top + gh - (v / maxCsat) * gh;
  const yForNps = (v: number) => pad.top + gh - (v / maxNps) * gh;

  const csatPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yForCsat(d.csat)}`)
    .join(' ');
  const csatArea = `${csatPath} L ${xFor(data.length - 1)} ${pad.top + gh} L ${pad.left} ${pad.top + gh} Z`;

  const npsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yForNps(d.nps)}`)
    .join(' ');
  const npsArea = `${npsPath} L ${xFor(data.length - 1)} ${pad.top + gh} L ${pad.left} ${pad.top + gh} Z`;

  const last = data[data.length - 1];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 320, height: 'auto' }}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1={pad.left}
            y1={pad.top + (i / 5) * gh}
            x2={W - pad.right}
            y2={pad.top + (i / 5) * gh}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        ))}

        {/* CSAT area */}
        <path d={csatArea} fill="rgba(59,130,246,0.12)" />
        {/* CSAT line */}
        <path d={csatPath} fill="none" stroke="#3b82f6" strokeWidth={2} />

        {/* NPS area */}
        <path d={npsArea} fill="rgba(34,197,94,0.08)" />
        {/* NPS line */}
        <path d={npsPath} fill="none" stroke="#22c55e" strokeWidth={2} />

        {/* Last value labels */}
        <rect x={xFor(data.length - 1) + 4} y={yForCsat(last.csat) - 14} width={28} height={16} rx={4} fill="#3b82f6" />
        <text x={xFor(data.length - 1) + 18} y={yForCsat(last.csat) - 3} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>
          {last.csat.toFixed(1)}
        </text>

        <rect x={xFor(data.length - 1) + 4} y={yForNps(last.nps) - 14} width={28} height={16} rx={4} fill="#22c55e" />
        <text x={xFor(data.length - 1) + 18} y={yForNps(last.nps) - 3} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>
          {last.nps}
        </text>

        {/* X labels (show ~6 labels) */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, idx, arr) => {
          const i = data.indexOf(d);
          return (
            <text
              key={i}
              x={xFor(i)}
              y={H - 6}
              textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}
              fill="var(--color-text-muted)"
              fontSize={9}
              transform={`rotate(-35, ${xFor(i)}, ${H - 6})`}
            >
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

/** Horizontal bar chart for feedback themes */
const ThemeBarChart: React.FC<{
  rows: Array<{ theme: string; count: number; sentiment: string }>;
}> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.count), 1);

  const sentimentColor = (s: string) => {
    if (s === 'positive') return '#22c55e';
    if (s === 'negative') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {rows.map((row) => (
        <div key={row.theme} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
              {row.theme}
            </span>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text)',
              }}
            >
              {row.count}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              height: '0.625rem',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(row.count / max) * 100}%`,
                height: '100%',
                background: sentimentColor(row.sentiment),
                borderRadius: 'var(--radius-sm)',
                transition: 'width 0.5s ease',
                minWidth: row.count > 0 ? 4 : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Date range options ───────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { label: '7d', full: 'Last 7 days', days: 7 },
  { label: '30d', full: 'Last 30 days', days: 30 },
  { label: '90d', full: 'Last 90 days', days: 90 },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export const CsatDashboardPage: React.FC = () => {
  useDocumentTitle('CSAT & NPS');
  const [pendingRange, setPendingRange] = useState('30d');
  const [rangeKey, setRangeKey] = useState('30d');

  const { data: kpiData, isLoading: kpiLoading } = useGetCsatKpisQuery({ period: rangeKey });
  const { data: trendData, isLoading: trendLoading } = useGetCsatTrendsQuery({ period: rangeKey });
  const { data: npsData, isLoading: npsLoading } = useGetNpsBreakdownQuery({ period: rangeKey });
  const { data: themeData, isLoading: themeLoading } = useGetFeedbackThemesQuery({ period: rangeKey });

  const handleApplyFilters = () => {
    setRangeKey(pendingRange);
  };

  const npsSlices = npsData
    ? [
        { label: 'Promoters', percentage: npsData.promoters, color: '#22c55e' },
        { label: 'Passives', percentage: npsData.passives, color: '#facc15' },
        { label: 'Detractors', percentage: npsData.detractors, color: '#f97316' },
      ]
    : [];

  const handleExport = () => {
    if (!trendData) return;
    const rows = [['Date', 'CSAT', 'NPS'], ...trendData.map((d) => [d.date, d.csat, d.nps])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csat-nps-trends-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.375rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}
          >
            CSAT Tracking Dashboard
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Customer Satisfaction & Product Utility Insights • Last {rangeKey === '7d' ? '7 Days' : rangeKey === '90d' ? '90 Days' : '30 Days'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <select
          value={pendingRange}
          onChange={(e) => setPendingRange(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.label}>
              {opt.full}
            </option>
          ))}
        </select>

        <select
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <option>All Projects</option>
        </select>

        <select
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <option>All Modules</option>
        </select>

        <select
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <option>All Segments</option>
        </select>

        <div style={{ flex: 1 }} />

        <Button variant="primary" size="sm" onClick={handleApplyFilters}>
          Apply Filters
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={!trendData}>
          ⬇ Export
        </Button>
      </div>

      {/* KPI row */}
      <MetricGrid density="compact">
        <MetricCard
          title="Average CSAT score"
          value={kpiLoading ? '…' : kpiData ? `${kpiData.avgCsat.toFixed(1)}/5` : '—'}
          icon={<Icon icon={Star} />}
          variant="warning"
        />
        <MetricCard
          title="NPS score"
          value={kpiLoading ? '…' : kpiData?.npsScore ?? '—'}
          icon={<Icon icon={TrendingUp} />}
          variant="success"
        />
        <MetricCard
          title="Total responses"
          value={kpiLoading ? '…' : kpiData?.totalResponses ?? '—'}
          icon={<Icon icon={MessageSquare} />}
          variant="info"
        />
        <MetricCard
          title="Response rate"
          value={kpiLoading ? '…' : kpiData ? `${kpiData.responseRate}%` : '—'}
          icon={<Icon icon={BarChart3} />}
          variant="brand"
        />
        <MetricCard
          title="Positive sentiment"
          value={kpiLoading ? '…' : kpiData ? `${kpiData.positiveSentiment}%` : '—'}
          icon={<Icon icon={Smile} />}
          variant="success"
        />
        <MetricCard
          title="Flagged issues"
          value={kpiLoading ? '…' : kpiData?.flaggedIssues ?? '—'}
          icon={<Icon icon={Flag} />}
          variant="danger"
        />
      </MetricGrid>

      {/* Charts row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <Card hover>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                CSAT & NPS Trends Over Time
              </h3>
              <div style={{ display: 'flex', gap: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }} />
                  CSAT
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} />
                  NPS
                </div>
              </div>
            </div>
          </div>
          {trendLoading ? <Skeleton height="10rem" /> : trendData && <TrendChart data={trendData} />}
        </Card>

        <Card hover>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              NPS Breakdown
            </h3>
          </div>
          {npsLoading ? (
            <Skeleton height="10rem" />
          ) : (
            npsData && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                <DonutChart slices={npsSlices} />
              </div>
            )
          )}
        </Card>
      </div>

      {/* Feedback Themes */}
      <Card hover>
        <h3
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
          }}
        >
          Top 5 Feedback Themes
        </h3>
        {themeLoading ? <Skeleton height="8rem" /> : themeData && <ThemeBarChart rows={themeData} />}
      </Card>
    </div>
  );
};

export default CsatDashboardPage;
