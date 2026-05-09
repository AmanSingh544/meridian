import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon, type IconSize } from './Icon';

export type IconButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_SIZE: Record<IconButtonSize, number> = {
  sm: 28,
  md: 32,
  lg: 36,
};

const ICON_SIZE_MAP: Record<IconButtonSize, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'md',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: IconButtonSize;
  label: string;
  iconSize?: IconSize;
}

let _iconBtnStylesInjected = false;
function injectIconBtnStyles() {
  if (_iconBtnStylesInjected || typeof document === 'undefined') return;
  _iconBtnStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__icon-btn-styles';
  el.textContent = `
    .__icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      transition: background 180ms cubic-bezier(0.4,0,0.2,1),
                  color 180ms cubic-bezier(0.4,0,0.2,1),
                  border-color 180ms cubic-bezier(0.4,0,0.2,1),
                  box-shadow 180ms cubic-bezier(0.4,0,0.2,1),
                  transform 120ms cubic-bezier(0.4,0,0.2,1);
      -webkit-font-smoothing: antialiased;
      user-select: none;
      padding: 0;
    }
    .__icon-btn:hover:not(:disabled) {
      background: var(--color-bg-muted);
      color: var(--color-text);
      border-color: var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .__icon-btn:active:not(:disabled) {
      transform: scale(0.92);
      background: var(--color-bg-subtle);
    }
    .__icon-btn:focus-visible {
      outline: 2px solid var(--color-brand-500);
      outline-offset: 2px;
    }
    .__icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(el);
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'md',
  label,
  iconSize,
  style,
  ...props
}) => {
  if (typeof document !== 'undefined') injectIconBtnStyles();

  const btnSize = BUTTON_SIZE[size];
  const icoSize = iconSize || ICON_SIZE_MAP[size];

  return (
    <button
      type="button"
      className="__icon-btn"
      aria-label={label}
      title={label}
      style={{
        width: btnSize,
        height: btnSize,
        ...style,
      }}
      {...props}
    >
      <Icon icon={icon} size={icoSize} />
    </button>
  );
};
