import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useGetProjectQuery,
  useGetProjectStatusReportQuery,
  useGetProjectMilestonePredictionsQuery,
  useAskProjectMutation,
} from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, ErrorState, AIAnswerCard } from '@3sc/ui';
import { formatDate } from '@3sc/utils';
import type { ProjectQAAnswer } from '@3sc/types';


const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'info'> = {
  active: 'success', planning: 'info', on_hold: 'warning', completed: 'neutral', cancelled: 'danger',
};

type Tab = 'overview' | 'milestones' | 'history';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [question, setQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState<ProjectQAAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading, isError } = useGetProjectQuery(id ?? '', { skip: !id });
  const { data: statusReport } = useGetProjectStatusReportQuery(id ?? '', { skip: !id });
  const { data: predictions } = useGetProjectMilestonePredictionsQuery(id ?? '', { skip: !id });
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
      <div style={{ maxWidth: '100%' }}>
        <Skeleton height="1rem" style={{ width: '8rem', marginBottom: '1.5rem' }} />
        <Skeleton height="2rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton height="6rem" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <ErrorState
        title="Project not found"
        description="This project may have been removed or you may not have access."
        action={<Button variant="primary" onClick={() => navigate('/projects')}>Back to Projects</Button>}
      />
    );
  }

  const milestones = project.milestones ?? [];
  const completedMilestones = milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = milestones.length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'milestones', label: `Milestones (${totalMilestones})` },
    { key: 'history', label: 'Ask AI' },
  ];

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        <Link to="/projects" style={{ color: 'var(--color-brand-600)', textDecoration: 'none' }}>Projects</Link>
        <span>/</span>
        <span>{project.name}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{project.name}</h1>
          <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>{project.status.replace('_', ' ')}</Badge>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{project.description}</p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Tickets', value: String(project.ticketCount) },
          { label: 'Open Issues', value: String(project.openTicketCount ?? 0), warn: (project.openTicketCount ?? 0) > 0 },
          { label: 'Resolved This Week', value: String(project.resolvedThisWeek ?? 0), good: (project.resolvedThisWeek ?? 0) > 0 },
          { label: 'Progress', value: `${progress}%` },
          ...(project.targetDate ? [{ label: 'Target Date', value: formatDate(project.targetDate) }] : []),
        ].map((kpi, i) => (
          <Card key={i} style={{ padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{kpi.label}</div>
            <div style={{
              fontSize: '1.25rem', fontWeight: 700,
              color: 'warn' in kpi && kpi.warn ? 'var(--color-warning)' : 'good' in kpi && kpi.good ? 'var(--color-success)' : 'var(--color-text)',
            }}>
              {kpi.value}
            </div>
          </Card>
        ))}
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* AI Status Report */}
          {statusReport ? (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <span style={{ fontSize: '1rem' }}>📋</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Weekly Update — {statusReport.period}</h3>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '999px',
                  background: statusReport.onTrack ? 'var(--color-success-light, #d1fae5)' : 'var(--color-warning-light, #fef3c7)',
                  color: statusReport.onTrack ? 'var(--color-success)' : 'var(--color-warning)',
                }}>
                  {statusReport.onTrack ? '✓ On Track' : '⚠ Attention Needed'}
                </span>
              </div>

              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text)' }}>{statusReport.summary}</p>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{statusReport.resolvedThisWeek}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Resolved this week</div>
                </div>
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: statusReport.openCount > 5 ? 'var(--color-warning)' : 'var(--color-text)' }}>{statusReport.openCount}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Open items</div>
                </div>
              </div>

              {(statusReport.blockers ?? []).length > 0 && (
                <div style={{ marginBottom: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '0.375rem' }}>Needs Your Attention</div>
                  {statusReport.blockers.map((b, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '0.375rem 0', borderBottom: '1px solid var(--color-border)' }}>
                      ⚠ {b}
                    </div>
                  ))}
                </div>
              )}

              {(statusReport.nextSteps ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>What's Next</div>
                  {statusReport.nextSteps.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '0.25rem 0' }}>→ {s}</div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                🤖 {statusReport.milestoneConfidence}
              </div>
            </Card>
          ) : (
            <Card>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No status report available yet. Reports are generated weekly.</p>
            </Card>
          )}

          {/* Project details */}
          <Card>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>Project Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.8125rem' }}>
              {project.lead && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>Project Lead</span>
                  <span style={{ fontWeight: 500 }}>{project.lead.displayName}</span>
                </>
              )}
              {project.startDate && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>Start Date</span>
                  <span>{formatDate(project.startDate)}</span>
                </>
              )}
              {project.targetDate && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>Target Date</span>
                  <span>{formatDate(project.targetDate)}</span>
                </>
              )}
              {project.completedAt && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>Completed</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{formatDate(project.completedAt)}</span>
                </>
              )}
            </div>
          </Card>

          {/* Milestone summary */}
          {totalMilestones > 0 && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Milestones</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{completedMilestones} of {totalMilestones} complete</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-bg-muted)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.875rem' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--color-success)' : 'var(--color-brand-500)', borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('milestones')}>View All Milestones →</Button>
            </Card>
          )}
        </div>
      )}

      {/* ── Milestones Tab ── */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {totalMilestones === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No milestones have been defined for this project yet.
            </div>
          ) : project.milestones.map((ms) => {
            const prediction = predictions?.find((p) => p.milestoneId === ms.id);
            return (
              <Card key={ms.id} style={{ borderLeft: `3px solid ${ms.isCompleted ? 'var(--color-success)' : prediction && !prediction.onTrack ? 'var(--color-warning)' : 'var(--color-border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span>{ms.isCompleted ? '✅' : '⭕'}</span>
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{ms.title}</h3>
                    </div>
                    {ms.description && (
                      <p style={{ margin: '0.25rem 0 0.375rem 1.625rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{ms.description}</p>
                    )}
                    <div style={{ marginLeft: '1.625rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Due: {formatDate(ms.dueDate)}</span>
                      {ms.completedAt && <span style={{ color: 'var(--color-success)' }}>Completed: {formatDate(ms.completedAt)}</span>}
                    </div>
                  </div>
                  {prediction && !ms.isCompleted && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '999px',
                        background: prediction.onTrack ? 'var(--color-success-light, #d1fae5)' : 'var(--color-warning-light, #fef3c7)',
                        color: prediction.onTrack ? 'var(--color-success)' : 'var(--color-warning)',
                      }}>
                        {prediction.onTrack ? '✓ On Track' : '⚠ May Slip'}
                      </span>
                      {!prediction.onTrack && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                          AI estimate: {formatDate(prediction.predictedDate)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Ask AI Tab ── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.125rem' }}>🤖</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>Ask About Your Project</h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Ask any question about this project's history, progress, or upcoming milestones. The AI answers based on actual project activity.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="e.g. What's blocking the data migration milestone?"
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

            {/* Suggested prompts */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {[
                'What milestones are coming up?',
                'Are we on track for the target date?',
                'What was resolved this week?',
                'Are there any blockers I should know about?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setQuestion(prompt); inputRef.current?.focus(); }}
                  style={{
                    padding: '0.3125rem 0.75rem', borderRadius: '999px', cursor: 'pointer',
                    fontSize: '0.75rem', border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-subtle)', color: 'var(--color-brand-600)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>

          {asking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', padding: '0.75rem' }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              Searching project history…
            </div>
          )}

          {qaAnswer && (
            <AIAnswerCard
              answer={qaAnswer.answer}
              confidence={qaAnswer.confidence}
              cannotAnswer={qaAnswer.cannotAnswer}
            />
          )}
        </div>
      )}
    </div>
  );
};
