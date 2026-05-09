import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: 'var(--color-text-muted)',
  }}>
    {icon ? (
      <div style={{
        width: '3rem',
        height: '3rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        color: 'var(--color-text-secondary)',
      }}>
        {icon}
      </div>
    ) : (
      <div style={{
        width: '3rem',
        height: '3rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        color: 'var(--color-text-secondary)',
      }}>
        <Icon icon={FolderOpen} size="lg" />
      </div>
    )}
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
