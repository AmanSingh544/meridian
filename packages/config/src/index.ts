/// <reference types="vite/client" />

// ═══════════════════════════════════════════════════════════════
// @3sc/config — Shared Configuration
// ═══════════════════════════════════════════════════════════════

export const API_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_BASE_URL || '/api/v1',
  wsUrl: import.meta.env?.VITE_WS_URL || 'ws://localhost:8080/ws',
  timeout: 30_000,
  retryAttempts: 3,
  retryDelay: 1_000,
} as const;

export const AUTH_CONFIG = {
  loginPath: '/auth/login', //'/auth/login',
  logoutPath: '/auth/logout',
  refreshPath: '/auth/token/refresh',
  sessionPath: '/auth/session',
  resetPasswordPath: '/auth/reset-password',
  confirmResetPath: '/auth/confirm-reset',
  sessionCheckInterval: 5 * 60 * 1_000, // 5 minutes
  sessionWarningThreshold: 2 * 60 * 1_000, // 2 minutes before expiry
} as const;

export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100] as const,
} as const;

export const SLA_CONFIG = {
  warningThresholdMinutes: 30,
  criticalThresholdMinutes: 10,
  refreshInterval: 60_000, // 1 minute
} as const;

export const REALTIME_CONFIG = {
  reconnectInterval: 3_000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30_000,
  fallbackPollInterval: 15_000,
} as const;

export const FILE_CONFIG = {
  maxFileSize: 25 * 1024 * 1024, // 25MB
  allowedTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip',
  ],
  maxAttachments: 10,
} as const;

export const AI_CONFIG = {
  minConfidenceThreshold: 0.5,
  highConfidenceThreshold: 0.85,
  suggestionTimeout: 15_000,
} as const;
