import React from 'react';

export interface MetricGridProps {
  children: React.ReactNode;
  density?: 'comfortable' | 'compact';
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  children,
  density = 'comfortable',
}) => {
  const minWidth = density === 'compact' ? '14rem' : '16rem';
  const gap = density === 'compact' ? '0.875rem' : '1rem';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
        gap,
        marginBottom: '1.5rem',
      }}
    >
      {children}
    </div>
  );
};
