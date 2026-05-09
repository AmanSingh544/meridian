import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

let _tooltipStylesInjected = false;
function injectTooltipStyles() {
  if (_tooltipStylesInjected || typeof document === 'undefined') return;
  _tooltipStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__tooltip-styles';
  el.textContent = `
    @keyframes tooltipFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .__tooltip {
      animation: tooltipFadeIn 0.12s ease forwards;
    }
  `;
  document.head.appendChild(el);
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', delay = 200 }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  if (typeof document !== 'undefined') injectTooltipStyles();

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const arrowSize = 5;
  const gap = 8;

  const tooltipBase: React.CSSProperties = {
    position: 'absolute',
    background: 'var(--color-text)',
    color: 'var(--color-bg)',
    padding: '0.375rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    zIndex: 1070,
    pointerEvents: 'none',
    boxShadow: 'var(--shadow-lg)',
    lineHeight: 1.4,
  };

  const arrowBase: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  };

  let tooltipPos: React.CSSProperties = {};
  let arrowPos: React.CSSProperties = {};
  let origin = 'center';

  switch (position) {
    case 'top':
      tooltipPos = { bottom: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' };
      arrowPos = { top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`, borderColor: 'var(--color-text) transparent transparent transparent' };
      origin = 'center bottom';
      break;
    case 'bottom':
      tooltipPos = { top: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' };
      arrowPos = { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`, borderColor: 'transparent transparent var(--color-text) transparent' };
      origin = 'center top';
      break;
    case 'left':
      tooltipPos = { right: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' };
      arrowPos = { left: '100%', top: '50%', transform: 'translateY(-50%)', borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`, borderColor: 'transparent transparent transparent var(--color-text)' };
      origin = 'center right';
      break;
    case 'right':
      tooltipPos = { left: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' };
      arrowPos = { right: '100%', top: '50%', transform: 'translateY(-50%)', borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`, borderColor: 'transparent var(--color-text) transparent transparent' };
      origin = 'center left';
      break;
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {visible && (
        <span
          className="__tooltip"
          role="tooltip"
          style={{
            ...tooltipBase,
            ...tooltipPos,
            transformOrigin: origin,
          }}
        >
          {content}
          <span style={{ ...arrowBase, ...arrowPos }} />
        </span>
      )}
    </span>
  );
};
