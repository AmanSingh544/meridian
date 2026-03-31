import React, { useState, useRef } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span style={{
          position: 'absolute',
          [position === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-text)',
          color: 'var(--color-bg)',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          zIndex: 1070,
          pointerEvents: 'none',
        }}>
          {content}
        </span>
      )}
    </span>
  );
};
