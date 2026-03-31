import React from 'react';
import type { AISuggestionStatus } from '@3sc/types';
import { ConfidenceBar } from './ConfidenceBar';
import { Button } from './Button';

export interface AISuggestionCardProps {
  type: string;
  title: string;
  content: React.ReactNode;
  confidence: number;
  reasoning?: string;
  status?: AISuggestionStatus;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  type,
  title,
  content,
  confidence,
  reasoning,
  status = 'pending',
  onAccept,
  onReject,
  onEdit,
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
          <span style={{ fontSize: '0.875rem' }}>🤖</span>
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
        {!isResolved && (onAccept || onEdit || onReject) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {onAccept && <Button variant="primary" size="sm" onClick={onAccept}>Accept</Button>}
            {onEdit && <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>}
            {onReject && <Button variant="ghost" size="sm" onClick={onReject}>Dismiss</Button>}
          </div>
        )}
      </div>
    </div>
  );
};
