import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useClickOutside } from '@3sc/hooks';

export interface DropdownItemProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ label, icon, onClick, danger, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      width: '100%', padding: '0.5rem 0.75rem',
      background: 'none', border: 'none',
      fontSize: '0.8125rem', fontFamily: 'var(--font-body)',
      color: danger ? 'var(--color-danger)' : 'var(--color-text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      textAlign: 'left',
      borderRadius: 'var(--radius-sm)',
    }}
    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ''; }}
  >
    {icon}{label}
  </button>
);

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  useLayoutEffect(() => {
    if (open && ref.current && menuRef.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = menuRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        setFlip(true);
      } else {
        setFlip(false);
      }
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{trigger}</div>
      {open && (
        <div
          ref={menuRef}
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute',
            ...(flip ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            [align]: 0,
            minWidth: '10rem',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.25rem',
            zIndex: 1060,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
