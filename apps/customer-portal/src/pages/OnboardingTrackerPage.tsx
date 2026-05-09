import React, { useState } from 'react';
import { useGetMyOnboardingQuery, useUpdateOnboardingTaskMutation, useGetRoadmapSummaryQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, Skeleton, EmptyState, Icon } from '@3sc/ui';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { OnboardingPhase, OnboardingTask, OnboardingTaskStatus } from '@3sc/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_STYLE: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  ON_TRACK: { bg: 'var(--color-success-light, #d1fae5)', text: 'var(--color-success)', label: 'On Track', emoji: '✓' },
  AT_RISK:  { bg: 'var(--color-warning-light, #fef3c7)', text: 'var(--color-warning)', label: 'At Risk',  emoji: '!' },
  BLOCKED:  { bg: 'var(--color-danger-light, #fee2e2)',  text: 'var(--color-danger)',  label: 'Blocked',  emoji: '✕' },
};

const TASK_STATUS_STYLE: Record<OnboardingTaskStatus, { color: string; label: string }> = {
  DONE:        { color: 'var(--color-success)',    label: 'Complete' },
  IN_PROGRESS: { color: 'var(--color-info)',       label: 'In Progress' },
  PENDING:     { color: 'var(--color-text-muted)', label: 'Upcoming' },
  BLOCKED:     { color: 'var(--color-danger)',     label: 'Blocked' },
};

// ── Phase accordion ───────────────────────────────────────────────────────────

const PhasePanel: React.FC<{
  phase: OnboardingPhase;
  onboardingId: string;
  canEditClientTasks: boolean;
}> = ({ phase, onboardingId, canEditClientTasks }) => {
  const [expanded, setExpanded] = useState(phase.status === 'IN_PROGRESS');
  const [updateTask] = useUpdateOnboardingTaskMutation();

  const handleCheck = async (task: OnboardingTask) => {
    if (!canEditClientTasks || task.owner === 'DELIVERY') return;
    const newStatus: OnboardingTaskStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask({ onboardingId, taskId: task.id, data: { status: newStatus } });
  };

  const phaseColor =
    phase.status === 'COMPLETED' ? 'var(--color-success)' :
    phase.status === 'IN_PROGRESS' ? 'var(--color-brand-600)' :
    'var(--color-border)';

  const statusLabel =
    phase.status === 'COMPLETED' ? 'Complete' :
    phase.status === 'IN_PROGRESS' ? 'In Progress' : 'Upcoming';

  return (
    <Card hover style={{ borderRadius: '0.625rem' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '1rem 1.25rem',
          background: 'var(--color-bg)', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Step circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: phaseColor, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 700,
        }}>
          {phase.status === 'COMPLETED' ? '✓' : phase.phaseNumber}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>{phase.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{statusLabel}</div>
        </div>

        {/* Mini progress */}
        <div style={{ width: '6rem' }}>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(148,163,184,0.25)' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${phase.progress}%`, background: phaseColor, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <span style={{
          fontSize: '0.8125rem', fontWeight: 700, minWidth: '2.75rem', textAlign: 'right',
          color: phaseColor === 'var(--color-border)' ? 'var(--color-text-muted)' : phaseColor,
        }}>
          {phase.progress}%
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
          {/* Tasks header */}
          <div style={{
            padding: '0.5rem 1.25rem 0.375rem',
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em',
            color: 'var(--color-text-muted)', textTransform: 'uppercase',
            borderBottom: '1px solid var(--color-border)',
          }}>
            Tasks in this phase
          </div>

          {phase.tasks.map((task, idx) => {
            const isClientTask = task.owner === 'CLIENT';
            const canCheck = canEditClientTasks && isClientTask;
            const style = TASK_STATUS_STYLE[task.status];
            const isDone = task.status === 'DONE';

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                  padding: '0.875rem 1.25rem 0.875rem 1.5rem',
                  borderBottom: idx < phase.tasks.length - 1 ? '1px solid var(--color-border)' : 'none',
                  borderLeft: `3px solid ${style.color}`,
                  background: isDone ? 'transparent' : 'var(--color-bg)',
                  opacity: isDone ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Checkbox / status indicator */}
                {canCheck ? (
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleCheck(task)}
                    style={{ marginTop: 3, cursor: 'pointer', flexShrink: 0, width: 16, height: 16, accentColor: style.color }}
                  />
                ) : (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: style.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.625rem', color: '#fff', fontWeight: 700,
                  }}>
                    {isDone ? '✓' : task.status === 'BLOCKED' ? '!' : ''}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: 600,
                    color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Status pill */}
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 999,
                      background: `color-mix(in srgb, ${style.color} 18%, transparent)`,
                      color: style.color, border: `1px solid color-mix(in srgb, ${style.color} 40%, transparent)`,
                    }}>
                      {style.label}
                    </span>
                    {/* Due date */}
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      Due {task.dueDate.slice(0, 10)}
                    </span>
                    {/* Owner tag */}
                    <span style={{
                      fontSize: '0.6875rem', color: 'var(--color-text-muted)',
                      background: 'var(--color-bg-muted)', padding: '0.1rem 0.45rem',
                      borderRadius: 4, border: '1px solid var(--color-border)',
                    }}>
                      {task.owner === 'DELIVERY' ? '🏢 3SC' : '👤 Your team'}
                    </span>
                    {/* Completed date */}
                    {task.completedAt && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-success)', fontWeight: 600 }}>
                        ✓ Done {task.completedAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const OnboardingTrackerPage: React.FC = () => {
  useDocumentTitle('Onboarding Tracker');

  const { data: onboarding, isLoading } = useGetMyOnboardingQuery();
  // Reuse the roadmap AI summary hook to get a personalised greeting (available to CLIENT_ADMIN)
  const { data: roadmapSummary } = useGetRoadmapSummaryQuery(undefined, { skip: false });

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton height="6.25rem" />
        <Skeleton height="3.75rem" />
        {[1,2,3,4].map(i => <Skeleton key={i} height="4.5rem" />)}
      </div>
    );
  }

  if (!onboarding) {
    return <EmptyState title="No onboarding found" description="Your onboarding project is not yet set up. Contact your 3SC account manager." />;
  }

  const hs = HEALTH_STYLE[onboarding.health];
  const completedPhases = onboarding.phases.filter(p => p.status === 'COMPLETED').length;
  const totalPhases = onboarding.phases.length;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '100%', margin: '0 auto' }}>

      {/* Hero summary card */}
      <Card hover style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.25rem' }}>
              Your Onboarding Journey
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Lead: <strong>{onboarding.leadAgentName}</strong> · Go-live: <strong>{onboarding.goLiveDate.slice(0, 10)}</strong>
            </p>
          </div>
          <div style={{
            padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 700,
            background: hs?.bg, color: hs?.text, display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <Icon icon={
              onboarding.health === 'ON_TRACK' ? CheckCircle :
              onboarding.health === 'AT_RISK' ? AlertTriangle :
              XCircle
            } size="sm" />
            {hs?.label}
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {completedPhases} of {totalPhases} phases complete
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {onboarding.overallProgress}%
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'rgba(148,163,184,0.2)', border: '1px solid rgba(148,163,184,0.15)' }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: `${onboarding.overallProgress}%`,
              background: hs?.text ?? 'var(--color-brand-600)',
              transition: 'width 0.5s ease',
              boxShadow: `0 0 8px ${hs?.text ?? 'var(--color-brand-600)'}55`,
            }} />
          </div>
        </div>

        {onboarding.blockerCount > 0 && (
          <div style={{
            marginTop: '1rem', padding: '0.625rem 1rem',
            background: 'var(--color-danger-light, #fee2e2)',
            borderRadius: '0.5rem', border: '1px solid var(--color-danger)',
            fontSize: '0.8125rem', color: 'var(--color-danger)', fontWeight: 600,
          }}>
            {onboarding.blockerCount} task{onboarding.blockerCount !== 1 ? 's are' : ' is'} currently blocked. Your 3SC account manager has been notified.
          </div>
        )}
      </Card>

      {/* What to focus on next — roadmap summary repurposed as helpful hint */}
      {roadmapSummary && (
        <Card hover style={{ background: 'var(--color-bg-muted)', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-brand-600)' }}>Tip: </span>
          While your onboarding is progressing, check out the Product Roadmap to see upcoming features and vote on what matters most to your team.
        </Card>
      )}

      {/* Phase list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.25rem' }}>
          Phases
        </h2>
        {onboarding.phases.map(phase => (
          <PhasePanel key={phase.id} phase={phase} onboardingId={onboarding.id} canEditClientTasks />
        ))}
      </div>

      {/* Help callout */}
      <Card style={{ padding: '1rem', background: 'var(--color-bg-muted)' }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          Have a question or need to flag a blocker?{' '}
          <a href="/tickets/new" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>Submit a support ticket</a>{' '}
          and your account manager will respond within your SLA window.
        </p>
      </Card>
    </div>
  );
};

export default OnboardingTrackerPage;
