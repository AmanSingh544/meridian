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
export enum UserRole {
  CUSTOMER_ADMIN = 'customer_admin',
  CUSTOMER_USER = 'customer_user',
  AGENT = 'agent',
  LEAD = 'lead',
  ADMIN = 'admin',
}

export enum Permission {
  // Ticket permissions
  TICKET_VIEW = 'ticket:view',
  TICKET_CREATE = 'ticket:create',
  TICKET_EDIT = 'ticket:edit',
  TICKET_ASSIGN = 'ticket:assign',
  TICKET_ESCALATE = 'ticket:escalate',
  TICKET_CLOSE = 'ticket:close',
  TICKET_REOPEN = 'ticket:reopen',
  TICKET_DELETE = 'ticket:delete',
  TICKET_TRANSITION = 'ticket:transition',
  TICKET_VIEW_INTERNAL = 'ticket:view_internal',

  // Comment permissions
  COMMENT_CREATE = 'comment:create',
  COMMENT_EDIT = 'comment:edit',
  COMMENT_DELETE = 'comment:delete',
  COMMENT_INTERNAL = 'comment:internal',

  // User management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Organization management
  ORG_VIEW = 'org:view',
  ORG_EDIT = 'org:edit',
  ORG_MANAGE = 'org:manage',

  // Project permissions
  PROJECT_VIEW = 'project:view',
  PROJECT_CREATE = 'project:create',
  PROJECT_EDIT = 'project:edit',
  PROJECT_DELETE = 'project:delete',

  // Knowledge base
  KB_VIEW = 'kb:view',
  KB_CREATE = 'kb:create',
  KB_EDIT = 'kb:edit',
  KB_DELETE = 'kb:delete',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Audit
  AUDIT_VIEW = 'audit:view',

  // AI features
  AI_USE = 'ai:use',
  AI_CONFIGURE = 'ai:configure',

  // Admin
  ADMIN_PANEL = 'admin:panel',
  ROUTING_MANAGE = 'routing:manage',
  SLA_MANAGE = 'sla:manage',
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
  ticketId: UUID;
  content: string;
  isInternal?: boolean;
  parentId?: UUID;
  mentions?: UUID[];
  attachments?: File[];
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
