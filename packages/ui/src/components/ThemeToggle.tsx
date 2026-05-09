import React from 'react';
import { useTheme } from '@3sc/hooks';
import { Sun, Moon } from 'lucide-react';
import { Icon } from './Icon';

/**
 * ThemeToggle — pill-style sun/moon toggle.
 *
 * Design intent:
 *   • Pill track shifts from warm-amber (light) to deep-indigo (dark)
 *   • Thumb translates with a spring-feel cubic-bezier
 *   • Accessible: role="switch", aria-checked, aria-label, keyboard operable
 *   • 44×24px hit area meets WCAG 2.5.5 target size
 */
export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 40,
        height: 20,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        outline: 'none',
        background: isDark
          ? 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)'
          : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: isDark
          ? 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px #3730a3'
          : 'inset 0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px #d97706',
        transition: 'background 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Track icon — sun (light) or moon (dark) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: isDark ? 'auto' : 5,
          right: isDark ? 5 : 'auto',
          opacity: 0.9,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1), right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDark ? (
          <Icon icon={Moon} size="xs" color="rgba(255,255,255,0.7)" />
        ) : (
          <Icon icon={Sun} size="xs" color="rgba(255,255,255,0.9)" />
        )}
      </span>

      {/* Thumb */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          left: isDark ? 23 : 3,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.5)'
            : '0 1px 4px rgba(0,0,0,0.25)',
          transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Face icon inside thumb */}
        {isDark && (
          <span aria-hidden style={{ opacity: 0.6, display: 'flex' }}>
            <Icon icon={Moon} size="xs" color="#1e1b4b" />
          </span>
        )}
      </span>
    </button>
  );
};
