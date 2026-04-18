// ═══════════════════════════════════════════════════════════════════════════
// MERIDIAN INTERNAL CONSOLE — CENTRAL MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════
//
// Single source of truth for all mock data.
// Three fully-fleshed personas: ADMIN (Alex Morgan), LEAD (Priya Sharma),
// AGENT (James Okafor). Switch MOCK_ACTIVE_USER in handler.ts to change
// which persona the session uses.
//
// When real APIs are ready, delete this file + src/mocks/ and remove the two
// lines in main.tsx that import/call installMockHandler().
// ═══════════════════════════════════════════════════════════════════════════

import type {
  User, Organization, Ticket, Comment,
  DashboardSummary, TicketVolumeData, SLAComplianceData,
  ResolutionTrendData, AgentPerformance, AuditLogEntry,
  Notification, AISuggestion, AIClassificationSuggestion,
  AIPrioritySuggestion, AIRoutingSuggestion, AIReplySuggestion,
  AISummarySuggestion, AIETASuggestion, AISearchResult, RoutingRule,
  KBArticle, KBCategory,
  Project, Milestone,
  ProjectHealthScore, ProjectTicketCluster, ProjectScopeDrift,
  ProjectChurnRisk, ProjectStatusReport, ProjectNextBestAction,
  ProjectKnowledgeEntry, ProjectMilestonePrediction,
} from '@3sc/types';
import {
  TicketStatus, TicketPriority, TicketCategory, SLAState,
  UserRole, Permission, AISuggestionType, AISuggestionStatus,
  NotificationType,
} from '@3sc/types';

// ─── 1. USERS ────────────────────────────────────────────────────────────────

const AGENT_PERMISSIONS: Permission[] = [
  Permission.TICKET_VIEW_ALL, Permission.TICKET_EDIT,
  Permission.TICKET_STATUS_CHANGE, Permission.TICKET_CREATE,
  Permission.COMMENT_CREATE, Permission.COMMENT_INTERNAL,
  Permission.COMMENT_DELETE,
  Permission.ATTACHMENT_UPLOAD, Permission.ATTACHMENT_DELETE,
  Permission.MEMBER_VIEW,
  Permission.REPORT_VIEW,
  Permission.KB_VIEW,
  Permission.SLA_VIEW,
  Permission.AI_SUGGEST, Permission.AI_FEEDBACK,
  Permission.PROJECT_VIEW,
  Permission.AI_PROJECT_QA,
];

const LEAD_PERMISSIONS: Permission[] = [
  ...AGENT_PERMISSIONS,
  Permission.TICKET_ASSIGN, Permission.TICKET_DELETE, Permission.TICKET_REOPEN,
  Permission.REPORT_EXPORT,
  Permission.SLA_CONFIGURE, Permission.ESCALATION_CONFIGURE,
  Permission.PROJECT_CREATE, Permission.PROJECT_EDIT,
  Permission.AI_PROJECT_INSIGHTS, Permission.AI_PROJECT_REPORTS,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...LEAD_PERMISSIONS,
  Permission.MEMBER_INVITE, Permission.MEMBER_MANAGE,
  Permission.KB_MANAGE,
  Permission.AUDIT_VIEW,
  Permission.WORKSPACE_CONFIGURE,
  Permission.PROJECT_DELETE,
];

export const MOCK_USERS: User[] = [
  // ── Internal staff ──────────────────────────────────────────────
  {
    id: 'USR-001',
    email: 'alex.morgan@3sc.com',
    displayName: 'Alex Morgan',
    firstName: 'Alex', lastName: 'Morgan',
    role: UserRole.ADMIN,
    permissions: ADMIN_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-16T08:14:00Z',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2026-04-16T08:14:00Z',
  },
  {
    id: 'USR-002',
    email: 'priya.sharma@3sc.com',
    displayName: 'Priya Sharma',
    firstName: 'Priya', lastName: 'Sharma',
    role: UserRole.LEAD,
    permissions: LEAD_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-16T07:45:00Z',
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2026-04-16T07:45:00Z',
  },
  {
    id: 'USR-003',
    email: 'james.okafor@3sc.com',
    displayName: 'James Okafor',
    firstName: 'James', lastName: 'Okafor',
    role: UserRole.AGENT,
    permissions: AGENT_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-16T09:01:00Z',
    created_at: '2024-05-20T09:00:00Z',
    updated_at: '2026-04-16T09:01:00Z',
  },
  {
    id: 'USR-004',
    email: 'sara.chen@3sc.com',
    displayName: 'Sara Chen',
    firstName: 'Sara', lastName: 'Chen',
    role: UserRole.AGENT,
    permissions: AGENT_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-15T17:22:00Z',
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2026-04-15T17:22:00Z',
  },
  {
    id: 'USR-005',
    email: 'michael.reyes@3sc.com',
    displayName: 'Michael Reyes',
    firstName: 'Michael', lastName: 'Reyes',
    role: UserRole.AGENT,
    permissions: AGENT_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-14T13:55:00Z',
    created_at: '2024-07-12T09:00:00Z',
    updated_at: '2026-04-14T13:55:00Z',
  },
  {
    id: 'USR-006',
    email: 'nina.patel@3sc.com',
    displayName: 'Nina Patel',
    firstName: 'Nina', lastName: 'Patel',
    role: UserRole.LEAD,
    permissions: LEAD_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-16T06:30:00Z',
    created_at: '2024-02-08T09:00:00Z',
    updated_at: '2026-04-16T06:30:00Z',
  },
  {
    id: 'USR-007',
    email: 'tom.baker@3sc.com',
    displayName: 'Tom Baker',
    firstName: 'Tom', lastName: 'Baker',
    role: UserRole.AGENT,
    permissions: AGENT_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: false,
    lastLoginAt: '2026-01-10T11:00:00Z',
    created_at: '2024-08-01T09:00:00Z',
    updated_at: '2026-01-10T11:00:00Z',
  },
  {
    id: 'USR-008',
    email: 'yuki.tanaka@3sc.com',
    displayName: 'Yuki Tanaka',
    firstName: 'Yuki', lastName: 'Tanaka',
    role: UserRole.AGENT,
    permissions: AGENT_PERMISSIONS,
    organizationId: 'ORG-001',
    isActive: true,
    lastLoginAt: '2026-04-16T08:55:00Z',
    created_at: '2025-01-15T09:00:00Z',
    updated_at: '2026-04-16T08:55:00Z',
  },
  // ── Client users ─────────────────────────────────────────────────
  {
    id: 'USR-101',
    email: 'david.wilson@acmecorp.com',
    displayName: 'David Wilson',
    firstName: 'David', lastName: 'Wilson',
    role: UserRole.CLIENT_ADMIN,
    permissions: [Permission.TICKET_CREATE, Permission.TICKET_VIEW_ORG, Permission.TICKET_EDIT, Permission.TICKET_REOPEN, Permission.COMMENT_CREATE, Permission.ATTACHMENT_UPLOAD, Permission.MEMBER_INVITE, Permission.MEMBER_MANAGE, Permission.MEMBER_VIEW, Permission.REPORT_VIEW, Permission.REPORT_EXPORT, Permission.KB_VIEW, Permission.SLA_VIEW, Permission.WORKSPACE_CONFIGURE],
    organizationId: 'ORG-002',
    isActive: true,
    lastLoginAt: '2026-04-16T07:12:00Z',
    created_at: '2024-09-01T09:00:00Z',
    updated_at: '2026-04-16T07:12:00Z',
  },
  {
    id: 'USR-102',
    email: 'lucy.nguyen@acmecorp.com',
    displayName: 'Lucy Nguyen',
    firstName: 'Lucy', lastName: 'Nguyen',
    role: UserRole.CLIENT_USER,
    permissions: [Permission.TICKET_CREATE, Permission.TICKET_VIEW_OWN, Permission.COMMENT_CREATE, Permission.ATTACHMENT_UPLOAD, Permission.MEMBER_VIEW, Permission.KB_VIEW, Permission.SLA_VIEW],
    organizationId: 'ORG-002',
    isActive: true,
    lastLoginAt: '2026-04-14T15:30:00Z',
    created_at: '2024-09-15T09:00:00Z',
    updated_at: '2026-04-14T15:30:00Z',
  },
  {
    id: 'USR-103',
    email: 'ben.harper@techwave.io',
    displayName: 'Ben Harper',
    firstName: 'Ben', lastName: 'Harper',
    role: UserRole.CLIENT_ADMIN,
    permissions: [Permission.TICKET_CREATE, Permission.TICKET_VIEW_ORG, Permission.TICKET_EDIT, Permission.TICKET_REOPEN, Permission.COMMENT_CREATE, Permission.ATTACHMENT_UPLOAD, Permission.MEMBER_INVITE, Permission.MEMBER_MANAGE, Permission.MEMBER_VIEW, Permission.REPORT_VIEW, Permission.KB_VIEW, Permission.SLA_VIEW, Permission.WORKSPACE_CONFIGURE],
    organizationId: 'ORG-003',
    isActive: true,
    lastLoginAt: '2026-04-15T09:45:00Z',
    created_at: '2024-10-01T09:00:00Z',
    updated_at: '2026-04-15T09:45:00Z',
  },
  {
    id: 'USR-104',
    email: 'rachel.kim@globalfinance.com',
    displayName: 'Rachel Kim',
    firstName: 'Rachel', lastName: 'Kim',
    role: UserRole.CLIENT_ADMIN,
    permissions: [Permission.TICKET_CREATE, Permission.TICKET_VIEW_ORG, Permission.TICKET_EDIT, Permission.TICKET_REOPEN, Permission.COMMENT_CREATE, Permission.ATTACHMENT_UPLOAD, Permission.MEMBER_VIEW, Permission.REPORT_VIEW, Permission.KB_VIEW, Permission.SLA_VIEW],
    organizationId: 'ORG-004',
    isActive: true,
    lastLoginAt: '2026-04-13T14:20:00Z',
    created_at: '2025-02-01T09:00:00Z',
    updated_at: '2026-04-13T14:20:00Z',
  },
];

// ─── 2. ORGANIZATIONS ────────────────────────────────────────────────────────

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'ORG-001',
    name: '3SC Internal',
    slug: '3sc-internal',
    domain: '3sc.com',
    isActive: true,
    plan: 'Enterprise',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-16T00:00:00Z',
  },
  {
    id: 'ORG-002',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    domain: 'acmecorp.com',
    isActive: true,
    plan: 'Business',
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 'ORG-003',
    name: 'TechWave IO',
    slug: 'techwave-io',
    domain: 'techwave.io',
    isActive: true,
    plan: 'Pro',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'ORG-004',
    name: 'Global Finance Group',
    slug: 'global-finance-group',
    domain: 'globalfinance.com',
    isActive: true,
    plan: 'Enterprise',
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ORG-005',
    name: 'Nomad Retail Ltd',
    slug: 'nomad-retail',
    domain: 'nomadretail.co.uk',
    isActive: false,
    plan: 'Starter',
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 'ORG-006',
    name: 'Apex Logistics',
    slug: 'apex-logistics',
    domain: 'apexlogistics.com',
    isActive: true,
    plan: 'Business',
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'ORG-007',
    name: 'Sunrise Healthcare',
    slug: 'sunrise-healthcare',
    domain: 'sunrisehealthcare.org',
    isActive: true,
    plan: 'Enterprise',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-04-05T00:00:00Z',
  },
];

// ─── 3. TICKETS ──────────────────────────────────────────────────────────────

const u = (id: string) => MOCK_USERS.find((u) => u.id === id)!;

export const MOCK_TICKETS: Ticket[] = [
  // ── CRITICAL / open ─────────────────────────────────────────────
  {
    id: 'TKT-001',
    ticketNumber: 'TKT-001',
    title: 'Production database cluster unresponsive — all queries timing out',
    description: `Our primary PostgreSQL cluster (us-east-1) stopped responding at 03:42 UTC. All read and write queries are timing out after 30 s. The application is returning 503 errors to all users.

Steps already taken:
- Restarted the read replicas — no improvement
- Checked CloudWatch: CPU 98%, disk I/O queue length 4200
- Application logs show "FATAL: remaining connection slots are reserved for non-replication superuser connections"

We have ~15,000 active users affected. This is a P0 incident.`,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.CRITICAL,
    category: TicketCategory.INCIDENT,
    tags: ['database', 'postgres', 'production', 'outage'],
    createdBy: 'USR-101',
    assignedTo: 'USR-002',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-16T04:42:00Z',
      resolutionDeadline: '2026-04-16T07:42:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.BREACHED,
      responseMet: true,
      resolutionMet: false,
      responseBreachedAt: undefined,
      resolutionBreachedAt: '2026-04-16T07:42:00Z',
    },
    attachments: [
      { id: 'ATT-001', fileName: 'cloudwatch_metrics.png', fileSize: 245000, mimeType: 'image/png', url: '#', uploadedBy: 'USR-101', created_at: '2026-04-16T03:50:00Z' },
      { id: 'ATT-002', fileName: 'error_logs.txt', fileSize: 18400, mimeType: 'text/plain', url: '#', uploadedBy: 'USR-101', created_at: '2026-04-16T03:51:00Z' },
    ],
    commentCount: 7,
    creator: u('USR-101'),
    assignee: u('USR-002'),
    created_at: '2026-04-16T03:44:00Z',
    updated_at: '2026-04-16T09:15:00Z',
  },
  {
    id: 'TKT-002',
    ticketNumber: 'TKT-002',
    title: 'Payment processing failing for all Stripe transactions — revenue impact',
    description: `Since approximately 14:30 UTC, all Stripe payment intents are failing with error code "card_declined" even for known good test cards. This affects checkout, subscription renewals, and manual charges.

Stripe dashboard shows the API keys are valid. Our webhook endpoint is receiving events but the charge never succeeds. Error response: {"error": {"code": "card_declined", "decline_code": "generic_decline", "message": "Your card has been declined."}}.

Estimated revenue impact: £4,200 per hour.`,
    status: TicketStatus.ACKNOWLEDGED,
    priority: TicketPriority.CRITICAL,
    category: TicketCategory.BUG,
    tags: ['payments', 'stripe', 'billing', 'revenue'],
    createdBy: 'USR-103',
    assignedTo: 'USR-003',
    organizationId: 'ORG-003',
    sla: {
      responseDeadline: '2026-04-16T15:30:00Z',
      resolutionDeadline: '2026-04-16T18:30:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.AT_RISK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [
      { id: 'ATT-003', fileName: 'stripe_error_response.json', fileSize: 3200, mimeType: 'application/json', url: '#', uploadedBy: 'USR-103', created_at: '2026-04-16T14:35:00Z' },
    ],
    commentCount: 3,
    creator: u('USR-103'),
    assignee: u('USR-003'),
    created_at: '2026-04-16T14:32:00Z',
    updated_at: '2026-04-16T15:10:00Z',
  },
  // ── HIGH ────────────────────────────────────────────────────────
  {
    id: 'TKT-003',
    ticketNumber: 'TKT-003',
    title: 'SSO/SAML login broken for all Azure AD users after cert rotation',
    description: `Following our certificate rotation on April 14th, all users authenticating via Azure AD SAML are receiving: "SAML signature validation failed — certificate thumbprint mismatch".

Users who use email/password login are unaffected. Roughly 340 users in our organisation cannot log in.

We updated the certificate in Azure AD but did not update the SP metadata on your side. Is there a way to upload the new IdP certificate through the admin panel?`,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['sso', 'saml', 'azure-ad', 'authentication'],
    createdBy: 'USR-101',
    assignedTo: 'USR-004',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-14T13:00:00Z',
      resolutionDeadline: '2026-04-16T10:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.AT_RISK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [
      { id: 'ATT-004', fileName: 'saml_error_trace.log', fileSize: 9100, mimeType: 'text/plain', url: '#', uploadedBy: 'USR-101', created_at: '2026-04-14T11:05:00Z' },
    ],
    commentCount: 4,
    creator: u('USR-101'),
    assignee: u('USR-004'),
    created_at: '2026-04-14T11:00:00Z',
    updated_at: '2026-04-16T08:45:00Z',
  },
  {
    id: 'TKT-004',
    ticketNumber: 'TKT-004',
    title: 'API rate limiting kicking in at 20 req/s instead of contracted 200 req/s',
    description: `Our integration is being rate-limited at 20 requests/second, but our Enterprise plan specifies 200 req/s. This is causing our real-time dashboard to fall significantly behind.

We are seeing HTTP 429 responses with: {"error": "rate_limit_exceeded", "limit": 20, "reset_at": "..."}. Our account ID is ACC-7821. Please investigate whether our rate limit tier is misconfigured on your end.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['api', 'rate-limiting', 'enterprise', 'integration'],
    createdBy: 'USR-104',
    assignedTo: undefined,
    organizationId: 'ORG-004',
    sla: {
      responseDeadline: '2026-04-17T10:00:00Z',
      resolutionDeadline: '2026-04-18T10:00:00Z',
      responseState: SLAState.ON_TRACK,
      resolutionState: SLAState.ON_TRACK,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 0,
    creator: u('USR-104'),
    assignee: undefined,
    created_at: '2026-04-16T09:00:00Z',
    updated_at: '2026-04-16T09:00:00Z',
  },
  {
    id: 'TKT-005',
    ticketNumber: 'TKT-005',
    title: 'Bulk data export stuck at 0% for exports > 10,000 rows',
    description: `When exporting reports with more than 10,000 rows, the export job starts (shows "Processing…"), then freezes at 0% indefinitely. Smaller exports work fine.

We need to export ~85,000 records for our end-of-quarter audit. The job was triggered 3 hours ago and still shows 0%.`,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['export', 'reports', 'bug', 'data'],
    createdBy: 'USR-102',
    assignedTo: 'USR-005',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-15T12:00:00Z',
      resolutionDeadline: '2026-04-17T12:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.ON_TRACK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 2,
    creator: u('USR-102'),
    assignee: u('USR-005'),
    created_at: '2026-04-15T09:00:00Z',
    updated_at: '2026-04-16T07:30:00Z',
  },
  {
    id: 'TKT-006',
    ticketNumber: 'TKT-006',
    title: 'File attachments exceeding 8 MB silently fail — no error shown to user',
    description: `When users attempt to attach files larger than 8 MB to a ticket, the upload spinner runs indefinitely with no error message. The attachment is never saved. This is a UX regression — previous behaviour showed a clear size-limit error.

Max allowed per our plan is 25 MB per file. The silent failure is causing confusion.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['attachments', 'uploads', 'ux', 'regression'],
    createdBy: 'USR-103',
    assignedTo: 'USR-008',
    organizationId: 'ORG-003',
    sla: {
      responseDeadline: '2026-04-17T14:00:00Z',
      resolutionDeadline: '2026-04-19T14:00:00Z',
      responseState: SLAState.ON_TRACK,
      resolutionState: SLAState.ON_TRACK,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 1,
    creator: u('USR-103'),
    assignee: u('USR-008'),
    created_at: '2026-04-16T10:20:00Z',
    updated_at: '2026-04-16T11:00:00Z',
  },
  // ── MEDIUM ──────────────────────────────────────────────────────
  {
    id: 'TKT-007',
    ticketNumber: 'TKT-007',
    title: 'Email notifications not delivered when ticket is assigned to a team',
    description: `When a ticket is assigned to a team (rather than a specific agent), the "ticket assigned" email notification is not sent to any team members. Direct-to-agent assignments still work correctly.

This is causing agents to miss tickets that come in during off-hours.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['notifications', 'email', 'teams', 'assignment'],
    createdBy: 'USR-003',
    assignedTo: undefined,
    organizationId: 'ORG-001',
    sla: {
      responseDeadline: '2026-04-18T09:00:00Z',
      resolutionDeadline: '2026-04-22T09:00:00Z',
      responseState: SLAState.ON_TRACK,
      resolutionState: SLAState.ON_TRACK,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 0,
    creator: u('USR-003'),
    assignee: undefined,
    created_at: '2026-04-16T11:30:00Z',
    updated_at: '2026-04-16T11:30:00Z',
  },
  {
    id: 'TKT-008',
    ticketNumber: 'TKT-008',
    title: 'Knowledge base search returns irrelevant results for technical queries',
    description: `Searching for specific error codes (e.g. "ERR_CONN_RESET", "ECONNREFUSED") returns articles about unrelated topics. Exact-string queries that worked in version 2.1 are no longer matching correctly after the semantic search upgrade in 2.2.`,
    status: TicketStatus.ACKNOWLEDGED,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['knowledge-base', 'search', 'semantic', 'regression'],
    createdBy: 'USR-104',
    assignedTo: 'USR-003',
    organizationId: 'ORG-004',
    sla: {
      responseDeadline: '2026-04-15T16:00:00Z',
      resolutionDeadline: '2026-04-19T16:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.ON_TRACK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 1,
    creator: u('USR-104'),
    assignee: u('USR-003'),
    created_at: '2026-04-15T13:00:00Z',
    updated_at: '2026-04-16T08:00:00Z',
  },
  {
    id: 'TKT-009',
    ticketNumber: 'TKT-009',
    title: 'Bulk ticket reassignment tool fails when selecting more than 50 tickets',
    description: `The "Reassign Selected" action in the ticket queue fails silently when more than 50 tickets are selected. Selecting 1–49 tickets and reassigning works as expected. The network request never fires when 50+ are selected.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['bulk-actions', 'assignment', 'ticket-queue'],
    createdBy: 'USR-002',
    assignedTo: 'USR-004',
    organizationId: 'ORG-001',
    sla: {
      responseDeadline: '2026-04-18T07:00:00Z',
      resolutionDeadline: '2026-04-22T07:00:00Z',
      responseState: SLAState.ON_TRACK,
      resolutionState: SLAState.ON_TRACK,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 0,
    creator: u('USR-002'),
    assignee: u('USR-004'),
    created_at: '2026-04-16T07:00:00Z',
    updated_at: '2026-04-16T07:00:00Z',
  },
  {
    id: 'TKT-010',
    ticketNumber: 'TKT-010',
    title: 'Mobile app crashes on iOS 17.4 when opening ticket detail view',
    description: `The iOS mobile app consistently crashes when tapping into a ticket detail view on devices running iOS 17.4. The app opens normally on iOS 16 and iOS 17.3. Crash log attached.

Crash signature: EXC_CRASH (SIGABRT) — Thread 1: Fatal error: Unexpectedly found nil while unwrapping an Optional value.`,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['mobile', 'ios', 'crash', 'ticket-detail'],
    createdBy: 'USR-102',
    assignedTo: 'USR-005',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-14T11:00:00Z',
      resolutionDeadline: '2026-04-18T11:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.ON_TRACK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [
      { id: 'ATT-005', fileName: 'crash_report_ios17.4.log', fileSize: 32000, mimeType: 'text/plain', url: '#', uploadedBy: 'USR-102', created_at: '2026-04-13T10:00:00Z' },
    ],
    commentCount: 3,
    creator: u('USR-102'),
    assignee: u('USR-005'),
    created_at: '2026-04-13T10:00:00Z',
    updated_at: '2026-04-16T09:00:00Z',
  },
  {
    id: 'TKT-011',
    ticketNumber: 'TKT-011',
    title: 'Audit log not capturing field-level changes on ticket updates',
    description: `When an agent updates a ticket's priority or category, the audit log only records "ticket updated" without showing the before/after field values. The previous version showed detailed change diffs. This is blocking our compliance review.`,
    status: TicketStatus.ACKNOWLEDGED,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['audit', 'compliance', 'ticket-updates'],
    createdBy: 'USR-001',
    assignedTo: 'USR-008',
    organizationId: 'ORG-001',
    sla: {
      responseDeadline: '2026-04-15T09:00:00Z',
      resolutionDeadline: '2026-04-19T09:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.ON_TRACK,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 1,
    creator: u('USR-001'),
    assignee: u('USR-008'),
    created_at: '2026-04-15T08:00:00Z',
    updated_at: '2026-04-15T15:00:00Z',
  },
  {
    id: 'TKT-012',
    ticketNumber: 'TKT-012',
    title: 'Custom SLA policy not applied when ticket is re-opened after resolution',
    description: `When a ticket is resolved and then re-opened by the client, our custom SLA policy (4-hour response, 24-hour resolution) is not reapplied — instead the default policy kicks in. This leads to incorrect SLA breach alerts.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['sla', 'reopen', 'policy'],
    createdBy: 'USR-006',
    assignedTo: undefined,
    organizationId: 'ORG-001',
    sla: {
      responseDeadline: '2026-04-18T10:00:00Z',
      resolutionDeadline: '2026-04-22T10:00:00Z',
      responseState: SLAState.ON_TRACK,
      resolutionState: SLAState.ON_TRACK,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 0,
    creator: u('USR-006'),
    assignee: undefined,
    created_at: '2026-04-16T10:00:00Z',
    updated_at: '2026-04-16T10:00:00Z',
  },
  // ── FEATURE REQUESTS ────────────────────────────────────────────
  {
    id: 'TKT-013',
    ticketNumber: 'TKT-013',
    title: 'Feature: Allow agents to save canned responses / reply templates',
    description: `Our team frequently sends similar replies for common issues (password resets, VPN setup, etc.). Having a library of canned responses that agents can insert and personalise would significantly reduce average handle time.

We'd ideally want: per-agent personal templates + shared team templates, with variable substitution (e.g. {{customer_name}}).`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    category: TicketCategory.FEATURE_REQUEST,
    tags: ['canned-responses', 'templates', 'productivity'],
    createdBy: 'USR-003',
    assignedTo: undefined,
    organizationId: 'ORG-001',
    sla: undefined,
    attachments: [],
    commentCount: 2,
    creator: u('USR-003'),
    assignee: undefined,
    created_at: '2026-04-10T14:00:00Z',
    updated_at: '2026-04-14T09:00:00Z',
  },
  {
    id: 'TKT-014',
    ticketNumber: 'TKT-014',
    title: 'Feature: Configurable auto-close policy for resolved tickets',
    description: `We'd like the ability to set a per-organisation policy to automatically close tickets that have been in "Resolved" state for N days without client response. Our preferred value is 7 days.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    category: TicketCategory.FEATURE_REQUEST,
    tags: ['auto-close', 'workflow', 'sla'],
    createdBy: 'USR-002',
    assignedTo: undefined,
    organizationId: 'ORG-001',
    sla: undefined,
    attachments: [],
    commentCount: 0,
    creator: u('USR-002'),
    assignee: undefined,
    created_at: '2026-04-12T11:00:00Z',
    updated_at: '2026-04-12T11:00:00Z',
  },
  {
    id: 'TKT-015',
    ticketNumber: 'TKT-015',
    title: 'Feature: Webhook support for ticket status changes',
    description: `We need to be able to trigger external webhooks when a ticket changes status (particularly OPEN → IN_PROGRESS and any → RESOLVED). This would let us sync ticket state to our internal Jira and Slack.`,
    status: TicketStatus.ACKNOWLEDGED,
    priority: TicketPriority.LOW,
    category: TicketCategory.FEATURE_REQUEST,
    tags: ['webhooks', 'integrations', 'jira', 'slack'],
    createdBy: 'USR-103',
    assignedTo: 'USR-006',
    organizationId: 'ORG-003',
    sla: undefined,
    attachments: [],
    commentCount: 1,
    creator: u('USR-103'),
    assignee: u('USR-006'),
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-11T14:00:00Z',
  },
  // ── QUESTIONS ───────────────────────────────────────────────────
  {
    id: 'TKT-016',
    ticketNumber: 'TKT-016',
    title: 'How do I export SLA compliance data to CSV for board reporting?',
    description: `I need to produce a monthly SLA compliance report for our board meeting. I can see the charts on the analytics page but cannot find a CSV export button. Is this available in our plan (Business)?`,
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.QUESTION,
    tags: ['export', 'sla', 'reporting', 'csv'],
    createdBy: 'USR-103',
    assignedTo: 'USR-003',
    organizationId: 'ORG-003',
    sla: {
      responseDeadline: '2026-04-11T12:00:00Z',
      resolutionDeadline: '2026-04-13T12:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 2,
    creator: u('USR-103'),
    assignee: u('USR-003'),
    created_at: '2026-04-10T11:00:00Z',
    updated_at: '2026-04-12T10:00:00Z',
    resolved_at: '2026-04-12T10:00:00Z',
  },
  {
    id: 'TKT-017',
    ticketNumber: 'TKT-017',
    title: 'Can we set different SLA policies for different ticket categories?',
    description: `We want critical bugs to have a 1-hour response SLA while feature requests get a 48-hour response. Is per-category SLA configuration supported?`,
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.QUESTION,
    tags: ['sla', 'configuration', 'policy'],
    createdBy: 'USR-101',
    assignedTo: 'USR-002',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-09T10:00:00Z',
      resolutionDeadline: '2026-04-11T10:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 3,
    creator: u('USR-101'),
    assignee: u('USR-002'),
    created_at: '2026-04-08T10:00:00Z',
    updated_at: '2026-04-10T14:00:00Z',
    resolved_at: '2026-04-10T14:00:00Z',
  },
  // ── RESOLVED ────────────────────────────────────────────────────
  {
    id: 'TKT-018',
    ticketNumber: 'TKT-018',
    title: '2FA SMS codes not delivered to +44 UK numbers',
    description: `Two-factor authentication SMS codes are not being delivered to UK phone numbers (+44 prefix). US and Canadian numbers work fine. Affected users cannot log in.`,
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['2fa', 'sms', 'authentication', 'uk'],
    createdBy: 'USR-101',
    assignedTo: 'USR-004',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-10T09:00:00Z',
      resolutionDeadline: '2026-04-12T09:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 5,
    creator: u('USR-101'),
    assignee: u('USR-004'),
    created_at: '2026-04-09T09:30:00Z',
    updated_at: '2026-04-11T16:00:00Z',
    resolved_at: '2026-04-11T16:00:00Z',
  },
  {
    id: 'TKT-019',
    ticketNumber: 'TKT-019',
    title: 'Analytics dashboard charts not rendering in Safari 17',
    description: `All chart visualisations on the analytics page appear blank in Safari 17 (macOS Sonoma). The data loads (visible in DevTools network tab) but the SVG canvas is 0×0. Chrome and Firefox are unaffected.`,
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['analytics', 'safari', 'charts', 'rendering'],
    createdBy: 'USR-102',
    assignedTo: 'USR-005',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-07T12:00:00Z',
      resolutionDeadline: '2026-04-10T12:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 4,
    creator: u('USR-102'),
    assignee: u('USR-005'),
    created_at: '2026-04-06T14:00:00Z',
    updated_at: '2026-04-09T11:00:00Z',
    resolved_at: '2026-04-09T11:00:00Z',
  },
  // ── CLOSED ──────────────────────────────────────────────────────
  {
    id: 'TKT-020',
    ticketNumber: 'TKT-020',
    title: 'Password reset link expiry too short — users unable to complete reset',
    description: `Users who don't check their email promptly find that the password reset link has already expired. The current expiry appears to be 15 minutes. Industry standard is 1 hour.`,
    status: TicketStatus.CLOSED,
    priority: TicketPriority.LOW,
    category: TicketCategory.BUG,
    tags: ['password-reset', 'email', 'ux'],
    createdBy: 'USR-103',
    assignedTo: 'USR-003',
    organizationId: 'ORG-003',
    sla: {
      responseDeadline: '2026-03-20T10:00:00Z',
      resolutionDeadline: '2026-03-24T10:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 3,
    creator: u('USR-103'),
    assignee: u('USR-003'),
    created_at: '2026-03-19T09:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
    resolved_at: '2026-03-22T14:00:00Z',
    closed_at: '2026-03-25T10:00:00Z',
  },
  {
    id: 'TKT-021',
    ticketNumber: 'TKT-021',
    title: 'Billing page shows incorrect plan tier after downgrade',
    description: `After downgrading from Enterprise to Business, the billing page still shows "Enterprise Plan" for 3 days. Resolved itself eventually — likely a cache issue.`,
    status: TicketStatus.CLOSED,
    priority: TicketPriority.LOW,
    category: TicketCategory.BUG,
    tags: ['billing', 'cache', 'plan'],
    createdBy: 'USR-101',
    assignedTo: 'USR-004',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-03-05T10:00:00Z',
      resolutionDeadline: '2026-03-07T10:00:00Z',
      responseState: SLAState.MET,
      resolutionState: SLAState.MET,
      responseMet: true,
      resolutionMet: true,
    },
    attachments: [],
    commentCount: 2,
    creator: u('USR-101'),
    assignee: u('USR-004'),
    created_at: '2026-03-03T11:00:00Z',
    updated_at: '2026-03-10T09:00:00Z',
    resolved_at: '2026-03-07T15:00:00Z',
    closed_at: '2026-03-10T09:00:00Z',
  },
  // ── TASK ────────────────────────────────────────────────────────
  {
    id: 'TKT-022',
    ticketNumber: 'TKT-022',
    title: 'Onboarding: Configure SSO and custom domain for Sunrise Healthcare',
    description: `New Enterprise client onboarding task. Configure Azure AD SSO integration and set up custom domain (support.sunrisehealthcare.org) for the customer portal.

Checklist:
- [ ] Provision tenant in production
- [ ] Configure Azure AD SAML SP metadata
- [ ] DNS CNAME setup
- [ ] Test end-to-end login flow
- [ ] Send welcome pack to Rachel Kim (IT Admin)`,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TASK,
    tags: ['onboarding', 'sso', 'enterprise', 'custom-domain'],
    createdBy: 'USR-001',
    assignedTo: 'USR-002',
    organizationId: 'ORG-001',
    sla: undefined,
    attachments: [],
    commentCount: 2,
    creator: u('USR-001'),
    assignee: u('USR-002'),
    created_at: '2026-04-14T09:00:00Z',
    updated_at: '2026-04-16T08:00:00Z',
  },
  {
    id: 'TKT-023',
    ticketNumber: 'TKT-023',
    title: 'Q2 SLA policy review — update thresholds for all Enterprise clients',
    description: `Quarterly review of SLA thresholds across all Enterprise tenants. Proposed changes:
- Critical: response 30 min → 15 min
- High: response 2 h → 1 h
- Enterprise resolution SLA: 4 h → 2 h for critical

Requires approval from Nina Patel and sign-off from each account owner.`,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TASK,
    tags: ['sla', 'q2-review', 'enterprise', 'policy'],
    createdBy: 'USR-006',
    assignedTo: 'USR-001',
    organizationId: 'ORG-001',
    sla: undefined,
    attachments: [
      { id: 'ATT-006', fileName: 'Q2_SLA_Proposal_v2.xlsx', fileSize: 87000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: '#', uploadedBy: 'USR-006', created_at: '2026-04-15T14:00:00Z' },
    ],
    commentCount: 1,
    creator: u('USR-006'),
    assignee: u('USR-001'),
    created_at: '2026-04-15T14:00:00Z',
    updated_at: '2026-04-15T14:00:00Z',
  },
  // ── A few more for pagination realism ───────────────────────────
  {
    id: 'TKT-024',
    ticketNumber: 'TKT-024',
    title: 'Apex Logistics: missing invoice for March 2026',
    description: 'Client reports they have not received the March 2026 invoice. Please resend to accounts@apexlogistics.com.',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.BILLING,
    tags: ['billing', 'invoice', 'apex-logistics'],
    createdBy: 'USR-103',
    assignedTo: 'USR-003',
    organizationId: 'ORG-006',
    sla: { responseDeadline: '2026-04-03T10:00:00Z', resolutionDeadline: '2026-04-05T10:00:00Z', responseState: SLAState.MET, resolutionState: SLAState.MET, responseMet: true, resolutionMet: true },
    attachments: [],
    commentCount: 2,
    creator: u('USR-103'),
    assignee: u('USR-003'),
    created_at: '2026-04-02T09:00:00Z',
    updated_at: '2026-04-04T11:00:00Z',
    resolved_at: '2026-04-04T11:00:00Z',
  },
  {
    id: 'TKT-025',
    ticketNumber: 'TKT-025',
    title: 'Global Finance: 2FA enforcement not applying to SSO logins',
    description: 'Our 2FA enforcement policy should apply to all login methods including SSO. Currently SSO users bypass 2FA. This is a compliance requirement.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['2fa', 'sso', 'security', 'compliance'],
    createdBy: 'USR-104',
    assignedTo: 'USR-006',
    organizationId: 'ORG-004',
    sla: { responseDeadline: '2026-04-17T09:00:00Z', resolutionDeadline: '2026-04-18T09:00:00Z', responseState: SLAState.ON_TRACK, resolutionState: SLAState.ON_TRACK, responseMet: false, resolutionMet: false },
    attachments: [],
    commentCount: 0,
    creator: u('USR-104'),
    assignee: u('USR-006'),
    created_at: '2026-04-16T11:00:00Z',
    updated_at: '2026-04-16T11:00:00Z',
  },
];

// ─── 4. COMMENTS ─────────────────────────────────────────────────────────────

export const MOCK_COMMENTS: Record<string, Comment[]> = {
  'TKT-001': [
    {
      id: 'CMT-001', ticketId: 'TKT-001', authorId: 'USR-101',
      author: u('USR-101'),
      content: 'URGENT — we have 15,000 users completely locked out. This is impacting a live presentation for a major client. Please escalate immediately.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T03:46:00Z', updated_at: '2026-04-16T03:46:00Z',
    },
    {
      id: 'CMT-002', ticketId: 'TKT-001', authorId: 'USR-002',
      author: u('USR-002'),
      content: 'Acknowledged. I have escalated this to our DB ops team and am joining your incident channel now. Initial analysis suggests connection pool exhaustion — can you confirm what change was deployed in the last 2 hours?',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T03:52:00Z', updated_at: '2026-04-16T03:52:00Z',
    },
    {
      id: 'CMT-003', ticketId: 'TKT-001', authorId: 'USR-002',
      author: u('USR-002'),
      content: '[INTERNAL] CloudWatch confirms connection count hit max_connections (500). Likely culprit is the new connection pool config deployed at 03:30 UTC. Checking with DevOps to roll back.\n\nAlso note: customer is in a live sales demo — priority above all else.',
      isInternal: true, attachments: [], mentions: ['USR-006'],
      created_at: '2026-04-16T03:55:00Z', updated_at: '2026-04-16T03:55:00Z',
    },
    {
      id: 'CMT-004', ticketId: 'TKT-001', authorId: 'USR-101',
      author: u('USR-101'),
      content: 'We deployed a connection pool size change (from 50 to 200 per node) at 03:28 UTC. Rolling it back now on our side — should we coordinate?',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T04:05:00Z', updated_at: '2026-04-16T04:05:00Z',
    },
    {
      id: 'CMT-005', ticketId: 'TKT-001', authorId: 'USR-002',
      author: u('USR-002'),
      content: 'Yes — please hold your rollback for 5 minutes. We are applying a pgbouncer config patch on our end first. Will confirm when ready.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T04:10:00Z', updated_at: '2026-04-16T04:10:00Z',
    },
    {
      id: 'CMT-006', ticketId: 'TKT-001', authorId: 'USR-002',
      author: u('USR-002'),
      content: 'pgbouncer patch applied. Connections are draining — we are seeing connection count drop from 498 to 320 and query latency recovering. Please proceed with your rollback now.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T04:22:00Z', updated_at: '2026-04-16T04:22:00Z',
    },
    {
      id: 'CMT-007', ticketId: 'TKT-001', authorId: 'USR-101',
      author: u('USR-101'),
      content: "Application is responding normally again. Users can log in. The SLA breach on resolution is noted — we'll discuss during our quarterly review. Thank you for the rapid response.",
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T04:48:00Z', updated_at: '2026-04-16T04:48:00Z',
    },
  ],
  'TKT-002': [
    {
      id: 'CMT-010', ticketId: 'TKT-002', authorId: 'USR-103',
      author: u('USR-103'),
      content: 'Confirmed on staging and production. All card types fail. We have halted all marketing campaigns to avoid new sign-ups hitting this.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T14:40:00Z', updated_at: '2026-04-16T14:40:00Z',
    },
    {
      id: 'CMT-011', ticketId: 'TKT-002', authorId: 'USR-003',
      author: u('USR-003'),
      content: '[INTERNAL] Stripe webhook logs show a "restricted_key" scope error starting 14:28 UTC. This correlates with a Stripe API key rotation done by our infra team at 14:25. The new restricted key is likely missing the "charges:write" permission. Checking with Stripe dashboard.',
      isInternal: true, attachments: [], mentions: ['USR-002'],
      created_at: '2026-04-16T15:00:00Z', updated_at: '2026-04-16T15:00:00Z',
    },
    {
      id: 'CMT-012', ticketId: 'TKT-002', authorId: 'USR-003',
      author: u('USR-003'),
      content: 'We have identified the root cause. Our infrastructure team rotated the Stripe API key and the new key was created with insufficient permissions. We are issuing a corrected key now. Expect resolution within 30 minutes.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-16T15:15:00Z', updated_at: '2026-04-16T15:15:00Z',
    },
  ],
  'TKT-003': [
    {
      id: 'CMT-020', ticketId: 'TKT-003', authorId: 'USR-101',
      author: u('USR-101'),
      content: 'To clarify — we rotated the IdP signing certificate on April 14th as part of our annual security review. We updated Azure AD but assumed the SP side would auto-refresh. 340 users are locked out of the platform.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-14T11:10:00Z', updated_at: '2026-04-14T11:10:00Z',
    },
    {
      id: 'CMT-021', ticketId: 'TKT-003', authorId: 'USR-004',
      author: u('USR-004'),
      content: 'Understood. To resolve this you will need to provide the new IdP metadata XML. Please go to your Azure AD Enterprise Application → Single sign-on → Download Federation Metadata XML and attach it to this ticket.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-14T12:30:00Z', updated_at: '2026-04-14T12:30:00Z',
    },
    {
      id: 'CMT-022', ticketId: 'TKT-003', authorId: 'USR-101',
      author: u('USR-101'),
      content: 'Metadata XML attached.',
      isInternal: false,
      attachments: [{ id: 'ATT-010', fileName: 'AcmeCorp_AzureAD_Metadata.xml', fileSize: 4200, mimeType: 'application/xml', url: '#', uploadedBy: 'USR-101', created_at: '2026-04-14T13:00:00Z' }],
      mentions: [],
      created_at: '2026-04-14T13:05:00Z', updated_at: '2026-04-14T13:05:00Z',
    },
    {
      id: 'CMT-023', ticketId: 'TKT-003', authorId: 'USR-004',
      author: u('USR-004'),
      content: '[INTERNAL] Metadata uploaded and SP certificate updated in our IdP config. Testing with a test Azure AD account — SAML assertion is valid. Monitoring to confirm all 340 users can log in. Will update customer once confirmed.',
      isInternal: true, attachments: [], mentions: [],
      created_at: '2026-04-16T08:40:00Z', updated_at: '2026-04-16T08:40:00Z',
    },
  ],
  'TKT-010': [
    {
      id: 'CMT-040', ticketId: 'TKT-010', authorId: 'USR-102',
      author: u('USR-102'),
      content: 'Reproduced on iPhone 15 Pro (iOS 17.4.1) and iPhone 14 (iOS 17.4). Not reproducible on iOS 17.3. Crash log attached to original ticket.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-13T10:30:00Z', updated_at: '2026-04-13T10:30:00Z',
    },
    {
      id: 'CMT-041', ticketId: 'TKT-010', authorId: 'USR-005',
      author: u('USR-005'),
      content: '[INTERNAL] Crash is in TicketDetailViewController.swift:142 — we are force-unwrapping `ticket.assignee?.avatarURL` which returns nil in the new API response shape. iOS 17.4 is stricter about optional chaining in Swift. One-line fix — submitting hotfix PR now.',
      isInternal: true, attachments: [], mentions: ['USR-002'],
      created_at: '2026-04-13T14:00:00Z', updated_at: '2026-04-13T14:00:00Z',
    },
    {
      id: 'CMT-042', ticketId: 'TKT-010', authorId: 'USR-005',
      author: u('USR-005'),
      content: 'We have identified the crash — a nil unwrapping issue in the ticket detail screen triggered by a change in the iOS 17.4 Swift runtime. A hotfix build (v2.3.1) is in App Store review and should be available within 24 hours.',
      isInternal: false, attachments: [], mentions: [],
      created_at: '2026-04-14T09:00:00Z', updated_at: '2026-04-14T09:00:00Z',
    },
  ],
  'TKT-022': [
    {
      id: 'CMT-060', ticketId: 'TKT-022', authorId: 'USR-001',
      author: u('USR-001'),
      content: '[INTERNAL] Tenant provisioned in prod. DNS CNAME is pending on client side. Priya — please coordinate with Ben Harper on the Azure AD SAML metadata exchange.',
      isInternal: true, attachments: [], mentions: ['USR-002'],
      created_at: '2026-04-14T10:00:00Z', updated_at: '2026-04-14T10:00:00Z',
    },
    {
      id: 'CMT-061', ticketId: 'TKT-022', authorId: 'USR-002',
      author: u('USR-002'),
      content: '[INTERNAL] DNS is live. SSO metadata exchange complete. Running end-to-end test now. Should be done by EOD.',
      isInternal: true, attachments: [], mentions: [],
      created_at: '2026-04-16T07:55:00Z', updated_at: '2026-04-16T07:55:00Z',
    },
  ],
};

// ─── 5. DASHBOARD KPIs ───────────────────────────────────────────────────────

export const MOCK_DASHBOARD: DashboardSummary & { openTickets: number } = {
  openTickets: 14,
  total: 14,
  resolvedToday: 3,
  avgResolutionTime: '18.4h',
  slaComplianceRate: 0.87,
  by_priority: {
    CRITICAL: 2,
    HIGH: 5,
    MEDIUM: 5,
    LOW: 2,
  },
  by_status: {
    OPEN: 7,
    ACKNOWLEDGED: 3,
    IN_PROGRESS: 4,
    RESOLVED: 6,
    CLOSED: 3,
  },
  recentActivity: [
    { id: 'ACT-001', type: 'status_change', description: 'TKT-001 moved to IN_PROGRESS', userId: 'USR-002', userName: 'Priya Sharma', resourceType: 'ticket', resourceId: 'TKT-001', timestamp: '2026-04-16T09:15:00Z' },
    { id: 'ACT-002', type: 'assignment', description: 'TKT-006 assigned to Yuki Tanaka', userId: 'USR-002', userName: 'Priya Sharma', resourceType: 'ticket', resourceId: 'TKT-006', timestamp: '2026-04-16T11:02:00Z' },
    { id: 'ACT-003', type: 'comment', description: 'James commented on TKT-002', userId: 'USR-003', userName: 'James Okafor', resourceType: 'ticket', resourceId: 'TKT-002', timestamp: '2026-04-16T15:15:00Z' },
    { id: 'ACT-004', type: 'created', description: 'TKT-025 opened by Rachel Kim', userId: 'USR-104', userName: 'Rachel Kim', resourceType: 'ticket', resourceId: 'TKT-025', timestamp: '2026-04-16T11:00:00Z' },
  ],
};

// ─── 6. ANALYTICS ────────────────────────────────────────────────────────────

export const MOCK_TICKET_VOLUME: TicketVolumeData[] = [
  { date: '2026-04-09', created: 8,  resolved: 6,  closed: 2 },
  { date: '2026-04-10', created: 11, resolved: 9,  closed: 3 },
  { date: '2026-04-11', created: 6,  resolved: 7,  closed: 1 },
  { date: '2026-04-12', created: 4,  resolved: 3,  closed: 4 },
  { date: '2026-04-13', created: 9,  resolved: 5,  closed: 2 },
  { date: '2026-04-14', created: 12, resolved: 10, closed: 3 },
  { date: '2026-04-15', created: 7,  resolved: 8,  closed: 1 },
  { date: '2026-04-16', created: 10, resolved: 3,  closed: 0 },
];

export const MOCK_TICKET_VOLUME_30D: TicketVolumeData[] = [
  { date: '2026-03-18', created: 7,  resolved: 5,  closed: 2 },
  { date: '2026-03-19', created: 9,  resolved: 8,  closed: 1 },
  { date: '2026-03-20', created: 5,  resolved: 6,  closed: 3 },
  { date: '2026-03-21', created: 3,  resolved: 4,  closed: 1 },
  { date: '2026-03-22', created: 2,  resolved: 2,  closed: 0 },
  { date: '2026-03-23', created: 1,  resolved: 3,  closed: 1 },
  { date: '2026-03-24', created: 8,  resolved: 7,  closed: 2 },
  { date: '2026-03-25', created: 10, resolved: 9,  closed: 2 },
  { date: '2026-03-26', created: 11, resolved: 8,  closed: 3 },
  { date: '2026-03-27', created: 6,  resolved: 7,  closed: 1 },
  { date: '2026-03-28', created: 5,  resolved: 6,  closed: 2 },
  { date: '2026-03-29', created: 4,  resolved: 3,  closed: 4 },
  { date: '2026-03-30', created: 9,  resolved: 8,  closed: 1 },
  { date: '2026-03-31', created: 13, resolved: 10, closed: 2 },
  { date: '2026-04-01', created: 7,  resolved: 6,  closed: 1 },
  { date: '2026-04-02', created: 8,  resolved: 9,  closed: 0 },
  { date: '2026-04-03', created: 6,  resolved: 7,  closed: 2 },
  { date: '2026-04-04', created: 4,  resolved: 5,  closed: 1 },
  { date: '2026-04-05', created: 2,  resolved: 3,  closed: 0 },
  { date: '2026-04-06', created: 1,  resolved: 2,  closed: 1 },
  { date: '2026-04-07', created: 9,  resolved: 8,  closed: 3 },
  { date: '2026-04-08', created: 11, resolved: 10, closed: 2 },
  ...MOCK_TICKET_VOLUME,
];

export const MOCK_SLA_COMPLIANCE: SLAComplianceData[] = [
  { period: '2026-04-09', responseCompliance: 0.95, resolutionCompliance: 0.90, totalTickets: 8,  breachedTickets: 1 },
  { period: '2026-04-10', responseCompliance: 0.91, resolutionCompliance: 0.82, totalTickets: 11, breachedTickets: 2 },
  { period: '2026-04-11', responseCompliance: 0.97, resolutionCompliance: 0.95, totalTickets: 6,  breachedTickets: 0 },
  { period: '2026-04-12', responseCompliance: 0.88, resolutionCompliance: 0.80, totalTickets: 4,  breachedTickets: 1 },
  { period: '2026-04-13', responseCompliance: 0.93, resolutionCompliance: 0.88, totalTickets: 9,  breachedTickets: 1 },
  { period: '2026-04-14', responseCompliance: 0.90, resolutionCompliance: 0.85, totalTickets: 12, breachedTickets: 2 },
  { period: '2026-04-15', responseCompliance: 0.94, resolutionCompliance: 0.91, totalTickets: 7,  breachedTickets: 1 },
  { period: '2026-04-16', responseCompliance: 0.80, resolutionCompliance: 0.75, totalTickets: 10, breachedTickets: 3 },
];

export const MOCK_RESOLUTION_TRENDS: ResolutionTrendData[] = [
  { period: '2026-04-09', avgResolutionHours: 16.2, medianResolutionHours: 12.5, p95ResolutionHours: 48.0 },
  { period: '2026-04-10', avgResolutionHours: 19.4, medianResolutionHours: 14.0, p95ResolutionHours: 52.0 },
  { period: '2026-04-11', avgResolutionHours: 14.8, medianResolutionHours: 11.0, p95ResolutionHours: 36.0 },
  { period: '2026-04-12', avgResolutionHours: 22.1, medianResolutionHours: 18.0, p95ResolutionHours: 64.0 },
  { period: '2026-04-13', avgResolutionHours: 17.6, medianResolutionHours: 13.5, p95ResolutionHours: 44.0 },
  { period: '2026-04-14', avgResolutionHours: 15.9, medianResolutionHours: 12.0, p95ResolutionHours: 42.0 },
  { period: '2026-04-15', avgResolutionHours: 18.3, medianResolutionHours: 15.5, p95ResolutionHours: 50.0 },
  { period: '2026-04-16', avgResolutionHours: 18.4, medianResolutionHours: 14.0, p95ResolutionHours: 55.0 },
];

export const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [
  { agentId: 'USR-003', agentName: 'James Okafor',  ticketsAssigned: 28, ticketsResolved: 24, avgResolutionHours: 14.2, slaCompliance: 0.93, csatScore: 4.7 },
  { agentId: 'USR-004', agentName: 'Sara Chen',     ticketsAssigned: 31, ticketsResolved: 27, avgResolutionHours: 16.8, slaCompliance: 0.89, csatScore: 4.5 },
  { agentId: 'USR-005', agentName: 'Michael Reyes', ticketsAssigned: 22, ticketsResolved: 19, avgResolutionHours: 20.1, slaCompliance: 0.82, csatScore: 4.2 },
  { agentId: 'USR-008', agentName: 'Yuki Tanaka',   ticketsAssigned: 18, ticketsResolved: 15, avgResolutionHours: 12.6, slaCompliance: 0.95, csatScore: 4.8 },
  { agentId: 'USR-002', agentName: 'Priya Sharma',  ticketsAssigned: 14, ticketsResolved: 13, avgResolutionHours: 10.4, slaCompliance: 0.97, csatScore: 4.9 },
  { agentId: 'USR-006', agentName: 'Nina Patel',    ticketsAssigned: 9,  ticketsResolved: 8,  avgResolutionHours: 11.2, slaCompliance: 0.96, csatScore: 4.8 },
];

export const MOCK_MONTHLY_VOLUME = [
  { month: 'Oct 2025', created: 48, resolved: 41 },
  { month: 'Nov 2025', created: 62, resolved: 55 },
  { month: 'Dec 2025', created: 34, resolved: 38 },
  { month: 'Jan 2026', created: 71, resolved: 60 },
  { month: 'Feb 2026', created: 58, resolved: 63 },
  { month: 'Mar 2026', created: 83, resolved: 74 },
  { month: 'Apr 2026', created: 67, resolved: 72 },
];

export const MOCK_CATEGORY_BREAKDOWN = [
  { category: 'Technical',   count: 112, percentage: 37 },
  { category: 'Billing',     count: 67,  percentage: 22 },
  { category: 'Account',     count: 52,  percentage: 17 },
  { category: 'Integration', count: 40,  percentage: 13 },
  { category: 'Other',       count: 33,  percentage: 11 },
];

export const MOCK_SEVERITY_DISTRIBUTION = [
  { priority: 'CRITICAL', count: 18,  percentage: 6  },
  { priority: 'HIGH',     count: 72,  percentage: 24 },
  { priority: 'MEDIUM',   count: 124, percentage: 41 },
  { priority: 'LOW',      count: 90,  percentage: 29 },
];

export const MOCK_RESOLUTION_BY_SEVERITY = [
  { priority: 'CRITICAL', avgHours: 3.2  },
  { priority: 'HIGH',     avgHours: 8.5  },
  { priority: 'MEDIUM',   avgHours: 18.3 },
  { priority: 'LOW',      avgHours: 42.1 },
];

export const MOCK_USER_PREFERENCES = {
  accentColor: 'cobalt' as const,
  colorMode: 'system' as const,
  density: 'comfortable' as const,
  emailOnNewReply: true,
  emailOnStatusChange: true,
  emailOnMention: true,
  emailDigest: false,
  browserPush: false,
  emailOnTicketAssigned: true,
  emailOnSLAWarning: true,
  emailOnEscalation: true,
  emailDailyDigest: false,
};

// ─── 7. AUDIT LOG ────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001', action: 'UPDATE', resourceType: 'user', resourceId: 'USR-007',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: { role: { from: 'AGENT', to: 'LEAD' } },
    ipAddress: '192.168.1.45',
    created_at: '2026-04-16T08:30:00Z',
  },
  {
    id: 'AUD-002', action: 'STATUS_CHANGE', resourceType: 'ticket', resourceId: 'TKT-001',
    userId: 'USR-002', userName: 'Priya Sharma', organizationId: 'ORG-002',
    changes: { status: { from: 'ACKNOWLEDGED', to: 'IN_PROGRESS' } },
    ipAddress: '10.0.0.12',
    created_at: '2026-04-16T09:15:00Z',
  },
  {
    id: 'AUD-003', action: 'ASSIGN', resourceType: 'ticket', resourceId: 'TKT-006',
    userId: 'USR-002', userName: 'Priya Sharma', organizationId: 'ORG-003',
    changes: { assignedTo: { from: null, to: 'USR-008' } },
    ipAddress: '10.0.0.12',
    created_at: '2026-04-16T11:02:00Z',
  },
  {
    id: 'AUD-004', action: 'UPDATE', resourceType: 'organization', resourceId: 'ORG-005',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: { isActive: { from: true, to: false } },
    metadata: { reason: 'Contract terminated per client request' },
    ipAddress: '192.168.1.45',
    created_at: '2026-04-15T16:00:00Z',
  },
  {
    id: 'AUD-005', action: 'UPDATE', resourceType: 'routing_rule', resourceId: 'RR-001',
    userId: 'USR-006', userName: 'Nina Patel', organizationId: 'ORG-001',
    changes: { condition: { from: 'priority = CRITICAL', to: 'priority IN (CRITICAL, HIGH)' } },
    ipAddress: '10.0.0.88',
    created_at: '2026-04-15T14:30:00Z',
  },
  {
    id: 'AUD-006', action: 'CREATE', resourceType: 'user', resourceId: 'USR-008',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: { role: { from: null, to: 'AGENT' }, email: { from: null, to: 'yuki.tanaka@3sc.com' } },
    ipAddress: '192.168.1.45',
    created_at: '2026-04-15T09:00:00Z',
  },
  {
    id: 'AUD-007', action: 'STATUS_CHANGE', resourceType: 'ticket', resourceId: 'TKT-018',
    userId: 'USR-004', userName: 'Sara Chen', organizationId: 'ORG-002',
    changes: { status: { from: 'IN_PROGRESS', to: 'RESOLVED' } },
    ipAddress: '10.0.0.55',
    created_at: '2026-04-11T16:00:00Z',
  },
  {
    id: 'AUD-008', action: 'DELETE', resourceType: 'user', resourceId: 'USR-007',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: { isActive: { from: true, to: false } },
    metadata: { reason: 'Left company 2026-01-08' },
    ipAddress: '192.168.1.45',
    created_at: '2026-01-10T11:00:00Z',
  },
  {
    id: 'AUD-009', action: 'UPDATE', resourceType: 'ticket', resourceId: 'TKT-023',
    userId: 'USR-006', userName: 'Nina Patel', organizationId: 'ORG-001',
    changes: { priority: { from: 'LOW', to: 'MEDIUM' }, assignedTo: { from: null, to: 'USR-001' } },
    ipAddress: '10.0.0.88',
    created_at: '2026-04-15T14:05:00Z',
  },
  {
    id: 'AUD-010', action: 'LOGIN', resourceType: 'user', resourceId: 'USR-001',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: undefined,
    metadata: { method: 'email_password', device: 'Chrome 124 / macOS 14' },
    ipAddress: '192.168.1.45',
    created_at: '2026-04-16T08:14:00Z',
  },
  {
    id: 'AUD-011', action: 'CREATE', resourceType: 'routing_rule', resourceId: 'RR-004',
    userId: 'USR-002', userName: 'Priya Sharma', organizationId: 'ORG-001',
    changes: { name: { from: null, to: 'Billing → Billing Queue' }, isActive: { from: null, to: true } },
    ipAddress: '10.0.0.12',
    created_at: '2026-04-14T11:00:00Z',
  },
  {
    id: 'AUD-012', action: 'UPDATE', resourceType: 'organization', resourceId: 'ORG-002',
    userId: 'USR-001', userName: 'Alex Morgan', organizationId: 'ORG-001',
    changes: { plan: { from: 'Pro', to: 'Business' } },
    metadata: { invoiceRef: 'INV-2026-0341' },
    ipAddress: '192.168.1.45',
    created_at: '2026-03-01T10:00:00Z',
  },
];

// ─── 8. AI SUGGESTIONS ───────────────────────────────────────────────────────

type TicketAISuggestions = {
  classification: AISuggestion<AIClassificationSuggestion>;
  priority:       AISuggestion<AIPrioritySuggestion>;
  routing:        AISuggestion<AIRoutingSuggestion>;
  reply:          AISuggestion<AIReplySuggestion>;
  summary:        AISuggestion<AISummarySuggestion>;
  eta:            AISuggestion<AIETASuggestion>;
};

export const MOCK_AI_SUGGESTIONS: Record<string, TicketAISuggestions> = {
  'TKT-001': {
    classification: {
      id: 'AIS-001-cls', type: AISuggestionType.CLASSIFICATION, ticketId: 'TKT-001',
      confidence: 0.97, status: AISuggestionStatus.ACCEPTED,
      suggestion: { category: TicketCategory.INCIDENT, subcategory: 'Database / Connection Exhaustion', confidence: 0.97 },
      reasoning: 'Ticket contains keywords: "database cluster", "connection timeout", "503", "FATAL: remaining connection slots". Matches INCIDENT pattern with 97% confidence.',
      created_at: '2026-04-16T03:45:00Z',
    },
    priority: {
      id: 'AIS-001-pri', type: AISuggestionType.PRIORITY, ticketId: 'TKT-001',
      confidence: 0.99, status: AISuggestionStatus.ACCEPTED,
      suggestion: { priority: TicketPriority.CRITICAL, factors: ['15,000 active users affected', 'Production environment', 'No workaround available', 'Revenue-impacting'], confidence: 0.99 },
      created_at: '2026-04-16T03:45:00Z',
    },
    routing: {
      id: 'AIS-001-rte', type: AISuggestionType.ROUTING, ticketId: 'TKT-001',
      confidence: 0.91, status: AISuggestionStatus.ACCEPTED,
      suggestion: {
        agentId: 'USR-002', agentName: 'Priya Sharma', teamName: 'Infrastructure',
        reason: 'Priya Sharma has the most recent resolved incidents involving PostgreSQL (3 in last 90 days) and is currently available.',
        confidence: 0.91,
        alternativeAgents: [
          { agentId: 'USR-006', agentName: 'Nina Patel', confidence: 0.74 },
        ],
      },
      created_at: '2026-04-16T03:45:00Z',
    },
    reply: {
      id: 'AIS-001-rpl', type: AISuggestionType.REPLY, ticketId: 'TKT-001',
      confidence: 0.88, status: AISuggestionStatus.ACCEPTED,
      suggestion: {
        content: `Hi David,\n\nThank you for raising this immediately. I've acknowledged the incident and escalated to our database operations team.\n\nBased on the CloudWatch metrics and logs you've shared, I can see this is a connection pool exhaustion issue. The "remaining connection slots are reserved" error indicates your PostgreSQL max_connections limit has been hit.\n\nCould you confirm what was deployed between 03:00–03:44 UTC? This will help us identify the root cause faster.\n\nI'm now in your incident channel and will provide updates every 10 minutes until resolved.\n\nPriya Sharma\nLead Support Engineer, 3SC`,
        tone: 'professional', confidence: 0.88,
      },
      created_at: '2026-04-16T03:45:00Z',
    },
    summary: {
      id: 'AIS-001-sum', type: AISuggestionType.SUMMARY, ticketId: 'TKT-001',
      confidence: 0.95, status: AISuggestionStatus.PENDING,
      suggestion: {
        summary: 'Critical production outage at Acme Corp caused by PostgreSQL connection pool exhaustion after a pool config change. 15,000 users affected. Priya Sharma is leading the response. A pgbouncer patch was applied and the client rolled back their config change, restoring service at 04:48 UTC. SLA breached on resolution.',
        keyPoints: [
          'Root cause: connection pool size increased from 50 to 200/node, exhausting max_connections',
          'Fix: pgbouncer config patch + client rollback',
          'Resolution time: ~65 minutes (SLA was 4h — breached due to SLA start time)',
          'No data loss confirmed',
        ],
        sentiment: 'negative', confidence: 0.95,
      },
      created_at: '2026-04-16T09:00:00Z',
    },
    eta: {
      id: 'AIS-001-eta', type: AISuggestionType.ETA, ticketId: 'TKT-001',
      confidence: 0.82, status: AISuggestionStatus.PENDING,
      suggestion: {
        estimatedHours: 2, confidence: 0.82,
        factors: ['CRITICAL priority', 'Infrastructure team engaged', 'Root cause identified', 'Similar incidents resolved avg 1.8h'],
        range: { low: 0.5, high: 4 },
      },
      created_at: '2026-04-16T03:45:00Z',
    },
  },

  'TKT-002': {
    classification: {
      id: 'AIS-002-cls', type: AISuggestionType.CLASSIFICATION, ticketId: 'TKT-002',
      confidence: 0.94, status: AISuggestionStatus.PENDING,
      suggestion: { category: TicketCategory.BUG, subcategory: 'Payments / API Key Permissions', confidence: 0.94 },
      reasoning: 'Keywords: "Stripe", "card_declined", "generic_decline", "payment intents". Classified as BUG / Payments.',
      created_at: '2026-04-16T14:33:00Z',
    },
    priority: {
      id: 'AIS-002-pri', type: AISuggestionType.PRIORITY, ticketId: 'TKT-002',
      confidence: 0.98, status: AISuggestionStatus.PENDING,
      suggestion: { priority: TicketPriority.CRITICAL, factors: ['Direct revenue impact £4,200/hr', 'All payment types affected', 'No workaround'], confidence: 0.98 },
      created_at: '2026-04-16T14:33:00Z',
    },
    routing: {
      id: 'AIS-002-rte', type: AISuggestionType.ROUTING, ticketId: 'TKT-002',
      confidence: 0.86, status: AISuggestionStatus.ACCEPTED,
      suggestion: {
        agentId: 'USR-003', agentName: 'James Okafor',
        reason: 'James has previously resolved 2 Stripe-related issues for TechWave IO and is familiar with their payment integration.',
        confidence: 0.86,
        alternativeAgents: [{ agentId: 'USR-004', agentName: 'Sara Chen', confidence: 0.65 }],
      },
      created_at: '2026-04-16T14:33:00Z',
    },
    reply: {
      id: 'AIS-002-rpl', type: AISuggestionType.REPLY, ticketId: 'TKT-002',
      confidence: 0.91, status: AISuggestionStatus.PENDING,
      suggestion: {
        content: `Hi Ben,\n\nThank you for the detailed report and for pausing your campaigns — that was the right call.\n\nI have identified the root cause: our infrastructure team rotated the Stripe API key today and the replacement key was issued with insufficient permissions (missing charges:write scope). We are correcting this now and expect resolution within 30 minutes.\n\nI'll update you as soon as payments are processing again.\n\nJames Okafor\nSupport Engineer, 3SC`,
        tone: 'professional', confidence: 0.91,
      },
      created_at: '2026-04-16T15:02:00Z',
    },
    summary: {
      id: 'AIS-002-sum', type: AISuggestionType.SUMMARY, ticketId: 'TKT-002',
      confidence: 0.92, status: AISuggestionStatus.PENDING,
      suggestion: {
        summary: 'All Stripe payment processing is failing for TechWave IO due to an API key rotation that produced a key with insufficient permissions. James Okafor identified the root cause and is issuing a corrected key. Revenue impact: ~£4,200/hr.',
        keyPoints: ['Root cause: Stripe API key missing charges:write permission after rotation', 'All payment types affected since 14:28 UTC', 'Fix in progress — ETA 30 min', 'Revenue impact: ~£4,200/hr'],
        sentiment: 'negative', confidence: 0.92,
      },
      created_at: '2026-04-16T15:10:00Z',
    },
    eta: {
      id: 'AIS-002-eta', type: AISuggestionType.ETA, ticketId: 'TKT-002',
      confidence: 0.88, status: AISuggestionStatus.PENDING,
      suggestion: { estimatedHours: 1, confidence: 0.88, factors: ['Root cause identified', 'Fix is straightforward key replacement', 'No deployment required'], range: { low: 0.25, high: 2 } },
      created_at: '2026-04-16T15:10:00Z',
    },
  },

  'TKT-003': {
    classification: {
      id: 'AIS-003-cls', type: AISuggestionType.CLASSIFICATION, ticketId: 'TKT-003',
      confidence: 0.96, status: AISuggestionStatus.ACCEPTED,
      suggestion: { category: TicketCategory.BUG, subcategory: 'Authentication / SSO / SAML', confidence: 0.96 },
      created_at: '2026-04-14T11:01:00Z',
    },
    priority: {
      id: 'AIS-003-pri', type: AISuggestionType.PRIORITY, ticketId: 'TKT-003',
      confidence: 0.93, status: AISuggestionStatus.ACCEPTED,
      suggestion: { priority: TicketPriority.HIGH, factors: ['340 users cannot log in', 'Business hours impact', 'Cert rotation is a known-fixable root cause'], confidence: 0.93 },
      created_at: '2026-04-14T11:01:00Z',
    },
    routing: {
      id: 'AIS-003-rte', type: AISuggestionType.ROUTING, ticketId: 'TKT-003',
      confidence: 0.88, status: AISuggestionStatus.ACCEPTED,
      suggestion: {
        agentId: 'USR-004', agentName: 'Sara Chen',
        reason: 'Sara resolved TKT-018 (Azure AD 2FA issue) for Acme Corp and is familiar with their SSO configuration.',
        confidence: 0.88,
        alternativeAgents: [{ agentId: 'USR-002', agentName: 'Priya Sharma', confidence: 0.72 }],
      },
      created_at: '2026-04-14T11:01:00Z',
    },
    reply: {
      id: 'AIS-003-rpl', type: AISuggestionType.REPLY, ticketId: 'TKT-003',
      confidence: 0.89, status: AISuggestionStatus.ACCEPTED,
      suggestion: {
        content: `Hi David,\n\nThank you for the context on the certificate rotation. I can confirm this is a known issue when IdP certificates are rotated without updating the SP metadata.\n\nTo fix this, please provide the updated Azure AD Federation Metadata XML:\n1. Go to Azure Portal → Enterprise Applications → [Your App] → Single sign-on\n2. Click "Download Federation Metadata XML"\n3. Attach the file to this ticket\n\nOnce I receive it, I can update the SP configuration and your users should be able to log in within minutes.\n\nSara Chen\nSupport Engineer, 3SC`,
        tone: 'professional', confidence: 0.89,
      },
      created_at: '2026-04-14T12:25:00Z',
    },
    summary: {
      id: 'AIS-003-sum', type: AISuggestionType.SUMMARY, ticketId: 'TKT-003',
      confidence: 0.93, status: AISuggestionStatus.PENDING,
      suggestion: {
        summary: 'Acme Corp rotated their Azure AD signing certificate but did not update the SP metadata on the Meridian side. 340 SSO users are locked out. Sara Chen requested the new metadata XML, which the client has provided. SP config update is in progress.',
        keyPoints: ['340 users locked out of SSO login', 'Root cause: stale SP certificate after IdP rotation', 'New metadata XML received from client', 'SP config update in progress'],
        sentiment: 'neutral', confidence: 0.93,
      },
      created_at: '2026-04-16T08:45:00Z',
    },
    eta: {
      id: 'AIS-003-eta', type: AISuggestionType.ETA, ticketId: 'TKT-003',
      confidence: 0.85, status: AISuggestionStatus.PENDING,
      suggestion: { estimatedHours: 2, confidence: 0.85, factors: ['Metadata XML received', 'SP config update straightforward', 'Testing required'], range: { low: 1, high: 4 } },
      created_at: '2026-04-16T08:45:00Z',
    },
  },
};

/** Fallback AI suggestions for any ticket not in MOCK_AI_SUGGESTIONS */
export function DEFAULT_AI_SUGGESTIONS(ticketId: string): TicketAISuggestions {
  const ticket = MOCK_TICKETS.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
  return {
    classification: {
      id: `AIS-${ticketId}-cls`, type: AISuggestionType.CLASSIFICATION, ticketId,
      confidence: 0.78, status: AISuggestionStatus.PENDING,
      suggestion: { category: ticket?.category ?? TicketCategory.SUPPORT, subcategory: 'General', confidence: 0.78 },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
    priority: {
      id: `AIS-${ticketId}-pri`, type: AISuggestionType.PRIORITY, ticketId,
      confidence: 0.72, status: AISuggestionStatus.PENDING,
      suggestion: { priority: ticket?.priority ?? TicketPriority.MEDIUM, factors: ['Based on ticket content analysis'], confidence: 0.72 },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
    routing: {
      id: `AIS-${ticketId}-rte`, type: AISuggestionType.ROUTING, ticketId,
      confidence: 0.65, status: AISuggestionStatus.PENDING,
      suggestion: { agentId: 'USR-003', agentName: 'James Okafor', reason: 'Available agent with relevant skill set.', confidence: 0.65, alternativeAgents: [] },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
    reply: {
      id: `AIS-${ticketId}-rpl`, type: AISuggestionType.REPLY, ticketId,
      confidence: 0.70, status: AISuggestionStatus.PENDING,
      suggestion: { content: `Thank you for reaching out to 3SC Support.\n\nI have reviewed your ticket and will investigate this issue. I will provide you with an update within our SLA response window.\n\nIf you have any additional information that might help, please reply to this ticket.\n\nBest regards,\n3SC Support Team`, tone: 'professional', confidence: 0.70 },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
    summary: {
      id: `AIS-${ticketId}-sum`, type: AISuggestionType.SUMMARY, ticketId,
      confidence: 0.68, status: AISuggestionStatus.PENDING,
      suggestion: { summary: ticket?.description?.slice(0, 200) ?? 'No summary available.', keyPoints: [], sentiment: 'neutral', confidence: 0.68 },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
    eta: {
      id: `AIS-${ticketId}-eta`, type: AISuggestionType.ETA, ticketId,
      confidence: 0.55, status: AISuggestionStatus.PENDING,
      suggestion: { estimatedHours: 8, confidence: 0.55, factors: ['Standard support ticket', 'Medium complexity estimated'], range: { low: 2, high: 24 } },
      created_at: ticket?.created_at ?? new Date().toISOString(),
    },
  };
}

// ─── 9. AI SEARCH ────────────────────────────────────────────────────────────

export const MOCK_AI_SEARCH_RESULTS: Record<string, AISearchResult> = {
  'database postgres': {
    query: 'database postgres',
    results: [
      { id: 'TKT-001', type: 'ticket', title: 'Production database cluster unresponsive — all queries timing out', excerpt: 'PostgreSQL cluster stopped responding. Connection pool exhaustion, CPU 98%, max_connections hit.', similarity: 0.97 },
      { id: 'KB-012', type: 'article', title: 'Troubleshooting PostgreSQL connection pool exhaustion', excerpt: 'Step-by-step guide to diagnosing and resolving max_connections errors in PostgreSQL with pgbouncer.', similarity: 0.89 },
      { id: 'KB-019', type: 'article', title: 'Best practices for PostgreSQL in high-traffic environments', excerpt: 'Connection pooling, read replicas, and monitoring strategies for production PostgreSQL.', similarity: 0.82 },
      { id: 'TKT-019', type: 'ticket', title: 'Analytics dashboard charts not rendering in Safari 17', excerpt: 'The data loads in DevTools but SVG canvas is 0×0. Unrelated but matched on "dashboard" keyword.', similarity: 0.41 },
    ],
  },
  'sso saml azure': {
    query: 'sso saml azure',
    results: [
      { id: 'TKT-003', type: 'ticket', title: 'SSO/SAML login broken for all Azure AD users after cert rotation', excerpt: 'SAML signature validation failed — certificate thumbprint mismatch after IdP cert rotation.', similarity: 0.98 },
      { id: 'KB-005', type: 'article', title: 'Configuring Azure AD SAML SSO with Meridian', excerpt: 'Complete guide to setting up and maintaining Azure AD as an IdP for Meridian customer portal.', similarity: 0.94 },
      { id: 'TKT-018', type: 'ticket', title: '2FA SMS codes not delivered to +44 UK numbers', excerpt: 'Authentication issue for UK users — different root cause but shares authentication domain.', similarity: 0.52 },
      { id: 'KB-007', type: 'article', title: 'How to rotate IdP certificates without disrupting SSO', excerpt: 'Step-by-step procedure to rotate signing certificates in Azure AD and update SP metadata.', similarity: 0.91 },
    ],
  },
  'payment stripe': {
    query: 'payment stripe',
    results: [
      { id: 'TKT-002', type: 'ticket', title: 'Payment processing failing for all Stripe transactions — revenue impact', excerpt: 'All Stripe payment intents failing with card_declined. Revenue impact £4,200/hr.', similarity: 0.99 },
      { id: 'KB-021', type: 'article', title: 'Stripe API key management and permission scopes', excerpt: 'Guide to creating and rotating Stripe API keys with correct permission scopes for charges and webhooks.', similarity: 0.88 },
      { id: 'KB-023', type: 'article', title: 'Debugging Stripe webhook failures', excerpt: 'How to diagnose 400/401 responses from Stripe webhooks and verify endpoint configurations.', similarity: 0.76 },
    ],
  },
  'sla breach': {
    query: 'sla breach',
    results: [
      { id: 'TKT-001', type: 'ticket', title: 'Production database cluster unresponsive', excerpt: 'SLA breached on resolution — ticket exceeded 4-hour resolution SLA.', similarity: 0.91 },
      { id: 'KB-003', type: 'article', title: 'Understanding SLA breach escalation procedures', excerpt: 'What happens when an SLA is breached, notification workflows, and escalation paths.', similarity: 0.87 },
      { id: 'TKT-012', type: 'ticket', title: 'Custom SLA policy not applied when ticket is re-opened', excerpt: 'SLA policy reapplication bug after ticket reopen leading to incorrect breach alerts.', similarity: 0.79 },
    ],
  },
  'export csv': {
    query: 'export csv',
    results: [
      { id: 'TKT-016', type: 'ticket', title: 'How do I export SLA compliance data to CSV for board reporting?', excerpt: 'Question about CSV export availability in Business plan.', similarity: 0.95 },
      { id: 'KB-014', type: 'article', title: 'Exporting analytics data from Meridian', excerpt: 'How to export ticket volume, SLA compliance, and agent performance reports as CSV or PDF.', similarity: 0.92 },
      { id: 'TKT-005', type: 'ticket', title: 'Bulk data export stuck at 0% for exports > 10,000 rows', excerpt: 'Export job freezes at 0% for large datasets — bug in export queue.', similarity: 0.71 },
    ],
  },
};

export function defaultSearchResult(query: string): AISearchResult {
  // Return the most semantically-related tickets from the full list
  return {
    query,
    results: MOCK_TICKETS.slice(0, 4).map((t) => ({
      id: t.id, type: 'ticket' as const,
      title: t.title,
      excerpt: t.description.slice(0, 140) + '…',
      similarity: Math.random() * 0.3 + 0.5,
    })),
  };
}

// ─── 10. NOTIFICATIONS ───────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOT-001', userId: 'USR-002',
    type: NotificationType.SLA_BREACHED,
    title: 'SLA Breached — TKT-001',
    message: 'Ticket TKT-001 "Production database cluster unresponsive" has breached its resolution SLA.',
    isRead: false, resourceType: 'ticket', resourceId: 'TKT-001',
    created_at: '2026-04-16T07:45:00Z',
  },
  {
    id: 'NOT-002', userId: 'USR-003',
    type: NotificationType.TICKET_ASSIGNED,
    title: 'New ticket assigned to you',
    message: 'TKT-002 "Payment processing failing for all Stripe transactions" has been assigned to you.',
    isRead: false, resourceType: 'ticket', resourceId: 'TKT-002',
    created_at: '2026-04-16T14:33:00Z',
  },
  {
    id: 'NOT-003', userId: 'USR-002',
    type: NotificationType.TICKET_MENTION,
    title: 'You were mentioned in TKT-002',
    message: 'James Okafor mentioned you in an internal note on TKT-002.',
    isRead: false, resourceType: 'ticket', resourceId: 'TKT-002',
    created_at: '2026-04-16T15:02:00Z',
  },
  {
    id: 'NOT-004', userId: 'USR-002',
    type: NotificationType.SLA_AT_RISK,
    title: 'SLA At Risk — TKT-003',
    message: 'Ticket TKT-003 "SSO/SAML login broken for Azure AD users" resolution SLA is at risk. 2h 15min remaining.',
    isRead: true, resourceType: 'ticket', resourceId: 'TKT-003',
    created_at: '2026-04-16T07:45:00Z',
  },
  {
    id: 'NOT-005', userId: 'USR-001',
    type: NotificationType.TICKET_COMMENT,
    title: 'New comment on TKT-022',
    message: 'Priya Sharma left an internal note on TKT-022 "Onboarding: Sunrise Healthcare".',
    isRead: true, resourceType: 'ticket', resourceId: 'TKT-022',
    created_at: '2026-04-16T07:55:00Z',
  },
  {
    id: 'NOT-006', userId: 'USR-003',
    type: NotificationType.TICKET_STATUS_CHANGED,
    title: 'TKT-016 marked as Resolved',
    message: 'Ticket TKT-016 "How do I export SLA compliance data?" has been resolved.',
    isRead: true, resourceType: 'ticket', resourceId: 'TKT-016',
    created_at: '2026-04-12T10:00:00Z',
  },
  {
    id: 'NOT-007', userId: 'USR-004',
    type: NotificationType.TICKET_ASSIGNED,
    title: 'New ticket assigned to you',
    message: 'TKT-009 "Bulk ticket reassignment fails with 50+ tickets" has been assigned to you.',
    isRead: false, resourceType: 'ticket', resourceId: 'TKT-009',
    created_at: '2026-04-16T07:10:00Z',
  },
  {
    id: 'NOT-008', userId: 'USR-001',
    type: NotificationType.SYSTEM,
    title: 'New Enterprise client onboarded',
    message: 'Sunrise Healthcare (ORG-007) has been provisioned. Onboarding ticket TKT-022 is in progress.',
    isRead: true, resourceType: 'organization', resourceId: 'ORG-007',
    created_at: '2026-04-14T09:05:00Z',
  },
];

// ─── 11. ROUTING RULES ───────────────────────────────────────────────────────

export const MOCK_ROUTING_RULES: RoutingRule[] = [
  {
    id: 'RR-001',
    name: 'Critical → Lead Agent',
    description: 'All CRITICAL and HIGH tickets are immediately routed to the on-call Lead agent.',
    conditions: [{ field: 'priority', operator: 'in', value: ['CRITICAL', 'HIGH'] }],
    assignTo: 'USR-002',
    priority: 1,
    isActive: true,
    created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'RR-002',
    name: 'Billing → James Okafor',
    description: 'Billing category tickets assigned to James who handles all payment-related issues.',
    conditions: [{ field: 'category', operator: 'equals', value: 'BILLING' }],
    assignTo: 'USR-003',
    priority: 2,
    isActive: true,
    created_at: '2025-08-01T00:00:00Z',
  },
  {
    id: 'RR-003',
    name: 'Unassigned → Round Robin',
    description: 'Tickets without an assignee after 15 minutes are distributed round-robin to available agents.',
    conditions: [{ field: 'assignedTo', operator: 'equals', value: 'null' }],
    assignTo: 'USR-003',
    priority: 10,
    isActive: true,
    created_at: '2025-09-01T00:00:00Z',
  },
  {
    id: 'RR-004',
    name: 'Incident → Nina Patel',
    description: 'INCIDENT category tickets escalated directly to lead Nina Patel.',
    conditions: [{ field: 'category', operator: 'equals', value: 'INCIDENT' }],
    assignTo: 'USR-006',
    priority: 3,
    isActive: true,
    created_at: '2026-04-14T11:00:00Z',
  },
  {
    id: 'RR-005',
    name: 'Global Finance — SLA Override',
    description: 'All tickets from Global Finance Group (ORG-004) use the 1-hour response SLA regardless of category.',
    conditions: [{ field: 'organizationId', operator: 'equals', value: 'ORG-004' }],
    assignTo: 'USR-006',
    priority: 5,
    isActive: false,
    created_at: '2026-02-01T00:00:00Z',
  },
];

// ─── PERSONA MAP (switch active user in handler.ts) ───────────────────────────
// ADMIN:  USR-001 / alex.morgan@3sc.com  — full access, audit log visible
// LEAD:   USR-002 / priya.sharma@3sc.com — assign, SLA config, reports
// AGENT:  USR-003 / james.okafor@3sc.com — tickets + comments, no admin pages
export const MOCK_PERSONAS = {
  ADMIN: MOCK_USERS[0],
  LEAD:  MOCK_USERS[1],
  AGENT: MOCK_USERS[2],
};

// ─── 12. KNOWLEDGE BASE ───────────────────────────────────────────────────────

export const MOCK_KB_CATEGORIES: KBCategory[] = [
  {
    id: 'KBC-001',
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'New to Meridian? Start here for setup guides and onboarding walkthroughs.',
    articleCount: 4,
  },
  {
    id: 'KBC-002',
    name: 'Account & Billing',
    slug: 'account-billing',
    description: 'Manage your subscription, invoices, payment methods, and account settings.',
    articleCount: 3,
  },
  {
    id: 'KBC-003',
    name: 'Tickets & Workflows',
    slug: 'tickets-workflows',
    description: 'Learn how to create, manage, and track support tickets effectively.',
    articleCount: 3,
  },
  {
    id: 'KBC-004',
    name: 'Integrations',
    slug: 'integrations',
    description: 'Connect Meridian with Slack, Jira, GitHub, and other tools your team uses.',
    articleCount: 2,
  },
  {
    id: 'KBC-005',
    name: 'Security & Compliance',
    slug: 'security-compliance',
    description: 'Data privacy, SSO, audit logs, and compliance certifications.',
    articleCount: 2,
  },
  {
    id: 'KBC-006',
    name: 'Troubleshooting',
    slug: 'troubleshooting',
    description: 'Common issues, error codes, and step-by-step resolution guides.',
    articleCount: 2,
  },
];

export const MOCK_KB_ARTICLES: KBArticle[] = [
  // ── Getting Started ─────────────────────────────────────────────
  {
    id: 'KBA-001',
    title: 'How to create your first support ticket',
    slug: 'create-first-ticket',
    categoryId: 'KBC-001',
    category: MOCK_KB_CATEGORIES[0],
    excerpt: 'Step-by-step guide to submitting a support request and setting the right priority so our team can help you faster.',
    content: `Creating a support ticket is the fastest way to get help from our team. Follow these steps to submit your first request.

## Step 1 — Log in to the Customer Portal

Navigate to your organisation's Meridian portal and sign in with your credentials. If you haven't received your invite email, contact your organisation admin.

## Step 2 — Click "New Ticket"

From the Dashboard, click the **New Ticket** button in the top-right corner, or navigate to Tickets → New Ticket from the sidebar.

## Step 3 — Fill in the details

- **Subject** — Write a clear, specific title. "Login page error on Chrome" is better than "It's broken".
- **Description** — Explain what you expected to happen and what actually happened. Include steps to reproduce if it's a bug.
- **Priority** — Choose the impact level: Low (minor inconvenience), Medium (affects your work), High (blocking critical tasks), Critical (full outage).
- **Category** — Pick the closest match. Our AI will also suggest one based on your description.

## Step 4 — Attach files (optional)

Screenshots, logs, or recordings help our agents resolve your issue faster. Drag and drop files or click the attachment icon.

## Step 5 — Submit

Click **Submit Ticket**. You'll receive a confirmation email with your ticket number (e.g. TKT-042). You can track progress in the Tickets tab.

## Tips for faster resolution

- Check the Knowledge Base before submitting — your question may already be answered.
- Mention your browser, OS, and any recent changes if reporting a technical issue.
- Use @mentions in comments to tag specific agents you've worked with before.`,
    tags: ['tickets', 'getting started', 'submit', 'new ticket'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 1842,
    helpfulCount: 314,
    relatedArticleIds: ['KBA-002', 'KBA-007'],
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2026-03-15T11:20:00Z',
  },
  {
    id: 'KBA-002',
    title: 'Understanding ticket statuses and what they mean',
    slug: 'ticket-statuses',
    categoryId: 'KBC-001',
    category: MOCK_KB_CATEGORIES[0],
    excerpt: 'A breakdown of every ticket status — Open, Acknowledged, In Progress, Resolved, and Closed — and what action (if any) is needed from you.',
    content: `Each ticket in Meridian moves through a defined lifecycle. Here's what every status means and what you should do at each stage.

## Open
Your ticket has been received and is in the queue. Our team hasn't picked it up yet. No action needed from you — we'll reach out soon.

## Acknowledged
An agent has read your ticket and confirmed it's been understood. They may ask clarifying questions before starting work.

## In Progress
Active work is underway. You may receive updates via comments. Feel free to add information if something changes on your end.

## Resolved
Our agent believes the issue has been fixed. You have **72 hours** to confirm. If the fix works, mark it as Closed. If the problem persists, reopen it with details.

## Closed
The ticket is complete. Closed tickets can still be viewed and referenced, but cannot be commented on. You can reopen a closed ticket within 30 days if the issue recurs.

## SLA states
Each ticket also tracks SLA (Service Level Agreement) compliance:
- **On Track** — within response and resolution deadlines
- **At Risk** — approaching the deadline
- **Breached** — deadline passed without resolution
- **Met** — resolved within the agreed timeframe

You can see the SLA state on the ticket detail page.`,
    tags: ['status', 'workflow', 'sla', 'lifecycle'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 1203,
    helpfulCount: 198,
    relatedArticleIds: ['KBA-001', 'KBA-003'],
    created_at: '2025-09-05T10:00:00Z',
    updated_at: '2026-02-20T08:45:00Z',
  },
  {
    id: 'KBA-003',
    title: 'How to invite team members to your organisation',
    slug: 'invite-team-members',
    categoryId: 'KBC-001',
    category: MOCK_KB_CATEGORIES[0],
    excerpt: 'CLIENT_ADMIN users can invite colleagues via email. Invited users receive a setup link valid for 48 hours.',
    content: `If you're a Client Admin, you can invite colleagues to join your organisation in Meridian so they can create and view tickets.

## Requirements
- You must have the **Client Admin** role. Regular users cannot invite others.
- Invitees will receive a role of **Client User** by default. You can adjust this after they accept.

## Steps to invite

1. Navigate to **Team Management** in the sidebar.
2. Click **Invite Member**.
3. Enter the person's email address and optionally customise their role.
4. Click **Send Invite**.

The invitee receives an email with a secure setup link. The link expires after **48 hours**. If it expires, you can resend from the Team Management page.

## Managing pending invites
Pending invites are shown with a "Pending" badge in the team list. You can cancel an invite before it's accepted by clicking the kebab menu next to the invite.

## Roles available
- **Client User** — can create and view their own tickets
- **Client Admin** — full org access, can manage members and view all org tickets`,
    tags: ['invite', 'team', 'admin', 'members'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 876,
    helpfulCount: 142,
    relatedArticleIds: ['KBA-001'],
    created_at: '2025-09-10T12:00:00Z',
    updated_at: '2026-01-18T09:00:00Z',
  },
  {
    id: 'KBA-004',
    title: 'Setting up two-factor authentication (2FA)',
    slug: 'two-factor-auth',
    categoryId: 'KBC-001',
    category: MOCK_KB_CATEGORIES[0],
    excerpt: 'Secure your account with TOTP-based 2FA using apps like Google Authenticator or Authy.',
    content: `Two-factor authentication adds a second layer of security to your Meridian account. We strongly recommend enabling it.

## Supported authenticator apps
- Google Authenticator
- Authy
- Microsoft Authenticator
- 1Password

## How to enable 2FA

1. Go to your **Account Settings** (click your avatar → Settings).
2. Under **Security**, click **Enable Two-Factor Authentication**.
3. Scan the QR code with your authenticator app.
4. Enter the 6-digit code from your app to confirm setup.
5. Save your **backup codes** in a secure location — you'll need them if you lose access to your app.

## Logging in with 2FA enabled
After entering your password, you'll be prompted for the 6-digit code from your authenticator app. Codes refresh every 30 seconds.

## Lost access to your authenticator?
Use one of your saved backup codes to log in, then reset 2FA from Account Settings. If you've lost both, contact your organisation admin or our support team.`,
    tags: ['security', '2fa', 'authentication', 'login'],
    authorId: 'USR-002',
    author: MOCK_USERS[1],
    isPublished: true,
    viewCount: 654,
    helpfulCount: 103,
    relatedArticleIds: ['KBA-010'],
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  // ── Account & Billing ───────────────────────────────────────────
  {
    id: 'KBA-005',
    title: 'How to download or reprint an invoice',
    slug: 'download-invoice',
    categoryId: 'KBC-002',
    category: MOCK_KB_CATEGORIES[1],
    excerpt: 'Find and download PDF invoices for any billing period from the Billing section of your Organisation Settings.',
    content: `All invoices for your Meridian subscription are available as downloadable PDFs directly from the portal.

## Accessing invoices

1. Navigate to **Organisation Settings** in the sidebar.
2. Click the **Billing** tab.
3. Scroll to the **Invoice History** section.
4. Click the **Download PDF** button next to any invoice.

Invoices are generated on the 1st of each month for the previous billing period.

## Invoice not appearing?

- Invoices typically appear within **2 business days** of the billing date.
- If a payment failed, the invoice may not be generated until the payment is retried and succeeds.
- Only **Client Admin** users can access billing information.

## Updating billing address or company details

Billing details (company name, VAT number, address) can be updated from the **Billing** tab. Changes apply to future invoices only — past invoices cannot be modified.

## Need a custom invoice format?

Contact our support team. We can provide invoices with specific PO numbers or line-item breakdowns for enterprise accounts.`,
    tags: ['billing', 'invoice', 'payment', 'subscription'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 921,
    helpfulCount: 187,
    relatedArticleIds: ['KBA-006'],
    created_at: '2025-09-15T10:00:00Z',
    updated_at: '2026-02-10T10:30:00Z',
  },
  {
    id: 'KBA-006',
    title: 'Upgrading or downgrading your subscription plan',
    slug: 'change-subscription',
    categoryId: 'KBC-002',
    category: MOCK_KB_CATEGORIES[1],
    excerpt: 'Change your plan at any time from Organisation Settings. Upgrades take effect immediately; downgrades at the next renewal date.',
    content: `Meridian offers four plans: **Starter**, **Growth**, **Business**, and **Enterprise**. You can change your plan at any time.

## Upgrading your plan

1. Go to **Organisation Settings → Billing**.
2. Click **Change Plan**.
3. Select the plan you want to upgrade to.
4. Review the prorated charge and confirm.

Upgrades take effect **immediately**. You'll be charged a prorated amount for the remainder of the current billing period.

## Downgrading your plan

Downgrades are scheduled for the **next renewal date**. Your current plan remains active until then. You'll receive a confirmation email when the downgrade is applied.

## What happens to my data if I downgrade?

- Data is never deleted when downgrading.
- Features not available on the lower plan will be locked (e.g. advanced analytics, custom routing rules), but data generated by those features is preserved.
- If member count exceeds the lower plan's limit, you'll be prompted to remove members before the downgrade takes effect.

## Enterprise plans

Enterprise pricing is custom. Contact our sales team for a quote. Enterprise plans include SLA guarantees, dedicated support, SSO, and custom data retention policies.`,
    tags: ['billing', 'plan', 'upgrade', 'downgrade', 'subscription'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 743,
    helpfulCount: 121,
    relatedArticleIds: ['KBA-005'],
    created_at: '2025-10-10T09:00:00Z',
    updated_at: '2026-01-25T11:00:00Z',
  },
  {
    id: 'KBA-007',
    title: 'Updating your payment method',
    slug: 'update-payment-method',
    categoryId: 'KBC-002',
    category: MOCK_KB_CATEGORIES[1],
    excerpt: 'Replace a credit card or switch to bank transfer from the Billing tab in Organisation Settings.',
    content: `You can update your payment method at any time without interrupting your service.

## Supported payment methods
- Credit / debit cards (Visa, Mastercard, Amex)
- SEPA Direct Debit (EU accounts)
- Bank transfer (Enterprise accounts only, by arrangement)

## How to update your card

1. Go to **Organisation Settings → Billing**.
2. Under **Payment Method**, click **Update Card**.
3. Enter your new card details.
4. Click **Save**.

The new card will be charged on your next billing date. The previous card is removed immediately.

## Failed payments

If a payment fails, we retry automatically after 3 days and again after 7 days. You'll receive an email notification each time. If payment fails after 3 attempts, your account enters a **grace period** of 14 days before access is restricted.

Update your payment method as soon as possible to avoid interruption.`,
    tags: ['billing', 'payment', 'card', 'bank transfer'],
    authorId: 'USR-002',
    author: MOCK_USERS[1],
    isPublished: true,
    viewCount: 589,
    helpfulCount: 94,
    relatedArticleIds: ['KBA-005', 'KBA-006'],
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2026-03-05T09:00:00Z',
  },
  // ── Tickets & Workflows ─────────────────────────────────────────
  {
    id: 'KBA-008',
    title: 'How to add attachments to a ticket',
    slug: 'ticket-attachments',
    categoryId: 'KBC-003',
    category: MOCK_KB_CATEGORIES[2],
    excerpt: 'Upload screenshots, logs, or documents directly to a ticket. Supported formats include PNG, JPG, PDF, and ZIP up to 25MB each.',
    content: `Attachments help our agents understand your issue faster. Here's how to add files to a ticket.

## During ticket creation

On the New Ticket form, drag and drop files onto the attachment area, or click the paperclip icon to browse your file system. You can attach up to **5 files** per submission.

## On an existing ticket

Open the ticket and scroll to the comment box. Attach files using the paperclip icon in the comment toolbar before submitting your comment. Attachments added to comments are visible to all parties.

## Supported file types
- Images: PNG, JPG, GIF, WebP
- Documents: PDF, DOCX, XLSX, CSV
- Archives: ZIP, TAR.GZ
- Logs: TXT, LOG

## Size limits
- Max 25MB per file
- Max 100MB total per ticket

## Viewing attachments

Attachments appear as clickable links in the ticket thread. Image files show a thumbnail preview. Other files download when clicked.

## Deleting attachments

You can delete your own attachments within **1 hour** of upload. After that, contact our support team if removal is required for compliance reasons.`,
    tags: ['attachments', 'files', 'upload', 'screenshots'],
    authorId: 'USR-002',
    author: MOCK_USERS[1],
    isPublished: true,
    viewCount: 1102,
    helpfulCount: 211,
    relatedArticleIds: ['KBA-001', 'KBA-002'],
    created_at: '2025-09-20T08:00:00Z',
    updated_at: '2026-02-28T10:00:00Z',
  },
  {
    id: 'KBA-009',
    title: 'Using @mentions in ticket comments',
    slug: 'mentions-in-comments',
    categoryId: 'KBC-003',
    category: MOCK_KB_CATEGORIES[2],
    excerpt: 'Tag agents or teammates in comments with @name to notify them directly and keep conversations focused.',
    content: `@mentions let you directly notify a specific person in a ticket comment, ensuring they see the message even if they're not actively watching the ticket.

## How to mention someone

While typing a comment, type **@** followed by the person's name. A dropdown will appear showing matching users. Click or press Enter to select.

Mentioned users receive an in-app notification and an email alert.

## Who can you mention?

- You can mention any member of your organisation or any agent assigned to your ticket.
- Internal notes (visible only to 3SC agents) allow agents to mention colleagues without the customer seeing the note.

## Tips for effective mentions

- Don't over-mention — reserve @mentions for when a specific person's attention is genuinely needed.
- You can mention multiple people in one comment: "@Alex can you review this? @Priya please reassign if needed."
- Mentions in resolved or closed tickets still send notifications, so the person is aware even if they revisit the thread.`,
    tags: ['mentions', 'comments', 'notifications', 'collaboration'],
    authorId: 'USR-003',
    author: MOCK_USERS[2],
    isPublished: true,
    viewCount: 678,
    helpfulCount: 134,
    relatedArticleIds: ['KBA-001', 'KBA-008'],
    created_at: '2025-10-15T11:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
  },
  // ── Integrations ────────────────────────────────────────────────
  {
    id: 'KBA-010',
    title: 'Connecting Meridian to Slack',
    slug: 'slack-integration',
    categoryId: 'KBC-004',
    category: MOCK_KB_CATEGORIES[3],
    excerpt: 'Receive ticket notifications directly in Slack channels and respond to updates without leaving Slack.',
    content: `The Meridian Slack integration sends real-time ticket notifications to your chosen Slack channels and allows agents to receive alerts without switching tools.

## Prerequisites

- You must be a **Client Admin** or internal **Admin** to set up the integration.
- Your Slack workspace must have permissions to install third-party apps.

## Setting up the integration

1. Go to **Organisation Settings → Integrations**.
2. Click **Connect** next to Slack.
3. You'll be redirected to Slack's OAuth consent page — click **Allow**.
4. Choose the default channel for ticket notifications.
5. Click **Save**.

## What gets posted to Slack

- New ticket created
- Ticket status changed
- Comment added (public comments only)
- SLA at-risk or breached alerts

## Customising notifications

You can configure which events trigger Slack messages, and set different channels for different event types (e.g. SLA breaches to #sla-alerts, new tickets to #support-inbox).

## Disconnecting

Go to **Organisation Settings → Integrations** and click **Disconnect** next to Slack. Existing notifications will stop immediately.`,
    tags: ['slack', 'integration', 'notifications', 'setup'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 812,
    helpfulCount: 156,
    relatedArticleIds: ['KBA-004'],
    created_at: '2025-11-15T09:00:00Z',
    updated_at: '2026-03-10T08:30:00Z',
  },
  // ── Security & Compliance ───────────────────────────────────────
  {
    id: 'KBA-011',
    title: 'Understanding data retention and deletion',
    slug: 'data-retention',
    categoryId: 'KBC-005',
    category: MOCK_KB_CATEGORIES[4],
    excerpt: 'How long Meridian stores your data, what gets deleted when you cancel, and how to request a full data export.',
    content: `Meridian takes data privacy seriously. This article explains our data retention policies and your options.

## What data we store

- Ticket content, comments, and attachments
- User account information and session logs
- Audit log entries
- Billing records (as required by law)

## Retention periods

| Data type | Retention period |
|---|---|
| Active ticket data | Until 2 years after closure |
| Deleted ticket data | 30 days in soft-delete, then purged |
| Audit logs | 5 years (compliance requirement) |
| Billing records | 7 years (legal requirement) |
| User accounts | Deleted on request, within 30 days |

## When you cancel your subscription

- Ticket and user data is retained for **90 days** after cancellation.
- You can request a full data export within this window.
- After 90 days, all data is permanently deleted (except billing records).

## Requesting a data export

Contact our support team or use the **Export Data** option in Organisation Settings. Exports are delivered as a ZIP archive within **5 business days**.

## GDPR and data subject requests

For data access, correction, or erasure requests under GDPR, submit a ticket with the category "Compliance". Our team handles these within **30 days** as required by law.`,
    tags: ['data', 'privacy', 'gdpr', 'retention', 'compliance'],
    authorId: 'USR-001',
    author: MOCK_USERS[0],
    isPublished: true,
    viewCount: 534,
    helpfulCount: 98,
    relatedArticleIds: ['KBA-010'],
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2026-02-15T14:00:00Z',
  },
  // ── Troubleshooting ─────────────────────────────────────────────
  {
    id: 'KBA-012',
    title: 'Troubleshooting login issues',
    slug: 'login-issues',
    categoryId: 'KBC-006',
    category: MOCK_KB_CATEGORIES[5],
    excerpt: 'Can\'t log in? Common causes include expired passwords, 2FA issues, and browser cookie settings. Here\'s how to fix them.',
    content: `If you're unable to log in to Meridian, work through the steps below to identify and resolve the issue.

## Forgotten password

Click **Forgot Password** on the login page and enter your email. A reset link will be sent (check your spam folder). The link expires after **1 hour**.

## 2FA code not working

- Make sure your authenticator app's clock is synchronised. Time drift of more than 30 seconds causes TOTP codes to fail.
- On iOS: Settings → General → Date & Time → Set Automatically.
- On Android: Settings → Date & Time → Automatic date & time.
- If you've lost access to your authenticator, use a backup code. If backup codes are also unavailable, contact your organisation admin to reset your 2FA.

## "Invalid credentials" error

- Check Caps Lock isn't on.
- Make sure you're using the correct email address — some users have multiple accounts with different providers.
- Your password may have been reset by an admin. Check your email for a reset notification.

## Browser-related issues

- Clear cookies and cached data for the Meridian domain.
- Disable browser extensions (especially ad blockers or script blockers) and try again.
- Try an incognito/private window to rule out extension conflicts.
- Supported browsers: Chrome 110+, Firefox 110+, Edge 110+, Safari 16+.

## Account locked

After 5 failed login attempts, accounts are locked for **15 minutes**. Wait and try again, or use the password reset flow.

## Still can't log in?

Submit a support ticket using the "I can't access my account" form on the login page — you don't need to be logged in to submit it.`,
    tags: ['login', 'password', '2fa', 'troubleshooting', 'access'],
    authorId: 'USR-002',
    author: MOCK_USERS[1],
    isPublished: true,
    viewCount: 2341,
    helpfulCount: 421,
    relatedArticleIds: ['KBA-004', 'KBA-011'],
    created_at: '2025-09-01T08:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'KBA-013',
    title: 'What to do if attachments fail to upload',
    slug: 'attachment-upload-issues',
    categoryId: 'KBC-006',
    category: MOCK_KB_CATEGORIES[5],
    excerpt: 'Upload failures are usually caused by file size limits, unsupported formats, or network issues. Here\'s how to diagnose and fix them.',
    content: `If an attachment fails to upload, the portal will show an error message. Here's how to resolve common upload issues.

## Check file size

Each file must be under **25MB**. The total per ticket is **100MB**. If your file is larger, try compressing it:
- Images: Use a tool like Squoosh or TinyPNG.
- Documents: Export PDFs with "Reduced File Size" if available.
- Archives: Split into multiple ZIPs.

## Check file format

Only supported file types are accepted (PNG, JPG, GIF, WebP, PDF, DOCX, XLSX, CSV, ZIP, TXT, LOG). If your file type isn't supported, contact support and we can arrange an alternative transfer method.

## Network issues

A slow or unstable connection can cause uploads to time out. Try:
- Switching from Wi-Fi to a wired connection.
- Pausing other large downloads while uploading.
- Trying a different network (e.g. mobile hotspot).

## Browser issues

- Disable browser extensions that may block file uploads.
- Try a different supported browser.
- Clear cache and cookies.

## Still failing?

If none of the above helps, note the exact error message shown and include it in a support ticket. Our team can investigate server-side upload logs to identify the root cause.`,
    tags: ['attachments', 'upload', 'troubleshooting', 'files', 'error'],
    authorId: 'USR-003',
    author: MOCK_USERS[2],
    isPublished: false,
    viewCount: 312,
    helpfulCount: 54,
    relatedArticleIds: ['KBA-008'],
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
  },
];

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'PRJ-001',
    name: 'Customer Support Platform',
    description: 'Building a scalable customer support system with AI-powered ticket routing and analytics dashboard.',
    scope: 'Deliver a multi-tenant SaaS support platform including ticket management, SLA enforcement, AI-assisted triage, and a customer-facing portal. Excludes mobile native apps and third-party integrations beyond email and webhooks.',
    status: 'active',
    organizationId: 'ORG-002',
    organization: MOCK_ORGANIZATIONS[1],
    leadId: 'USR-002',
    lead: MOCK_USERS[1],
    ticketCount: 56,
    openTicketCount: 14,
    resolvedThisWeek: 8,
    startDate: '2025-11-01T00:00:00Z',
    targetDate: '2026-05-15T00:00:00Z',
    milestones: [
      { id: 'MS-001', projectId: 'PRJ-001', title: 'Requirement Analysis', description: 'Gather and sign off on full requirements', dueDate: '2025-11-30T00:00:00Z', isCompleted: true, completedAt: '2025-11-28T00:00:00Z', deliverables: [] },
      { id: 'MS-002', projectId: 'PRJ-001', title: 'UI/UX Design', description: 'Figma prototypes approved by client', dueDate: '2026-01-15T00:00:00Z', isCompleted: true, completedAt: '2026-01-14T00:00:00Z', deliverables: [] },
      { id: 'MS-003', projectId: 'PRJ-001', title: 'Backend APIs', description: 'All REST endpoints live in staging', dueDate: '2026-03-31T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-004', projectId: 'PRJ-001', title: 'QA & UAT', description: 'End-to-end test pass + client UAT sign-off', dueDate: '2026-04-30T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-005', projectId: 'PRJ-001', title: 'Production Deployment', description: 'Go-live on client infrastructure', dueDate: '2026-05-15T00:00:00Z', isCompleted: false, deliverables: [] },
    ] as Milestone[],
    created_at: '2025-10-20T09:00:00Z',
    updated_at: '2026-04-15T11:30:00Z',
  },
  {
    id: 'PRJ-002',
    name: 'Mobile App Revamp',
    description: 'Redesigning the mobile application with improved UX and performance optimizations for iOS and Android.',
    scope: 'Redesign and rebuild the iOS and Android mobile apps using React Native. Includes authentication, home feed, notifications, and settings screens. Excludes new backend feature development.',
    status: 'planning',
    organizationId: 'ORG-003',
    organization: MOCK_ORGANIZATIONS[2],
    leadId: 'USR-006',
    lead: MOCK_USERS[5],
    ticketCount: 23,
    openTicketCount: 23,
    resolvedThisWeek: 0,
    startDate: '2026-04-01T00:00:00Z',
    targetDate: '2026-07-30T00:00:00Z',
    milestones: [
      { id: 'MS-006', projectId: 'PRJ-002', title: 'Wireframing', description: 'Low-fidelity wireframes approved', dueDate: '2026-04-30T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-007', projectId: 'PRJ-002', title: 'Design System', description: 'Component library + design tokens', dueDate: '2026-05-31T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-008', projectId: 'PRJ-002', title: 'Alpha Build', description: 'Feature-complete internal alpha', dueDate: '2026-06-30T00:00:00Z', isCompleted: false, deliverables: [] },
    ] as Milestone[],
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
  },
  {
    id: 'PRJ-003',
    name: 'Payment Gateway Integration',
    description: 'Integrating Razorpay and Stripe for seamless multi-currency transactions across the platform.',
    scope: 'Integrate Stripe and Razorpay payment gateways including checkout flow, webhook handling, refund processing, and invoicing. Excludes subscription billing and marketplace split payments.',
    status: 'on_hold',
    organizationId: 'ORG-002',
    organization: MOCK_ORGANIZATIONS[1],
    leadId: 'USR-002',
    lead: MOCK_USERS[1],
    ticketCount: 12,
    openTicketCount: 5,
    resolvedThisWeek: 1,
    startDate: '2026-02-01T00:00:00Z',
    targetDate: '2026-05-01T00:00:00Z',
    milestones: [
      { id: 'MS-009', projectId: 'PRJ-003', title: 'API Setup & Credentials', description: 'Keys provisioned and sandbox tested', dueDate: '2026-02-28T00:00:00Z', isCompleted: true, completedAt: '2026-02-25T00:00:00Z', deliverables: [] },
      { id: 'MS-010', projectId: 'PRJ-003', title: 'Checkout Integration', description: 'Payment flow in staging', dueDate: '2026-03-31T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-011', projectId: 'PRJ-003', title: 'Production & Compliance', description: 'PCI-DSS checklist complete and live', dueDate: '2026-05-01T00:00:00Z', isCompleted: false, deliverables: [] },
    ] as Milestone[],
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-04-12T16:00:00Z',
  },
  {
    id: 'PRJ-004',
    name: 'Internal Admin Dashboard',
    description: 'A complete admin dashboard for managing users, roles, permissions, and analytics.',
    scope: 'Build an internal operations dashboard covering user management, role assignment, audit log, SLA configuration, and report exports. All features delivered.',
    status: 'completed',
    organizationId: 'ORG-001',
    organization: MOCK_ORGANIZATIONS[0],
    leadId: 'USR-001',
    lead: MOCK_USERS[0],
    ticketCount: 78,
    openTicketCount: 0,
    resolvedThisWeek: 0,
    startDate: '2025-07-01T00:00:00Z',
    targetDate: '2026-03-20T00:00:00Z',
    completedAt: '2026-03-18T14:00:00Z',
    milestones: [
      { id: 'MS-012', projectId: 'PRJ-004', title: 'Backend APIs', description: 'All CRUD endpoints', dueDate: '2025-10-31T00:00:00Z', isCompleted: true, completedAt: '2025-10-29T00:00:00Z', deliverables: [] },
      { id: 'MS-013', projectId: 'PRJ-004', title: 'Frontend UI', description: 'All dashboard pages', dueDate: '2026-01-31T00:00:00Z', isCompleted: true, completedAt: '2026-01-28T00:00:00Z', deliverables: [] },
      { id: 'MS-014', projectId: 'PRJ-004', title: 'QA Testing', description: 'Full regression pass', dueDate: '2026-03-10T00:00:00Z', isCompleted: true, completedAt: '2026-03-08T00:00:00Z', deliverables: [] },
      { id: 'MS-015', projectId: 'PRJ-004', title: 'Go-Live', description: 'Production deployment', dueDate: '2026-03-20T00:00:00Z', isCompleted: true, completedAt: '2026-03-18T00:00:00Z', deliverables: [] },
    ] as Milestone[],
    created_at: '2025-06-15T09:00:00Z',
    updated_at: '2026-03-18T14:00:00Z',
  },
  {
    id: 'PRJ-005',
    name: 'Legacy System Migration',
    description: 'Migrating legacy monolith to microservices architecture. Cancelled due to budget reallocation.',
    scope: 'Decompose the existing monolith into 6 discrete microservices: auth, billing, notifications, reporting, search, and file storage. Cancelled before development began.',
    status: 'cancelled',
    organizationId: 'ORG-003',
    organization: MOCK_ORGANIZATIONS[2],
    leadId: 'USR-006',
    lead: MOCK_USERS[5],
    ticketCount: 40,
    openTicketCount: 0,
    resolvedThisWeek: 0,
    startDate: '2025-09-01T00:00:00Z',
    milestones: [
      { id: 'MS-016', projectId: 'PRJ-005', title: 'System Audit', description: 'Document all monolith components', dueDate: '2025-10-01T00:00:00Z', isCompleted: true, completedAt: '2025-09-28T00:00:00Z', deliverables: [] },
      { id: 'MS-017', projectId: 'PRJ-005', title: 'Migration Plan', description: 'Service boundary definition approved', dueDate: '2025-11-01T00:00:00Z', isCompleted: false, deliverables: [] },
    ] as Milestone[],
    created_at: '2025-08-10T09:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
  },
];

// ─── AI PROJECT INTELLIGENCE DATA ────────────────────────────────────────────

export const MOCK_PROJECT_HEALTH: Record<string, ProjectHealthScore> = {
  'PRJ-001': {
    projectId: 'PRJ-001',
    color: 'amber',
    score: 62,
    explanation: 'Resolution velocity has declined 34% over the last 10 days. Two tickets have exceeded SLA with no agent response. Sentiment in client comments shifted from neutral to mildly negative. Milestone MS-003 (Backend APIs) is 12 days past due.',
    velocityTrend: 'declining',
    slaBreachRisk: 0.61,
    openBlockers: 3,
    generatedAt: '2026-04-17T06:00:00Z',
  },
  'PRJ-002': {
    projectId: 'PRJ-002',
    color: 'green',
    score: 88,
    explanation: 'Project is in early planning with no overdue tickets. All communication cadence is healthy. Client engaged and responsive. No blockers identified.',
    velocityTrend: 'stable',
    slaBreachRisk: 0.08,
    openBlockers: 0,
    generatedAt: '2026-04-17T06:00:00Z',
  },
  'PRJ-003': {
    projectId: 'PRJ-003',
    color: 'red',
    score: 31,
    explanation: 'Project is on hold due to unresolved PCI-DSS compliance questions from the client. 5 tickets open with no movement in 18 days. Client has not responded to 3 consecutive update emails. Churn risk is elevated.',
    velocityTrend: 'declining',
    slaBreachRisk: 0.82,
    openBlockers: 5,
    generatedAt: '2026-04-17T06:00:00Z',
  },
};

export const MOCK_PROJECT_CLUSTERS: Record<string, ProjectTicketCluster[]> = {
  'PRJ-001': [
    { id: 'CL-001', label: 'Authentication & Login Issues', ticketCount: 12, ticketIds: ['TKT-001', 'TKT-002', 'TKT-003'], topKeywords: ['login', 'SSO', '2FA', 'session', 'token'], sentiment: 'negative' },
    { id: 'CL-002', label: 'SLA Configuration & Reporting', ticketCount: 9, ticketIds: ['TKT-016', 'TKT-017'], topKeywords: ['sla', 'policy', 'breach', 'export', 'csv'], sentiment: 'neutral' },
    { id: 'CL-003', label: 'Performance & Latency', ticketCount: 8, ticketIds: ['TKT-008'], topKeywords: ['slow', 'timeout', 'latency', 'dashboard', 'load'], sentiment: 'negative' },
    { id: 'CL-004', label: 'Feature Requests', ticketCount: 14, ticketIds: ['TKT-006', 'TKT-015'], topKeywords: ['webhook', 'bulk', 'export', 'integration', 'api'], sentiment: 'neutral' },
    { id: 'CL-005', label: 'Mobile & Browser Compatibility', ticketCount: 7, ticketIds: ['TKT-009'], topKeywords: ['mobile', 'safari', 'chrome', 'responsive', 'layout'], sentiment: 'neutral' },
  ],
  'PRJ-002': [
    { id: 'CL-006', label: 'Design System Queries', ticketCount: 11, ticketIds: [], topKeywords: ['components', 'tokens', 'figma', 'spacing', 'typography'], sentiment: 'positive' },
    { id: 'CL-007', label: 'Navigation & Routing', ticketCount: 7, ticketIds: [], topKeywords: ['navigation', 'deep-link', 'tab-bar', 'back-button'], sentiment: 'neutral' },
  ],
  'PRJ-003': [
    { id: 'CL-008', label: 'Compliance & Security', ticketCount: 5, ticketIds: ['TKT-007'], topKeywords: ['pci-dss', 'compliance', 'encryption', 'audit', 'gdpr'], sentiment: 'negative' },
    { id: 'CL-009', label: 'Webhook & Integration', ticketCount: 4, ticketIds: ['TKT-015'], topKeywords: ['webhook', 'stripe', 'razorpay', 'callback', 'retry'], sentiment: 'neutral' },
  ],
};

export const MOCK_PROJECT_SCOPE_DRIFT: Record<string, ProjectScopeDrift[]> = {
  'PRJ-001': [
    { ticketId: 'TKT-015', ticketTitle: 'Feature: Webhook support for ticket status changes', similarity: 0.42, flagged: true, reasoning: 'Webhook integrations with external systems (Jira, Slack) were explicitly excluded from project scope.' },
    { ticketId: 'TKT-006', ticketTitle: 'Add bulk ticket export to CSV', similarity: 0.55, flagged: true, reasoning: 'Bulk export is adjacent but not listed in the original delivery scope. Likely a post-go-live enhancement.' },
  ],
  'PRJ-003': [
    { ticketId: 'TKT-007', ticketTitle: 'GDPR data deletion endpoint not found', similarity: 0.38, flagged: true, reasoning: 'GDPR compliance automation was not part of the payment integration scope. Requires separate scoping.' },
  ],
};

export const MOCK_PROJECT_CHURN_RISK: Record<string, ProjectChurnRisk> = {
  'PRJ-001': {
    projectId: 'PRJ-001',
    score: 0.44,
    level: 'medium',
    signals: [
      'Client response time increased from avg 6h to 31h over last 2 weeks',
      'Milestone MS-003 overdue by 12 days with no client escalation (unusual — suggests disengagement)',
      'Last client comment was 5 days ago, tone was terse (3 words)',
    ],
    recommendation: 'Schedule a proactive sync call. Send a blocker briefing email today with a revised milestone estimate.',
  },
  'PRJ-002': {
    projectId: 'PRJ-002',
    score: 0.11,
    level: 'low',
    signals: ['Client actively participating in design reviews', 'Response time under 4 hours on average'],
    recommendation: 'No action needed. Continue regular weekly update cadence.',
  },
  'PRJ-003': {
    projectId: 'PRJ-003',
    score: 0.79,
    level: 'high',
    signals: [
      '3 unanswered emails over 18 days',
      'Client cc\'d their CTO on last message (escalation signal)',
      'No ticket activity from client side in 3 weeks',
      'Project on-hold status unchanged for 25 days',
    ],
    recommendation: 'Urgent: escalate to account manager. Prepare a written status summary and a clear ask. Consider a contract review if no response within 48 hours.',
  },
};

export const MOCK_PROJECT_STATUS_REPORTS: Record<string, ProjectStatusReport> = {
  'PRJ-001': {
    projectId: 'PRJ-001',
    period: 'Apr 10 – Apr 17, 2026',
    summary: 'The team resolved 8 tickets this week, primarily addressing login reliability issues and SLA reporting queries. Three high-priority authentication bugs (TKT-001, TKT-002, TKT-003) are now closed. The Backend APIs milestone (MS-003) remains in progress and is currently 12 days past the original target; a revised date of April 29 has been proposed internally.',
    resolvedThisWeek: 8,
    openCount: 14,
    blockers: [
      'MS-003 (Backend APIs) delayed — awaiting client environment access credentials',
      'TKT-010 blocked by a third-party email provider outage (external dependency)',
    ],
    nextSteps: [
      'Request client environment credentials by April 18',
      'Complete SLA engine integration by April 22',
      'Begin QA milestone prep by April 25',
    ],
    onTrack: false,
    milestoneConfidence: '71% confident the revised April 29 target will be met if environment access is granted by April 18.',
    generatedAt: '2026-04-17T06:00:00Z',
  },
  'PRJ-002': {
    projectId: 'PRJ-002',
    period: 'Apr 10 – Apr 17, 2026',
    summary: 'Kickoff week complete. Design sprint is underway with first wireframe batch shared with the client on April 15. Client feedback was positive. No tickets resolved yet — all open items are discovery and planning tasks.',
    resolvedThisWeek: 0,
    openCount: 23,
    blockers: [],
    nextSteps: [
      'Finalise wireframes for Home and Notifications screens by April 24',
      'Schedule component library review session with client design lead',
    ],
    onTrack: true,
    milestoneConfidence: '92% confident Wireframing milestone will be delivered by April 30.',
    generatedAt: '2026-04-17T06:00:00Z',
  },
};

export const MOCK_PROJECT_NEXT_ACTIONS: Record<string, ProjectNextBestAction> = {
  'PRJ-001': {
    projectId: 'PRJ-001',
    action: 'Send interim status update to client — 5 days without communication',
    reason: 'The client\'s last message was April 12. The milestone is overdue and 3 tickets are blocked. Proactive communication prevents churn escalation.',
    urgency: 'high',
    draftMessage: `Hi [Client Name],

Quick update on the Customer Support Platform project:

This week we resolved 8 tickets, including the three authentication issues you flagged. We're making good progress on the Backend APIs milestone, though we've hit a blocker waiting on environment access credentials — could you share these by Thursday to keep us on track for the revised April 29 date?

Open items: 14 tickets, 3 of which are blocked externally.

I'm available for a call this week if helpful. Happy to send a full update report if useful.

Best,
[Agent Name]`,
  },
  'PRJ-002': {
    projectId: 'PRJ-002',
    action: 'Schedule design review session for wireframe batch 2',
    reason: 'First wireframes were approved. Maintaining review cadence keeps client engaged and prevents late-stage rework.',
    urgency: 'low',
    draftMessage: undefined,
  },
  'PRJ-003': {
    projectId: 'PRJ-003',
    action: 'Escalate to account manager — client unresponsive for 18 days',
    reason: 'Three emails unanswered, project on hold. Churn risk is high. Agent-level follow-up is insufficient at this stage.',
    urgency: 'high',
    draftMessage: `Hi [Account Manager],

PRJ-003 (Payment Gateway Integration) has been on hold for 25 days and the client (ORG-003) has not responded to 3 emails since March 30. Their CTO was CC\'d on the last message, which suggests an internal escalation.

I recommend: (1) direct outreach from your side, (2) a written project status summary, and (3) a clear decision ask — resume or close.

Let me know how you\'d like to proceed.

[Agent Name]`,
  },
};

export const MOCK_PROJECT_KNOWLEDGE: ProjectKnowledgeEntry[] = [
  {
    id: 'PKE-001',
    projectId: 'PRJ-004',
    projectName: 'Internal Admin Dashboard',
    summary: 'Delivered a full-stack internal operations dashboard on time and under budget. Key success factors: clear scope, weekly client syncs, and early QA involvement.',
    problemStatement: 'The client needed a centralised operations view replacing 4 separate spreadsheet-based workflows.',
    resolutionApproach: 'Single-page React application backed by a REST API. Role-based access control implemented from day one. Iterative delivery with bi-weekly demos.',
    blockersSeen: ['Environment provisioning delayed by 2 weeks at project start', 'SSO integration required unplanned work — 3 extra days'],
    recommendations: ['Always provision environments in week 1, not when development starts', 'Clarify SSO requirements in scoping — it\'s almost always needed and almost always underestimated'],
    created_at: '2026-03-20T10:00:00Z',
  },
];

export const MOCK_PROJECT_MILESTONE_PREDICTIONS: Record<string, ProjectMilestonePrediction[]> = {
  'PRJ-001': [
    {
      milestoneId: 'MS-003',
      milestoneName: 'Backend APIs',
      scheduledDate: '2026-03-31T00:00:00Z',
      predictedDate: '2026-04-29T00:00:00Z',
      onTrack: false,
      confidenceLow: '2026-04-25T00:00:00Z',
      confidenceHigh: '2026-05-05T00:00:00Z',
      blockingTicketIds: ['TKT-001', 'TKT-010'],
      reasoning: 'Current velocity of 8 tickets/week with 14 open and 2 external blockers. Assuming access credentials arrive by April 18, 29 April is the 75th-percentile outcome.',
    },
    {
      milestoneId: 'MS-004',
      milestoneName: 'QA & UAT',
      scheduledDate: '2026-04-30T00:00:00Z',
      predictedDate: '2026-05-10T00:00:00Z',
      onTrack: false,
      confidenceLow: '2026-05-07T00:00:00Z',
      confidenceHigh: '2026-05-17T00:00:00Z',
      blockingTicketIds: [],
      reasoning: 'Dependent on MS-003 completion. If APIs land April 29, UAT starts May 1. Based on historical UAT length for similar projects, 10 days is the median.',
    },
    {
      milestoneId: 'MS-005',
      milestoneName: 'Production Deployment',
      scheduledDate: '2026-05-15T00:00:00Z',
      predictedDate: '2026-05-20T00:00:00Z',
      onTrack: false,
      confidenceLow: '2026-05-17T00:00:00Z',
      confidenceHigh: '2026-05-28T00:00:00Z',
      blockingTicketIds: [],
      reasoning: 'Dependent on UAT sign-off. Assuming UAT completes May 10, deployment prep and go/no-go takes 7–10 days based on prior projects.',
    },
  ],
  'PRJ-002': [
    {
      milestoneId: 'MS-006',
      milestoneName: 'Wireframing',
      scheduledDate: '2026-04-30T00:00:00Z',
      predictedDate: '2026-04-28T00:00:00Z',
      onTrack: true,
      confidenceLow: '2026-04-26T00:00:00Z',
      confidenceHigh: '2026-05-02T00:00:00Z',
      blockingTicketIds: [],
      reasoning: 'Design velocity is ahead of plan. All screens are scoped and first batch delivered on schedule. 92% confident on-time delivery.',
    },
  ],
};
