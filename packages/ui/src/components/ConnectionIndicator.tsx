import React from 'react';
import type { ConnectionStatus } from '@3sc/realtime';

const statusConfig: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: '#10b981', label: 'Connected' },
  connecting: { color: '#f59e0b', label: 'Connecting...' },
  reconnecting: { color: '#f59e0b', label: 'Reconnecting...' },
  disconnected: { color: '#6b7280', label: 'Disconnected' },
  failed: { color: '#ef4444', label: 'Connection Lost' },
};

export const ConnectionIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const { color, label } = statusConfig[status];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
      fontSize: '0.75rem', color: 'var(--color-text-secondary)',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: status === 'connected' ? `0 0 6px ${color}` : 'none',
      }} />
      {label}
    </div>
  );
};
