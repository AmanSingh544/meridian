// ═══════════════════════════════════════════════════════════════
// @3sc/auth — Cookie-Based Authentication
// ═══════════════════════════════════════════════════════════════

import type {
  LoginCredentials,
  SessionInfo,
  PasswordResetRequest,
  PasswordResetConfirm,
  ApiResponse,
} from '@3sc/types';
import { API_CONFIG, AUTH_CONFIG } from '@3sc/config';

const baseUrl = API_CONFIG.baseUrl;

// ── Credentialed Fetch ──────────────────────────────────────────
async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include', // Always send HttpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Attempt silent refresh
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry original request
      const retryResponse = await fetch(`${baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!retryResponse.ok) {
        throw new AuthError('Session expired', 401);
      }
      return retryResponse.json();
    }
    throw new AuthError('Unauthorized', 401);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthError(
      body.message || `Request failed: ${response.status}`,
      response.status,
      body.code,
    );
  }

  return response.json();
}

// ── Auth Error ──────────────────────────────────────────────────
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── Auth Service ────────────────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}${AUTH_CONFIG.refreshPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function login(credentials: LoginCredentials): Promise<SessionInfo> {
  const response = await authFetch<ApiResponse<SessionInfo>>(
    AUTH_CONFIG.loginPath,
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    },
  );
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await authFetch<void>(AUTH_CONFIG.logoutPath, { method: 'POST' });
  } catch {
    // Clear client state even if server logout fails
  }
}

export async function getSession(): Promise<SessionInfo | null> {
  try {
    const response = await authFetch<ApiResponse<SessionInfo>>(
      AUTH_CONFIG.sessionPath,
    );
    return response.data;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  await authFetch<void>(AUTH_CONFIG.resetPasswordPath, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function confirmPasswordReset(payload: PasswordResetConfirm): Promise<void> {
  await authFetch<void>(AUTH_CONFIG.confirmResetPath, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshSession(): Promise<boolean> {
  return attemptRefresh();
}

// ── Session Monitor ─────────────────────────────────────────────
export type SessionEventHandler = (event: 'expired' | 'warning' | 'refreshed') => void;

export class SessionMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private handler: SessionEventHandler;

  constructor(handler: SessionEventHandler) {
    this.handler = handler;
  }

  start(): void {
    this.stop();
    this.intervalId = setInterval(async () => {
      const session = await getSession();
      if (!session) {
        this.handler('expired');
        this.stop();
        return;
      }

      const expiresAt = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        this.handler('expired');
        this.stop();
      } else if (remaining <= AUTH_CONFIG.sessionWarningThreshold) {
        const refreshed = await refreshSession();
        if (refreshed) {
          this.handler('refreshed');
        } else {
          this.handler('warning');
        }
      }
    }, AUTH_CONFIG.sessionCheckInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// ── Credentialed Fetch Export ────────────────────────────────────
export { authFetch };
