import React from 'react';

export interface TimelineItemProps {
  icon?: React.ReactNode;
  color?: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  children?: React.ReactNode;
  isLast?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  icon,
  color = 'var(--color-brand-500)',
  title,
  subtitle,
  timestamp,
  children,
  isLast = false,
}) => (
  <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{
        width: '2rem', height: '2rem', borderRadius: '50%',
        background: `${color}20`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', zIndex: 1,
      }}>
        {icon || '●'}
      </div>
      {!isLast && (
        <div style={{ width: 2, flex: 1, background: 'var(--color-border)', minHeight: '1.5rem' }} />
      )}
    </div>
    <div style={{ paddingBottom: isLast ? 0 : '1.5rem', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{title}</p>
        {timestamp && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{timestamp}</span>}
      </div>
      {subtitle && <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      {children && <div style={{ marginTop: '0.5rem' }}>{children}</div>}
    </div>
  </div>
);

export const Timeline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'relative' }}>{children}</div>
);
