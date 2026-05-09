import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetProjectsQuery, useCreateProjectMutation, useGetProjectHealthQuery } from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, EmptyState, useToast, Icon } from '@3sc/ui';
import { FolderOpen } from 'lucide-react';
import { formatDate } from '@3sc/utils';
import { Permission, ProjectStatus } from '@3sc/types';
import type { Project, ProjectHealthColor } from '@3sc/types';

// ── Health badge ─────────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<ProjectHealthColor, { bg: string; text: string; label: string }> = {
  green: { bg: 'var(--color-success-light, #d1fae5)', text: 'var(--color-success)', label: 'Healthy' },
  amber: { bg: 'var(--color-warning-light, #fef3c7)', text: 'var(--color-warning)', label: 'At Risk' },
  red:   { bg: 'var(--color-danger-light, #fee2e2)',  text: 'var(--color-danger)',  label: 'Critical' },
};

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  active:    { color: 'var(--color-success)', bg: 'var(--color-success-light, #d1fae5)' },
  planning:  { color: 'var(--color-info, #3b82f6)', bg: '#eff6ff' },
  on_hold:   { color: 'var(--color-warning)', bg: 'var(--color-warning-light, #fef3c7)' },
  completed: { color: 'var(--color-text-muted)', bg: 'var(--color-bg-muted)' },
  cancelled: { color: 'var(--color-danger)', bg: 'var(--color-danger-light, #fee2e2)' },
};

// Fetch health for a single card — isolated so each card re-renders independently
const ProjectHealthBadge: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: health } = useGetProjectHealthQuery(projectId);
  if (!health) return null;
  const c = HEALTH_COLORS[health.color];
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
      padding: '0.125rem 0.5rem', borderRadius: '999px',
      background: c.bg, color: c.text,
    }}>
      {health.color === 'green' ? '●' : health.color === 'amber' ? '▲' : '!'} {c.label}
    </span>
  );
};

// ── Create modal (inline) ─────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void; onCreate: (data: Partial<Project>) => void; creating: boolean; }

const CreateModal: React.FC<CreateModalProps> = ({ onClose, onCreate, creating }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), scope: scope.trim(), targetDate: targetDate || undefined, status: ProjectStatus.PLANNING });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
    background: 'var(--color-bg)', color: 'var(--color-text)',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }}>
      <div style={{
        background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)',
        padding: '1.75rem', width: '100%', maxWidth: '30rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.125rem', fontWeight: 700 }}>New Project</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Project Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer Portal Redesign" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: '4rem', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of the project" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Scope Statement</label>
            <textarea style={{ ...inputStyle, minHeight: '4rem', resize: 'vertical' }} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="What is included and excluded from this project..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Target Date</label>
            <input type="date" style={inputStyle} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={creating} disabled={!name.trim()}>Create Project</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const ProjectsPage: React.FC = () => {
  useDocumentTitle('Projects');
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { toast } = useToast();
  const showToast = ({ message, variant }: { message: string; variant?: string }) => toast(message, variant as any);
  const canCreate = permissions.has(Permission.PROJECT_CREATE);
  const canViewInsights = permissions.has(Permission.AI_PROJECT_INSIGHTS);

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useGetProjectsQuery({ page: 1, page_size: 50 });
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();

  const projects = data?.data ?? [];

  const filtered = statusFilter === 'all'
    ? projects
    : projects.filter((p) => p.status === statusFilter);

  const handleCreate = async (payload: Partial<Project>) => {
    try {
      const created = await createProject(payload).unwrap();
      showToast({ message: `Project "${created.name}" created`, variant: 'success' });
      setShowCreate(false);
      navigate(`/projects/${created.id}`);
    } catch {
      showToast({ message: 'Failed to create project', variant: 'error' });
    }
  };

  const statuses = ['all', 'active', 'planning', 'on_hold', 'completed', 'cancelled'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Projects</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Manage client engagements, track milestones, and monitor AI health signals.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Project</Button>
        )}
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.3125rem 0.875rem', borderRadius: '999px', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 500, border: '1px solid',
              borderColor: statusFilter === s ? 'var(--color-brand-500)' : 'var(--color-border)',
              background: statusFilter === s ? 'var(--color-brand-500)' : 'var(--color-bg)',
              color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              transition: 'var(--transition-fast)',
            }}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><Skeleton height="8rem" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Icon icon={FolderOpen} size="xl" />} title="No projects" description={statusFilter === 'all' ? 'Create your first project to get started.' : `No ${statusFilter.replace('_', ' ')} projects.`}
          action={canCreate ? <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>New Project</Button> : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))', gap: '1rem' }}>
          {filtered.map((project) => {
            const completedMilestones = project.milestones.filter((m) => m.isCompleted).length;
            const totalMilestones = project.milestones.length;
            const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

            return (
              <Card key={project.id} hover onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  {/* Top row: name + health + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, flex: 1, lineHeight: 1.3 }}>{project.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      <Badge
                        color={(STATUS_COLOR[project.status] ?? STATUS_COLOR.completed).color}
                        bgColor={(STATUS_COLOR[project.status] ?? STATUS_COLOR.completed).bg}
                      >
                        {project.status.replace('_', ' ')}
                      </Badge>
                      {canViewInsights && ['active', 'on_hold'].includes(project.status) && (
                        <ProjectHealthBadge projectId={project.id} />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ margin: '0 0 0.875rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {(project.description ?? '').slice(0, 100)}{(project.description ?? '').length > 100 ? '…' : ''}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                    <span>{project.ticketCount} tickets</span>
                    {(project.openTicketCount ?? 0) > 0 && (
                      <span style={{ color: 'var(--color-danger)' }}>{project.openTicketCount} open</span>
                    )}
                    {(project.resolvedThisWeek ?? 0) > 0 && (
                      <span style={{ color: 'var(--color-success)' }}>+{project.resolvedThisWeek} this week</span>
                    )}
                    {project.targetDate && <span>Due {formatDate(project.targetDate)}</span>}
                  </div>

                  {/* Lead */}
                  {project.lead && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
                      Lead: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{project.lead.displayName}</span>
                    </div>
                  )}
                </div>

                {/* Milestone progress bar — always rendered so cards align */}
                <div style={{ minHeight: 18 }}>
                  {totalMilestones > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        <span>Milestones</span>
                        <span>{completedMilestones}/{totalMilestones}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--color-bg-muted)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${progress}%`,
                          background: progress === 100 ? 'var(--color-success)' : 'var(--color-brand-500)',
                          borderRadius: 2, transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} creating={creating} />
      )}
    </div>
  );
};
