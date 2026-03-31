import React from 'react';
import { Button } from './Button';
import { ConfidenceBar } from './ConfidenceBar';

export interface AIBannerProps {
  title: string;
  description: string;
  confidence?: number;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  loading?: boolean;
  unavailable?: boolean;
}

export const AIBanner: React.FC<AIBannerProps> = ({
  title,
  description,
  confidence,
  onAccept,
  onReject,
  onEdit,
  loading = false,
  unavailable = false,
}) => {
  if (unavailable) {
    return (
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-muted)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        fontSize: '0.8125rem',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span>🤖</span>
        AI suggestions are temporarily unavailable
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #c7d2fe',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{
          width: '1.25rem', height: '1.25rem',
          border: '2px solid #6366f1',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.8125rem', color: '#4338ca' }}>AI is analyzing...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid #c7d2fe',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: '#4338ca',
            }}>
              AI Suggestion
            </span>
          </div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#1e1b4b' }}>{title}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#3730a3', lineHeight: 1.5 }}>{description}</p>
          {confidence !== undefined && (
            <div style={{ marginTop: '0.5rem' }}>
              <ConfidenceBar confidence={confidence} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {onAccept && <Button variant="primary" size="sm" onClick={onAccept}>✓ Accept</Button>}
            {onEdit && <Button variant="secondary" size="sm" onClick={onEdit}>✎ Edit</Button>}
            {onReject && <Button variant="ghost" size="sm" onClick={onReject}>✕ Dismiss</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};
