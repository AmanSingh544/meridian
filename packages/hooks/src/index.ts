// ═══════════════════════════════════════════════════════════════
// @3sc/hooks — Shared Custom Hooks
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createPermissionChecker, type PermissionChecker } from '@3sc/permissions';
import type { SessionInfo, Permission, TicketStatus } from '@3sc/types';
import { isValidTransition, getAvailableTransitions, debounce } from '@3sc/utils';

// ── Auth Hooks ──────────────────────────────────────────────────

/** Access current session from Redux store */
export function useSession(): SessionInfo | null {
  return useSelector((state: { auth: { session: SessionInfo | null } }) => state.auth.session);
}

export function useIsAuthenticated(): boolean {
  const session = useSession();
  return session !== null;
}

// ── Permission Hooks ────────────────────────────────────────────

export function usePermissions(): PermissionChecker {
  const session = useSession();
  return useMemo(() => {
    if (!session) {
      // Return a no-op checker with no permissions
      return createPermissionChecker('customer_user' as never, []);
    }
    return createPermissionChecker(session.role, session.permissions);
  }, [session?.role, session?.permissions]);
}

export function useHasPermission(permission: Permission): boolean {
  const checker = usePermissions();
  return checker.has(permission);
}

export function useHasAnyPermission(...permissions: Permission[]): boolean {
  const checker = usePermissions();
  return checker.hasAny(...permissions);
}

// ── Ticket State Machine Hook ───────────────────────────────────

export function useTicketTransitions(currentStatus: TicketStatus) {
  const availableTransitions = useMemo(
    () => getAvailableTransitions(currentStatus),
    [currentStatus],
  );

  const canTransitionTo = useCallback(
    (target: TicketStatus) => isValidTransition(currentStatus, target),
    [currentStatus],
  );

  return { availableTransitions, canTransitionTo };
}

// ── Debounced Search Hook ───────────────────────────────────────

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300,
): T {
  const ref = useRef(callback);
  ref.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () => debounce((...args: unknown[]) => ref.current(...args), delay) as unknown as T,
    [delay],
  );
}

// ── Pagination Hook ─────────────────────────────────────────────

export interface UsePaginationOptions {
  totalItems: number;
  page_size?: number;
  initialPage?: number;
}

export function usePagination({ totalItems, page_size = 20, initialPage = 1 }: UsePaginationOptions) {
  const [page, setPage] = useState(initialPage);
  const total_pages = Math.ceil(totalItems / page_size);

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, total_pages))),
    [total_pages],
  );

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

  return {
    page,
    page_size,
    total_pages,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: page < total_pages,
    hasPrevPage: page > 1,
  };
}

// ── Local Storage Hook (for non-sensitive UI preferences only) ──

export function useLocalPreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`3sc_pref_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPreference = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(`3sc_pref_${key}`, JSON.stringify(newValue));
      } catch {
        // Ignore storage errors
      }
    },
    [key],
  );

  return [value, setPreference];
}

// ── Click Outside Hook ──────────────────────────────────────────

export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// ── Interval Hook ───────────────────────────────────────────────

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ── Media Query Hook ────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

// ── Document Title Hook ─────────────────────────────────────────

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | 3SC Platform` : '3SC Platform';
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}

// ── Theme Hook ──────────────────────────────────────────────────
// Persists choice in localStorage, applies [data-theme] on <html>.
// Supports 'light' | 'dark' | 'system'. 'system' resolves to the OS preference.
// Uses a module-level singleton so every useTheme() instance stays in sync.

export type Theme = 'light' | 'dark';
export type ColorMode = 'light' | 'dark' | 'system';

const ACCENT_HEX: Record<string, string> = {
  cobalt:  '#4f46e5',
  sky:     '#0ea5e9',
  emerald: '#10b981',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
  slate:   '#64748b',
};

// Derived brand palette from a single base hex (50/500/600/700/900 stops).
function derivePalette(hex: string): Record<string, string> {
  return {
    '--color-brand-50':  hex + '14',
    '--color-brand-100': hex + '26',
    '--color-brand-200': hex + '4d',
    '--color-brand-500': hex,
    '--color-brand-600': hex,
    '--color-brand-700': hex,
    '--color-brand-900': hex,
  };
}

export function applyAccentColor(accentId: string) {
  const hex = ACCENT_HEX[accentId] ?? ACCENT_HEX.cobalt;
  const root = document.documentElement;
  const palette = derivePalette(hex);
  Object.entries(palette).forEach(([prop, val]) => root.style.setProperty(prop, val));
  try { localStorage.setItem('3sc_pref_accent', accentId); } catch { /* ignore */ }
}

export function applyDensity(density: 'comfortable' | 'compact') {
  document.documentElement.setAttribute('data-density', density);
  try { localStorage.setItem('3sc_pref_density', density); } catch { /* ignore */ }
}

// ── Shared theme state (singleton) ──────────────────────────────

const THEME_STORAGE_KEY = '3sc_pref_color_mode';
const LEGACY_THEME_KEY  = '3sc_pref_theme';

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function resolveColorMode(mode: ColorMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function readStoredColorMode(): ColorMode | null {
  try {
    const mode = localStorage.getItem(THEME_STORAGE_KEY) as ColorMode | null;
    if (mode) return mode;
    const legacy = localStorage.getItem(LEGACY_THEME_KEY) as Theme | null;
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch { /* ignore */ }
  return null;
}

function writeStoredColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    localStorage.setItem(LEGACY_THEME_KEY, resolveColorMode(mode));
  } catch { /* ignore */ }
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

let sharedColorMode: ColorMode = readStoredColorMode() ?? 'system';
let sharedTheme: Theme = resolveColorMode(sharedColorMode);
const themeListeners = new Set<(theme: Theme) => void>();

function emitTheme(theme: Theme) {
  themeListeners.forEach((cb) => cb(theme));
}

function setSharedColorMode(mode: ColorMode) {
  sharedColorMode = mode;
  sharedTheme = resolveColorMode(mode);
  applyThemeToDOM(sharedTheme);
  writeStoredColorMode(mode);
  emitTheme(sharedTheme);
}

function toggleSharedColorMode() {
  const next: ColorMode = sharedTheme === 'light' ? 'dark' : 'light';
  setSharedColorMode(next);
}

// Bootstrap DOM on first import
applyThemeToDOM(sharedTheme);

export function useTheme(): { theme: Theme; toggleTheme: () => void; setColorMode: (mode: ColorMode) => void; isDark: boolean } {
  const [theme, setTheme] = useState<Theme>(sharedTheme);

  // Subscribe to shared state
  useEffect(() => {
    const handler = (t: Theme) => setTheme(t);
    themeListeners.add(handler);
    return () => { themeListeners.delete(handler); };
  }, []);

  // Listen for OS preference changes (only acts while mode is 'system')
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (sharedColorMode !== 'system') return;
      const resolved = getSystemTheme();
      if (resolved !== sharedTheme) {
        sharedTheme = resolved;
        applyThemeToDOM(sharedTheme);
        emitTheme(sharedTheme);
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Cross-tab / cross-instance sync via storage events
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const mode = e.newValue as ColorMode;
        if (mode !== sharedColorMode) {
          sharedColorMode = mode;
          sharedTheme = resolveColorMode(mode);
          applyThemeToDOM(sharedTheme);
          emitTheme(sharedTheme);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    toggleSharedColorMode();
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setSharedColorMode(mode);
  }, []);

  return { theme, toggleTheme, setColorMode, isDark: theme === 'dark' };
}
