import React from 'react';

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
}) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
    style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'var(--transition-fast)',
      boxShadow: 'var(--shadow-sm)',
      ...(hover ? { transform: 'translateY(0)' } : {}),
      ...style,
    }}
  >
    {children}
  </div>
);

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
}) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
        }}>
          {title}
        </p>
        <p style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: color || 'var(--color-text)',
          margin: '0.375rem 0 0',
          fontFamily: 'var(--font-display)',
          lineHeight: 1.2,
        }}>
          {value}
        </p>
        {subtitle && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            margin: '0.25rem 0 0',
          }}>
            {subtitle}
          </p>
        )}
        {trend && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trend.isPositive ? 'var(--color-success)' : 'var(--color-danger)',
            marginTop: '0.375rem',
          }}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {icon && (
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: 'var(--radius-md)',
          background: color ? `${color}15` : 'var(--color-brand-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
        }}>
          {icon}
        </div>
      )}
    </div>
  </Card>
);
