import React, { useState } from 'react';
import type { SLAInfo } from '@3sc/types';
import { SLABadge } from './Badge';
import { getTimeRemaining } from '@3sc/utils';
import { useInterval } from '@3sc/hooks';

export interface SLATimerProps {
  sla: SLAInfo;
  compact?: boolean;
}

export const SLATimer: React.FC<SLATimerProps> = ({ sla, compact = false }) => {
  const [, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), 60_000);

  const response = getTimeRemaining(sla.responseDeadline);
  const resolution = getTimeRemaining(sla.resolutionDeadline);

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <SLABadge state={sla.resolutionState} />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {resolution.label}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
      padding: '0.875rem',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.8125rem',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
          Response
        </p>
        <div style={{ marginTop: '0.25rem' }}><SLABadge state={sla.responseState} /></div>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: response.isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
          {response.label}
        </p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
          Resolution
        </p>
        <div style={{ marginTop: '0.25rem' }}><SLABadge state={sla.resolutionState} /></div>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: resolution.isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
          {resolution.label}
        </p>
      </div>
    </div>
  );
};
