import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

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

const ToastItem: React.FC<{ t: ToastMessage; onRemove: (id: string) => void }> = ({ t, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t, onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem',
      background: 'var(--color-bg)',
      border: `1px solid var(--color-border)`,
      borderLeft: `4px solid ${variantColors[t.variant]}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      fontSize: '0.875rem',
      fontFamily: 'var(--font-body)',
      animation: 'toastSlide 0.25s ease',
      maxWidth: '24rem',
    }}>
      <span style={{ flex: 1, color: 'var(--color-text)' }}>{t.message}</span>
      <button onClick={() => onRemove(t.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)', fontSize: '0.875rem',
      }}>✕</button>
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
        position: 'fixed', top: '1rem', right: '1rem',
        zIndex: 1080, display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {toasts.map((t) => <ToastItem key={t.id} t={t} onRemove={remove} />)}
      </div>
      <style>{`@keyframes toastSlide { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </ToastContext.Provider>
  );
};

export const Toast = ToastItem;
