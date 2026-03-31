// ═══════════════════════════════════════════════════════════════
// @3sc/theme — Design System Tokens
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Brand
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  // Semantic
  success: { light: '#d1fae5', main: '#10b981', dark: '#047857' },
  warning: { light: '#fef3c7', main: '#f59e0b', dark: '#b45309' },
  danger: { light: '#fee2e2', main: '#ef4444', dark: '#b91c1c' },
  info: { light: '#dbeafe', main: '#3b82f6', dark: '#1d4ed8' },
  // Neutral
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const typography = {
  fontFamily: {
    display: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    body: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

export const radii = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

/** CSS custom properties for injection into :root */
export function generateCSSVariables(): string {
  return `
    :root {
      --color-brand-50: ${colors.brand[50]};
      --color-brand-100: ${colors.brand[100]};
      --color-brand-500: ${colors.brand[500]};
      --color-brand-600: ${colors.brand[600]};
      --color-brand-700: ${colors.brand[700]};
      --color-brand-900: ${colors.brand[900]};

      --color-success: ${colors.success.main};
      --color-success-light: ${colors.success.light};
      --color-warning: ${colors.warning.main};
      --color-warning-light: ${colors.warning.light};
      --color-danger: ${colors.danger.main};
      --color-danger-light: ${colors.danger.light};
      --color-info: ${colors.info.main};
      --color-info-light: ${colors.info.light};

      --color-bg: ${colors.neutral[0]};
      --color-bg-subtle: ${colors.neutral[50]};
      --color-bg-muted: ${colors.neutral[100]};
      --color-border: ${colors.neutral[200]};
      --color-border-strong: ${colors.neutral[300]};
      --color-text: ${colors.neutral[900]};
      --color-text-secondary: ${colors.neutral[600]};
      --color-text-muted: ${colors.neutral[400]};

      --font-display: ${typography.fontFamily.display};
      --font-body: ${typography.fontFamily.body};
      --font-mono: ${typography.fontFamily.mono};

      --radius-sm: ${radii.sm};
      --radius-md: ${radii.md};
      --radius-lg: ${radii.lg};
      --radius-xl: ${radii.xl};

      --shadow-sm: ${shadows.sm};
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-xl: ${shadows.xl};

      --transition-fast: ${transitions.fast};
      --transition-normal: ${transitions.normal};
      --transition-slow: ${transitions.slow};
    }
  `;
}
