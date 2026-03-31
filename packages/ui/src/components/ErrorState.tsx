import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}) => (
  <div style={{
    textAlign: 'center',
    padding: '3rem 1.5rem',
    background: 'var(--color-danger-light, #fee2e2)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-danger)',
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-danger)' }}>{title}</h3>
    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{message}</p>
    {onRetry && (
      <div style={{ marginTop: '1rem' }}>
        <Button variant="secondary" size="sm" onClick={onRetry}>Try Again</Button>
      </div>
    )}
  </div>
);
