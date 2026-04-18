import React, { useState } from 'react';
import {
  useGetTicketVolumeQuery, useGetSLAComplianceQuery,
  useGetResolutionTrendsQuery, useGetAgentPerformanceQuery,
} from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, MetricCard, Select, DataTable, Skeleton, ErrorState, Badge } from '@3sc/ui';
import type { AgentPerformance, AnalyticsFilters } from '@3sc/types';

export const AnalyticsPage: React.FC = () => {
  useDocumentTitle('Analytics');

  const [dateRange, setDateRange] = useState('30d');

  const now = new Date();
  const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const dateFrom = new Date(now.getTime() - daysBack * 86400000).toISOString();

  const filters: AnalyticsFilters = { dateFrom, dateTo: now.toISOString() };

  const { data: volume, isLoading: volLoading } = useGetTicketVolumeQuery(filters);
  const { data: sla, isLoading: slaLoading } = useGetSLAComplianceQuery(filters);
  const { data: trends } = useGetResolutionTrendsQuery(filters);
  const { data: agents, isLoading: agentsLoading } = useGetAgentPerformanceQuery(filters);

  const latestSLA = sla?.[sla.length - 1];
  const totalCreated = volume?.reduce((s, d) => s + d.created, 0) ?? 0;
  const totalResolved = volume?.reduce((s, d) => s + d.resolved, 0) ?? 0;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Analytics
        </h1>
        <div style={{ width: '8rem' }}>
          <Select
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
        gap: '0.875rem', marginBottom: '1.5rem',
      }}>
        <MetricCard title="Tickets Created" value={totalCreated} icon="📥" color="var(--color-info)" />
        <MetricCard title="Tickets Resolved" value={totalResolved} icon="✅" color="var(--color-success)" />
        <MetricCard
          title="SLA Compliance"
          value={latestSLA ? `${Math.round(latestSLA.resolutionCompliance * 100)}%` : '—'}
          icon="📊" color="var(--color-warning)"
        />
        <MetricCard
          title="Avg Resolution"
          value={trends?.[trends.length - 1]?.avgResolutionHours
            ? `${trends[trends.length - 1].avgResolutionHours.toFixed(1)}h`
            : '—'}
          icon="⏱" color="var(--color-text-muted)"
        />
      </div>

      {/* Volume chart representation (data table as alternative since no charting lib) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <Card>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            Ticket Volume
          </h3>
          {volLoading ? <Skeleton height="8rem" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Period</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Created</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {volume?.slice(-7).map((d) => (
                    <tr key={d.date}>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>{d.date}</td>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{d.created}</td>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right', color: 'var(--color-success)' }}>{d.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            SLA Compliance
          </h3>
          {slaLoading ? <Skeleton height="8rem" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Period</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Response</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {sla?.slice(-7).map((d) => (
                    <tr key={d.period}>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>{d.period}</td>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right', color: d.responseCompliance >= 0.9 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {Math.round(d.responseCompliance * 100)}%
                      </td>
                      <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right', color: d.resolutionCompliance >= 0.9 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {Math.round(d.resolutionCompliance * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          Agent Performance
        </h3>
        <DataTable
          columns={[
            { key: 'agentName', header: 'Agent', render: (a: AgentPerformance) => <span style={{ fontWeight: 500 }}>{a.agentName}</span> },
            { key: 'ticketsAssigned', header: 'Assigned', width: '6rem' },
            { key: 'ticketsResolved', header: 'Resolved', width: '6rem' },
            {
              key: 'avgResolutionHours', header: 'Avg Resolution', width: '8rem',
              render: (a: AgentPerformance) => `${a.avgResolutionHours.toFixed(1)}h`,
            },
            {
              key: 'slaCompliance', header: 'SLA %', width: '6rem',
              render: (a: AgentPerformance) => (
                <span style={{ color: a.slaCompliance >= 0.9 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {Math.round(a.slaCompliance * 100)}%
                </span>
              ),
            },
          ]}
          data={agents ?? []}
          keyExtractor={(a) => a.agentId}
          loading={agentsLoading}
          emptyMessage="No agent data available"
        />
      </Card>
    </div>
  );
};
