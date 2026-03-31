import React from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
}) => (
  <div style={{ position: 'relative', width: '100%', maxWidth: '24rem' }}>
    <span style={{
      position: 'absolute',
      left: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--color-text-muted)',
      fontSize: '0.875rem',
      pointerEvents: 'none',
    }}>
      🔍
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '0.5rem 2.25rem 0.5rem 2.25rem',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-body)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        outline: 'none',
      }}
    />
    {value && (
      <button
        onClick={() => { onChange(''); onClear?.(); }}
        style={{
          position: 'absolute',
          right: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
          padding: '0.125rem',
        }}
      >
        ✕
      </button>
    )}
  </div>
);
