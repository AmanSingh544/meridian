import React, { useEffect, useRef } from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  position?: 'right' | 'left';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '28rem',
  position = 'right',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slideDir = position === 'right' ? 'translateX(100%)' : 'translateX(-100%)';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [position]: 0,
        width: '90%',
        maxWidth: width,
        background: 'var(--color-bg)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        animation: `drawerSlide 0.25s ease forwards`,
      }}>
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
            }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.125rem',
                color: 'var(--color-text-muted)',
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes drawerSlide {
          from { transform: ${slideDir}; }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
