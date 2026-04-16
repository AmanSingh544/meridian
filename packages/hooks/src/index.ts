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
// Respects system preference on first visit.

export type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: Theme; toggleTheme: () => void; isDark: boolean } {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('3sc_pref_theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return getSystemTheme();
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem('3sc_pref_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  // Apply immediately on mount (handles SSR/hydration edge cases)
  useEffect(() => { applyTheme(theme); }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
