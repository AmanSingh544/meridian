import React from 'react';
import type { MetricVariant } from './Card';

const accentMap: Record<MetricVariant, string> = {
  brand:   'var(--color-brand-500)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
  info:    'var(--color-info)',
  neutral: 'var(--color-text-muted)',
};

let _pillStylesInjected = false;
function injectPillStyles() {
  if (_pillStylesInjected || typeof document === 'undefined') return;
  _pillStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__metric-pill-styles';
  el.textContent = `
    .__metric-pill {
      --pill-accent: var(--color-brand-500);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.875rem 1rem;
      text-align: left;
      cursor: pointer;
      transition: transform 150ms cubic-bezier(0.4,0,0.2,1),
                  box-shadow 150ms cubic-bezier(0.4,0,0.2,1),
                  border-color 150ms cubic-bezier(0.4,0,0.2,1);
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
      flex: 1 1 10rem;
    }
    .__metric-pill:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--color-border-strong);
      background: linear-gradient(
        to bottom right,
        color-mix(in srgb, var(--pill-accent) 4%, transparent),
        var(--color-bg)
      );
    }
    .__metric-pill:active {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }
    .__metric-pill--active {
      border-color: var(--pill-accent);
      box-shadow: 0 0 0 1px var(--pill-accent), var(--shadow-sm);
    }
    .__metric-pill:focus-visible {
      outline: 2px solid var(--pill-accent);
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .__metric-pill {
        transition: none !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(el);
}

export interface MetricPillProps {
  label: string;
  count: number;
  variant?: MetricVariant;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  count,
  variant = 'brand',
  color,
  active = false,
  onClick,
}) => {
  if (typeof document !== 'undefined') injectPillStyles();

  const accent = color || accentMap[variant];
  const classes = ['__metric-pill'];
  if (active) classes.push('__metric-pill--active');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={onClick}
      style={{ ['--pill-accent' as string]: accent }}
    >
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: accent,
        fontFamily: 'var(--font-display)',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      }}>
        {count}
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--color-text-secondary)',
        marginTop: '0.125rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
      }}>
        {label}
      </div>
    </button>
  );
};
