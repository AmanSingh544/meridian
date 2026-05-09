import React, { useState, useMemo } from 'react';
import {
  useGetOnboardingProjectsQuery,
  useGetOrganizationsQuery,
  useCreateOnboardingProjectMutation,
  useUpdateOnboardingProjectMutation,
  useDeleteOnboardingProjectMutation,
  useUpdateOnboardingTaskMutation,
  useGetOnboardingHealthQuery,
  useGetOnboardingBlockerSummaryMutation,
  useGetOnboardingNextActionQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, EmptyState, Modal, useToast } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type {
  OnboardingProject,
  OnboardingPhase,
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingCreatePayload,
  OnboardingTaskCreatePayload,
} from '@3sc/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ON_TRACK: { bg: 'var(--color-success-light, #d1fae5)', text: 'var(--color-success)', label: 'On Track' },
  AT_RISK:  { bg: 'var(--color-warning-light, #fef3c7)', text: 'var(--color-warning)', label: 'At Risk' },
  BLOCKED:  { bg: 'var(--color-danger-light, #fee2e2)',  text: 'var(--color-danger)',  label: 'Blocked' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  IN_PROGRESS: { bg: 'var(--color-info-light, #dbeafe)',  text: 'var(--color-info)',    label: 'In Progress' },
  COMPLETED:   { bg: 'var(--color-success-light, #d1fae5)', text: 'var(--color-success)', label: 'Completed' },
  ON_HOLD:     { bg: 'var(--color-warning-light, #fef3c7)', text: 'var(--color-warning)', label: 'On Hold' },
  CANCELLED:   { bg: 'var(--color-bg-muted)',              text: 'var(--color-text-muted)', label: 'Cancelled' },
};

const TASK_STATUS_STYLE: Record<OnboardingTaskStatus, { color: string; label: string }> = {
  DONE:        { color: 'var(--color-success)',    label: 'Done' },
  IN_PROGRESS: { color: 'var(--color-info)',       label: 'In Progress' },
  PENDING:     { color: 'var(--color-text-muted)', label: 'Pending' },
  BLOCKED:     { color: 'var(--color-danger)',     label: 'Blocked' },
};

// ── Shared input styles ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', fontSize: '0.875rem',
  border: '1px solid var(--color-border)', borderRadius: '0.375rem',
  background: 'var(--color-bg)', color: 'var(--color-text)',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600,
  color: 'var(--color-text)', marginBottom: '0.25rem',
};

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

// ── AI Side Panel ─────────────────────────────────────────────────────────────

const AIPanel: React.FC<{ onboardingId: string }> = ({ onboardingId }) => {
  const { data: health } = useGetOnboardingHealthQuery(onboardingId);
  const { data: nextAction } = useGetOnboardingNextActionQuery(onboardingId);
  const [getBlockers, { data: blockers, isLoading: isLoadingBlockers }] = useGetOnboardingBlockerSummaryMutation();
  const [showDraft, setShowDraft] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '100%' }}>
      {health && (
        <Card hover style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            AI HEALTH PREDICTION
          </div>
          <div style={{
            display: 'inline-block', fontSize: '0.75rem', fontWeight: 700,
            padding: '0.2rem 0.625rem', borderRadius: '999px', marginBottom: '0.5rem',
            background: HEALTH_STYLE[health.health]?.bg, color: HEALTH_STYLE[health.health]?.text,
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

      {nextAction && (
        <Card hover style={{ padding: '0.875rem' }}>
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
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4, background: 'var(--color-bg-muted)', color: 'var(--color-text-muted)' }}>
              {nextAction.ownedBy}
            </span>
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

      <Card hover style={{ padding: '0.875rem' }}>
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

// ── Phase row ─────────────────────────────────────────────────────────────────

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
    <Card hover style={{ borderRadius: '0.5rem' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem',
          background: 'var(--color-bg)', border: 'none', cursor: 'pointer', gap: '0.75rem', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', minWidth: '1.5rem' }}>
          {phase.phaseNumber}
        </span>
        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{phase.name}</span>
        <div style={{ width: '6rem' }}>
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
              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-border)' }}
            >
              <input
                type="checkbox"
                checked={task.status === 'DONE'}
                onChange={() => handleToggle(task)}
                disabled={!canManage || task.owner === 'CLIENT'}
                style={{ marginTop: 3, cursor: canManage && task.owner !== 'CLIENT' ? 'pointer' : 'default', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text)',
                  textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>{task.description}</div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6875rem', color: TASK_STATUS_STYLE[task.status]?.color, fontWeight: 600 }}>
                    {TASK_STATUS_STYLE[task.status]?.label}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Owner: {task.owner}</span>
                  {task.dueDate && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Due {task.dueDate.slice(0, 10)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ── Onboarding Detail Drawer ──────────────────────────────────────────────────

const OnboardingDrawer: React.FC<{
  project: OnboardingProject;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}> = ({ project, onClose, onEdit, onDelete, canManage }) => {
  const hs = HEALTH_STYLE[project.health];
  const ss = STATUS_STYLE[project.status];

  return (
    <Modal isOpen onClose={onClose} title={project.organizationName} width="56rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Summary row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: '999px', background: hs?.bg, color: hs?.text }}>
              {hs?.label}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: '999px', background: ss?.bg, color: ss?.text }}>
              {ss?.label}
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
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4, background: 'var(--color-danger-light, #fee2e2)', color: 'var(--color-danger)' }}>
                {project.blockerCount} blocker{project.blockerCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <Button variant="secondary" onClick={onEdit}>Edit</Button>
              <Button variant="secondary" onClick={onDelete} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                Delete
              </Button>
            </div>
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
            {project.phases.length > 0 ? (
              project.phases.map(phase => (
                <PhaseRow key={phase.id} phase={phase} canManage={canManage} onboardingId={project.id} />
              ))
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>No tasks added yet.</p>
            )}
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

// ── Custom task editor row ────────────────────────────────────────────────────

interface TaskDraft {
  id: string;
  title: string;
  description: string;
  owner: 'CLIENT' | 'DELIVERY';
  due_date: string;
}

const newTaskDraft = (): TaskDraft => ({
  id: Math.random().toString(36).slice(2),
  title: '',
  description: '',
  owner: 'DELIVERY',
  due_date: '',
});

const TaskDraftRow: React.FC<{ task: TaskDraft; onChange: (t: TaskDraft) => void; onRemove: () => void }> = ({ task, onChange, onRemove }) => (
  <Card hover style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', background: 'var(--color-bg-muted)', borderRadius: '0.375rem' }}>
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <input
          style={{ ...inputStyle, fontSize: '0.8125rem' }}
          placeholder="Task title *"
          value={task.title}
          onChange={e => onChange({ ...task, title: e.target.value })}
        />
      </div>
      <button
        onClick={onRemove}
        title="Remove task"
        style={{ flexShrink: 0, marginTop: 2, padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '1rem', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
    <input
      style={{ ...inputStyle, fontSize: '0.8125rem' }}
      placeholder="Description (optional)"
      value={task.description}
      onChange={e => onChange({ ...task, description: e.target.value })}
    />
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <select
        style={{ ...inputStyle, flex: 1 }}
        value={task.owner}
        onChange={e => onChange({ ...task, owner: e.target.value as 'CLIENT' | 'DELIVERY' })}
      >
        <option value="DELIVERY">3SC Delivery</option>
        <option value="CLIENT">Client</option>
      </select>
      <input
        type="date"
        style={{ ...inputStyle, flex: 1 }}
        value={task.due_date}
        onChange={e => onChange({ ...task, due_date: e.target.value })}
      />
    </div>
  </Card>
);

// ── Create / Edit Modal ───────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit';

const OnboardingFormModal: React.FC<{
  mode: ModalMode;
  project?: OnboardingProject;
  onClose: () => void;
}> = ({ mode, project, onClose }) => {
  const { toast } = useToast();
  const { data: orgsResponse } = useGetOrganizationsQuery({ page: 1 });
  const [createProject, { isLoading: isCreating }] = useCreateOnboardingProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateOnboardingProjectMutation();

  // Form state
  const [orgId, setOrgId] = useState(project?.organizationId ?? '');
  const [goLiveDate, setGoLiveDate] = useState(
    project?.goLiveDate ? project.goLiveDate.slice(0, 10) : ''
  );
  const [status, setStatus] = useState(project?.status ?? 'IN_PROGRESS');
  const [useDefaultTasks, setUseDefaultTasks] = useState(true);
  const [customTasks, setCustomTasks] = useState<TaskDraft[]>([newTaskDraft()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const orgs = orgsResponse?.data ?? orgsResponse?.items ?? (Array.isArray(orgsResponse) ? orgsResponse : []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'create' && !orgId) e.orgId = 'Please select an organisation.';
    if (!goLiveDate) e.goLiveDate = 'Go-live date is required.';
    if (!useDefaultTasks) {
      const blank = customTasks.filter(t => !t.title.trim());
      if (blank.length > 0) e.tasks = 'All tasks must have a title.';
      if (customTasks.length === 0) e.tasks = 'Add at least one task.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (mode === 'create') {
        const tasks: OnboardingTaskCreatePayload[] | undefined = useDefaultTasks
          ? undefined
          : customTasks.map(t => ({
              title: t.title.trim(),
              description: t.description.trim() || undefined,
              owner: t.owner,
              due_date: t.due_date ? new Date(t.due_date).toISOString() : undefined,
            }));

        const payload: OnboardingCreatePayload = {
          organizationId: orgId,
          goLiveDate: goLiveDate ? new Date(goLiveDate).toISOString() : undefined,
          status: status as any,
          tasks,
        };
        await createProject(payload).unwrap();
        toast('Onboarding project created', 'success');
      } else if (project) {
        await updateProject({
          id: project.id,
          data: {
            goLiveDate: goLiveDate ? new Date(goLiveDate).toISOString() : undefined,
            status: status as any,
          },
        }).unwrap();
        toast('Onboarding project updated', 'success');
      }
      onClose();
    } catch {
      toast(mode === 'create' ? 'Failed to create project' : 'Failed to update project', 'error');
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'Start New Onboarding' : `Edit — ${project?.organizationName}`}
      width="38rem"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Organisation selector (create only) */}
        {mode === 'create' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Organisation *</label>
            <select
              style={inputStyle}
              value={orgId}
              onChange={e => { setOrgId(e.target.value); setErrors(prev => ({ ...prev, orgId: '' })); }}
            >
              <option value="">— Select organisation —</option>
              {orgs.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {errors.orgId && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors.orgId}</span>}
          </div>
        )}

        {/* Go-live date */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Target Go-Live Date *</label>
          <input
            type="date"
            style={inputStyle}
            value={goLiveDate}
            onChange={e => { setGoLiveDate(e.target.value); setErrors(prev => ({ ...prev, goLiveDate: '' })); }}
          />
          {errors.goLiveDate && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors.goLiveDate}</span>}
        </div>

        {/* Status */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Task setup (create only) */}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ ...labelStyle, margin: 0 }}>Tasks</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setUseDefaultTasks(true)}
                  style={{
                    fontSize: '0.75rem', padding: '0.2rem 0.625rem', borderRadius: '999px', cursor: 'pointer',
                    border: '1px solid',
                    background: useDefaultTasks ? 'var(--color-brand-600)' : 'transparent',
                    color: useDefaultTasks ? '#fff' : 'var(--color-text-muted)',
                    borderColor: useDefaultTasks ? 'var(--color-brand-600)' : 'var(--color-border)',
                  }}
                >
                  Standard template
                </button>
                <button
                  onClick={() => setUseDefaultTasks(false)}
                  style={{
                    fontSize: '0.75rem', padding: '0.2rem 0.625rem', borderRadius: '999px', cursor: 'pointer',
                    border: '1px solid',
                    background: !useDefaultTasks ? 'var(--color-brand-600)' : 'transparent',
                    color: !useDefaultTasks ? '#fff' : 'var(--color-text-muted)',
                    borderColor: !useDefaultTasks ? 'var(--color-brand-600)' : 'var(--color-border)',
                  }}
                >
                  Custom tasks
                </button>
              </div>
            </div>

            {useDefaultTasks ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.625rem' }}>
                A standard 15-task onboarding plan (Kickoff, Data Migration, UAT &amp; Training, Go-Live) will be created automatically.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {customTasks.map(task => (
                  <TaskDraftRow
                    key={task.id}
                    task={task}
                    onChange={updated => setCustomTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                    onRemove={() => setCustomTasks(prev => prev.filter(t => t.id !== task.id))}
                  />
                ))}
                <button
                  onClick={() => setCustomTasks(prev => [...prev, newTaskDraft()])}
                  style={{ fontSize: '0.8125rem', color: 'var(--color-brand-600)', background: 'none', border: '1px dashed var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem', cursor: 'pointer' }}
                >
                  + Add task
                </button>
                {errors.tasks && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors.tasks}</span>}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="primary" loading={isLoading} onClick={handleSubmit}>
            {mode === 'create' ? 'Create Onboarding' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────

const DeleteConfirmModal: React.FC<{ project: OnboardingProject; onClose: () => void }> = ({ project, onClose }) => {
  const { toast } = useToast();
  const [deleteProject, { isLoading }] = useDeleteOnboardingProjectMutation();

  const handleDelete = async () => {
    try {
      await deleteProject(project.id).unwrap();
      toast('Onboarding project deleted', 'success');
      onClose();
    } catch {
      toast('Failed to delete project', 'error');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Delete Onboarding Project" width="28rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text)' }}>
          Are you sure you want to delete the onboarding project for{' '}
          <strong>{project.organizationName}</strong>? This will permanently remove all tasks and progress.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            variant="primary"
            loading={isLoading}
            onClick={handleDelete}
            style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Summary card ──────────────────────────────────────────────────────────────

const OrgCard: React.FC<{ project: OnboardingProject; onSelect: () => void }> = ({ project, onSelect }) => {
  const hs = HEALTH_STYLE[project.health];
  const ss = STATUS_STYLE[project.status];

  return (
    <Card hover style={{ padding: '1rem', cursor: 'pointer' }} onClick={onSelect}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>{project.organizationName}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>Lead: {project.leadAgentName}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: hs?.bg, color: hs?.text }}>
            {hs?.label}
          </div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: ss?.bg, color: ss?.text }}>
            {ss?.label}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Overall progress</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>{project.overallProgress}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)' }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${project.overallProgress}%`, background: hs?.text ?? 'var(--color-brand-600)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.125rem 0.5rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          Go-live: <strong style={{ color: 'var(--color-text)' }}>{project.goLiveDate.slice(0, 10)}</strong>
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.125rem 0.5rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          {project.phases.length} phase{project.phases.length !== 1 ? 's' : ''}
        </span>
        {project.blockerCount > 0 && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', fontWeight: 600, padding: '0.125rem 0.5rem', background: 'var(--color-danger-light, #fee2e2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)' }}>
            {project.blockerCount} blocker{project.blockerCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

type ActiveModal =
  | { kind: 'create' }
  | { kind: 'edit'; project: OnboardingProject }
  | { kind: 'delete'; project: OnboardingProject }
  | { kind: 'detail'; project: OnboardingProject }
  | null;

const OnboardingListPage: React.FC = () => {
  useDocumentTitle('Onboarding');
  const perms = usePermissions();
  const canManage = perms.has(Permission.ONBOARDING_MANAGE);

  const { data: projects, isLoading } = useGetOnboardingProjectsQuery();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      const matchSearch = p.organizationName.toLowerCase().includes(search.toLowerCase());
      const matchHealth = healthFilter === 'ALL' || p.health === healthFilter;
      return matchSearch && matchHealth;
    });
  }, [projects, search, healthFilter]);

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3].map(i => <Skeleton key={i} height="7.5rem" />)}
      </div>
    );
  }

  const atRisk = (projects ?? []).filter(p => p.health !== 'ON_TRACK').length;
  const onTrack = (projects ?? []).filter(p => p.health === 'ON_TRACK').length;

  const detailProject = activeModal?.kind === 'detail' ? activeModal.project : null;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Onboarding</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
            {(projects ?? []).length} active onboarding{(projects ?? []).length !== 1 ? 's' : ''}
            {atRisk > 0 && <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}> · {atRisk} at risk</span>}
            {onTrack > 0 && <span style={{ color: 'var(--color-success)', fontWeight: 600 }}> · {onTrack} on track</span>}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => setActiveModal({ kind: 'create' })}>
            + Start Onboarding
          </Button>
        )}
      </div>

      {/* Filters */}
      {(projects ?? []).length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, maxWidth: '16rem' }}
            placeholder="Search organisations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            style={{ ...inputStyle, width: 'auto' }}
            value={healthFilter}
            onChange={e => setHealthFilter(e.target.value)}
          >
            <option value="ALL">All health statuses</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 && !isLoading ? (
        search || healthFilter !== 'ALL' ? (
          <EmptyState title="No results" description="No onboarding projects match your filters." />
        ) : (
          <EmptyState
            title="No onboarding projects"
            description={canManage ? 'Start the first client onboarding to get going.' : 'There are no active onboarding projects.'}
          />
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))', gap: '1rem' }}>
          {filtered.map(p => (
            <OrgCard key={p.id} project={p} onSelect={() => setActiveModal({ kind: 'detail', project: p })} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {activeModal?.kind === 'detail' && (
        <OnboardingDrawer
          project={activeModal.project}
          canManage={canManage}
          onClose={() => setActiveModal(null)}
          onEdit={() => setActiveModal({ kind: 'edit', project: activeModal.project })}
          onDelete={() => setActiveModal({ kind: 'delete', project: activeModal.project })}
        />
      )}

      {/* Create modal */}
      {activeModal?.kind === 'create' && (
        <OnboardingFormModal mode="create" onClose={() => setActiveModal(null)} />
      )}

      {/* Edit modal */}
      {activeModal?.kind === 'edit' && (
        <OnboardingFormModal mode="edit" project={activeModal.project} onClose={() => setActiveModal(null)} />
      )}

      {/* Delete confirm */}
      {activeModal?.kind === 'delete' && (
        <DeleteConfirmModal project={activeModal.project} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
};

export default OnboardingListPage;
