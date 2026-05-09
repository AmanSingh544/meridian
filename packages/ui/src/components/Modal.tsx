import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';

let _modalStylesInjected = false;
function injectModalStyles() {
  if (_modalStylesInjected || typeof document === 'undefined') return;
  _modalStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__modal-styles';
  el.textContent = `
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalSlideUp {
      from { transform: translateY(12px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    .__modal-overlay {
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .__modal-dialog {
      animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(el);
}

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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  // Simple focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document !== 'undefined') injectModalStyles();

  return (
    <div
      ref={overlayRef}
      className="__modal-overlay"
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
      }}
    >
      <div
        ref={dialogRef}
        className="__modal-dialog"
        style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          width: '90%',
          maxWidth: width,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
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
            <IconButton icon={X} size="sm" label="Close" onClick={onClose} />
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
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
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
  /** Optional extra content rendered below the message (e.g. a reason textarea) */
  children?: React.ReactNode;
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
  children,
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
    {children}
  </Modal>
);
