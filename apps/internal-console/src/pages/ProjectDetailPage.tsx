import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useGetProjectQuery,
  useGetProjectHealthQuery,
  useGetProjectClustersQuery,
  useGetProjectScopeDriftQuery,
  useGetProjectChurnRiskQuery,
  useGetProjectStatusReportQuery,
  useGetProjectNextActionQuery,
  useGetProjectMilestonePredictionsQuery,
  useAskProjectMutation,
  useGetTicketsQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, ErrorState, useToast } from '@3sc/ui';
import { formatDate } from '@3sc/utils';
import { Permission } from '@3sc/types';
import type { ProjectHealthColor, ProjectQAAnswer } from '@3sc/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<ProjectHealthColor, { color: string; bg: string; border: string; icon: string }> = {
  green: { color: 'var(--color-success)', bg: 'var(--color-success-light, #d1fae5)', border: 'var(--color-success)', icon: '●' },
  amber: { color: 'var(--color-warning)', bg: 'var(--color-warning-light, #fef3c7)', border: 'var(--color-warning)', icon: '▲' },
  red:   { color: 'var(--color-danger)',  bg: 'var(--color-danger-light, #fee2e2)',   border: 'var(--color-danger)',  icon: '!' },
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'info'> = {
  active: 'success', planning: 'info', on_hold: 'warning', completed: 'neutral', cancelled: 'danger',
};

const CHURN_COLORS: Record<string, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
};

type Tab = 'overview' | 'milestones' | 'tickets' | 'ai';
type TicketView = 'list' | 'kanban';

// ── Section components ────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
    {children}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const canInsights = permissions.has(Permission.AI_PROJECT_INSIGHTS);
  const canReports = permissions.has(Permission.AI_PROJECT_REPORTS);
  const canQA = permissions.has(Permission.AI_PROJECT_QA);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [ticketView, setTicketView] = useState<TicketView>(() => {
    return (localStorage.getItem('projectTicketView') as TicketView) ?? 'list';
  });
  const [question, setQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState<ProjectQAAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const qaRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading, isError } = useGetProjectQuery(id ?? '', { skip: !id });
  const { data: health } = useGetProjectHealthQuery(id ?? '', { skip: !id || !canInsights });
  const { data: clusters } = useGetProjectClustersQuery(id ?? '', { skip: !id || !canInsights });
  const { data: scopeDrift } = useGetProjectScopeDriftQuery(id ?? '', { skip: !id || !canInsights });
  const { data: churnRisk } = useGetProjectChurnRiskQuery(id ?? '', { skip: !id || !canInsights });
  const { data: statusReport } = useGetProjectStatusReportQuery(id ?? '', { skip: !id || !canReports });
  const { data: nextAction } = useGetProjectNextActionQuery(id ?? '', { skip: !id || !canInsights });
  const { data: milestonePredictions } = useGetProjectMilestonePredictionsQuery(id ?? '', { skip: !id });
  const { data: ticketsData } = useGetTicketsQuery({ projectId: id, page: 1, page_size: 50 } as Parameters<typeof useGetTicketsQuery>[0], { skip: !id });
  const [askProject] = useAskProjectMutation();

  useDocumentTitle(project ? project.name : 'Project');

  const handleAsk = async () => {
    if (!question.trim() || asking || !id) return;
    setAsking(true);
    setQaAnswer(null);
    try {
      const result = await askProject({ projectId: id, question: question.trim() }).unwrap();
      setQaAnswer(result);
    } catch {
      setQaAnswer({ answer: 'Something went wrong. Please try again.', confidence: 0, sourceTicketIds: [], cannotAnswer: true });
    } finally {
      setAsking(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '60rem' }}>
        <Skeleton height="1rem" style={{ width: '8rem', marginBottom: '1.5rem' }} />
        <Skeleton height="2rem" style={{ marginBottom: '1rem' }} />
        <Skeleton height="6rem" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <ErrorState
        title="Project not found"
        description="This project may have been deleted or you don't have access."
        action={<Button variant="primary" onClick={() => navigate('/projects')}>Back to Projects</Button>}
      />
    );
  }

  const completedMilestones = project.milestones.filter((m) => m.isCompleted).length;
  const progress = project.milestones.length > 0
    ? Math.round((completedMilestones / project.milestones.length) * 100)
    : 0;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'milestones', label: `Milestones (${project.milestones.length})` },
    { key: 'tickets', label: `Tickets (${project.ticketCount})` },
    ...(canInsights || canReports ? [{ key: 'ai' as Tab, label: 'AI Intelligence' }] : []),
  ];

  return (
    <div style={{ maxWidth: '72rem' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        <Link to="/projects" style={{ color: 'var(--color-brand-600)', textDecoration: 'none' }}>Projects</Link>
        <span>/</span>
        <span>{project.name}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{project.name}</h1>
            <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>{project.status.replace('_', ' ')}</Badge>
            {health && canInsights && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.625rem',
                borderRadius: '999px', border: `1px solid ${HEALTH_CONFIG[health.color].border}`,
                background: HEALTH_CONFIG[health.color].bg, color: HEALTH_CONFIG[health.color].color,
              }}>
                {HEALTH_CONFIG[health.color].icon} {health.color === 'green' ? 'Healthy' : health.color === 'amber' ? 'At Risk' : 'Critical'} — {health.score}/100
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{project.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>← Back</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Tickets', value: String(project.ticketCount) },
          { label: 'Open', value: String(project.openTicketCount ?? '—'), highlight: (project.openTicketCount ?? 0) > 0 },
          { label: 'Resolved This Week', value: String(project.resolvedThisWeek ?? '—'), positive: true },
          { label: 'Milestone Progress', value: `${progress}%` },
          { label: 'Target Date', value: project.targetDate ? formatDate(project.targetDate) : '—' },
          ...(canInsights && churnRisk ? [{ label: 'Churn Risk', value: churnRisk.level.toUpperCase(), churn: churnRisk.level }] : []),
        ].map((kpi, i) => (
          <Card key={i} style={{ padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{kpi.label}</div>
            <div style={{
              fontSize: '1.25rem', fontWeight: 700,
              color: 'churn' in kpi ? CHURN_COLORS[kpi.churn as string] : kpi.highlight ? 'var(--color-danger)' : kpi.positive ? 'var(--color-success)' : 'var(--color-text)',
            }}>
              {kpi.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Next Best Action banner */}
      {canInsights && nextAction && nextAction.urgency === 'high' && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.125rem',
          background: 'var(--color-warning-light, #fef3c7)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>Recommended Action</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{nextAction.action}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{nextAction.reason}</div>
          </div>
          {nextAction.draftMessage && (
            <Button variant="ghost" size="sm" onClick={() => setDraftExpanded(!draftExpanded)} style={{ flexShrink: 0 }}>
              {draftExpanded ? 'Hide Draft' : 'View Draft'}
            </Button>
          )}
        </div>
      )}
      {draftExpanded && nextAction?.draftMessage && (
        <Card style={{ marginBottom: '1.25rem', background: 'var(--color-bg-subtle)' }}>
          <SectionLabel>AI-drafted message — review before sending</SectionLabel>
          <pre style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.8125rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>
            {nextAction.draftMessage}
          </pre>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
            <Button variant="ghost" size="sm" onClick={() => {
              navigator.clipboard.writeText(nextAction.draftMessage!);
              showToast({ message: 'Draft copied to clipboard', variant: 'success' });
            }}>Copy</Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.625rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-brand-500)' : '2px solid transparent',
              marginBottom: -1, fontFamily: 'var(--font-body)',
              transition: 'var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 20rem)', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Scope */}
            {project.scope && (
              <Card>
                <SectionLabel>Project Scope</SectionLabel>
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{project.scope}</p>
              </Card>
            )}

            {/* Status report */}
            {canReports && statusReport && (
              <Card>
                <SectionLabel>AI Status Report — {statusReport.period}</SectionLabel>
                <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text)' }}>{statusReport.summary}</p>
                {statusReport.blockers.length > 0 && (
                  <div style={{ marginBottom: '0.875rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.375rem' }}>Blockers</div>
                    {statusReport.blockers.map((b, i) => (
                      <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '0.25rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        🚧 {b}
                      </div>
                    ))}
                  </div>
                )}
                {statusReport.nextSteps.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Next Steps</div>
                    {statusReport.nextSteps.map((s, i) => (
                      <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '0.25rem 0' }}>→ {s}</div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  🤖 {statusReport.milestoneConfidence}
                </div>
              </Card>
            )}

            {/* AI Q&A */}
            {canQA && (
              <Card>
                <SectionLabel>Ask AI About This Project</SectionLabel>
                <p style={{ margin: '0 0 0.875rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Ask natural-language questions grounded in this project's ticket history.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    ref={qaRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="e.g. Why is the Backend APIs milestone delayed?"
                    style={{
                      flex: 1, padding: '0.625rem 0.875rem',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                      background: 'var(--color-bg)', color: 'var(--color-text)',
                      fontFamily: 'var(--font-body)', outline: 'none',
                    }}
                  />
                  <Button variant="primary" size="sm" onClick={handleAsk} loading={asking} disabled={!question.trim() || asking}>Ask</Button>
                </div>

                {asking && (
                  <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    <div style={{ width: 14, height: 14, border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    Searching project history…
                  </div>
                )}

                {qaAnswer && (
                  <div style={{
                    marginTop: '0.875rem', padding: '0.875rem',
                    background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.875rem', lineHeight: 1.7,
                    color: qaAnswer.cannotAnswer ? 'var(--color-text-muted)' : 'var(--color-text)',
                  }}>
                    {qaAnswer.answer}
                    {!qaAnswer.cannotAnswer && qaAnswer.confidence > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden', maxWidth: '6rem' }}>
                          <div style={{ height: '100%', width: `${Math.round(qaAnswer.confidence * 100)}%`, background: 'var(--color-brand-500)' }} />
                        </div>
                        <span>{Math.round(qaAnswer.confidence * 100)}% confident</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Project meta */}
            <Card>
              <SectionLabel>Details</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {project.lead && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Lead</span>
                    <span style={{ fontWeight: 500 }}>{project.lead.displayName}</span>
                  </div>
                )}
                {project.organization && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Client</span>
                    <span style={{ fontWeight: 500 }}>{project.organization.name}</span>
                  </div>
                )}
                {project.startDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Started</span>
                    <span>{formatDate(project.startDate)}</span>
                  </div>
                )}
                {project.targetDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Target</span>
                    <span>{formatDate(project.targetDate)}</span>
                  </div>
                )}
                {project.completedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Completed</span>
                    <span style={{ color: 'var(--color-success)' }}>{formatDate(project.completedAt)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Health score */}
            {canInsights && health && (
              <Card style={{ borderLeft: `3px solid ${HEALTH_CONFIG[health.color].border}` }}>
                <SectionLabel>AI Health Score</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: HEALTH_CONFIG[health.color].bg, fontSize: '1.125rem', fontWeight: 800,
                    color: HEALTH_CONFIG[health.color].color,
                  }}>
                    {health.score}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: HEALTH_CONFIG[health.color].color }}>
                      {health.color === 'green' ? 'Healthy' : health.color === 'amber' ? 'At Risk' : 'Critical'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Velocity: {health.velocityTrend} · {health.openBlockers} blocker{health.openBlockers !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{health.explanation}</p>
              </Card>
            )}

            {/* Churn risk */}
            {canInsights && churnRisk && (
              <Card style={{ borderLeft: `3px solid ${CHURN_COLORS[churnRisk.level]}` }}>
                <SectionLabel>Churn Risk</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: CHURN_COLORS[churnRisk.level], fontSize: '0.875rem' }}>
                    {churnRisk.level.toUpperCase()} — {Math.round(churnRisk.score * 100)}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.625rem' }}>
                  {churnRisk.signals.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '0.1875rem 0', borderBottom: '1px solid var(--color-border)' }}>⚠ {s}</div>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {churnRisk.recommendation}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Milestones Tab ── */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {project.milestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No milestones defined yet.
            </div>
          ) : project.milestones.map((ms) => {
            const prediction = milestonePredictions?.find((p) => p.milestoneId === ms.id);
            return (
              <Card key={ms.id} style={{ borderLeft: `3px solid ${ms.isCompleted ? 'var(--color-success)' : prediction && !prediction.onTrack ? 'var(--color-danger)' : 'var(--color-border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1rem' }}>{ms.isCompleted ? '✅' : '⭕'}</span>
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{ms.title}</h3>
                    </div>
                    {ms.description && (
                      <p style={{ margin: '0 0 0.5rem 1.625rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{ms.description}</p>
                    )}
                    <div style={{ marginLeft: '1.625rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Scheduled: {formatDate(ms.dueDate)}</span>
                      {ms.isCompleted && ms.completedAt && (
                        <span style={{ color: 'var(--color-success)' }}>Completed: {formatDate(ms.completedAt)}</span>
                      )}
                    </div>
                  </div>
                  {prediction && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: prediction.onTrack ? 'var(--color-success)' : 'var(--color-danger)', marginBottom: '0.25rem' }}>
                        {prediction.onTrack ? '✓ On Track' : '⚠ Delayed'}
                      </div>
                      {!prediction.onTrack && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Predicted: {formatDate(prediction.predictedDate)}
                        </div>
                      )}
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        {prediction.reasoning.slice(0, 60)}…
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {activeTab === 'tickets' && (
        <div>
          {/* View toggle header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {ticketsData?.data.length ?? 0} tickets
            </span>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.1875rem' }}>
              {([
                { key: 'list' as TicketView, icon: '☰', label: 'List' },
                { key: 'kanban' as TicketView, icon: '⊞', label: 'Kanban' },
              ] as const).map(v => (
                <button
                  key={v.key}
                  onClick={() => { setTicketView(v.key); localStorage.setItem('projectTicketView', v.key); }}
                  title={v.label}
                  style={{
                    padding: '0.3125rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none', cursor: 'pointer',
                    fontSize: '0.875rem',
                    background: ticketView === v.key ? 'var(--color-bg)' : 'transparent',
                    color: ticketView === v.key ? 'var(--color-brand-500)' : 'var(--color-text-muted)',
                    boxShadow: ticketView === v.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    fontWeight: ticketView === v.key ? 600 : 400,
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {!ticketsData || ticketsData.data.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem',
              background: 'var(--color-bg)', border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎫</div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>No tickets yet</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Tickets linked to this project will appear here.
              </p>
            </div>
          ) : ticketView === 'list' ? (
            <Card style={{ overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                    {['#', 'Title', 'Status', 'Priority', 'Assignee', 'Updated'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ticketsData.data.map((ticket, idx) => (
                    <tr
                      key={ticket.id}
                      style={{ borderBottom: idx < ticketsData.data.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <td style={{ padding: '0.625rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{ticket.ticketNumber}</td>
                      <td style={{ padding: '0.625rem 1rem', maxWidth: '20rem' }}>
                        <span style={{ fontWeight: 500 }}>{ticket.title}</span>
                      </td>
                      <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap' }}>
                        <Badge variant={ticket.status === 'OPEN' ? 'danger' : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'success' : 'warning'}>
                          {ticket.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap' }}>
                        <Badge variant={ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? 'danger' : ticket.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.625rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {ticket.assignee?.displayName ?? '—'}
                      </td>
                      <td style={{ padding: '0.625rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {formatDate(ticket.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            /* ── Kanban view ── */
            (() => {
              const COLUMNS: Array<{ key: string; label: string; statuses: string[]; accentColor: string }> = [
                { key: 'todo',        label: 'TO DO',       statuses: ['OPEN'],                         accentColor: '#94a3b8' },
                { key: 'inprogress',  label: 'IN PROGRESS', statuses: ['ACKNOWLEDGED', 'IN_PROGRESS'],  accentColor: '#6366f1' },
                { key: 'resolved',    label: 'RESOLVED',    statuses: ['RESOLVED'],                     accentColor: '#f59e0b' },
                { key: 'done',        label: 'DONE',        statuses: ['CLOSED'],                       accentColor: '#22c55e' },
              ];

              const priorityDot: Record<string, string> = {
                CRITICAL: '#dc2626', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#94a3b8',
              };

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(13rem, 1fr))`,
                  gap: '0.75rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem',
                }}>
                  {COLUMNS.map(col => {
                    const colTickets = ticketsData.data.filter(t => col.statuses.includes(t.status));
                    return (
                      <div key={col.key}>
                        {/* Column header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          marginBottom: '0.625rem', padding: '0 0.25rem',
                        }}>
                          <div style={{ width: 3, height: '1rem', borderRadius: '2px', background: col.accentColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>
                            {col.label}
                          </span>
                          <span style={{
                            marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 700,
                            background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)', padding: '0.0625rem 0.375rem',
                          }}>
                            {colTickets.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '4rem' }}>
                          {colTickets.length === 0 ? (
                            <div style={{
                              padding: '1.25rem', textAlign: 'center',
                              color: 'var(--color-text-muted)', fontSize: '0.75rem',
                              border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                            }}>
                              No tickets
                            </div>
                          ) : colTickets.map(ticket => (
                            <div
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              style={{
                                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)', padding: '0.75rem',
                                cursor: 'pointer',
                                borderLeft: `3px solid ${priorityDot[ticket.priority] ?? '#94a3b8'}`,
                                transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'none';
                              }}
                            >
                              {/* Ticket number */}
                              <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: col.accentColor, fontWeight: 700, marginBottom: '0.375rem' }}>
                                {ticket.ticketNumber}
                              </div>

                              {/* Title */}
                              <p style={{
                                margin: '0 0 0.625rem', fontSize: '0.8125rem', fontWeight: 600,
                                color: 'var(--color-text)', lineHeight: 1.4,
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}>
                                {ticket.title}
                              </p>

                              {/* Footer: priority + assignee */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.375rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: priorityDot[ticket.priority] }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityDot[ticket.priority], flexShrink: 0 }} />
                                  {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                                </span>
                                {ticket.assignee ? (
                                  <div style={{
                                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                                    background: 'var(--color-brand-500)', color: '#fff',
                                    fontSize: '0.5625rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, title: ticket.assignee.displayName,
                                  }}>
                                    {ticket.assignee.displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                ) : (
                                  <div style={{
                                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                                    background: 'var(--color-bg-subtle)', border: '1px dashed var(--color-border)',
                                    flexShrink: 0,
                                  }} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ── AI Intelligence Tab ── */}
      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Ticket clusters */}
          {canInsights && clusters && clusters.length > 0 && (
            <Card>
              <SectionLabel>Semantic Ticket Clusters</SectionLabel>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                AI-detected recurring themes across all tickets in this project.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {clusters.map((cluster) => (
                  <div key={cluster.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
                    background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: cluster.sentiment === 'negative' ? 'var(--color-danger-light, #fee2e2)' : cluster.sentiment === 'positive' ? 'var(--color-success-light, #d1fae5)' : 'var(--color-bg-muted)',
                      fontSize: '1rem',
                    }}>
                      {cluster.sentiment === 'negative' ? '📉' : cluster.sentiment === 'positive' ? '📈' : '📊'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{cluster.label}</div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {cluster.topKeywords.map((kw) => (
                          <span key={kw} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '999px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cluster.ticketCount}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>tickets</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Scope drift */}
          {canInsights && scopeDrift && scopeDrift.length > 0 && (
            <Card>
              <SectionLabel>Scope Drift Flags</SectionLabel>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Tickets that appear semantically outside the declared project scope. Review whether they should be billed separately or descoped.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {scopeDrift.map((drift) => (
                  <div key={drift.ticketId} style={{
                    padding: '0.75rem', background: 'var(--color-warning-light, #fef3c7)',
                    border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem' }}>⚠</span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{drift.ticketTitle}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {Math.round(drift.similarity * 100)}% scope match
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{drift.reasoning}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Milestone predictions */}
          {milestonePredictions && milestonePredictions.length > 0 && (
            <Card>
              <SectionLabel>Milestone Delivery Predictions</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {milestonePredictions.map((pred) => (
                  <div key={pred.milestoneId} style={{ padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{pred.milestoneName}</span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '999px',
                        background: pred.onTrack ? 'var(--color-success-light, #d1fae5)' : 'var(--color-danger-light, #fee2e2)',
                        color: pred.onTrack ? 'var(--color-success)' : 'var(--color-danger)',
                      }}>
                        {pred.onTrack ? '✓ On Track' : '⚠ At Risk'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                      <span>Scheduled: {formatDate(pred.scheduledDate)}</span>
                      <span style={{ color: pred.onTrack ? 'var(--color-text-muted)' : 'var(--color-danger)' }}>
                        Predicted: {formatDate(pred.predictedDate)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{pred.reasoning}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!canInsights && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              AI insights are available to Lead and Admin roles.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
