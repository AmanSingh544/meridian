import React from 'react';

// ── Shared Field Styles ─────────────────────────────────────────
const fieldBaseStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  transition: 'var(--transition-fast)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: '0.375rem',
  fontFamily: 'var(--font-body)',
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-danger)',
  marginTop: '0.25rem',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-muted)',
  marginTop: '0.25rem',
};

// ── Input ───────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  id,
  style,
  ...props
}) => {
  const fieldId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label htmlFor={fieldId} style={labelStyle}>{label}</label>}
      <input
        id={fieldId}
        style={{
          ...fieldBaseStyle,
          borderColor: error ? 'var(--color-danger)' : undefined,
          ...style,
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...props}
      />
      {error && <p id={`${fieldId}-error`} style={errorStyle} role="alert">{error}</p>}
      {hint && !error && <p style={hintStyle}>{hint}</p>}
    </div>
  );
};

// ── TextArea ────────────────────────────────────────────────────
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  hint,
  id,
  style,
  ...props
}) => {
  const fieldId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label htmlFor={fieldId} style={labelStyle}>{label}</label>}
      <textarea
        id={fieldId}
        rows={4}
        style={{
          ...fieldBaseStyle,
          resize: 'vertical',
          minHeight: '5rem',
          borderColor: error ? 'var(--color-danger)' : undefined,
          ...style,
        }}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p style={errorStyle} role="alert">{error}</p>}
      {hint && !error && <p style={hintStyle}>{hint}</p>}
    </div>
  );
};

// ── Select ──────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  options,
  placeholder,
  id,
  style,
  ...props
}) => {
  const fieldId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    // <div style={{ marginBottom: '1rem' }}>
    <div style={{ }}>
      {label && <label htmlFor={fieldId} style={labelStyle}>{label}</label>}
      <select
        id={fieldId}
        style={{
          ...fieldBaseStyle,
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          paddingRight: '2.5rem',
          borderColor: error ? 'var(--color-danger)' : undefined,
          ...style,
        }}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p style={errorStyle} role="alert">{error}</p>}
      {hint && !error && <p style={hintStyle}>{hint}</p>}
    </div>
  );
};
