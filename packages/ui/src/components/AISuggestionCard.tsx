import React from 'react';
import { Bot } from 'lucide-react';
import type { AISuggestionStatus } from '@3sc/types';
import { ConfidenceBar } from './ConfidenceBar';
import { Button } from './Button';
import { Icon } from './Icon';

export interface AISuggestionCardProps {
  type: string;
  title: string;
  content: React.ReactNode;
  confidence: number;
  reasoning?: string;
  status?: AISuggestionStatus;
  loading?: boolean;
  acceptLabel?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  type,
  title,
  content,
  confidence,
  reasoning,
  status = 'pending',
  loading = false,
  acceptLabel = 'Accept',
  onAccept,
  onReject,
  onEdit,
  onCancel,
}) => {
  const isResolved = status === 'accepted' || status === 'rejected' || status === 'edited';

  return (
    <div style={{
      border: '1px solid #c7d2fe',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      opacity: isResolved ? 0.7 : 1,
    }}>
      <div style={{
        background: '#eef2ff',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #c7d2fe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex' }}><Icon icon={Bot} size="sm" /></span>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em', color: '#4338ca',
          }}>
            {type}
          </span>
        </div>
        {isResolved && (
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600,
            color: status === 'accepted' ? 'var(--color-success)' : status === 'rejected' ? 'var(--color-danger)' : '#8b5cf6',
            textTransform: 'uppercase',
          }}>
            {status}
          </span>
        )}
      </div>
      <div style={{ padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {content}
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <ConfidenceBar confidence={confidence} />
        </div>
        {reasoning && (
          <p style={{
            marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)',
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            Reasoning: {reasoning}
          </p>
        )}
        {!isResolved && (onAccept || onEdit || onReject || onCancel) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {onAccept && <Button variant="primary" size="sm" loading={loading} onClick={onAccept}>{acceptLabel}</Button>}
            {onEdit && !onCancel && <Button variant="secondary" size="sm" disabled={loading} onClick={onEdit}>Edit</Button>}
            {onCancel && <Button variant="secondary" size="sm" disabled={loading} onClick={onCancel}>Cancel</Button>}
            {onReject && <Button variant="ghost" size="sm" disabled={loading} onClick={onReject}>Dismiss</Button>}
          </div>
        )}
      </div>
    </div>
  );
};
