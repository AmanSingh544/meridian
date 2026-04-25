import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetProjectsQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, EmptyState, ErrorState } from '@3sc/ui';
import { formatDate } from '@3sc/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'danger' | 'info'> = {
  active: 'success', planning: 'info', on_hold: 'warning', completed: 'neutral', cancelled: 'danger',
};

export const ProjectsPage: React.FC = () => {
  useDocumentTitle('Projects');
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useGetProjectsQuery({ page: 1, page_size: 20 });

  if (isError) {
    return <ErrorState title="Could not load projects" description="Please try again." action={<Button variant="primary" onClick={refetch}>Retry</Button>} />;
  }

  const projects = data?.data ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Your Projects</h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Track the progress and status of your active engagements.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><Skeleton height="7rem" /></Card>)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon="📁" title="No projects yet" description="Projects will appear here once your team creates them." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
          {projects.map((project) => {
            const milestones = project.milestones ?? [];
            const completedMilestones = milestones.filter((m) => m.isCompleted).length;
            const totalMilestones = milestones.length;
            const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

            return (
              <Card key={project.id} hover onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer' }}>
                {/* Name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, flex: 1, lineHeight: 1.3 }}>{project.name}</h3>
                  <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Description */}
                <p style={{ margin: '0 0 0.875rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {(project.description ?? '').slice(0, 100)}{(project.description ?? '').length > 100 ? '…' : ''}
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                  <span>{project.ticketCount} tickets</span>
                  {(project.openTicketCount ?? 0) > 0 && (
                    <span style={{ color: 'var(--color-warning)' }}>{project.openTicketCount} open</span>
                  )}
                  {(project.resolvedThisWeek ?? 0) > 0 && (
                    <span style={{ color: 'var(--color-success)' }}>+{project.resolvedThisWeek} this week</span>
                  )}
                  {project.targetDate && <span>Due {formatDate(project.targetDate)}</span>}
                </div>

                {/* Milestone progress */}
                {totalMilestones > 0 && (
                  <div>
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
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
