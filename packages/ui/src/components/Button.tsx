import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background: var(--color-brand-600);
    color: #fff;
    border: 1px solid var(--color-brand-600);
  `,
  secondary: `
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border-strong);
  `,
  ghost: `
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
  `,
  danger: `
    background: var(--color-danger);
    color: #fff;
    border: 1px solid var(--color-danger);
  `,
  success: `
    background: var(--color-success);
    color: #fff;
    border: 1px solid var(--color-success);
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'padding: 0.375rem 0.75rem; font-size: 0.8125rem;',
  md: 'padding: 0.5rem 1rem; font-size: 0.875rem;',
  lg: 'padding: 0.625rem 1.25rem; font-size: 1rem;',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'var(--transition-fast)',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    lineHeight: 1.5,
    ...style,
  };

  // Parse CSS string styles (simplified runtime approach)
  const cssText = `${variantStyles[variant]} ${sizeStyles[size]}`;

  return (
    <button
      disabled={disabled || loading}
      style={baseStyle}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      <style>{`
        button[data-variant="${variant}"][data-size="${size}"] {
          ${cssText}
        }
        button[data-variant="${variant}"]:hover:not(:disabled) {
          filter: brightness(0.92);
        }
        button[data-variant="${variant}"]:focus-visible {
          outline: 2px solid var(--color-brand-500);
          outline-offset: 2px;
        }
      `}</style>
      {loading && (
        <span
          style={{
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      )}
      {!loading && icon}
      {children}
    </button>
  );
};
