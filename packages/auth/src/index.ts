// ═══════════════════════════════════════════════════════════════
// @3sc/auth — Cookie-Based Authentication
// ═══════════════════════════════════════════════════════════════

import type {
  LoginCredentials,
  SessionInfo,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '@3sc/types';
import { API_CONFIG, AUTH_CONFIG } from '@3sc/config';

const baseUrl = API_CONFIG.baseUrl;

// ── API Response Shape ──────────────────────────────────────────
interface LoginApiResponse {
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: {
    user_id: number;
    email: string;
    user_name: string;
    role: string;
    permissions: string[];
    tenant_id: string;
    tenant_name: string | null;
  };
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

// ── Map API User to SessionInfo ─────────────────────────────────
function mapToSessionInfo(apiResponse: LoginApiResponse): SessionInfo {
  const { user } = apiResponse;
  return {
    userId: String(user.user_id),
    email: user.email,
    token: '',
    displayName: user.user_name,
    role: user.role as SessionInfo['role'],
    permissions: user.permissions as SessionInfo['permissions'],
    tenantId: user.tenant_id,
    tenantName: user.tenant_name ?? "",
    tenantSlug: user.tenant_name?.toLowerCase().replace(/\s+/g, '-') ?? "",
    expiresAt: '',
  };
}

// ── Auth Service ────────────────────────────────────────────────
export async function login(credentials: LoginCredentials): Promise<SessionInfo> {
  const response = await fetch(`${baseUrl}${AUTH_CONFIG.loginPath}`, {
    method: 'POST',
    credentials: 'include', // Receive HttpOnly cookie from server
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthError(
      body.message || `Login failed: ${response.status}`,
      response.status,
      body.code,
    );
  }

  const data: LoginApiResponse = await response.json();
  return mapToSessionInfo(data);
}

export async function logout(): Promise<void> {
  await fetch(`${baseUrl}${AUTH_CONFIG.logoutPath}`, {
    method: 'POST',
    credentials: 'include', // Server clears the HttpOnly cookie
  });
}

export async function getSession(tenantId: string | number): Promise<SessionInfo | null> {
  const response = await fetch(`${baseUrl}${AUTH_CONFIG.sessionPath}?tenant_id=${tenantId}`, {
    method: 'GET',
    credentials: 'include', // Browser sends cookie automatically
  });

  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data) return null;

  return mapToSessionInfo({ tokens: { access: '', refresh: '' }, user: data?.data, message: '' });
}

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  const response = await fetch(`${baseUrl}${AUTH_CONFIG.resetPasswordPath}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthError(
      body.message || `Request failed: ${response.status}`,
      response.status,
      body.code,
    );
  }
}

export async function confirmPasswordReset(payload: PasswordResetConfirm): Promise<void> {
  const response = await fetch(`${baseUrl}${AUTH_CONFIG.confirmResetPath}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthError(
      body.message || `Request failed: ${response.status}`,
      response.status,
      body.code,
    );
  }
}
