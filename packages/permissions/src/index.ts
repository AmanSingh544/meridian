// ═══════════════════════════════════════════════════════════════
// @3sc/permissions — Permission System
// ═══════════════════════════════════════════════════════════════

import { UserRole, Permission } from '@3sc/types';

// ── Role → Permission Mapping ───────────────────────────────────
// Mirrors the backend ROLES dict exactly. Used as a fallback when
// the session payload does not include a permissions array.
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CLIENT_USER]: [
    Permission.TICKET_CREATE,
    Permission.TICKET_VIEW_OWN,
    Permission.TICKET_REOPEN,
    Permission.COMMENT_CREATE,
    Permission.ATTACHMENT_UPLOAD,
    Permission.MEMBER_VIEW,
    Permission.KB_VIEW,
    Permission.SLA_VIEW,
    Permission.AI_DIGEST,
    Permission.AI_KB_SUGGEST,
    Permission.PROJECT_VIEW,
    Permission.ROADMAP_VOTE,
  ],

  [UserRole.CLIENT_ADMIN]: [
    Permission.TICKET_CREATE,
    Permission.TICKET_VIEW_ORG,
    Permission.TICKET_EDIT,
    Permission.TICKET_STATUS_CHANGE,
    Permission.TICKET_REOPEN,
    Permission.COMMENT_CREATE,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_DELETE,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_MANAGE,
    Permission.MEMBER_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.KB_VIEW,
    Permission.SLA_VIEW,
    Permission.WORKSPACE_CONFIGURE,
    Permission.BRANDING_CONFIGURE,
    Permission.PROJECT_VIEW,
    Permission.AI_DIGEST,
    Permission.AI_KB_SUGGEST,
    Permission.ROADMAP_VOTE,
    Permission.ROADMAP_REQUEST,
  ],

  [UserRole.AGENT]: [
    Permission.TICKET_VIEW_ALL,
    Permission.TICKET_EDIT,
    Permission.TICKET_STATUS_CHANGE,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_INTERNAL,
    Permission.ATTACHMENT_UPLOAD,
    Permission.AI_SUGGEST,
    Permission.AI_FEEDBACK,
    Permission.AI_KB_SUGGEST,
    Permission.KB_VIEW,
    Permission.SLA_VIEW,
    Permission.ESCALATION_VIEW,
    Permission.MEMBER_VIEW,
    Permission.PROJECT_VIEW,
  ],

  [UserRole.LEAD]: [
    Permission.TICKET_VIEW_ALL,
    Permission.TICKET_EDIT,
    Permission.TICKET_STATUS_CHANGE,
    Permission.TICKET_ASSIGN,
    Permission.TICKET_DELETE,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_INTERNAL,
    Permission.COMMENT_DELETE,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_DELETE,
    Permission.SLA_VIEW,
    Permission.SLA_CONFIGURE,
    Permission.ESCALATION_VIEW,
    Permission.ESCALATION_CONFIGURE,
    Permission.ROUTING_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.AI_SUGGEST,
    Permission.AI_FEEDBACK,
    Permission.AI_KB_SUGGEST,
    Permission.AI_PROJECT_INSIGHTS,
    Permission.AI_PROJECT_REPORTS,
    Permission.AI_PROJECT_QA,
    Permission.KB_VIEW,
    Permission.MEMBER_VIEW,
    Permission.PROJECT_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_EDIT,
    Permission.DELIVERY_VIEW,
    Permission.ONBOARDING_VIEW,
    Permission.ONBOARDING_MANAGE,
  ],

  [UserRole.ADMIN]: [
    Permission.TICKET_VIEW_ALL,
    Permission.TICKET_EDIT,
    Permission.TICKET_STATUS_CHANGE,
    Permission.TICKET_ASSIGN,
    Permission.TICKET_DELETE,
    Permission.TICKET_REOPEN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_INTERNAL,
    Permission.COMMENT_DELETE,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_DELETE,
    Permission.SLA_VIEW,
    Permission.SLA_CONFIGURE,
    Permission.ESCALATION_VIEW,
    Permission.ESCALATION_CONFIGURE,
    Permission.ROUTING_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.AI_SUGGEST,
    Permission.AI_FEEDBACK,
    Permission.AI_DIGEST,
    Permission.AI_KB_SUGGEST,
    Permission.AI_PROJECT_INSIGHTS,
    Permission.AI_PROJECT_REPORTS,
    Permission.AI_PROJECT_QA,
    Permission.KB_VIEW,
    Permission.KB_MANAGE,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_MANAGE,
    Permission.MEMBER_VIEW,
    Permission.AUDIT_VIEW,
    Permission.WORKSPACE_CONFIGURE,
    Permission.BRANDING_CONFIGURE,
    Permission.SYSTEM_CONFIGURE,
    Permission.COMPLIANCE_VIEW,
    Permission.PROJECT_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_EDIT,
    Permission.PROJECT_DELETE,
    Permission.DELIVERY_VIEW,
    Permission.DELIVERY_MANAGE,
    Permission.ONBOARDING_VIEW,
    Permission.ONBOARDING_MANAGE,
  ],
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

  // ── Role helpers ────────────────────────────────────────────
  get isCustomer(): boolean {
    return this.role === UserRole.CLIENT_USER || this.role === UserRole.CLIENT_ADMIN;
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
    return this.hasAny(Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG, Permission.TICKET_VIEW_ALL);
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

  canChangeStatus(): boolean {
    return this.has(Permission.TICKET_STATUS_CHANGE);
  }

  canReopenTicket(): boolean {
    return this.has(Permission.TICKET_REOPEN);
  }

  canDeleteTicket(): boolean {
    return this.has(Permission.TICKET_DELETE);
  }

  // ── Comment Permissions ─────────────────────────────────────
  canCreateComments(): boolean {
    return this.has(Permission.COMMENT_CREATE);
  }

  canCreateInternalComments(): boolean {
    return this.has(Permission.COMMENT_INTERNAL);
  }

  canDeleteComment(): boolean {
    return this.has(Permission.COMMENT_DELETE);
  }

  // ── Member Management ───────────────────────────────────────
  canViewMembers(): boolean {
    return this.has(Permission.MEMBER_VIEW);
  }

  canInviteMembers(): boolean {
    return this.has(Permission.MEMBER_INVITE);
  }

  canManageMembers(): boolean {
    return this.has(Permission.MEMBER_MANAGE);
  }

  // ── Reports ─────────────────────────────────────────────────
  canViewReports(): boolean {
    return this.has(Permission.REPORT_VIEW);
  }

  canExportReports(): boolean {
    return this.has(Permission.REPORT_EXPORT);
  }

  // ── Knowledge Base ──────────────────────────────────────────
  canViewKB(): boolean {
    return this.has(Permission.KB_VIEW);
  }

  canManageKB(): boolean {
    return this.has(Permission.KB_MANAGE);
  }

  // ── SLA ─────────────────────────────────────────────────────
  canViewSLA(): boolean {
    return this.has(Permission.SLA_VIEW);
  }

  canConfigureSLA(): boolean {
    return this.has(Permission.SLA_CONFIGURE);
  }

  canConfigureEscalations(): boolean {
    return this.has(Permission.ESCALATION_CONFIGURE);
  }

  // ── AI ──────────────────────────────────────────────────────
  canUseAI(): boolean {
    return this.has(Permission.AI_SUGGEST);
  }

  canGiveAIFeedback(): boolean {
    return this.has(Permission.AI_FEEDBACK);
  }

  // ── Audit & Workspace ───────────────────────────────────────
  canViewAuditLog(): boolean {
    return this.has(Permission.AUDIT_VIEW);
  }

  canConfigureWorkspace(): boolean {
    return this.has(Permission.WORKSPACE_CONFIGURE);
  }

  // ── Projects ────────────────────────────────────────────────
  canViewProjects(): boolean {
    return this.has(Permission.PROJECT_VIEW);
  }

  canManageProjects(): boolean {
    return this.hasAny(Permission.PROJECT_CREATE, Permission.PROJECT_EDIT);
  }

  // ── Escalations ─────────────────────────────────────────────
  canViewEscalations(): boolean {
    return this.has(Permission.ESCALATION_VIEW);
  }

  canConfigureEscalationRules(): boolean {
    return this.has(Permission.ESCALATION_CONFIGURE);
  }

  // ── Routing ─────────────────────────────────────────────────
  canViewRouting(): boolean {
    return this.has(Permission.ROUTING_VIEW);
  }

  // ── System / Compliance ──────────────────────────────────────
  canConfigureSystem(): boolean {
    return this.has(Permission.SYSTEM_CONFIGURE);
  }

  canViewCompliance(): boolean {
    return this.has(Permission.COMPLIANCE_VIEW);
  }

  // ── Branding ─────────────────────────────────────────────────
  canConfigureBranding(): boolean {
    return this.has(Permission.BRANDING_CONFIGURE);
  }

  // ── Delivery Board ────────────────────────────────────────
  canViewDelivery(): boolean { return this.has(Permission.DELIVERY_VIEW); }
  canManageDelivery(): boolean { return this.has(Permission.DELIVERY_MANAGE); }

  // ── Onboarding ────────────────────────────────────────────
  canViewOnboarding(): boolean { return this.has(Permission.ONBOARDING_VIEW); }
  canManageOnboarding(): boolean { return this.has(Permission.ONBOARDING_MANAGE); }

  // ── Roadmap ───────────────────────────────────────────────
  canVoteRoadmap(): boolean { return this.has(Permission.ROADMAP_VOTE); }
  canRequestFeature(): boolean { return this.has(Permission.ROADMAP_REQUEST); }
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
  return role === UserRole.CLIENT_USER || role === UserRole.CLIENT_ADMIN;
}

export function isInternalRole(role: UserRole): boolean {
  return role === UserRole.AGENT || role === UserRole.LEAD || role === UserRole.ADMIN;
}

export { ROLE_PERMISSIONS };
