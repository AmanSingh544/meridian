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
 * │ ESCALATION_CONFIGURE    │              │             │       │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ AI_SUGGEST              │              │             │   ✓   │  ✓   │   ✓   │
 * │ AI_FEEDBACK             │              │             │   ✓   │  ✓   │   ✓   │
 * ├─────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
 * │ AUDIT_VIEW              │              │             │       │      │   ✓   │
 * │ WORKSPACE_CONFIGURE     │      ✓       │             │       │      │   ✓   │
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

  // ── AI Assist ──────────────────────────────────────────────────────────────
  /** Access AI-generated suggestions in the agent panel. Internal staff only. */
  AI_SUGGEST = 'AI_SUGGEST',
  /** Submit accept/reject feedback on AI suggestions. Internal staff only. */
  AI_FEEDBACK = 'AI_FEEDBACK',

  // ── Audit & Workspace ──────────────────────────────────────────────────────
  /** View the audit trail of all system actions. ADMIN only. */
  AUDIT_VIEW = 'AUDIT_VIEW',
  /** Configure workspace-level settings. CLIENT_ADMIN (own org) and ADMIN only. */
  WORKSPACE_CONFIGURE = 'WORKSPACE_CONFIGURE',

  // Project permissions
  PROJECT_VIEW = 'PROJECT_VIEW',
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_EDIT = 'PROJECT_EDIT',
  PROJECT_DELETE = 'PROJECT_DELETE',
}

export interface User {
  id: UUID;
  email: Email;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  organizationId: UUID;
  isActive: boolean;
  lastLoginAt?: ISO8601;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl?: string;
  domain?: string;
  isActive: boolean;
  plan?: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;
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
  createdAt: ISO8601;
  updatedAt: ISO8601;
  resolvedAt?: ISO8601;
  closedAt?: ISO8601;
}

export interface TicketCreatePayload {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  tags?: string[];
  projectId?: UUID;
  attachments?: File[];
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
  createdAt: ISO8601;
  updatedAt: ISO8601;
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
export interface Attachment {
  id: UUID;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: UUID;
  createdAt: ISO8601;
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
  status: ProjectStatus;
  organizationId: UUID;
  leadId?: UUID;
  lead?: User;
  milestones: Milestone[];
  ticketCount: number;
  startDate?: ISO8601;
  targetDate?: ISO8601;
  completedAt?: ISO8601;
  createdAt: ISO8601;
  updatedAt: ISO8601;
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
  createdAt: ISO8601;
  updatedAt: ISO8601;
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
  createdAt: ISO8601;
}

// ── Analytics Types ─────────────────────────────────────────────
export interface AnalyticsFilters {
  dateFrom: ISO8601;
  dateTo: ISO8601;
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

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  avgResolutionTime: string;
  slaComplianceRate: number;
  ticketsByPriority: Record<TicketPriority, number>;
  ticketsByStatus: Record<TicketStatus, number>;
  recentActivity: ActivityItem[];
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
  createdAt: ISO8601;
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
  createdAt: ISO8601;
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
  createdAt: ISO8601;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: string | string[];
}
