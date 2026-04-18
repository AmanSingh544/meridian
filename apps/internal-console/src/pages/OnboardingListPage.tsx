import React, { useState } from 'react';
import {
  useGetOnboardingProjectsQuery,
  useUpdateOnboardingTaskMutation,
  useGetOnboardingHealthQuery,
  useGetOnboardingBlockerSummaryMutation,
  useGetOnboardingNextActionQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, EmptyState, Modal, useToast } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { OnboardingProject, OnboardingPhase, OnboardingTask, OnboardingTaskStatus } from '@3sc/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ON_TRACK: { bg: 'var(--color-success-light, #d1fae5)', text: 'var(--color-success)', label: 'On Track' },
  AT_RISK:  { bg: 'var(--color-warning-light, #fef3c7)', text: 'var(--color-warning)', label: 'At Risk' },
  BLOCKED:  { bg: 'var(--color-danger-light, #fee2e2)',  text: 'var(--color-danger)',  label: 'Blocked' },
};

const TASK_STATUS_STYLE: Record<OnboardingTaskStatus, { color: string; label: string }> = {
  DONE:        { color: 'var(--color-success)',       label: 'Done' },
  IN_PROGRESS: { color: 'var(--color-info)',          label: 'In Progress' },
  PENDING:     { color: 'var(--color-text-muted)',    label: 'Pending' },
  BLOCKED:     { color: 'var(--color-danger)',        label: 'Blocked' },
};

// ── AI Side Panel ─────────────────────────────────────────────────────────────

const AIPanel: React.FC<{ onboardingId: string }> = ({ onboardingId }) => {
  const { data: health } = useGetOnboardingHealthQuery(onboardingId);
  const { data: nextAction } = useGetOnboardingNextActionQuery(onboardingId);
  const [getBlockers, { data: blockers, isLoading: isLoadingBlockers }] = useGetOnboardingBlockerSummaryMutation();
  const [showDraft, setShowDraft] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Health prediction */}
      {health && (
        <Card style={{ padding: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>AI HEALTH PREDICTION</span>
          </div>
          <div style={{
            display: 'inline-block', fontSize: '0.75rem', fontWeight: 700,
            padding: '0.2rem 0.625rem', borderRadius: '999px', marginBottom: '0.5rem',
            background: HEALTH_STYLE[health.health]?.bg,
            color: HEALTH_STYLE[health.health]?.text,
          }}>
            {HEALTH_STYLE[health.health]?.label}
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{health.reason}</p>
          {health.daysVariance !== 0 && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--color-warning)', fontWeight: 600 }}>
              Go-live risk: +{health.daysVariance} days variance
            </p>
          )}
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            Confidence: {Math.round(health.confidence * 100)}%
          </p>
        </Card>
      )}

      {/* Next action */}
      {nextAction && (
        <Card style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            SUGGESTED NEXT ACTION
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text)', fontWeight: 600 }}>{nextAction.action}</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4,
              background: nextAction.priority === 'HIGH' ? 'var(--color-danger-light, #fee2e2)' : nextAction.priority === 'MEDIUM' ? 'var(--color-warning-light, #fef3c7)' : 'var(--color-bg-muted)',
              color: nextAction.priority === 'HIGH' ? 'var(--color-danger)' : nextAction.priority === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-text-muted)',
            }}>
              {nextAction.priority}
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4, background: 'var(--color-bg-muted)', color: 'var(--color-text-muted)' }}>{nextAction.ownedBy}</span>
          </div>
          {nextAction.draftMessage && (
            <div style={{ marginTop: '0.625rem' }}>
              <button
                onClick={() => setShowDraft(o => !o)}
                style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showDraft ? 'Hide draft message' : 'View AI draft message'}
              </button>
              {showDraft && (
                <pre style={{
                  marginTop: '0.5rem', padding: '0.625rem', borderRadius: '0.375rem',
                  background: 'var(--color-bg-muted)', fontSize: '0.75rem',
                  color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  border: '1px solid var(--color-border)',
                }}>
                  {nextAction.draftMessage}
                </pre>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Blocker summary */}
      <Card style={{ padding: '0.875rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          BLOCKER ANALYSIS
        </div>
        {blockers ? (
          <div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{blockers.summary}</p>
            {blockers.mostUrgent && (
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                Most urgent: {blockers.mostUrgent}
              </p>
            )}
          </div>
        ) : (
          <Button variant="secondary" loading={isLoadingBlockers} onClick={() => getBlockers(onboardingId)}>
            Analyse Blockers
          </Button>
        )}
      </Card>
    </div>
  );
};

// ── Phase progress bar ────────────────────────────────────────────────────────

const PhaseRow: React.FC<{ phase: OnboardingPhase; canManage: boolean; onboardingId: string }> = ({ phase, canManage, onboardingId }) => {
  const [expanded, setExpanded] = useState(false);
  const [updateTask] = useUpdateOnboardingTaskMutation();
  const { toast } = useToast();

  const handleToggle = async (task: OnboardingTask) => {
    if (!canManage) return;
    const newStatus: OnboardingTaskStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      await updateTask({ onboardingId, taskId: task.id, data: { status: newStatus } }).unwrap();
    } catch {
      toast('Failed to update task', 'error');
    }
  };

  const phaseStatusColor =
    phase.status === 'COMPLETED' ? 'var(--color-success)' :
    phase.status === 'IN_PROGRESS' ? 'var(--color-info)' :
    'var(--color-text-muted)';

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem',
          background: 'var(--color-bg)', border: 'none', cursor: 'pointer', gap: '0.75rem',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', minWidth: '1.5rem' }}>
          {phase.phaseNumber}
        </span>
        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
          {phase.name}
        </span>
        {/* progress bar */}
        <div style={{ width: '6rem', position: 'relative' }}>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)' }}>
            <div style={{ height: '100%', width: `${phase.progress}%`, borderRadius: 3, background: phaseStatusColor, transition: 'width 0.3s' }} />
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: phaseStatusColor, minWidth: '2.5rem', textAlign: 'right' }}>
          {phase.progress}%
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
          {phase.tasks.map(task => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.625rem 1rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <input
                type="checkbox"
                checked={task.status === 'DONE'}
                onChange={() => handleToggle(task)}
                disabled={!canManage || task.owner === 'CLIENT'}
                style={{ marginTop: 3, cursor: canManage && task.owner !== 'CLIENT' ? 'pointer' : 'default', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>{task.description}</div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6875rem', color: TASK_STATUS_STYLE[task.status]?.color, fontWeight: 600 }}>
                    {TASK_STATUS_STYLE[task.status]?.label}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    Owner: {task.owner}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    Due {task.dueDate.slice(0, 10)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Onboarding Detail Drawer ──────────────────────────────────────────────────

const OnboardingDrawer: React.FC<{ project: OnboardingProject; onClose: () => void }> = ({ project, onClose }) => {
  const perms = usePermissions();
  const canManage = perms.has(Permission.ONBOARDING_MANAGE);
  const hs = HEALTH_STYLE[project.health];

  return (
    <Modal isOpen onClose={onClose} title={project.organizationName} width="52rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Summary row */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.625rem',
            borderRadius: '999px', background: hs?.bg, color: hs?.text,
          }}>
            {hs?.label}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Lead: <strong style={{ color: 'var(--color-text)' }}>{project.leadAgentName}</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Go-live: <strong style={{ color: 'var(--color-text)' }}>{project.goLiveDate.slice(0, 10)}</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Progress: <strong style={{ color: 'var(--color-text)' }}>{project.overallProgress}%</strong>
          </div>
          {project.blockerCount > 0 && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4, background: 'var(--color-danger-light, #fee2e2)', color: 'var(--color-danger)' }}></span>
          )}
        </div>

        {/* Overall progress bar */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${project.overallProgress}%`, background: hs?.text ?? 'var(--color-brand-600)', transition: 'width 0.4s' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 18rem', gap: '1.25rem', alignItems: 'flex-start' }}>
          {/* Phases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>Phases</h3>
            {project.phases.map(phase => (
              <PhaseRow key={phase.id} phase={phase} canManage={canManage} onboardingId={project.id} />
            ))}
          </div>

          {/* AI Panel */}
          <div>
            <h3 style={{ margin: '0 0 0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>AI Insights</h3>
            <AIPanel onboardingId={project.id} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Summary card ──────────────────────────────────────────────────────────────

const OrgCard: React.FC<{ project: OnboardingProject; onSelect: () => void }> = ({ project, onSelect }) => {
  const hs = HEALTH_STYLE[project.health];
  return (
    <Card style={{ padding: '1rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }} onClick={onSelect}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>{project.organizationName}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>Lead: {project.leadAgentName}</div>
        </div>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem',
          borderRadius: '999px', background: hs?.bg, color: hs?.text,
        }}>
          {hs?.label}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Overall progress</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>{project.overallProgress}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)' }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${project.overallProgress}%`, background: hs?.text ?? 'var(--color-brand-600)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
        <span>Go-live: <strong style={{ color: 'var(--color-text)' }}>{project.goLiveDate.slice(0, 10)}</strong></span>
        <span>{project.phases.length} phases</span>
        {project.blockerCount > 0 && (
          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{project.blockerCount} blocker{project.blockerCount !== 1 ? 's' : ''}</span>
        )}
      </div>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const OnboardingListPage: React.FC = () => {
  useDocumentTitle('Onboarding');
  const { data: projects, isLoading } = useGetOnboardingProjectsQuery();
  const [selected, setSelected] = useState<OnboardingProject | null>(null);

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1,2,3].map(i => <Skeleton key={i} height="7.5rem" />)}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return <EmptyState title="No onboarding projects" description="There are no active onboarding projects." />;
  }

  const atRisk = projects.filter(p => p.health !== 'ON_TRACK').length;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Onboarding</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
            {projects.length} active onboarding{projects.length !== 1 ? 's' : ''}
            {atRisk > 0 && <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}> · {atRisk} at risk</span>}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))', gap: '1rem' }}>
        {projects.map(p => (
          <OrgCard key={p.id} project={p} onSelect={() => setSelected(p)} />
        ))}
      </div>

      {/* Detail drawer */}
      {selected && <OnboardingDrawer project={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default OnboardingListPage;
