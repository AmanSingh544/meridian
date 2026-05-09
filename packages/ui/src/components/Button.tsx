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

const SIZE: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: '2rem',    padding: '0 0.75rem',  fontSize: '0.8125rem', gap: '0.375rem' },
  md: { height: '2.375rem', padding: '0 1rem',    fontSize: '0.875rem',  gap: '0.5rem'   },
  lg: { height: '2.75rem', padding: '0 1.375rem', fontSize: '0.9375rem', gap: '0.5rem'   },
};

const VARIANT_CSS: Record<ButtonVariant, string> = {
  primary: `
    background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600));
    color: #fff;
    border: none;
    box-shadow: 0 1px 6px rgba(99,102,241,0.32), inset 0 1px 0 rgba(255,255,255,0.12);
  `,
  secondary: `
    background: var(--color-bg-surface);
    color: var(--color-text);
    border: 1.5px solid var(--color-border-strong);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  `,
  ghost: `
    background: transparent;
    color: var(--color-text-secondary);
    border: 1.5px solid transparent;
  `,
  danger: `
    background: var(--color-danger);
    color: #fff;
    border: none;
    box-shadow: 0 1px 6px rgba(239,68,68,0.28);
  `,
  success: `
    background: var(--color-success);
    color: #fff;
    border: none;
    box-shadow: 0 1px 6px rgba(16,185,129,0.28);
  `,
};

const VARIANT_HOVER_CSS: Record<ButtonVariant, string> = {
  primary:   `background: linear-gradient(135deg, var(--color-brand-600), var(--color-brand-700)); box-shadow: 0 4px 14px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.12); transform: translateY(-1px);`,
  secondary: `background: var(--color-bg-subtle); border-color: var(--color-border-strong); box-shadow: 0 2px 6px rgba(0,0,0,0.08); transform: translateY(-1px);`,
  ghost:     `background: var(--color-bg-subtle); color: var(--color-text); border-color: var(--color-border);`,
  danger:    `background: #dc2626; box-shadow: 0 4px 14px rgba(239,68,68,0.38); transform: translateY(-1px);`,
  success:   `background: #059669; box-shadow: 0 4px 14px rgba(16,185,129,0.38); transform: translateY(-1px);`,
};

const VARIANT_ACTIVE_CSS: Record<ButtonVariant, string> = {
  primary:   `transform: translateY(0); box-shadow: 0 1px 4px rgba(99,102,241,0.3);`,
  secondary: `transform: translateY(0); box-shadow: none;`,
  ghost:     `transform: translateY(0);`,
  danger:    `transform: translateY(0); box-shadow: 0 1px 4px rgba(239,68,68,0.3);`,
  success:   `transform: translateY(0); box-shadow: 0 1px 4px rgba(16,185,129,0.3);`,
};

let _injected = false;
function injectStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.id = '__btn-styles';
  el.textContent = `
    @keyframes btn-spin { to { transform: rotate(360deg); } }
    @keyframes btn-ripple {
      from { transform: scale(0); opacity: 0.35; }
      to   { transform: scale(2.5); opacity: 0; }
    }
    .__btn {
      display: inline-flex; align-items: center; justify-content: center;
      font-family: var(--font-display, 'DM Sans', sans-serif);
      font-weight: 600;
      border-radius: var(--radius-md, 0.5rem);
      cursor: pointer;
      position: relative; overflow: hidden;
      white-space: nowrap; flex-shrink: 0;
      transition: background 180ms cubic-bezier(0.4,0,0.2,1),
                  box-shadow 180ms cubic-bezier(0.4,0,0.2,1),
                  border-color 180ms cubic-bezier(0.4,0,0.2,1),
                  color 180ms cubic-bezier(0.4,0,0.2,1),
                  transform 150ms cubic-bezier(0.34,1.56,0.64,1);
      -webkit-font-smoothing: antialiased;
      user-select: none;
      text-decoration: none;
      line-height: 1;
      box-sizing: border-box;
    }
    .__btn:focus-visible {
      outline: 2px solid var(--color-brand-500);
      outline-offset: 2px;
    }
    .__btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    .__btn svg { flex-shrink: 0; }

    /* Variant base */
    .__btn[data-v="primary"]   { ${VARIANT_CSS.primary}   }
    .__btn[data-v="secondary"] { ${VARIANT_CSS.secondary} }
    .__btn[data-v="ghost"]     { ${VARIANT_CSS.ghost}     }
    .__btn[data-v="danger"]    { ${VARIANT_CSS.danger}    }
    .__btn[data-v="success"]   { ${VARIANT_CSS.success}   }

    /* Hover */
    .__btn[data-v="primary"]:not(:disabled):hover   { ${VARIANT_HOVER_CSS.primary}   }
    .__btn[data-v="secondary"]:not(:disabled):hover { ${VARIANT_HOVER_CSS.secondary} }
    .__btn[data-v="ghost"]:not(:disabled):hover     { ${VARIANT_HOVER_CSS.ghost}     }
    .__btn[data-v="danger"]:not(:disabled):hover    { ${VARIANT_HOVER_CSS.danger}    }
    .__btn[data-v="success"]:not(:disabled):hover   { ${VARIANT_HOVER_CSS.success}   }

    /* Active/press */
    .__btn[data-v="primary"]:not(:disabled):active   { ${VARIANT_ACTIVE_CSS.primary}   }
    .__btn[data-v="secondary"]:not(:disabled):active { ${VARIANT_ACTIVE_CSS.secondary} }
    .__btn[data-v="ghost"]:not(:disabled):active     { ${VARIANT_ACTIVE_CSS.ghost}     }
    .__btn[data-v="danger"]:not(:disabled):active    { ${VARIANT_ACTIVE_CSS.danger}    }
    .__btn[data-v="success"]:not(:disabled):active   { ${VARIANT_ACTIVE_CSS.success}   }

    /* Ripple */
    .__btn-ripple {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.4);
      pointer-events: none;
      animation: btn-ripple 550ms cubic-bezier(0.4,0,0.2,1) forwards;
    }
    .__btn[data-v="secondary"] .__btn-ripple,
    .__btn[data-v="ghost"] .__btn-ripple {
      background: rgba(99,102,241,0.18);
    }

    /* Spinner */
    .__btn-spinner {
      width: 1em; height: 1em;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: btn-spin 0.65s linear infinite;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(el);
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  style,
  onClick,
  ...props
}) => {
  if (typeof document !== 'undefined') injectStyles();

  const sizeStyle = SIZE[size];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Ripple
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = '__btn-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());

    onClick?.(e);
  };

  return (
    <button
      className="__btn"
      data-v={variant}
      disabled={disabled || loading}
      onClick={handleClick}
      style={{
        ...sizeStyle,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...props}
    >
      {loading ? <span className="__btn-spinner" /> : icon}
      {children}
    </button>
  );
};
