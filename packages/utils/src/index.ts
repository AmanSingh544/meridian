// ═══════════════════════════════════════════════════════════════
// @3sc/utils — Shared Utilities
// ═══════════════════════════════════════════════════════════════

import {
  TicketStatus,
  TicketPriority,
  SLAState,
  VALID_TICKET_TRANSITIONS,
  type SLAInfo,
} from '@3sc/types';

// ── Date Utilities ──────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function getTimeRemaining(deadline: string): {
  total: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
  label: string;
} {
  const total = new Date(deadline).getTime() - Date.now();
  const isOverdue = total < 0;
  const abs = Math.abs(total);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

  const label = isOverdue
    ? `${hours}h ${minutes}m overdue`
    : `${hours}h ${minutes}m remaining`;

  return { total, hours, minutes, isOverdue, label };
}

// ── Ticket Utilities ────────────────────────────────────────────
export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(current: TicketStatus): TicketStatus[] {
  return VALID_TICKET_TRANSITIONS[current] ?? [];
}

export function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Open',
    [TicketStatus.ACKNOWLEDGED]: 'Acknowledged',
    [TicketStatus.IN_PROGRESS]: 'In Progress',
    [TicketStatus.RESOLVED]: 'Resolved',
    [TicketStatus.CLOSED]: 'Closed',
  };
  return labels[status];
}

export function getStatusColor(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: '#3b82f6',
    [TicketStatus.ACKNOWLEDGED]: '#8b5cf6',
    [TicketStatus.IN_PROGRESS]: '#f59e0b',
    [TicketStatus.RESOLVED]: '#10b981',
    [TicketStatus.CLOSED]: '#6b7280',
  };
  return colors[status];
}

export function getPriorityLabel(priority: TicketPriority): string {
  const labels: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'Low',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.HIGH]: 'High',
    [TicketPriority.CRITICAL]: 'Critical',
  };
  return labels[priority];
}

export function getPriorityColor(priority: TicketPriority): string {
  const colors: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: '#6b7280',
    [TicketPriority.MEDIUM]: '#3b82f6',
    [TicketPriority.HIGH]: '#f59e0b',
    [TicketPriority.CRITICAL]: '#ef4444',
  };
  return colors[priority];
}

// ── SLA Utilities ───────────────────────────────────────────────
export function getSLAStateLabel(state: SLAState): string {
  const labels: Record<SLAState, string> = {
    [SLAState.ON_TRACK]: 'On Track',
    [SLAState.AT_RISK]: 'At Risk',
    [SLAState.BREACHED]: 'Breached',
    [SLAState.PAUSED]: 'Paused',
    [SLAState.MET]: 'Met',
  };
  return labels[state];
}

export function getSLAStateColor(state: SLAState): string {
  const colors: Record<SLAState, string> = {
    [SLAState.ON_TRACK]: '#10b981',
    [SLAState.AT_RISK]: '#f59e0b',
    [SLAState.BREACHED]: '#ef4444',
    [SLAState.PAUSED]: '#6b7280',
    [SLAState.MET]: '#10b981',
  };
  return colors[state];
}

export function getSLASeverity(sla: SLAInfo): 'ok' | 'warning' | 'critical' {
  if (sla.responseState === SLAState.BREACHED || sla.resolutionState === SLAState.BREACHED) {
    return 'critical';
  }
  if (sla.responseState === SLAState.AT_RISK || sla.resolutionState === SLAState.AT_RISK) {
    return 'warning';
  }
  return 'ok';
}

// ── String Utilities ────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 1)}…`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── File Utilities ──────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}

// ── Number Utilities ────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// ── Debounce ────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Class Names ─────────────────────────────────────────────────
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
