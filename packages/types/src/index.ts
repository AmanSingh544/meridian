// ═══════════════════════════════════════════════════════════════
// @3sc/types — Domain Type Definitions
// ═══════════════════════════════════════════════════════════════

// ── Base Types ──────────────────────────────────────────────────
export type UUID = string;
export type ISO8601 = string;
export type Email = string;

export interface PaginatedResponse<T> {
  data: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  traceId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Auth Types ──────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface SessionInfo {
  userId: UUID;
  email: Email;
  token: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  tenantId: UUID;
  tenantName: string;
  tenantSlug: string;
  expiresAt: ISO8601;
}

// ── User & Organization Types ───────────────────────────────────

/**
 * Roles in the system — two client-side roles and three internal 3SC roles.
 *
 * Client side (have a tenant_id, scoped to their org):
 *   CLIENT_ADMIN — org admin; manages members, sees all tickets in their org
 *   CLIENT_USER  — regular client user; can only see/create their own tickets
 *
 * Internal 3SC staff (no tenant_id, cross-tenant access):
 *   AGENT — works assigned tickets across all tenants
 *   LEAD  — everything AGENT has + ticket assignment, SLA config, reports
 *   ADMIN — everything LEAD has + org management, KB management, audit trail
 */
export enum UserRole {
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  CLIENT_USER = 'CLIENT_USER',
  AGENT = 'AGENT',
  LEAD = 'LEAD',
  ADMIN = 'ADMIN',
}

/**
 * Sub-role for internal 3SC staff only (applied on top of UserRole.AGENT/LEAD/ADMIN).
 * Used for intelligent ticket routing, workload balancing, and skill matching.
 * Client-side users (CLIENT_ADMIN / CLIENT_USER) never have an internalSubRole.
 *
 * DEVELOPER  — engineering/technical specialist; handles bug reports, API issues, integration tickets
 * DELIVERY   — project delivery & onboarding specialist; handles delivery board, onboarding trackers
 * SUPPORT    — general support agent; handles billing, account, general enquiries
 * TEAM_LEAD  — maps to UserRole.LEAD; oversees team workload and SLA compliance
 * ADMIN      — maps to UserRole.ADMIN; full system access
 */
export enum InternalSubRole {
  DEVELOPER = 'DEVELOPER',
  DELIVERY  = 'DELIVERY',
  SUPPORT   = 'SUPPORT',
  TEAM_LEAD = 'TEAM_LEAD',
  ADMIN     = 'ADMIN',
}

// ── Skill Types ────────────────────────────────────────────────────────────────

export type SkillCategory = 'TECHNICAL' | 'DOMAIN' | 'LANGUAGE' | 'PRODUCT';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

/**
 * A single skill tag from the global skill taxonomy.
 * Examples: "React", "AWS", "Salesforce", "French", "Billing", "API Integration".
 */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string;
}

/** A skill as assigned to a specific user — includes their proficiency level. */
export interface UserSkill {
  skillId: string;
  /** Nested skill details — populated when fetched via GET /users/:id/skills */
  skill?: Skill;
  level: SkillLevel;
  endorsements?: number;
}

// ── Workload Types ─────────────────────────────────────────────────────────────

export enum AvailabilityStatus {
  AVAILABLE      = 'AVAILABLE',
  BUSY           = 'BUSY',
  AWAY           = 'AWAY',
  DO_NOT_DISTURB = 'DO_NOT_DISTURB',
  OFFLINE        = 'OFFLINE',
}

/**
 * Live workload state for an internal agent.
 * Computed server-side from assigned open tickets vs. maxCapacity.
 */
export interface UserWorkload {
  assignedTickets: number;
  maxCapacity: number;          // set by ADMIN/LEAD; default 20
  availabilityStatus: AvailabilityStatus;
  availableFrom?: ISO8601;      // set when status is AWAY/OFF — when will they return
  utilizationPct: number;       // assignedTickets / maxCapacity × 100, computed
}

export interface UserWorkloadUpdatePayload {
  maxCapacity?: number;
  availabilityStatus?: AvailabilityStatus;
  availableFrom?: ISO8601 | null;
}

// ── Permission Override Types ──────────────────────────────────────────────────

/**
 * A single permission granted to a user beyond their role's default set,
 * OR a record that a role-default permission has been revoked.
 * Only internal ADMIN can create overrides or revocations.
 */
export interface PermissionOverride {
  id?: UUID;
  permission: Permission;
  type: 'GRANT' | 'REVOKE';
  grantedBy: UUID;             // user_id of the actor who made the change
  grantedByRole?: string;      // role of the actor at time of creation (e.g. 'ADMIN', 'CLIENT_ADMIN')
  grantedByName?: string;      // display name for UI (denormalised, optional)
  createdAt: ISO8601;          // when the override was created
  reason?: string;
  expiresAt?: ISO8601;         // optional — time-limited access grant
}

/** Payload for ADMIN to add or remove a permission override on a user. */
export interface PermissionOverridePayload {
  permission: Permission;
  type: 'GRANT' | 'REVOKE';
  reason?: string;
  expiresAt?: ISO8601;
}

// ── Assignment Scoring Weights ─────────────────────────────────────────────────

/**
 * Configurable multipliers for the AI ticket-assignment scoring formula.
 * Stored globally (ADMIN-configured) or per routing-rule.
 *
 * Final score = (skillMatch × wSkill) + ((1 − utilization) × wWorkload) + (availability × wAvail)
 *
 * All weights are in range 0.0 – 1.0. The UI normalises them so they sum to 1.0.
 */
export interface AssignmentScoringWeights {
  id?: string;        // 'global' or routing-rule id
  wSkill: number;     // skill match weight, default 0.50
  wWorkload: number;  // workload weight, default 0.35
  wAvail: number;     // availability weight, default 0.15
  updatedBy?: UUID;
  updatedAt?: ISO8601;
}

export interface AssignmentScoringWeightsPayload {
  wSkill: number;
  wWorkload: number;
  wAvail: number;
}

// ── AI Assignment Suggestion ───────────────────────────────────────────────────

/** One agent suggestion returned by the AI assignment endpoint. */
export interface AgentAssignSuggestion {
  agentId: UUID;
  agentName: string;
  agentEmail: Email;
  avatarUrl?: string;
  subRole?: InternalSubRole;
  skills: UserSkill[];
  workload: UserWorkload;
  score: number;                // 0.0 – 1.0, higher is better
  skillMatchScore: number;
  workloadScore: number;
  availabilityScore: number;
  matchedSkills: string[];      // skill names that matched ticket tags/category
  reasoning: string;            // human-readable explanation
}

/** Skill-coverage gap — tickets waiting that no agent can skill-match. */
export interface SkillGap {
  skillId?: string;
  skillName: string;          // name of the skill with insufficient coverage
  openTickets: number;        // count of open tickets requiring this skill
  agentsWithSkill?: number;   // how many active agents have this skill
  sampleTicketIds?: UUID[];
  suggestedAction?: string;
}

/**
 * Permission strings sent by the backend in the session payload.
 * These are authoritative — do NOT hardcode permission arrays on the frontend.
 * Use `session.permissions.includes(Permission.XYZ)` or the `hasPermission`
 * helper to gate UI features.
 *
 * Role → permission matrix (source of truth is the backend):
 *
 * ┌─────────────────────────┬──────────────┬─────────────┬───────┬──────┬───────┐
 * │ Permission              │ CLIENT_ADMIN │ CLIENT_USER │ AGENT │ LEAD │ ADMIN │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ TICKET_CREATE           │      ✓       │      ✓      │       │      │   ✓   │
 * │ TICKET_VIEW_OWN         │              │      ✓      │       │      │       │
 * │ TICKET_VIEW_ORG         │      ✓       │             │       │      │       │
 * │ TICKET_VIEW_ALL         │              │             │   ✓   │  ✓   │   ✓   │
 * │ TICKET_EDIT             │      ✓       │             │   ✓   │  ✓   │   ✓   │
 * │ TICKET_STATUS_CHANGE    │      ✓       │             │   ✓   │  ✓   │   ✓   │
 * │ TICKET_ASSIGN           │              │             │       │  ✓   │   ✓   │
 * │ TICKET_REOPEN           │      ✓       │      ✓      │       │      │   ✓   │
 * │ TICKET_DELETE           │              │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ COMMENT_CREATE          │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
 * │ COMMENT_DELETE          │              │             │       │  ✓   │   ✓   │
 * │ COMMENT_INTERNAL        │              │             │   ✓   │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ ATTACHMENT_UPLOAD       │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
 * │ ATTACHMENT_DELETE       │      ✓       │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ MEMBER_INVITE           │      ✓       │             │       │      │   ✓   │
 * │ MEMBER_MANAGE           │      ✓       │             │       │      │   ✓   │
 * │ MEMBER_VIEW             │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ REPORT_VIEW             │      ✓       │             │       │  ✓   │   ✓   │
 * │ REPORT_EXPORT           │      ✓       │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ KB_VIEW                 │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
 * │ KB_MANAGE               │              │             │       │      │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ SLA_VIEW                │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
 * │ SLA_CONFIGURE           │              │             │       │  ✓   │   ✓   │
 * │ ESCALATION_VIEW         │              │             │   ✓   │  ✓   │   ✓   │
 * │ ESCALATION_CONFIGURE    │              │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ ROUTING_VIEW            │              │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ AI_SUGGEST              │              │             │   ✓   │  ✓   │   ✓   │
 * │ AI_FEEDBACK             │              │             │   ✓   │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ AUDIT_VIEW              │              │             │       │      │   ✓   │
 * │ WORKSPACE_CONFIGURE     │      ✓       │             │       │      │   ✓   │
 * │ BRANDING_CONFIGURE      │      ✓       │             │       │      │   ✓   │
 * │ SYSTEM_CONFIGURE        │              │             │       │      │   ✓   │
 * │ COMPLIANCE_VIEW         │              │             │       │      │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ DELIVERY_VIEW           │              │             │       │  ✓   │   ✓   │
 * │ DELIVERY_MANAGE         │              │             │       │      │   ✓   │
 * │ ONBOARDING_VIEW         │              │             │       │  ✓   │   ✓   │
 * │ ONBOARDING_MANAGE       │              │             │       │  ✓   │   ✓   │
 * │ ROADMAP_VOTE            │      ✓       │      ✓      │       │      │       │
 * │ ROADMAP_REQUEST         │      ✓       │             │       │      │       │
 * └─────────────────────────┴──────────────┴─────────────┴───────┴──────┴───────┘
 */
export enum Permission {
  // ── Tickets ────────────────────────────────────────────────────────────────
  /** Create a new ticket. Available to all roles. */
  TICKET_CREATE = 'TICKET_CREATE',
  /** View own tickets only. CLIENT_USER scope. */
  TICKET_VIEW_OWN = 'TICKET_VIEW_OWN',
  /** View all tickets within the user's org. CLIENT_ADMIN scope. */
  TICKET_VIEW_ORG = 'TICKET_VIEW_ORG',
  /** View all tickets across all tenants. Internal staff only (AGENT/LEAD/ADMIN). */
  TICKET_VIEW_ALL = 'TICKET_VIEW_ALL',
  /** Edit ticket fields (title, description, priority, etc.). */
  TICKET_EDIT = 'TICKET_EDIT',
  /** Change ticket status (e.g. OPEN → IN_PROGRESS). */
  TICKET_STATUS_CHANGE = 'TICKET_STATUS_CHANGE',
  /** Assign or reassign a ticket to any agent. LEAD and ADMIN only. */
  TICKET_ASSIGN = 'TICKET_ASSIGN',
  /** Reopen a resolved/closed ticket. */
  TICKET_REOPEN = 'TICKET_REOPEN',
  /** Permanently delete a ticket. LEAD and ADMIN only. */
  TICKET_DELETE = 'TICKET_DELETE',

  // ── Comments ───────────────────────────────────────────────────────────────
  /** Post a comment on a ticket. Available to all roles. */
  COMMENT_CREATE = 'COMMENT_CREATE',
  /** Delete any comment on a ticket. LEAD and ADMIN only. */
  COMMENT_DELETE = 'COMMENT_DELETE',
  /** Write internal (agent-only) notes not visible to the client. Internal staff only. */
  COMMENT_INTERNAL = 'COMMENT_INTERNAL',

  // ── Attachments ────────────────────────────────────────────────────────────
  /** Upload attachments to a ticket or comment. Available to all roles. */
  ATTACHMENT_UPLOAD = 'ATTACHMENT_UPLOAD',
  /** Delete attachments. CLIENT_ADMIN, LEAD, and ADMIN only. */
  ATTACHMENT_DELETE = 'ATTACHMENT_DELETE',

  // ── Members ────────────────────────────────────────────────────────────────
  /** Invite new members to an org. CLIENT_ADMIN and ADMIN only. */
  MEMBER_INVITE = 'MEMBER_INVITE',
  /** Edit or remove existing members. CLIENT_ADMIN and ADMIN only. */
  MEMBER_MANAGE = 'MEMBER_MANAGE',
  /** View the member list. Available to all roles. */
  MEMBER_VIEW = 'MEMBER_VIEW',

  // ── Reports ────────────────────────────────────────────────────────────────
  /** View reports and analytics dashboards. CLIENT_ADMIN scope = own org; LEAD/ADMIN = all tenants. */
  REPORT_VIEW = 'REPORT_VIEW',
  /** Export report data (CSV/PDF). Same scope rules as REPORT_VIEW. */
  REPORT_EXPORT = 'REPORT_EXPORT',

  // ── Knowledge Base ─────────────────────────────────────────────────────────
  /** Read KB articles. Available to all roles. */
  KB_VIEW = 'KB_VIEW',
  /** Create, edit, and delete KB articles. ADMIN only. */
  KB_MANAGE = 'KB_MANAGE',

  // ── SLA ────────────────────────────────────────────────────────────────────
  /** View SLA deadlines and status on tickets. Available to all roles. */
  SLA_VIEW = 'SLA_VIEW',
  /** Create and modify SLA policies. LEAD and ADMIN only. */
  SLA_CONFIGURE = 'SLA_CONFIGURE',
  /** Configure escalation rules and routing. LEAD and ADMIN only. */
  ESCALATION_CONFIGURE = 'ESCALATION_CONFIGURE',

  // ── AI Assist (internal staff) ─────────────────────────────────────────────
  /** Access AI-generated suggestions in the agent panel. Internal staff only. */
  AI_SUGGEST = 'AI_SUGGEST',
  /** Submit accept/reject feedback on AI suggestions. Internal staff only. */
  AI_FEEDBACK = 'AI_FEEDBACK',

  // ── AI Assist (client-facing) ──────────────────────────────────────────────
  /** View the AI digest panel on the customer dashboard (needs-attention, patterns, gaps). CLIENT_ADMIN, CLIENT_USER, ADMIN. */
  AI_DIGEST = 'AI_DIGEST',
  /** Surface AI-suggested KB articles based on open ticket content. All roles. */
  AI_KB_SUGGEST = 'AI_KB_SUGGEST',

  // ── Audit & Workspace ──────────────────────────────────────────────────────
  /** View the audit trail of all system actions. ADMIN only. */
  AUDIT_VIEW = 'AUDIT_VIEW',
  /** Configure workspace-level settings. CLIENT_ADMIN (own org) and ADMIN only. */
  WORKSPACE_CONFIGURE = 'WORKSPACE_CONFIGURE',

  // ── Projects ──────────────────────────────────────────────────────────────
  PROJECT_VIEW = 'PROJECT_VIEW',
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_EDIT = 'PROJECT_EDIT',
  PROJECT_DELETE = 'PROJECT_DELETE',

  // ── AI Projects ───────────────────────────────────────────────────────────
  /** View AI health scores, cluster analysis, and churn risk for projects. LEAD + ADMIN. */
  AI_PROJECT_INSIGHTS = 'AI_PROJECT_INSIGHTS',
  /** View and generate AI status reports for projects. LEAD + ADMIN. */
  AI_PROJECT_REPORTS = 'AI_PROJECT_REPORTS',
  /** Ask AI questions over project history. All authenticated roles. */
  AI_PROJECT_QA = 'AI_PROJECT_QA',

  // ── System Administration ─────────────────────────────────────────────────
  /**
   * Configure system-wide settings: AI model provider, SLA policies, notification
   * toggles, access/security rules, and danger-zone operations. ADMIN only.
   */
  SYSTEM_CONFIGURE = 'SYSTEM_CONFIGURE',

  // ── Escalations ───────────────────────────────────────────────────────────
  /**
   * View the escalations queue — tickets that have breached or are approaching
   * SLA breach. AGENT sees only their assigned escalations; LEAD/ADMIN see all.
   */
  ESCALATION_VIEW = 'ESCALATION_VIEW',

  // ── Routing ───────────────────────────────────────────────────────────────
  /**
   * View routing rules list. LEAD + ADMIN.
   * ESCALATION_CONFIGURE already gates create/edit/delete of rules.
   */
  ROUTING_VIEW = 'ROUTING_VIEW',

  // ── Branding ──────────────────────────────────────────────────────────────
  /**
   * Configure customer portal branding: logo, primary colour, portal display name.
   * CLIENT_ADMIN (own org only) and ADMIN (any org).
   */
  BRANDING_CONFIGURE = 'BRANDING_CONFIGURE',

  // ── Compliance ────────────────────────────────────────────────────────────
  /**
   * View and manage compliance settings: data retention policy, GDPR right-to-erasure
   * requests, SLA compliance reports, and audit data export. ADMIN only.
   */
  COMPLIANCE_VIEW = 'COMPLIANCE_VIEW',

  // ── Delivery Board ────────────────────────────────────────────────────────
  /** View the internal product delivery board (features pipeline). LEAD + ADMIN. */
  DELIVERY_VIEW = 'DELIVERY_VIEW',
  /** Create, edit, move, and delete features on the delivery board. ADMIN only. */
  DELIVERY_MANAGE = 'DELIVERY_MANAGE',

  // ── Onboarding ────────────────────────────────────────────────────────────
  /** View all client onboarding projects and task progress. LEAD + ADMIN. */
  ONBOARDING_VIEW = 'ONBOARDING_VIEW',
  /** Update onboarding task statuses and manage blockers. LEAD + ADMIN. */
  ONBOARDING_MANAGE = 'ONBOARDING_MANAGE',

  // ── Roadmap (client-facing) ───────────────────────────────────────────────
  /** Vote on public roadmap features. CLIENT_ADMIN + CLIENT_USER. */
  ROADMAP_VOTE = 'ROADMAP_VOTE',
  /** Submit new feature requests from the roadmap page. CLIENT_ADMIN only. */
  ROADMAP_REQUEST = 'ROADMAP_REQUEST',

  // ── User Management (new) ─────────────────────────────────────────────────
  /**
   * Edit a user's individual permission overrides (grant beyond role / revoke from role).
   * Internal ADMIN only. CLIENT_ADMIN can toggle within their own ceiling but does NOT
   * hold this permission — ceiling-enforcement is done server-side on the /team endpoint.
   */
  USER_PERMISSION_MANAGE = 'USER_PERMISSION_MANAGE',
  /**
   * Assign or edit skills on internal agents.
   * ADMIN and LEAD only.
   */
  SKILL_ASSIGN = 'SKILL_ASSIGN',
  /**
   * View agent workload metrics (assigned ticket count, utilization %, availability).
   * ADMIN and LEAD only.
   */
  WORKLOAD_VIEW = 'WORKLOAD_VIEW',
  /**
   * Edit the global assignment-scoring weights (skill / workload / availability multipliers).
   * Internal ADMIN only.
   */
  SCORING_CONFIGURE = 'SCORING_CONFIGURE',
  /**
   * Import users in bulk via CSV upload.
   * Internal ADMIN only.
   */
  USER_IMPORT = 'USER_IMPORT',
  /**
   * Force a password reset link for any user.
   * Internal ADMIN only.
   */
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export interface User {
  id: UUID;
  email: Email;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  /** Effective permissions — role defaults ± overrides ± revocations. Source of truth from backend. */
  permissions: Permission[];
  organizationId: UUID;
  isActive: boolean;
  lastLoginAt?: ISO8601;
  created_at: ISO8601;
  updated_at: ISO8601;

  // ── Extended fields (internal staff only) ──────────────────────────────────
  /** Sub-role for internal 3SC staff — drives skill-based routing and workload logic. */
  internalSubRole?: InternalSubRole;
  /** Skills assigned to this agent. Only present for internal staff (AGENT/LEAD/ADMIN). */
  skills?: UserSkill[];
  /** Live workload metrics. Only present for internal staff. */
  workload?: UserWorkload;
  /**
   * Permission overrides applied on top of role defaults.
   * GRANTs add permissions beyond the role ceiling.
   * REVOKEs remove a permission from the role's default set.
   * Only visible to ADMIN or the user themselves.
   */
  permissionOverrides?: PermissionOverride[];
  /** Department label — free text, e.g. "Engineering", "Customer Success". */
  department?: string;
  /** IANA timezone string, e.g. "Europe/London". Used for SLA business-hours calculation. */
  timezone?: string;
  /** Whether MFA is currently enrolled for this user. */
  mfaEnabled?: boolean;
}

export interface InviteUserPayload {
  email: Email;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  /** Sub-role when inviting internal AGENT/LEAD staff. */
  internalSubRole?: InternalSubRole;
  /** Initial skill IDs to assign (optional, can be set later). */
  skillIds?: string[];
  department?: string;
}

/**
 * Sent by the invitee when they click the link in their invitation email
 * and set their password to activate the account.
 */
export interface InviteAcceptPayload {
  token: string;       // one-time invite token from the email link
  firstName: string;
  lastName: string;
  password: string;
}

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl?: string;
  domain?: string;
  isActive: boolean;
  plan?: string;
  created_at: ISO8601;
  updated_at: ISO8601;
}

// ── Branding Types ──────────────────────────────────────────────

/**
 * Per-tenant portal branding configuration.
 * Applied at render-time so the customer portal looks like the client's product.
 */
export interface OrgBranding {
  organizationId: UUID;
  logoUrl?: string;
  faviconUrl?: string;
  portalDisplayName: string;   // e.g. "Acme Support Portal"
  primaryColor: string;        // hex, e.g. "#6366f1"
  accentColor?: string;        // hex, optional secondary accent
  customCssUrl?: string;       // advanced: link to a hosted CSS override file
  updated_at: ISO8601;
}

export interface OrgBrandingUpdatePayload {
  logoUrl?: string;
  faviconUrl?: string;
  portalDisplayName?: string;
  primaryColor?: string;
  accentColor?: string;
}

// ── SLA Policy Types ────────────────────────────────────────────

export interface SLAPolicyByPriority {
  responseHours: number;
  resolutionHours: number;
}

export interface SLAPolicy {
  id: UUID;
  name: string;
  description?: string;
  isDefault: boolean;
  organizationId?: UUID;   // null = global default; set = per-org override
  priorities: {
    CRITICAL: SLAPolicyByPriority;
    HIGH: SLAPolicyByPriority;
    MEDIUM: SLAPolicyByPriority;
    LOW: SLAPolicyByPriority;
  };
  escalationRules: SLAEscalationRules;
  businessHours: SLABusinessHours;
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface SLAEscalationRules {
  autoEscalateAtPercent: number;   // e.g. 80 — auto-assign to senior SPOC at 80% of SLA elapsed
  notifyAdminAtPercent: number;    // e.g. 60 — send admin alert at 60% elapsed
  s1ReAlertIntervalMinutes: number; // e.g. 30 — re-alert every 30m until resolved
}

export interface SLABusinessHours {
  startTime: string;    // "HH:mm" in org timezone
  endTime: string;      // "HH:mm" in org timezone
  timezone: string;     // IANA tz, e.g. "Asia/Kolkata"
  pauseOnWeekends: boolean;
}

export interface SLAPolicyUpdatePayload {
  name?: string;
  description?: string;
  priorities?: Partial<SLAPolicy['priorities']>;
  escalationRules?: Partial<SLAEscalationRules>;
  businessHours?: Partial<SLABusinessHours>;
}

// ── Escalation Queue Types ──────────────────────────────────────

export interface EscalatedTicket {
  ticketId: UUID;
  ticketNumber: string;
  title: string;
  clientName: string;
  clientId: UUID;
  severity: TicketPriority;  // re-uses TicketPriority — S1=CRITICAL, S2=HIGH, S3=MEDIUM
  escalatedBy?: string;      // display name of agent who triggered escalation
  escalatedByUserId?: UUID;
  reason: string;
  timeInEscalationMinutes: number;
  assignedTo?: UUID;
  assigneeName?: string;
  slaState: SLAState;
  created_at: ISO8601;
}

export interface EscalationAssignPayload {
  ticketId: UUID;
  agentId: UUID;
}

export interface EscalationResolvePayload {
  ticketId: UUID;
  resolution?: string;
}

// ── System Settings Types ───────────────────────────────────────

export interface SystemNotificationSettings {
  emailOnSLABreach: boolean;
  slackIntegrationEnabled: boolean;
  slackChannel?: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime?: string;   // "HH:mm" IST
  clientStatusNotifications: boolean;
}

export interface SystemAIFeatureSettings {
  triageAgentEnabled: boolean;
  similarTicketSuggestionsEnabled: boolean;
  kbDeflectionEnabled: boolean;
  autoGenerateKBArticlesEnabled: boolean;
  weeklyProjectSummariesEnabled: boolean;
  aiProvider?: 'anthropic' | 'openai' | 'custom';
  aiModelName?: string;
  aiApiKey?: string;           // write-only — never returned in GET
  aiBaseUrl?: string;          // for custom OpenAI-compatible providers
}

export interface SystemAccessSettings {
  ssoEnabled: boolean;
  twoFactorRequired: boolean;
  auditLoggingEnabled: boolean;
  ipAllowlistEnabled: boolean;
  ipAllowlist?: string[];      // CIDR or IP strings
}

export interface SystemSettings {
  notifications: SystemNotificationSettings;
  aiFeatures: SystemAIFeatureSettings;
  access: SystemAccessSettings;
  updated_at: ISO8601;
  updatedBy?: UUID;
}

export interface SystemSettingsUpdatePayload {
  notifications?: Partial<SystemNotificationSettings>;
  aiFeatures?: Partial<SystemAIFeatureSettings>;
  access?: Partial<SystemAccessSettings>;
}

// ── Compliance Types ────────────────────────────────────────────

export interface ComplianceDataRetentionPolicy {
  closedTicketRetentionDays: number;    // e.g. 90
  auditLogRetentionDays: number;        // e.g. 365
  attachmentRetentionDays: number;      // e.g. 180
}

export interface GDPRErasureRequest {
  id: UUID;
  requestedBy: UUID;
  targetUserId: UUID;
  targetEmail: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestedAt: ISO8601;
  completedAt?: ISO8601;
  notes?: string;
}

// ── User Appearance Preferences ─────────────────────────────────

export type AccentColor = 'cobalt' | 'emerald' | 'violet' | 'rose' | 'amber' | 'slate';
export type ColorMode = 'light' | 'dark' | 'system';

export interface UserAppearancePreferences {
  accentColor: AccentColor;
  colorMode: ColorMode;
}

export interface UserAppearanceUpdatePayload {
  accentColor?: AccentColor;
  colorMode?: ColorMode;
}

// ── Ticket Types ────────────────────────────────────────────────
export enum TicketStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  BUG = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  SUPPORT = 'SUPPORT',
  BILLING = 'BILLING',
  QUESTION = 'QUESTION',
  INCIDENT = 'INCIDENT',
  TASK = 'TASK',
}

/** Valid state transitions enforced in UI */
export const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ACKNOWLEDGED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.ACKNOWLEDGED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.OPEN],
  [TicketStatus.CLOSED]: [TicketStatus.OPEN],
};

export interface Ticket {
  id: UUID;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  tags: string[];
  createdBy: UUID;
  assignedTo?: UUID;
  organizationId: UUID;
  projectId?: UUID;
  sla?: SLAInfo;
  attachments: Attachment[];
  commentCount: number;
  creator?: User;
  assignee?: User;
  created_at: ISO8601;
  updated_at: ISO8601;
  resolved_at?: ISO8601;
  closed_at?: ISO8601;
}

export interface TicketCreatePayload {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  tags?: string[];
  projectId?: UUID;
  attachment_ids?: number[];
}

export interface TicketUpdatePayload {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  tags?: string[];
  assignedTo?: UUID;
}

export interface TicketTransitionPayload {
  ticketId: UUID;
  toStatus: TicketStatus;
  comment?: string;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: UUID;
  createdBy?: UUID;
  projectId?: UUID;
  search?: string;
  dateFrom?: ISO8601;
  dateTo?: ISO8601;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── SLA Types ───────────────────────────────────────────────────
export enum SLAState {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  BREACHED = 'breached',
  PAUSED = 'paused',
  MET = 'met',
}

export interface SLAInfo {
  responseDeadline: ISO8601;
  resolutionDeadline: ISO8601;
  responseState: SLAState;
  resolutionState: SLAState;
  responseMet: boolean;
  resolutionMet: boolean;
  pausedAt?: ISO8601;
  responseBreachedAt?: ISO8601;
  resolutionBreachedAt?: ISO8601;
}

// ── Comment Types ───────────────────────────────────────────────
export interface Comment {
  id: UUID;
  ticketId: UUID;
  authorId: UUID;
  author?: User;
  content: string;
  isInternal: boolean;
  parentId?: UUID;
  attachments: Attachment[];
  mentions: UUID[];
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface CommentCreatePayload {
  ticket_id: UUID;
  user_id: UUID;
  message: string;
  isInternal?: boolean;
  parent_id?: UUID;
  mentioned_user_ids?: UUID[];
  attachment_ids?: UUID[];
}

// ── Attachment Types ────────────────────────────────────────────
export interface AttachmentCreatePayload {
  file_name: string;
  file_type: string;
  file_path: string;
  metadata?: Record<string, unknown>;
}

export interface AttachmentRecord {
  id: number;
  file_name: string;
  file_type: string;
  file_path: string;
  tenant_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Attachment {
  id: UUID;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: UUID;
  created_at: ISO8601;
}

export interface PresignedUpload {
  uploadUrl: string;
  fileKey: string;
  expiresAt: ISO8601;
}

// ── Project Types ───────────────────────────────────────────────
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Project {
  id: UUID;
  name: string;
  description: string;
  scope?: string; // Plain-text scope statement used for semantic drift detection
  status: ProjectStatus;
  organizationId: UUID;
  organization?: Organization;
  leadId?: UUID;
  lead?: User;
  milestones: Milestone[];
  ticketCount: number;
  openTicketCount?: number;
  resolvedThisWeek?: number;
  startDate?: ISO8601;
  targetDate?: ISO8601;
  completedAt?: ISO8601;
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface Milestone {
  id: UUID;
  projectId: UUID;
  title: string;
  description?: string;
  dueDate: ISO8601;
  isCompleted: boolean;
  completedAt?: ISO8601;
  deliverables: Deliverable[];
}

export interface Deliverable {
  id: UUID;
  milestoneId: UUID;
  title: string;
  isCompleted: boolean;
  completedAt?: ISO8601;
}

// ── Knowledge Base Types ────────────────────────────────────────
export interface KBArticle {
  id: UUID;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  categoryId?: UUID;
  category?: KBCategory;
  tags: string[];
  authorId: UUID;
  author?: User;
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  relatedArticleIds: UUID[];
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface KBCategory {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  articleCount: number;
  parentId?: UUID;
}

export interface KBSearchResult {
  article: KBArticle;
  score: number;
  highlights: string[];
}

// ── Notification Types ──────────────────────────────────────────
export enum NotificationType {
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_COMMENT = 'ticket_comment',
  TICKET_MENTION = 'ticket_mention',
  SLA_AT_RISK = 'sla_at_risk',
  SLA_BREACHED = 'sla_breached',
  PROJECT_UPDATE = 'project_update',
  SYSTEM = 'system',
}

export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  resourceType?: string;
  resourceId?: UUID;
  created_at: ISO8601;
}

// ── Analytics Types ─────────────────────────────────────────────
export interface AnalyticsFilters {
  dateFrom?: ISO8601;
  dateTo?: ISO8601;
  period?: string;
  organizationId?: UUID;
  agentId?: UUID;
  status?: TicketStatus[];
  priority?: TicketPriority[];
}

export interface TicketVolumeData {
  date: string;
  created: number;
  resolved: number;
  closed: number;
}

export interface SLAComplianceData {
  period: string;
  responseCompliance: number;
  resolutionCompliance: number;
  totalTickets: number;
  breachedTickets: number;
}

export interface ResolutionTrendData {
  period: string;
  avgResolutionHours: number;
  medianResolutionHours: number;
  p95ResolutionHours: number;
}

export interface AgentPerformance {
  agentId: UUID;
  agentName: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  avgResolutionHours: number;
  slaCompliance: number;
  csatScore?: number;
}

export interface MonthlyVolumeData {
  month: string;   // e.g. "Apr 2026"
  created: number;
  resolved: number;
}

export interface CategoryBreakdownData {
  category: string;   // e.g. "Technical", "Billing"
  count: number;
  percentage: number; // 0–100
}

export interface SeverityDistributionData {
  priority: string;   // CRITICAL | HIGH | MEDIUM | LOW
  count: number;
  percentage: number;
}

export interface ResolutionBySeverityData {
  priority: string;
  avgHours: number;
}

export interface UserPreferences {
  accentColor: AccentColor;
  colorMode: ColorMode;
  density: 'comfortable' | 'compact';
  emailOnNewReply: boolean;
  emailOnStatusChange: boolean;
  emailOnMention: boolean;
  emailDigest: boolean;
  browserPush: boolean;
  // agent-only fields (ignored silently on client portal)
  emailOnTicketAssigned?: boolean;
  emailOnSLAWarning?: boolean;
  emailOnEscalation?: boolean;
  emailDailyDigest?: boolean;
}

export interface UserPreferencesUpdatePayload {
  accentColor?: AccentColor;
  colorMode?: ColorMode;
  density?: 'comfortable' | 'compact';
  emailOnNewReply?: boolean;
  emailOnStatusChange?: boolean;
  emailOnMention?: boolean;
  emailDigest?: boolean;
  browserPush?: boolean;
  emailOnTicketAssigned?: boolean;
  emailOnSLAWarning?: boolean;
  emailOnEscalation?: boolean;
  emailDailyDigest?: boolean;
}

export interface DashboardSummary {
  total: number;
  resolvedToday: number;
  avgResolutionTime: string;
  slaComplianceRate: number;
  by_priority: Record<TicketPriority, number>;
  by_status: Record<TicketStatus, number>;
  recentActivity?: ActivityItem[];
}

export interface ActivityItem {
  id: UUID;
  type: string;
  description: string;
  userId: UUID;
  userName: string;
  resourceType: string;
  resourceId: UUID;
  timestamp: ISO8601;
}

// ── AI Types ────────────────────────────────────────────────────
export enum AISuggestionType {
  CLASSIFICATION = 'classification',
  PRIORITY = 'priority',
  ROUTING = 'routing',
  REPLY = 'reply',
  SUMMARY = 'summary',
  ETA = 'eta',
  SEARCH = 'search',
}

export enum AISuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EDITED = 'edited',
  REJECTED = 'rejected',
}

export interface AISuggestion<T = unknown> {
  id: UUID;
  type: AISuggestionType;
  ticketId?: UUID;
  suggestion: T;
  confidence: number;
  reasoning?: string;
  status: AISuggestionStatus;
  created_at: ISO8601;
}

export interface AIClassificationSuggestion {
  category: TicketCategory;
  subcategory?: string;
  confidence: number;
}

export interface AIPrioritySuggestion {
  priority: TicketPriority;
  factors: string[];
  confidence: number;
}

export interface AIRoutingSuggestion {
  agentId: UUID;
  agentName: string;
  teamId?: UUID;
  teamName?: string;
  reason: string;
  confidence: number;
  alternativeAgents: Array<{
    agentId: UUID;
    agentName: string;
    confidence: number;
  }>;
}

export interface AIReplySuggestion {
  content: string;
  tone: 'professional' | 'friendly' | 'technical';
  confidence: number;
}

export interface AISummarySuggestion {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface AIETASuggestion {
  estimatedHours: number;
  confidence: number;
  factors: string[];
  range: {
    low: number;
    high: number;
  };
}

/** Result of classifying raw text (title + description) before a ticket exists */
export interface AITextClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  categoryConfidence: number;
  priorityConfidence: number;
  categoryReasoning: string;
  priorityReasoning: string;
  priorityFactors: string[];
}

export interface AISearchResult {
  query: string;
  results: Array<{
    id: UUID;
    type: 'ticket' | 'article' | 'comment';
    title: string;
    excerpt: string;
    similarity: number;
  }>;
}

// ── Audit Types ─────────────────────────────────────────────────
export interface AuditLogEntry {
  id: UUID;
  action: string;
  resourceType: string;
  resourceId: UUID;
  userId: UUID;
  userName: string;
  organizationId: UUID;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  created_at: ISO8601;
}

// ── Realtime Types ──────────────────────────────────────────────
export enum RealtimeEventType {
  TICKET_CREATED = 'ticket:created',
  TICKET_UPDATED = 'ticket:updated',
  TICKET_STATUS_CHANGED = 'ticket:status_changed',
  TICKET_ASSIGNED = 'ticket:assigned',
  COMMENT_CREATED = 'comment:created',
  NOTIFICATION = 'notification',
  SLA_WARNING = 'sla:warning',
  SLA_BREACH = 'sla:breach',
  AGENT_STATUS = 'agent:status',
  CONNECTION_STATUS = 'connection:status',
}

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  timestamp: ISO8601;
  tenantId: UUID;
}

// ── Routing Rule Types ──────────────────────────────────────────
export interface RoutingRule {
  id: UUID;
  name: string;
  description?: string;
  conditions: RoutingCondition[];
  assignTo: UUID;
  priority: number;
  isActive: boolean;
  created_at: ISO8601;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: string | string[];
}

// ── AI Digest Types (client dashboard) ─────────────────────────
export interface AIDigestAtRiskTicket {
  ticketId: string;
  ticketNumber: string;
  title: string;
  reason: string;
  urgency: 'high' | 'medium';
  deadlineAt?: ISO8601;
}

export interface AIDigestPattern {
  label: string;
  ticketCount: number;
  tags: string[];
  suggestion: string;
}

export interface AIDigestResponseGap {
  ticketId: string;
  ticketNumber: string;
  title: string;
  waitingDays: number;
  waitingFor: 'client' | 'agent';
}

export interface AIDigest {
  generatedAt: ISO8601;
  needsAttentionCount: number;
  needsAttentionSummary: string;
  atRiskTickets: AIDigestAtRiskTicket[];
  patterns: AIDigestPattern[];
  responseGaps: AIDigestResponseGap[];
  digestSummary: string;
}

// ── AI Knowledge Base Types ─────────────────────────────────────

/** Suggested KB articles relevant to a ticket, generated by semantic search */
export interface AIKBSuggestion {
  articleId: UUID;
  title: string;
  excerpt: string;
  score: number;
  reasoning: string;
}

/** AI draft generated for a KB article */
export interface AIKBDraftResult {
  title: string;
  excerpt: string;
  content: string;
  suggestedTags: string[];
  suggestedCategoryId?: UUID;
}

/** A KB gap identified from ticket patterns */
export interface AIKBGap {
  id: string;
  topic: string;
  description: string;
  ticketCount: number;
  sampleTicketIds: UUID[];
  suggestedTitle: string;
  priority: 'high' | 'medium' | 'low';
}

/** RAG answer grounded in KB articles */
export interface AIKBAnswer {
  answer: string;
  confidence: number;
  sourceArticleIds: UUID[];
  followUpQuestions: string[];
  cannotAnswer: boolean;
}

// ── AI Project Types ────────────────────────────────────────────

/** Health signal for a project: Green / Amber / Red */
export type ProjectHealthColor = 'green' | 'amber' | 'red';

/** Computed health score with explanation */
export interface ProjectHealthScore {
  projectId: UUID;
  color: ProjectHealthColor;
  score: number; // 0–100
  explanation: string; // LLM-written plain-English reasoning
  velocityTrend: 'improving' | 'stable' | 'declining';
  slaBreachRisk: number; // 0–1 probability
  openBlockers: number;
  generatedAt: ISO8601;
}

/** A semantic theme cluster found inside a project's tickets */
export interface ProjectTicketCluster {
  id: string;
  label: string;
  ticketCount: number;
  ticketIds: UUID[];
  topKeywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

/** Scope-drift flag: ticket semantically outside declared project scope */
export interface ProjectScopeDrift {
  ticketId: UUID;
  ticketTitle: string;
  similarity: number; // 0–1 cosine vs. scope statement
  flagged: boolean;
  reasoning: string;
}

/** Churn risk for a client engagement */
export interface ProjectChurnRisk {
  projectId: UUID;
  score: number; // 0–1
  level: 'low' | 'medium' | 'high';
  signals: string[]; // e.g. "Client response time increasing", "3 escalations in 7 days"
  recommendation: string;
}

/** AI-generated weekly status report */
export interface ProjectStatusReport {
  projectId: UUID;
  period: string; // e.g. "Apr 10 – Apr 17, 2026"
  summary: string;
  resolvedThisWeek: number;
  openCount: number;
  blockers: string[];
  nextSteps: string[];
  onTrack: boolean;
  milestoneConfidence: string; // e.g. "85% confident milestone will be hit by Apr 25"
  generatedAt: ISO8601;
}

/** Client-facing Q&A answer grounded in project history */
export interface ProjectQAAnswer {
  answer: string;
  confidence: number;
  sourceTicketIds: UUID[];
  cannotAnswer: boolean;
}

/** Recommended next action for an agent on a project */
export interface ProjectNextBestAction {
  projectId: UUID;
  action: string; // e.g. "Send interim status update to client"
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  draftMessage?: string;
}

/** Knowledge extraction result from a closed project */
export interface ProjectKnowledgeEntry {
  id: string;
  projectId: UUID;
  projectName: string;
  summary: string;
  problemStatement: string;
  resolutionApproach: string;
  blockersSeen: string[];
  recommendations: string[];
  created_at: ISO8601;
}

/** Milestone delivery prediction */
export interface ProjectMilestonePrediction {
  milestoneId: UUID;
  milestoneName: string;
  scheduledDate: ISO8601;
  predictedDate: ISO8601;
  onTrack: boolean;
  confidenceLow: ISO8601;
  confidenceHigh: ISO8601;
  blockingTicketIds: UUID[];
  reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY BOARD TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DeliveryStatus =
  | 'BACKLOG'
  | 'PLANNED'
  | 'IN_DEV'
  | 'IN_QA'
  | 'IN_STAGING'
  | 'RELEASED';

export interface DeliveryFeature {
  id: string;                         // 'FEAT-001'
  title: string;
  description: string;
  status: DeliveryStatus;
  assignee?: string;                  // display name
  assigneeId?: string;
  eta?: ISO8601;
  upvotes: number;                    // aggregated from client votes
  quarter?: string;                   // 'Q2 2026' — for roadmap grouping
  isPublic: boolean;                  // true = visible in client roadmap
  category?: string;                  // 'AI', 'Performance', 'UX', etc.
  requestedByOrgIds?: string[];       // which orgs requested/voted
  hasVoted?: boolean;                 // client-side: current user voted?
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface DeliveryFeatureCreatePayload {
  title: string;
  description: string;
  status?: DeliveryStatus;
  assigneeId?: string;
  eta?: ISO8601;
  quarter?: string;
  isPublic?: boolean;
  category?: string;
}

export interface DeliveryFeatureMovePayload {
  status: DeliveryStatus;
}

// AI — Delivery Board
export interface DeliveryRiskItem {
  featureId: string;
  featureTitle: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  daysUntilEta?: number;
  recommendation: string;
}

export interface DeliveryPrioritisedFeature {
  featureId: string;
  featureTitle: string;
  suggestedStatus: DeliveryStatus;
  score: number;           // 0–100
  reasoning: string;
}

export interface DeliveryFeatureDraft {
  description: string;
  suggestedQuarter: string;
  suggestedCategory: string;
  suggestedAssigneeRole: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  submittedByUserId: string;
  submittedByOrgId: string;
  submittedByOrgName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MERGED';
  linkedFeatureId?: string;    // if merged into existing feature
  created_at: ISO8601;
}

export interface FeatureRequestClassification {
  isDuplicate: boolean;
  similarFeatureId?: string;
  similarFeatureTitle?: string;
  similarityScore?: number;
  suggestedQuarter?: string;
  category: string;
  recommendation: string;       // human-readable guidance
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type OnboardingHealth = 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';
export type OnboardingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type OnboardingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type OnboardingTaskOwner = 'CLIENT' | 'DELIVERY';
export type OnboardingPhaseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  owner: OnboardingTaskOwner;
  dueDate: ISO8601;
  status: OnboardingTaskStatus;
  completedAt?: ISO8601;
}

export interface OnboardingPhase {
  id: string;
  phaseNumber: number;
  name: string;
  progress: number;             // 0–100
  status: OnboardingPhaseStatus;
  tasks: OnboardingTask[];
}

export interface OnboardingProject {
  id: string;                   // 'ONB-001'
  organizationId: string;
  organizationName: string;
  leadAgentId: string;
  leadAgentName: string;
  status: OnboardingStatus;
  health: OnboardingHealth;
  overallProgress: number;      // 0–100
  goLiveDate: ISO8601;
  blockerCount: number;
  phases: OnboardingPhase[];
  created_at: ISO8601;
  updated_at: ISO8601;
}

export interface OnboardingTaskUpdatePayload {
  status: OnboardingTaskStatus;
}

// AI — Onboarding
export interface OnboardingHealthPrediction {
  onboardingId: string;
  health: OnboardingHealth;
  confidence: number;           // 0–1
  reason: string;
  predictedGoLive: ISO8601;
  daysVariance: number;         // positive = late, negative = early
}

export interface OnboardingBlockerSummary {
  onboardingId: string;
  summary: string;              // one-line plain English
  blockerCount: number;
  mostUrgent?: string;
}

export interface OnboardingNextAction {
  onboardingId: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  ownedBy: OnboardingTaskOwner;
  draftMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP AI TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RoadmapPersonalisedSummary {
  headline: string;
  topRelevantFeatureIds: string[];
  reasoning: string;
}
