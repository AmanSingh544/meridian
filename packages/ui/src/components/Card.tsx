import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Icon } from './Icon';

let _cardStylesInjected = false;
function injectCardStyles() {
  if (_cardStylesInjected || typeof document === 'undefined') return;
  _cardStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__card-styles';
  el.textContent = `
    .__card {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: transform 200ms cubic-bezier(0.4,0,0.2,1),
                  box-shadow 200ms cubic-bezier(0.4,0,0.2,1),
                  border-color 200ms cubic-bezier(0.4,0,0.2,1);
      box-shadow:
        0 1px 2px 0 rgb(0 0 0 / 0.04),
        0 1px 3px -1px rgb(0 0 0 / 0.03);
      position: relative;
      overflow: hidden;
    }

    .__card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(50deg, transparent, color-mix(in srgb, var(--color-brand-500) 12%, transparent), transparent);
      opacity: 0;
      transition: opacity 300ms cubic-bezier(0.4,0,0.2,1);
      pointer-events: none;
      z-index: 0;
    }

    .__card.__card-hover:hover {
      transform: translateY(-2px) scale(1.01);
      border-color: var(--color-border-strong);
      box-shadow:
        0 8px 24px -8px color-mix(in srgb, var(--color-brand-500) 20%, transparent),
        0 4px 12px -4px color-mix(in srgb, var(--color-brand-500) 10%, transparent),
        0 1px 3px 0 rgb(0 0 0 / 0.06);
    }

    .__card.__card-hover:hover::before {
      opacity: 1;
    }

    .__card > * {
      position: relative;
      z-index: 1;
    }

    .__card.__card-clickable {
      cursor: pointer;
    }

    .__card.__card-clickable:active {
      transform: translateY(0) scale(0.995);
      box-shadow:
        0 1px 2px 0 rgb(0 0 0 / 0.04),
        0 1px 3px -1px rgb(0 0 0 / 0.03);
    }
  `;
  document.head.appendChild(el);
}

export interface CardProps {
  children: React.ReactNode;
  padding?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = '1.25rem',
  hover = false,
  onClick,
  style,
  className,
}) => {
  if (typeof document !== 'undefined') injectCardStyles();

  const classes = ['__card'];
  if (hover) classes.push('__card-hover');
  if (onClick) classes.push('__card-clickable');
  if (className) classes.push(className);

  return (
    <div
      className={classes.join(' ')}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MetricCard v2 — Dashboard Design System Primitive
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricVariant = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const accentMap: Record<MetricVariant, string> = {
  brand: 'var(--color-brand-500)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  neutral: 'var(--color-text-muted)',
};

let _metricCardStylesInjected = false;
function injectMetricCardStyles() {
  if (_metricCardStylesInjected || typeof document === 'undefined') return;
  _metricCardStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__metric-card-styles';
  el.textContent = `
    .__metric-card {
      --metric-accent: var(--color-brand-500);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      transition: transform 200ms cubic-bezier(0.4,0,0.2,1),
                  box-shadow 200ms cubic-bezier(0.4,0,0.2,1),
                  border-color 200ms cubic-bezier(0.4,0,0.2,1),
                  background 200ms cubic-bezier(0.4,0,0.2,1);
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }
    .__metric-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: var(--color-border-strong);
      background: linear-gradient(
        to bottom right,
        color-mix(in srgb, var(--metric-accent) 4%, transparent),
        var(--color-bg)
      );
    }
    .__metric-card--interactive {
      cursor: pointer;
    }
    .__metric-card--interactive:hover {
      box-shadow: var(--shadow-lg);
    }
    .__metric-card--interactive:active {
      transform: translateY(-1px) scale(0.995);
      box-shadow: var(--shadow-sm);
    }
    .__metric-card--interactive:focus-visible {
      outline: 2px solid var(--metric-accent);
      outline-offset: 2px;
    }
    .__metric-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--metric-accent) 12%, transparent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--metric-accent);
      transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 200ms ease;
      flex-shrink: 0;
    }
    .__metric-card:hover .__metric-icon {
      transform: scale(1.08);
    }
    .__metric-skeleton {
      background: var(--color-bg-muted);
      border-radius: var(--radius-sm);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @supports not (background: color-mix(in srgb, red 12%, transparent)) {
      .__metric-icon {
        background: var(--color-bg-muted);
      }
      .__metric-card:hover {
        background: var(--color-bg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .__metric-card,
      .__metric-icon {
        transition: none !important;
        transform: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(el);
}

export interface MetricCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: MetricVariant;
  color?: string;
  state?: 'loading' | 'ready' | 'error';
  error?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'brand',
  color,
  state = 'ready',
  error,
  onClick,
}) => {
  if (typeof document !== 'undefined') injectMetricCardStyles();

  const accent = color || accentMap[variant];
  const isInteractive = !!onClick;

  const classes = ['__metric-card'];
  if (isInteractive) classes.push('__metric-card--interactive');

  if (state === 'loading') {
    return (
      <div
        className={classes.join(' ')}
        style={{ ['--metric-accent' as string]: accent }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="__metric-skeleton" style={{ width: '55%', height: '0.875rem', marginBottom: '0.75rem' }} />
            <div className="__metric-skeleton" style={{ width: '40%', height: '1.875rem', marginBottom: '0.5rem' }} />
            {subtitle && <div className="__metric-skeleton" style={{ width: '35%', height: '0.75rem' }} />}
          </div>
          {icon && <div className="__metric-skeleton __metric-icon" style={{ background: 'var(--color-bg-muted)' }} />}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={classes.join(' ')}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
        style={{ ['--metric-accent' as string]: accent }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}>
              {title}
            </p>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-danger)',
              margin: '0.5rem 0 0',
              fontFamily: 'var(--font-body)',
            }}>
              {error || 'Failed to load'}
            </p>
          </div>
          {icon && (
            <div className="__metric-icon">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }

  const trendColor = trend
    ? trend.direction === 'up'
      ? 'var(--color-success)'
      : trend.direction === 'down'
        ? 'var(--color-danger)'
        : 'var(--color-text-muted)'
    : undefined;

  return (
    <div
      className={classes.join(' ')}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
      style={{ ['--metric-accent' as string]: accent }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}>
            {title}
          </p>
          <p style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: '0.375rem 0 0',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}>
            {value ?? '—'}
          </p>
          {(subtitle || trend) && (
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              margin: '0.375rem 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              flexWrap: 'wrap',
            }}>
              {trend && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600,
                  color: trendColor,
                }}>
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '0.125rem' }}>
                    <Icon icon={trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus} size="xs" />
                  </span>
                  {Math.abs(trend.value)}%
                  {trend.label && <span style={{ fontWeight: 400 }}>· {trend.label}</span>}
                </span>
              )}
              {subtitle && (
                <span>
                  {trend && '· '}{subtitle}
                </span>
              )}
            </p>
          )}
        </div>
        {icon && (
          <div className="__metric-icon">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
