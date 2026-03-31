import React from 'react';

const pulseStyle = `@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`;

export const Skeleton: React.FC<{
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '1rem', borderRadius = 'var(--radius-sm)', style }) => (
  <>
    <div style={{
      width,
      height,
      borderRadius,
      background: 'var(--color-bg-muted)',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...style,
    }} />
    <style>{pulseStyle}</style>
  </>
);

export const SkeletonRow: React.FC = () => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 0' }}>
    <Skeleton width="2rem" height="2rem" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <Skeleton width="60%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div style={{
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
  }}>
    <Skeleton width="40%" height="0.75rem" style={{ marginBottom: '0.75rem' }} />
    <Skeleton width="50%" height="1.5rem" style={{ marginBottom: '0.5rem' }} />
    <Skeleton width="30%" height="0.75rem" />
  </div>
);
