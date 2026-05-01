import React from 'react';

export interface AIToolCallIndicatorProps {
  tools: string[];
  status: 'running' | 'done' | 'error';
}

const TOOL_LABELS: Record<string, string> = {
  get_ticket_detail: 'Fetching ticket details',
  search_tickets: 'Searching tickets',
  get_my_tickets: 'Loading your tickets',
  get_recent_tickets: 'Loading recent tickets',
  get_ticket_summary: 'Summarizing ticket',
  get_bug_summary: 'Analyzing bugs',
  ask_kb: 'Searching knowledge base',
  get_project_status: 'Checking project status',
  get_sla_breaches: 'Checking SLA breaches',
  get_agent_workload: 'Loading team workload',
  get_client_overview: 'Loading client overview',
  get_releases: 'Loading delivery board',
  get_onboarding_summary: 'Loading onboarding status',
  get_digest: 'Generating digest',
  get_similar_tickets: 'Finding similar tickets',
  get_routing_suggestion: 'Analyzing routing options',
  draft_reply: 'Drafting reply',
  get_team_availability: 'Checking team availability',
  get_analytics_summary: 'Generating analytics',
};

export const AIToolCallIndicator: React.FC<AIToolCallIndicatorProps> = ({ tools, status }) => {
  const label = tools
    .map((t) => TOOL_LABELS[t] || t.replace(/_/g, ' '))
    .join(', ');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      margin: '0.375rem 0',
      padding: '0.5rem 0.75rem',
      background: 'var(--color-bg-muted)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.8125rem',
      color: status === 'error' ? 'var(--color-danger)' : 'var(--color-text-muted)',
    }}>
      {status === 'running' ? (
        <span style={{
          width: '0.875rem',
          height: '0.875rem',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-brand-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
      ) : status === 'done' ? (
        <span style={{ color: 'var(--color-success, #10b981)', flexShrink: 0 }}>✓</span>
      ) : (
        <span style={{ color: 'var(--color-danger)', flexShrink: 0 }}>✕</span>
      )}
      <span>{status === 'done' ? `Done: ${label}` : label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
