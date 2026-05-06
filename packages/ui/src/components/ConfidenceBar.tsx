import React from 'react';
import { AI_CONFIG } from '@3sc/config';

export interface ConfidenceBarProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  showLabel = true,
}) => {
  const safeConfidence = confidence ?? 0;
  const pct = Math.round(safeConfidence * 100);
  const color = safeConfidence >= AI_CONFIG.highConfidenceThreshold
    ? 'var(--color-success)'
    : safeConfidence >= AI_CONFIG.minConfidenceThreshold
    ? 'var(--color-warning)'
    : 'var(--color-danger)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        flex: 1,
        height: 6,
        background: 'var(--color-bg-muted)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color, minWidth: '2.5rem', textAlign: 'right' }}>
          {pct}%
        </span>
      )}
    </div>
  );
};
