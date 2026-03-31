import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetProjectsQuery } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, StatusBadge, Badge, Skeleton, EmptyState, ErrorState } from '@3sc/ui';
import { formatDate } from '@3sc/utils';
import type { ProjectStatus } from '@3sc/types';

const projectStatusColors: Record<string, string> = {
  planning: '#8b5cf6',
  active: '#10b981',
  on_hold: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

export const ProjectsPage: React.FC = () => {
  useDocumentTitle('Projects');
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetProjectsQuery({ page: 1, pageSize: 20 });

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        Projects
      </h1>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><Skeleton height="6rem" /></Card>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState icon="📁" title="No projects yet" description="Projects will appear here once created." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1rem' }}>
          {data?.data.map((project) => (
            <Card key={project.id} hover onClick={() => navigate(`/projects/${project.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{project.name}</h3>
                <Badge
                  color={projectStatusColors[project.status] || '#6b7280'}
                  bgColor={`${projectStatusColors[project.status] || '#6b7280'}18`}
                >
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {project.description?.slice(0, 100) || 'No description'}
              </p>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>{project.milestones.length} milestones</span>
                <span>{project.ticketCount} tickets</span>
                {project.targetDate && <span>Due {formatDate(project.targetDate)}</span>}
              </div>
              {/* Milestone progress bar */}
              {project.milestones.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ height: 4, background: 'var(--color-bg-muted)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(project.milestones.filter((m) => m.isCompleted).length / project.milestones.length) * 100}%`,
                      background: 'var(--color-success)',
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
