import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
      transition: 'background 100ms ease',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-muted)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate fixed position for the menu
  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const estimatedHeight = menuRef.current?.offsetHeight ?? 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldFlip = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setMenuStyle({
        position: 'fixed',
        top: shouldFlip ? undefined : rect.bottom + 4,
        bottom: shouldFlip ? window.innerHeight - rect.top + 4 : undefined,
        left: align === 'left' ? rect.left : undefined,
        right: align === 'right' ? window.innerWidth - rect.right : undefined,
        minWidth: '10rem',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '0.25rem',
        zIndex: 1060,
      });
    }
  }, [open, align]);

  // Click outside handler (checks both trigger and portaled menu)
  useEffect(() => {
    if (!open) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      if (
        ref.current?.contains(event.target as Node) ||
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [open]);

  // Close on scroll or resize
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    const handleResize = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{trigger}</div>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          onClick={() => setOpen(false)}
          style={menuStyle}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
};
