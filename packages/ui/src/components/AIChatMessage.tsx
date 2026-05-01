import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface AIChatMessageProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
  toolCallId?: string;
  onConfirmDraft?: (tool: string, payload: Record<string, unknown>) => void;
  onCancelDraft?: () => void;
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  role,
  content,
  toolCalls,
  onConfirmDraft,
  onCancelDraft,
}) => {
  const isUser = role === 'user';
  const isTool = role === 'tool';

  // Try to parse draft/tool result from content
  let draftData: { tool?: string; displayTitle?: string; displayDescription?: string; payload?: Record<string, unknown> } | null = null;
  if (!isUser && !isTool) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'draft') {
        draftData = parsed.data ?? parsed;
      }
    } catch {
      // Not JSON, treat as normal text
    }
  }

  if (isTool) {
    // Tool results are rendered inline but collapsed-looking
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '0.25rem 0',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-muted)',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}>
          <span>✓</span>
          <span>Action completed</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      margin: '0.5rem 0',
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-lg)',
        background: isUser ? 'var(--color-brand-500)' : 'var(--color-bg-elevated)',
        color: isUser ? '#fff' : 'var(--color-text)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}>
        {isUser ? (
          <span>{content}</span>
        ) : draftData ? (
          <DraftCard
            title={draftData.displayTitle ?? 'Proposed Action'}
            description={draftData.displayDescription ?? ''}
            onConfirm={() => onConfirmDraft?.(draftData!.tool!, draftData!.payload ?? {})}
            onCancel={onCancelDraft}
          />
        ) : (
          <MarkdownRenderer>{content}</MarkdownRenderer>
        )}
      </div>
    </div>
  );
};

const DraftCard: React.FC<{
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
}> = ({ title, description, onConfirm, onCancel }) => (
  <div style={{
    background: 'var(--color-bg-muted)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    minWidth: '240px',
  }}>
    <div style={{
      fontSize: '0.6875rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--color-brand-500)',
      marginBottom: '0.25rem',
    }}>
      Proposed Action
    </div>
    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
      {description}
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        onClick={() => {console.log("clciked"); onConfirm();}}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--color-brand-500)',
          color: '#fff',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Confirm
      </button>
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      )}
    </div>
  </div>
);
