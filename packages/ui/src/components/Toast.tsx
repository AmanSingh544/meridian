import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const variantColors: Record<ToastVariant, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

const variantIcons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

let _toastStylesInjected = false;
function injectToastStyles() {
  if (_toastStylesInjected || typeof document === 'undefined') return;
  _toastStylesInjected = true;
  const el = document.createElement('style');
  el.id = '__toast-styles';
  el.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to   { transform: translateX(100%); opacity: 0; }
    }
    .__toast-item {
      animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .__toast-item.__toast-exit {
      animation: toastSlideOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
  `;
  document.head.appendChild(el);
}

const ToastItem: React.FC<{ t: ToastMessage; onRemove: (id: string) => void }> = ({ t, onRemove }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(t.id), 200);
    }, t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t, onRemove]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onRemove(t.id), 200);
  };

  if (typeof document !== 'undefined') injectToastStyles();

  return (
    <div
      className={`__toast-item${exiting ? ' __toast-exit' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg)',
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${variantColors[t.variant]}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-body)',
        maxWidth: '24rem',
        minWidth: '18rem',
      }}
    >
      <span style={{ color: variantColors[t.variant], display: 'flex', flexShrink: 0 }}>
        <Icon icon={variantIcons[t.variant]} size="md" />
      </span>
      <span style={{ flex: 1, color: 'var(--color-text)' }}>{t.message}</span>
      <IconButton icon={X} size="sm" label="Dismiss" onClick={handleDismiss} />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1080,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        {toasts.map((t) => <ToastItem key={t.id} t={t} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  );
};

export const Toast = ToastItem;
