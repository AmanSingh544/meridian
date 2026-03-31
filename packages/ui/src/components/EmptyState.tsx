import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => (
  <div style={{
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: 'var(--color-text-muted)',
  }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
    <h3 style={{
      margin: 0,
      fontSize: '1rem',
      fontWeight: 600,
      color: 'var(--color-text)',
      fontFamily: 'var(--font-display)',
    }}>{title}</h3>
    {description && (
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', maxWidth: '24rem', marginInline: 'auto' }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
  </div>
);
