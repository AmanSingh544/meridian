// ═══════════════════════════════════════════════════════════════
// @3sc/permissions — Permission System
// ═══════════════════════════════════════════════════════════════

import { UserRole, Permission } from '@3sc/types';

// ── Role → Permission Mapping ───────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CUSTOMER_USER]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.COMMENT_CREATE,
    Permission.PROJECT_VIEW,
    Permission.KB_VIEW,
  ],
  [UserRole.CUSTOMER_ADMIN]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_REOPEN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.PROJECT_VIEW,
    Permission.KB_VIEW,
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_EDIT,
    Permission.ORG_VIEW,
    Permission.ORG_EDIT,
    Permission.ANALYTICS_VIEW,
  ],
  [UserRole.AGENT]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_TRANSITION,
    Permission.TICKET_VIEW_INTERNAL,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.COMMENT_INTERNAL,
    Permission.PROJECT_VIEW,
    Permission.KB_VIEW,
    Permission.KB_CREATE,
    Permission.KB_EDIT,
    Permission.AI_USE,
    Permission.USER_VIEW,
  ],
  [UserRole.LEAD]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_ASSIGN,
    Permission.TICKET_ESCALATE,
    Permission.TICKET_CLOSE,
    Permission.TICKET_REOPEN,
    Permission.TICKET_TRANSITION,
    Permission.TICKET_VIEW_INTERNAL,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_INTERNAL,
    Permission.PROJECT_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_EDIT,
    Permission.KB_VIEW,
    Permission.KB_CREATE,
    Permission.KB_EDIT,
    Permission.KB_DELETE,
    Permission.AI_USE,
    Permission.AI_CONFIGURE,
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_EDIT,
    Permission.USER_MANAGE_ROLES,
    Permission.ORG_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.ROUTING_MANAGE,
    Permission.SLA_MANAGE,
  ],
  [UserRole.ADMIN]: Object.values(Permission),
};

// ── Permission Checker Class ────────────────────────────────────
export class PermissionChecker {
  private permissions: Set<Permission>;
  private role: UserRole;

  constructor(role: UserRole, permissions?: Permission[]) {
    this.role = role;
    this.permissions = new Set(permissions ?? ROLE_PERMISSIONS[role] ?? []);
  }

  has(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  hasAll(...permissions: Permission[]): boolean {
    return permissions.every(p => this.permissions.has(p));
  }

  hasAny(...permissions: Permission[]): boolean {
    return permissions.some(p => this.permissions.has(p));
  }

  get isCustomer(): boolean {
    return this.role === UserRole.CUSTOMER_USER || this.role === UserRole.CUSTOMER_ADMIN;
  }

  get isInternal(): boolean {
    return this.role === UserRole.AGENT || this.role === UserRole.LEAD || this.role === UserRole.ADMIN;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  get isLead(): boolean {
    return this.role === UserRole.LEAD || this.role === UserRole.ADMIN;
  }

  // ── Ticket Permissions ──────────────────────────────────────
  canViewTickets(): boolean {
    return this.has(Permission.TICKET_VIEW);
  }

  canCreateTickets(): boolean {
    return this.has(Permission.TICKET_CREATE);
  }

  canEditTicket(): boolean {
    return this.has(Permission.TICKET_EDIT);
  }

  canAssignTicket(): boolean {
    return this.has(Permission.TICKET_ASSIGN);
  }

  canEscalateTicket(): boolean {
    return this.has(Permission.TICKET_ESCALATE);
  }

  canCloseTicket(): boolean {
    return this.has(Permission.TICKET_CLOSE);
  }

  canReopenTicket(): boolean {
    return this.has(Permission.TICKET_REOPEN);
  }

  canTransitionTicket(): boolean {
    return this.has(Permission.TICKET_TRANSITION);
  }

  canViewInternalNotes(): boolean {
    return this.has(Permission.TICKET_VIEW_INTERNAL);
  }

  // ── Comment Permissions ─────────────────────────────────────
  canCreateComments(): boolean {
    return this.has(Permission.COMMENT_CREATE);
  }

  canCreateInternalComments(): boolean {
    return this.has(Permission.COMMENT_INTERNAL);
  }

  // ── User Management ─────────────────────────────────────────
  canViewUsers(): boolean {
    return this.has(Permission.USER_VIEW);
  }

  canManageUsers(): boolean {
    return this.hasAny(Permission.USER_CREATE, Permission.USER_EDIT);
  }

  canManageRoles(): boolean {
    return this.has(Permission.USER_MANAGE_ROLES);
  }

  // ── Organization ────────────────────────────────────────────
  canManageOrg(): boolean {
    return this.has(Permission.ORG_MANAGE);
  }

  // ── Project Permissions ─────────────────────────────────────
  canViewProjects(): boolean {
    return this.has(Permission.PROJECT_VIEW);
  }

  canManageProjects(): boolean {
    return this.hasAny(Permission.PROJECT_CREATE, Permission.PROJECT_EDIT);
  }

  // ── Knowledge Base ──────────────────────────────────────────
  canViewKB(): boolean {
    return this.has(Permission.KB_VIEW);
  }

  canManageKB(): boolean {
    return this.hasAny(Permission.KB_CREATE, Permission.KB_EDIT);
  }

  // ── Analytics ───────────────────────────────────────────────
  canViewAnalytics(): boolean {
    return this.has(Permission.ANALYTICS_VIEW);
  }

  canExportAnalytics(): boolean {
    return this.has(Permission.ANALYTICS_EXPORT);
  }

  // ── Audit ───────────────────────────────────────────────────
  canViewAuditLog(): boolean {
    return this.has(Permission.AUDIT_VIEW);
  }

  // ── AI ──────────────────────────────────────────────────────
  canUseAI(): boolean {
    return this.has(Permission.AI_USE);
  }

  canConfigureAI(): boolean {
    return this.has(Permission.AI_CONFIGURE);
  }

  // ── Admin ───────────────────────────────────────────────────
  canAccessAdmin(): boolean {
    return this.has(Permission.ADMIN_PANEL);
  }

  canManageRouting(): boolean {
    return this.has(Permission.ROUTING_MANAGE);
  }

  canManageSLA(): boolean {
    return this.has(Permission.SLA_MANAGE);
  }
}

// ── Factory Function ────────────────────────────────────────────
export function createPermissionChecker(role: UserRole, permissions?: Permission[]): PermissionChecker {
  return new PermissionChecker(role, permissions);
}

// ── Standalone Helper Functions ─────────────────────────────────
export function getDefaultPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function isCustomerRole(role: UserRole): boolean {
  return role === UserRole.CUSTOMER_USER || role === UserRole.CUSTOMER_ADMIN;
}

export function isInternalRole(role: UserRole): boolean {
  return role === UserRole.AGENT || role === UserRole.LEAD || role === UserRole.ADMIN;
}

export { ROLE_PERMISSIONS };
