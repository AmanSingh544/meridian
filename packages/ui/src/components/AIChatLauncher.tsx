import React from 'react';

export interface AIChatLauncherProps {
  onClick: () => void;
  unreadCount?: number;
}

export const AIChatLauncher: React.FC<AIChatLauncherProps> = ({ onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        background: 'var(--color-brand-500)',
        color: '#fff',
        border: 'none',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        zIndex: 9998,
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
      aria-label="Open AI Copilot"
    >
      <span>🤖</span>
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-0.25rem',
          right: '-0.25rem',
          background: 'var(--color-danger, #ef4444)',
          color: '#fff',
          fontSize: '0.6875rem',
          fontWeight: 700,
          width: '1.25rem',
          height: '1.25rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
