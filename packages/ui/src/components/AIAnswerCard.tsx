import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface AIAnswerCardProps {
  answer: string;
  confidence?: number;
  cannotAnswer?: boolean;
  label?: string;
}

export const AIAnswerCard: React.FC<AIAnswerCardProps> = ({
  answer,
  confidence = 0,
  cannotAnswer = false,
  label = 'AI Answer',
}) => {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-brand-200, #c7d2fe)',
        background: 'linear-gradient(135deg, var(--color-brand-50, #eef2ff) 0%, var(--color-bg) 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-brand-100, #e0e7ff)',
          background: 'var(--color-brand-50, #eef2ff)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: 'var(--color-brand-700, #4338ca)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>

        {!cannotAnswer && confidence > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginLeft: 'auto',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 4,
                borderRadius: 2,
                background: 'var(--color-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(confidence * 100)}%`,
                  background:
                    confidence >= 0.7
                      ? '#22c55e'
                      : confidence >= 0.4
                        ? '#f59e0b'
                        : '#ef4444',
                  borderRadius: 2,
                }}
              />
            </div>
            <span>{Math.round(confidence * 100)}% confident</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: '1rem 1.125rem',
          color: cannotAnswer ? 'var(--color-text-secondary)' : 'var(--color-text)',
        }}
      >
        {cannotAnswer ? (
          <p style={{ margin: 0, fontSize: '0.875rem', fontStyle: 'italic' }}>{answer}</p>
        ) : (
          <MarkdownRenderer>{answer}</MarkdownRenderer>
        )}
      </div>
    </div>
  );
};
