import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

// ── Modal ───────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '32rem',
  footer,
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

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        width: '90%',
        maxWidth: width,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.2s ease',
      }}>
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: 'var(--color-text-muted)',
                padding: '0.25rem',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
        }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
          }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

// ── Confirm Dialog ──────────────────────────────────────────────
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    width="26rem"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p style={{
      margin: 0,
      fontSize: '0.875rem',
      color: 'var(--color-text-secondary)',
      lineHeight: 1.6,
    }}>
      {message}
    </p>
  </Modal>
);
