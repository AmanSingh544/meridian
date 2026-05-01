import React, { useState, useRef, useEffect } from 'react';

export interface AIChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const AIChatInput: React.FC<AIChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a command or ask anything...',
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '0.5rem',
      padding: '0.75rem',
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-bg-elevated)',
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        style={{
          padding: '0.5rem 0.875rem',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: disabled || !text.trim() ? 'var(--color-bg-muted)' : 'var(--color-brand-500)',
          color: disabled || !text.trim() ? 'var(--color-text-muted)' : '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        Send
      </button>
    </div>
  );
};
