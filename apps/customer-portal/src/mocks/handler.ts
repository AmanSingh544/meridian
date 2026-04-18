// ═══════════════════════════════════════════════════════════════════════════
// MERIDIAN CUSTOMER PORTAL — MOCK FETCH HANDLER
// ═══════════════════════════════════════════════════════════════════════════
//
// Intercepts every fetch() call made by RTK Query and returns mock data.
//
// HOW TO REMOVE (when APIs are ready)
//   1. Delete the two lines in main.tsx that import and call installMockHandler
//   2. Delete this file and src/mocks/data.ts
//
// ACTIVE PERSONA — switch between CLIENT_ADMIN and CLIENT_USER:
//   CLIENT_ADMIN: sees all org tickets, can manage team, analytics, org settings
//   CLIENT_USER:  sees only own tickets
// ═══════════════════════════════════════════════════════════════════════════

import { Permission, TicketStatus, TicketPriority, TicketCategory, UserRole } from '@3sc/types';
import type { Ticket, User, Comment, KBArticle, KBSearchResult, Notification } from '@3sc/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIMULATED_DELAY_MS = 350;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function paginate<T>(items: T[], page = 1, page_size = 25) {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / page_size));
  const start = (page - 1) * page_size;
  return { data: items.slice(start, start + page_size), page, page_size, total, total_pages };
}

function getPath(url: string): string {
  try { return new URL(url).pathname; } catch { return url.split('?')[0]; }
}

function qp(url: string): URLSearchParams {
  const idx = url.indexOf('?');
  return new URLSearchParams(idx >= 0 ? url.slice(idx + 1) : '');
}

function extractAfter(url: string, segment: string): string {
  const path = getPath(url);
  const parts = path.split('/');
  const idx = parts.lastIndexOf(segment);
  if (idx < 0) return '';
  return parts[idx + 1]?.split('?')[0] ?? '';
}

// ── Personas ──────────────────────────────────────────────────────────────────

const CLIENT_ADMIN_PERMISSIONS: Permission[] = [
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
  Permission.PROJECT_VIEW,
  Permission.AI_DIGEST,
  Permission.AI_KB_SUGGEST,
];

const CLIENT_USER_PERMISSIONS: Permission[] = [
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
];

// ── Active persona switch ─────────────────────────────────────────────────────
// Change to MOCK_PERSONAS.CLIENT_USER to test a restricted user
const ACTIVE_PERSONA_KEY: 'CLIENT_ADMIN' | 'CLIENT_USER' = 'CLIENT_ADMIN';

const MOCK_PERSONA_USERS: Record<'CLIENT_ADMIN' | 'CLIENT_USER', User> = {
  CLIENT_ADMIN: {
    id: 'CUST-001',
    email: 'sarah.thompson@acmecorp.com',
    displayName: 'Sarah Thompson',
    firstName: 'Sarah',
    lastName: 'Thompson',
    role: UserRole.CLIENT_ADMIN,
    permissions: CLIENT_ADMIN_PERMISSIONS,
    organizationId: 'ORG-002',
    isActive: true,
    lastLoginAt: '2026-04-16T08:30:00Z',
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2026-04-16T08:30:00Z',
  },
  CLIENT_USER: {
    id: 'CUST-002',
    email: 'james.wu@acmecorp.com',
    displayName: 'James Wu',
    firstName: 'James',
    lastName: 'Wu',
    role: UserRole.CLIENT_USER,
    permissions: CLIENT_USER_PERMISSIONS,
    organizationId: 'ORG-002',
    isActive: true,
    lastLoginAt: '2026-04-15T14:00:00Z',
    created_at: '2024-09-15T10:00:00Z',
    updated_at: '2026-04-15T14:00:00Z',
  },
};

const ACTIVE_USER = MOCK_PERSONA_USERS[ACTIVE_PERSONA_KEY];

const MOCK_API_USER = {
  user_id: ACTIVE_PERSONA_KEY === 'CLIENT_ADMIN' ? 101 : 102,
  email: ACTIVE_USER.email,
  user_name: ACTIVE_USER.displayName,
  role: ACTIVE_USER.role as string,
  permissions: ACTIVE_USER.permissions as string[],
  tenant_id: ACTIVE_USER.organizationId,
  tenant_name: 'Acme Corp',
};

const MOCK_LOGIN_RESPONSE = {
  message: 'Login successful',
  tokens: { access: 'mock-access-token', refresh: 'mock-refresh-token' },
  user: MOCK_API_USER,
};

const MOCK_SESSION_RESPONSE = { data: MOCK_API_USER };

// ── Team members (org members visible to this customer) ───────────────────────

const MOCK_TEAM_MEMBERS: User[] = [
  ACTIVE_USER,
  MOCK_PERSONA_USERS.CLIENT_USER,
  {
    id: 'CUST-003',
    email: 'priya.mehta@acmecorp.com',
    displayName: 'Priya Mehta',
    firstName: 'Priya',
    lastName: 'Mehta',
    role: UserRole.CLIENT_USER,
    permissions: CLIENT_USER_PERMISSIONS,
    organizationId: 'ORG-002',
    isActive: true,
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'CUST-004',
    email: 'lucas.fernandez@acmecorp.com',
    displayName: 'Lucas Fernandez',
    firstName: 'Lucas',
    lastName: 'Fernandez',
    role: UserRole.CLIENT_USER,
    permissions: CLIENT_USER_PERMISSIONS,
    organizationId: 'ORG-002',
    isActive: true,
    created_at: '2025-03-20T09:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'CUST-005',
    email: 'nina.osei@acmecorp.com',
    displayName: 'Nina Osei',
    firstName: 'Nina',
    lastName: 'Osei',
    role: UserRole.CLIENT_USER,
    permissions: CLIENT_USER_PERMISSIONS,
    organizationId: 'ORG-002',
    isActive: false,
    created_at: '2024-11-05T09:00:00Z',
    updated_at: '2026-02-14T00:00:00Z',
  },
];

// ── Projects ──────────────────────────────────────────────────────────────────

const MOCK_PROJECTS = [
  {
    id: 'PRJ-001',
    name: 'Acme Platform Migration',
    description: 'Full migration of Acme legacy systems to the 3SC cloud platform.',
    scope: 'Migrate all data, integrations, and user accounts from the Acme legacy system to the 3SC cloud platform. Includes infrastructure setup, data migration in two phases, and UAT sign-off.',
    status: 'active',
    organizationId: 'ORG-002',
    leadId: 'CUST-001',
    lead: ACTIVE_USER,
    milestones: [
      { id: 'MS-001', projectId: 'PRJ-001', title: 'Infrastructure Setup', dueDate: '2026-02-28T00:00:00Z', isCompleted: true, completedAt: '2026-02-25T00:00:00Z', deliverables: [] },
      { id: 'MS-002', projectId: 'PRJ-001', title: 'Data Migration Phase 1', dueDate: '2026-04-30T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-003', projectId: 'PRJ-001', title: 'UAT & Sign-off', dueDate: '2026-06-15T00:00:00Z', isCompleted: false, deliverables: [] },
    ],
    ticketCount: 8,
    openTicketCount: 3,
    resolvedThisWeek: 2,
    startDate: '2026-01-10T00:00:00Z',
    targetDate: '2026-07-01T00:00:00Z',
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-04-10T14:30:00Z',
  },
  {
    id: 'PRJ-002',
    name: 'SSO Integration',
    description: 'Integrate Acme\'s Azure AD with the 3SC SSO system.',
    scope: 'Configure SAML 2.0 SSO between Acme Azure AD and 3SC platform. Includes user provisioning, role mapping, and session management.',
    status: 'active',
    organizationId: 'ORG-002',
    leadId: 'CUST-001',
    lead: ACTIVE_USER,
    milestones: [
      { id: 'MS-004', projectId: 'PRJ-002', title: 'SAML Config', dueDate: '2026-04-20T00:00:00Z', isCompleted: false, deliverables: [] },
      { id: 'MS-005', projectId: 'PRJ-002', title: 'User Provisioning', dueDate: '2026-05-01T00:00:00Z', isCompleted: false, deliverables: [] },
    ],
    ticketCount: 3,
    openTicketCount: 2,
    resolvedThisWeek: 0,
    startDate: '2026-03-01T00:00:00Z',
    targetDate: '2026-05-01T00:00:00Z',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-04-14T11:00:00Z',
  },
  {
    id: 'PRJ-003',
    name: 'Employee Onboarding Portal',
    description: 'Build a self-service onboarding portal for new Acme hires.',
    scope: 'Design and build a web-based employee onboarding portal with task checklists, document upload, and manager approval workflows.',
    status: 'planning',
    organizationId: 'ORG-002',
    leadId: 'CUST-001',
    lead: ACTIVE_USER,
    milestones: [
      { id: 'MS-006', projectId: 'PRJ-003', title: 'Requirements Workshop', dueDate: '2026-05-15T00:00:00Z', isCompleted: false, deliverables: [] },
    ],
    ticketCount: 2,
    openTicketCount: 2,
    resolvedThisWeek: 0,
    startDate: '2026-05-01T00:00:00Z',
    targetDate: '2026-09-30T00:00:00Z',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-12T16:00:00Z',
  },
];

const MOCK_CP_PROJECT_STATUS_REPORTS: Record<string, object> = {
  'PRJ-001': {
    projectId: 'PRJ-001',
    period: 'Apr 10 – Apr 17, 2026',
    summary: 'Good progress this week — 2 tickets resolved including the data validation issue you raised. The Data Migration Phase 1 milestone is on track for April 30. We\'re currently awaiting your confirmation on the field mapping document sent April 14.',
    resolvedThisWeek: 2,
    openCount: 3,
    blockers: ['Awaiting field mapping confirmation from your team (sent April 14)'],
    nextSteps: ['Please confirm field mapping document by April 20', 'Schedule UAT kick-off call for early May'],
    onTrack: true,
    milestoneConfidence: '89% confident Data Migration Phase 1 will complete by April 30.',
    generatedAt: '2026-04-17T06:00:00Z',
  },
  'PRJ-002': {
    projectId: 'PRJ-002',
    period: 'Apr 10 – Apr 17, 2026',
    summary: 'SAML configuration is in progress. Your Azure AD metadata file has been received and our team is configuring the SAML endpoints. We expect a test login to be available by April 19.',
    resolvedThisWeek: 0,
    openCount: 2,
    blockers: [],
    nextSteps: ['Test SAML login available by April 19 — we\'ll send a link', 'Role mapping to be confirmed with your IT admin'],
    onTrack: true,
    milestoneConfidence: '94% confident SAML Config milestone will complete by April 20.',
    generatedAt: '2026-04-17T06:00:00Z',
  },
};

const MOCK_CP_MILESTONE_PREDICTIONS: Record<string, object[]> = {
  'PRJ-001': [
    {
      milestoneId: 'MS-002',
      milestoneName: 'Data Migration Phase 1',
      scheduledDate: '2026-04-30T00:00:00Z',
      predictedDate: '2026-04-30T00:00:00Z',
      onTrack: true,
      confidenceLow: '2026-04-28T00:00:00Z',
      confidenceHigh: '2026-05-03T00:00:00Z',
      blockingTicketIds: [],
      reasoning: 'All migration tasks are on schedule. One pending action from your team (field mapping confirmation) is the only variable.',
    },
    {
      milestoneId: 'MS-003',
      milestoneName: 'UAT & Sign-off',
      scheduledDate: '2026-06-15T00:00:00Z',
      predictedDate: '2026-06-15T00:00:00Z',
      onTrack: true,
      confidenceLow: '2026-06-12T00:00:00Z',
      confidenceHigh: '2026-06-20T00:00:00Z',
      blockingTicketIds: [],
      reasoning: 'Dependent on Phase 1 completion. If Phase 1 lands April 30, UAT preparation begins May 2 and the 6-week UAT window fits within the June 15 date.',
    },
  ],
};

// ── Tickets ───────────────────────────────────────────────────────────────────

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-C001',
    ticketNumber: 'TKT-C001',
    title: 'SSO login broken after Azure AD certificate renewal',
    description: 'After renewing our Azure AD SAML certificate last Tuesday, all SSO logins through the 3SC portal are failing with "Invalid signature" errors. Users are completely locked out and having to use password login as a workaround.\n\nError seen: SAML response signature validation failed (InvalidSignatureError)\nAffects: All 47 Acme Corp users\nWorkaround: Direct email/password login still works.',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.CRITICAL,
    category: TicketCategory.INCIDENT,
    tags: ['sso', 'azure-ad', 'saml', 'authentication'],
    createdBy: 'CUST-001',
    assignedTo: 'USR-002',
    organizationId: 'ORG-002',
    projectId: 'PRJ-002',
    sla: {
      responseDeadline: '2026-04-16T10:00:00Z',
      resolutionDeadline: '2026-04-17T08:00:00Z',
      responseState: 'met' as never,
      resolutionState: 'at_risk' as never,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [
      { id: 'ATT-C001', fileName: 'saml_error_log.txt', fileSize: 14200, mimeType: 'text/plain', url: '#', uploadedBy: 'CUST-001', created_at: '2026-04-12T09:15:00Z' },
    ],
    commentCount: 5,
    creator: MOCK_PERSONA_USERS.CLIENT_ADMIN,
    created_at: '2026-04-12T09:00:00Z',
    updated_at: '2026-04-16T07:45:00Z',
  },
  {
    id: 'TKT-C002',
    ticketNumber: 'TKT-C002',
    title: 'Bulk CSV export timing out for large datasets',
    description: 'When attempting to export more than 5,000 records to CSV from the reporting module, the request times out after 30 seconds with no file downloaded. Exports under 1,000 records work fine.\n\nSteps to reproduce:\n1. Navigate to Reports > Data Export\n2. Select date range spanning > 3 months\n3. Click Export CSV\n4. Observe timeout error',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG,
    tags: ['export', 'csv', 'performance', 'reporting'],
    createdBy: 'CUST-001',
    organizationId: 'ORG-002',
    projectId: 'PRJ-001',
    sla: {
      responseDeadline: '2026-04-17T09:00:00Z',
      resolutionDeadline: '2026-04-19T09:00:00Z',
      responseState: 'on_track' as never,
      resolutionState: 'on_track' as never,
      responseMet: false,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 2,
    creator: MOCK_PERSONA_USERS.CLIENT_ADMIN,
    created_at: '2026-04-15T14:30:00Z',
    updated_at: '2026-04-15T16:00:00Z',
  },
  {
    id: 'TKT-C003',
    ticketNumber: 'TKT-C003',
    title: 'Email notifications not arriving for ticket status changes',
    description: 'Since last week, users are no longer receiving email notifications when tickets are updated or status changes. In-app notifications are still working correctly.\n\nAffected users: All Acme Corp members\nNot affected: In-app notifications, Slack webhook',
    status: TicketStatus.ACKNOWLEDGED,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['notifications', 'email', 'smtp'],
    createdBy: 'CUST-002',
    assignedTo: 'USR-003',
    organizationId: 'ORG-002',
    sla: {
      responseDeadline: '2026-04-16T14:00:00Z',
      resolutionDeadline: '2026-04-20T09:00:00Z',
      responseState: 'met' as never,
      resolutionState: 'on_track' as never,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [],
    commentCount: 3,
    creator: MOCK_PERSONA_USERS.CLIENT_USER,
    created_at: '2026-04-14T10:00:00Z',
    updated_at: '2026-04-15T09:30:00Z',
  },
  {
    id: 'TKT-C004',
    ticketNumber: 'TKT-C004',
    title: 'Request: Custom field support for ticket forms',
    description: 'We would like the ability to add custom fields to our ticket submission form so that our users can provide structured information (e.g. department, cost centre, affected system) when raising a ticket. This would significantly improve our triage process.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    category: TicketCategory.FEATURE_REQUEST,
    tags: ['custom-fields', 'forms', 'enhancement'],
    createdBy: 'CUST-001',
    organizationId: 'ORG-002',
    attachments: [],
    commentCount: 1,
    creator: MOCK_PERSONA_USERS.CLIENT_ADMIN,
    created_at: '2026-04-10T11:00:00Z',
    updated_at: '2026-04-10T11:00:00Z',
  },
  {
    id: 'TKT-C005',
    ticketNumber: 'TKT-C005',
    title: 'Data migration Phase 1 — file import errors',
    description: 'During the Phase 1 data migration, approximately 340 records failed to import with "Constraint violation: duplicate key" errors. These appear to be legacy records where our old system allowed duplicate identifiers.\n\nAttached: error log and sample of failing records.',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    category: TicketCategory.SUPPORT,
    tags: ['migration', 'data-import', 'database'],
    createdBy: 'CUST-001',
    assignedTo: 'USR-004',
    organizationId: 'ORG-002',
    projectId: 'PRJ-001',
    sla: {
      responseDeadline: '2026-04-13T09:00:00Z',
      resolutionDeadline: '2026-04-18T09:00:00Z',
      responseState: 'met' as never,
      resolutionState: 'at_risk' as never,
      responseMet: true,
      resolutionMet: false,
    },
    attachments: [
      { id: 'ATT-C002', fileName: 'migration_errors.csv', fileSize: 28400, mimeType: 'text/csv', url: '#', uploadedBy: 'CUST-001', created_at: '2026-04-13T08:00:00Z' },
    ],
    commentCount: 4,
    creator: MOCK_PERSONA_USERS.CLIENT_ADMIN,
    created_at: '2026-04-13T08:00:00Z',
    updated_at: '2026-04-15T17:00:00Z',
  },
  {
    id: 'TKT-C006',
    ticketNumber: 'TKT-C006',
    title: 'How do I configure SLA policies for our team?',
    description: 'I would like to understand how to set up SLA policies for our organisation so that we can track our internal response time commitments. Specifically, I want different SLAs for different priority levels.',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.QUESTION,
    tags: ['sla', 'configuration', 'how-to'],
    createdBy: 'CUST-003',
    assignedTo: 'USR-003',
    organizationId: 'ORG-002',
    attachments: [],
    commentCount: 3,
    creator: MOCK_TEAM_MEMBERS[2],
    resolved_at: '2026-04-11T14:30:00Z',
    created_at: '2026-04-09T10:00:00Z',
    updated_at: '2026-04-11T14:30:00Z',
  },
  {
    id: 'TKT-C007',
    ticketNumber: 'TKT-C007',
    title: 'File upload fails silently for files over 20MB',
    description: 'When users try to upload attachments larger than approximately 20MB, the upload appears to complete but the attachment never appears on the ticket. No error message is shown to the user.\n\nReproduced with: PDF 22MB, ZIP 35MB\nExpected: Upload should succeed or show a clear error',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG,
    tags: ['attachments', 'upload', 'file-size'],
    createdBy: 'CUST-004',
    organizationId: 'ORG-002',
    attachments: [],
    commentCount: 0,
    creator: MOCK_TEAM_MEMBERS[3],
    created_at: '2026-04-16T07:00:00Z',
    updated_at: '2026-04-16T07:00:00Z',
  },
  {
    id: 'TKT-C008',
    ticketNumber: 'TKT-C008',
    title: 'Platform migration — infrastructure setup complete',
    description: 'The infrastructure setup milestone for PRJ-001 has been completed. All cloud resources are provisioned and connectivity checks have passed. Ready to proceed to Phase 1 data migration.',
    status: TicketStatus.CLOSED,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TASK,
    tags: ['migration', 'infrastructure', 'milestone'],
    createdBy: 'CUST-001',
    organizationId: 'ORG-002',
    projectId: 'PRJ-001',
    attachments: [],
    commentCount: 2,
    creator: MOCK_PERSONA_USERS.CLIENT_ADMIN,
    resolved_at: '2026-02-25T16:00:00Z',
    closed_at: '2026-02-26T09:00:00Z',
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-02-26T09:00:00Z',
  },
];

// ── Comments ──────────────────────────────────────────────────────────────────

const MOCK_COMMENTS: Record<string, Comment[]> = {
  'TKT-C001': [
    {
      id: 'CMT-C001',
      ticketId: 'TKT-C001',
      authorId: 'CUST-001',
      author: MOCK_PERSONA_USERS.CLIENT_ADMIN,
      content: 'This started immediately after our Azure AD team renewed the SAML signing certificate at 09:00 Tuesday. Old certificate expired 2026-04-11. New certificate thumbprint: A3F2...',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-12T09:20:00Z',
      updated_at: '2026-04-12T09:20:00Z',
    },
    {
      id: 'CMT-C002',
      ticketId: 'TKT-C001',
      authorId: 'USR-002',
      author: { id: 'USR-002', email: 'priya.sharma@3sc.com', displayName: 'Priya Sharma', firstName: 'Priya', lastName: 'Sharma', role: UserRole.LEAD, permissions: [], organizationId: 'ORG-001', isActive: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      content: 'Thanks Sarah, we can see the issue on our end. The SAML metadata in our system still references the old certificate fingerprint. We need to update the IdP metadata. I\'ll keep you updated.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-12T10:45:00Z',
      updated_at: '2026-04-12T10:45:00Z',
    },
    {
      id: 'CMT-C003',
      ticketId: 'TKT-C001',
      authorId: 'USR-002',
      author: { id: 'USR-002', email: 'priya.sharma@3sc.com', displayName: 'Priya Sharma', firstName: 'Priya', lastName: 'Sharma', role: UserRole.LEAD, permissions: [], organizationId: 'ORG-001', isActive: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      content: 'Update: Metadata has been updated in our staging environment and SSO is working there. We\'re scheduling the production deployment for tonight at 22:00 UTC to minimise impact.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-15T16:00:00Z',
      updated_at: '2026-04-15T16:00:00Z',
    },
    {
      id: 'CMT-C004',
      ticketId: 'TKT-C001',
      authorId: 'CUST-001',
      author: MOCK_PERSONA_USERS.CLIENT_ADMIN,
      content: 'Thanks for the update. Our team has been notified. Please let us know once the production deployment is complete.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-15T16:30:00Z',
      updated_at: '2026-04-15T16:30:00Z',
    },
    {
      id: 'CMT-C005',
      ticketId: 'TKT-C001',
      authorId: 'CUST-002',
      author: MOCK_PERSONA_USERS.CLIENT_USER,
      content: 'Just to confirm — the password login workaround is working for our team in the meantime. No complete outage.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-16T08:00:00Z',
      updated_at: '2026-04-16T08:00:00Z',
    },
  ],
  'TKT-C003': [
    {
      id: 'CMT-C010',
      ticketId: 'TKT-C003',
      authorId: 'CUST-002',
      author: MOCK_PERSONA_USERS.CLIENT_USER,
      content: 'I first noticed this on Friday 11th April. I submitted a ticket and never got the usual confirmation email.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-14T10:10:00Z',
      updated_at: '2026-04-14T10:10:00Z',
    },
    {
      id: 'CMT-C011',
      ticketId: 'TKT-C003',
      authorId: 'USR-003',
      author: { id: 'USR-003', email: 'james.okafor@3sc.com', displayName: 'James Okafor', firstName: 'James', lastName: 'Okafor', role: UserRole.AGENT, permissions: [], organizationId: 'ORG-001', isActive: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      content: 'We have confirmed there is an issue with our SMTP relay provider. Our team is working with them to restore service. ETA: 24 hours.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-14T14:00:00Z',
      updated_at: '2026-04-14T14:00:00Z',
    },
    {
      id: 'CMT-C012',
      ticketId: 'TKT-C003',
      authorId: 'CUST-001',
      author: MOCK_PERSONA_USERS.CLIENT_ADMIN,
      content: 'Understood, please keep us posted. In the meantime our users are checking in-app notifications as a workaround.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-14T14:45:00Z',
      updated_at: '2026-04-14T14:45:00Z',
    },
  ],
  'TKT-C005': [
    {
      id: 'CMT-C020',
      ticketId: 'TKT-C005',
      authorId: 'CUST-001',
      author: MOCK_PERSONA_USERS.CLIENT_ADMIN,
      content: 'The duplicate IDs come from our legacy CRM which allowed the same customer_id to be reused after account deletion. We have ~340 such records.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-13T08:30:00Z',
      updated_at: '2026-04-13T08:30:00Z',
    },
    {
      id: 'CMT-C021',
      ticketId: 'TKT-C005',
      authorId: 'USR-004',
      author: { id: 'USR-004', email: 'sara.chen@3sc.com', displayName: 'Sara Chen', firstName: 'Sara', lastName: 'Chen', role: UserRole.AGENT, permissions: [], organizationId: 'ORG-001', isActive: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      content: 'Thanks for the context. We can handle these with a pre-migration deduplication script that will suffix the duplicate IDs with _legacy. Would that work for your team?',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-13T11:00:00Z',
      updated_at: '2026-04-13T11:00:00Z',
    },
    {
      id: 'CMT-C022',
      ticketId: 'TKT-C005',
      authorId: 'CUST-001',
      author: MOCK_PERSONA_USERS.CLIENT_ADMIN,
      content: 'Yes, the _legacy suffix approach is fine. I\'ve checked with our data team. Please go ahead.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-13T14:00:00Z',
      updated_at: '2026-04-13T14:00:00Z',
    },
    {
      id: 'CMT-C023',
      ticketId: 'TKT-C005',
      authorId: 'USR-004',
      author: { id: 'USR-004', email: 'sara.chen@3sc.com', displayName: 'Sara Chen', firstName: 'Sara', lastName: 'Chen', role: UserRole.AGENT, permissions: [], organizationId: 'ORG-001', isActive: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      content: 'Script is ready and tested in the migration staging environment. Scheduling the re-run for tomorrow morning.',
      isInternal: false,
      attachments: [],
      mentions: [],
      created_at: '2026-04-15T17:00:00Z',
      updated_at: '2026-04-15T17:00:00Z',
    },
  ],
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const MOCK_DASHBOARD = {
  total: 8,
  openTickets: 4,
  resolvedToday: 0,
  avgResolutionTime: '2d 4h',
  slaComplianceRate: 0.88,
  by_priority: { LOW: 2, MEDIUM: 2, HIGH: 3, CRITICAL: 1 },
  by_status: { OPEN: 3, ACKNOWLEDGED: 1, IN_PROGRESS: 2, RESOLVED: 1, CLOSED: 1 },
  recentActivity: [
    { id: 'ACT-001', type: 'status_change', description: 'TKT-C001 status changed to IN_PROGRESS', userId: 'USR-002', userName: 'Priya Sharma', resourceType: 'ticket', resourceId: 'TKT-C001', timestamp: '2026-04-16T07:45:00Z' },
    { id: 'ACT-002', type: 'comment', description: 'New comment on TKT-C001', userId: 'CUST-002', userName: 'James Wu', resourceType: 'ticket', resourceId: 'TKT-C001', timestamp: '2026-04-16T08:00:00Z' },
    { id: 'ACT-003', type: 'ticket_created', description: 'TKT-C007 created', userId: 'CUST-004', userName: 'Lucas Fernandez', resourceType: 'ticket', resourceId: 'TKT-C007', timestamp: '2026-04-16T07:00:00Z' },
  ],
};

// ── Knowledge Base ────────────────────────────────────────────────────────────

const MOCK_KB_CATEGORIES = [
  { id: 'KBC-001', name: 'Getting Started', slug: 'getting-started', description: 'New to Meridian? Start here for setup guides and onboarding walkthroughs.', articleCount: 4 },
  { id: 'KBC-002', name: 'Account & Billing', slug: 'account-billing', description: 'Manage your subscription, invoices, payment methods, and account settings.', articleCount: 3 },
  { id: 'KBC-003', name: 'Tickets & Workflows', slug: 'tickets-workflows', description: 'Learn how to create, manage, and track support tickets effectively.', articleCount: 3 },
  { id: 'KBC-004', name: 'Integrations', slug: 'integrations', description: 'Connect Meridian with Slack, Jira, GitHub, and other tools your team uses.', articleCount: 2 },
  { id: 'KBC-005', name: 'Security & Compliance', slug: 'security-compliance', description: 'Data privacy, SSO, audit logs, and compliance certifications.', articleCount: 2 },
  { id: 'KBC-006', name: 'Troubleshooting', slug: 'troubleshooting', description: 'Common issues, error codes, and step-by-step resolution guides.', articleCount: 2 },
];

const MOCK_KB_ARTICLES: KBArticle[] = [
  {
    id: 'KBA-001',
    title: 'How to create your first support ticket',
    slug: 'create-first-ticket',
    categoryId: 'KBC-001',
    excerpt: 'Step-by-step guide to submitting a support request and setting the right priority so our team can help you faster.',
    content: `Creating a support ticket is the fastest way to get help from our team. Follow these steps to submit your first request.\n\n## Step 1 — Log in to the Customer Portal\n\nNavigate to your organisation's Meridian portal and sign in with your credentials.\n\n## Step 2 — Click "New Ticket"\n\nFrom the Dashboard, click the New Ticket button in the top-right corner.\n\n## Step 3 — Fill in the details\n\n- Subject — Write a clear, specific title.\n- Description — Explain what you expected to happen and what actually happened.\n- Priority — Choose the impact level.\n- Category — Pick the closest match.\n\n## Step 4 — Attach files (optional)\n\nScreenshots, logs, or recordings help our agents resolve your issue faster.\n\n## Step 5 — Submit\n\nClick Submit Ticket. You'll receive a confirmation email with your ticket number.`,
    tags: ['tickets', 'getting started', 'submit', 'new ticket'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 1842,
    helpfulCount: 314,
    relatedArticleIds: ['KBA-002', 'KBA-008'],
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2026-03-15T11:20:00Z',
  },
  {
    id: 'KBA-002',
    title: 'Understanding ticket statuses and what they mean',
    slug: 'ticket-statuses',
    categoryId: 'KBC-001',
    excerpt: 'A breakdown of every ticket status — Open, Acknowledged, In Progress, Resolved, and Closed — and what action (if any) is needed from you.',
    content: `Each ticket in Meridian moves through a defined lifecycle.\n\n## Open\nYour ticket has been received and is in the queue.\n\n## Acknowledged\nAn agent has read your ticket and confirmed it's been understood.\n\n## In Progress\nActive work is underway.\n\n## Resolved\nOur agent believes the issue has been fixed. You have 72 hours to confirm.\n\n## Closed\nThe ticket is complete. You can reopen within 30 days if the issue recurs.`,
    tags: ['status', 'workflow', 'sla', 'lifecycle'],
    authorId: 'USR-001',
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
    excerpt: 'CLIENT_ADMIN users can invite colleagues via email. Invited users receive a setup link valid for 48 hours.',
    content: `If you're a Client Admin, you can invite colleagues to join your organisation in Meridian.\n\n## Steps to invite\n\n1. Navigate to Team Management in the sidebar.\n2. Click Invite Member.\n3. Enter the person's email address.\n4. Click Send Invite.\n\nThe invitee receives an email with a secure setup link valid for 48 hours.`,
    tags: ['invite', 'team', 'admin', 'members'],
    authorId: 'USR-001',
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
    excerpt: 'Secure your account with TOTP-based 2FA using apps like Google Authenticator or Authy.',
    content: `Two-factor authentication adds a second layer of security to your Meridian account.\n\n## How to enable 2FA\n\n1. Go to Account Settings.\n2. Under Security, click Enable Two-Factor Authentication.\n3. Scan the QR code with your authenticator app.\n4. Enter the 6-digit code to confirm setup.\n5. Save your backup codes in a secure location.`,
    tags: ['security', '2fa', 'authentication', 'login'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 654,
    helpfulCount: 103,
    relatedArticleIds: ['KBA-012'],
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'KBA-005',
    title: 'How to download or reprint an invoice',
    slug: 'download-invoice',
    categoryId: 'KBC-002',
    excerpt: 'Find and download PDF invoices for any billing period from the Billing section of your Organisation Settings.',
    content: `All invoices are available as downloadable PDFs from the portal.\n\n## Accessing invoices\n\n1. Navigate to Organisation Settings.\n2. Click the Billing tab.\n3. Scroll to Invoice History.\n4. Click Download PDF next to any invoice.`,
    tags: ['billing', 'invoice', 'payment', 'subscription'],
    authorId: 'USR-001',
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
    excerpt: 'Change your plan at any time. Upgrades take effect immediately; downgrades at the next renewal date.',
    content: `Meridian offers four plans: Starter, Growth, Business, and Enterprise.\n\n## Upgrading\n\nUpgrades take effect immediately with a prorated charge.\n\n## Downgrading\n\nDowngrades are scheduled for the next renewal date. Data is never deleted when downgrading.`,
    tags: ['billing', 'plan', 'upgrade', 'downgrade', 'subscription'],
    authorId: 'USR-001',
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
    excerpt: 'Replace a credit card or switch to bank transfer from the Billing tab in Organisation Settings.',
    content: `You can update your payment method at any time.\n\n## How to update your card\n\n1. Go to Organisation Settings → Billing.\n2. Click Update Card.\n3. Enter your new card details.\n4. Click Save.`,
    tags: ['billing', 'payment', 'card'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 589,
    helpfulCount: 94,
    relatedArticleIds: ['KBA-005'],
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2026-03-05T09:00:00Z',
  },
  {
    id: 'KBA-008',
    title: 'How to add attachments to a ticket',
    slug: 'ticket-attachments',
    categoryId: 'KBC-003',
    excerpt: 'Upload screenshots, logs, or documents directly to a ticket. Supported formats include PNG, JPG, PDF, and ZIP up to 25MB each.',
    content: `Attachments help our agents understand your issue faster.\n\n## During ticket creation\n\nDrag and drop files onto the attachment area, or click the paperclip icon. Up to 5 files per submission.\n\n## Supported file types\n\nImages (PNG, JPG, GIF, WebP), Documents (PDF, DOCX, XLSX, CSV), Archives (ZIP), Logs (TXT, LOG)\n\n## Size limits\n\n- Max 25MB per file\n- Max 100MB total per ticket`,
    tags: ['attachments', 'files', 'upload', 'screenshots'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 1102,
    helpfulCount: 211,
    relatedArticleIds: ['KBA-001', 'KBA-013'],
    created_at: '2025-09-20T08:00:00Z',
    updated_at: '2026-02-28T10:00:00Z',
  },
  {
    id: 'KBA-009',
    title: 'Using @mentions in ticket comments',
    slug: 'mentions-in-comments',
    categoryId: 'KBC-003',
    excerpt: 'Tag agents or teammates in comments with @name to notify them directly and keep conversations focused.',
    content: `@mentions let you directly notify a specific person in a ticket comment.\n\n## How to mention someone\n\nWhile typing a comment, type @ followed by the person's name. A dropdown will appear. Click or press Enter to select.\n\nMentioned users receive an in-app notification and an email alert.`,
    tags: ['mentions', 'comments', 'notifications', 'collaboration'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 678,
    helpfulCount: 134,
    relatedArticleIds: ['KBA-001', 'KBA-008'],
    created_at: '2025-10-15T11:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'KBA-010',
    title: 'Connecting Meridian to Slack',
    slug: 'slack-integration',
    categoryId: 'KBC-004',
    excerpt: 'Receive ticket notifications directly in Slack channels and respond to updates without leaving Slack.',
    content: `The Meridian Slack integration sends real-time ticket notifications to your Slack channels.\n\n## Setting up the integration\n\n1. Go to Organisation Settings → Integrations.\n2. Click Connect next to Slack.\n3. Complete the OAuth flow.\n4. Choose the default channel for notifications.\n5. Click Save.`,
    tags: ['slack', 'integration', 'notifications', 'setup'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 812,
    helpfulCount: 156,
    relatedArticleIds: ['KBA-004'],
    created_at: '2025-11-15T09:00:00Z',
    updated_at: '2026-03-10T08:30:00Z',
  },
  {
    id: 'KBA-011',
    title: 'Understanding data retention and deletion',
    slug: 'data-retention',
    categoryId: 'KBC-005',
    excerpt: 'How long Meridian stores your data, what gets deleted when you cancel, and how to request a full data export.',
    content: `Meridian takes data privacy seriously.\n\n## Retention periods\n\n- Active ticket data: until 2 years after closure\n- Audit logs: 5 years\n- Billing records: 7 years\n\n## When you cancel\n\nData is retained for 90 days after cancellation, after which it is permanently deleted.`,
    tags: ['data', 'privacy', 'gdpr', 'retention', 'compliance'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 534,
    helpfulCount: 98,
    relatedArticleIds: [],
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2026-02-15T14:00:00Z',
  },
  {
    id: 'KBA-012',
    title: 'Troubleshooting login issues',
    slug: 'login-issues',
    categoryId: 'KBC-006',
    excerpt: "Can't log in? Common causes include expired passwords, 2FA issues, and browser cookie settings.",
    content: `If you're unable to log in, work through these steps.\n\n## Forgotten password\n\nClick Forgot Password and enter your email. A reset link expires after 1 hour.\n\n## 2FA code not working\n\nMake sure your authenticator app's clock is synchronised. Time drift causes TOTP codes to fail.\n\n## Browser issues\n\nClear cookies, disable extensions, try incognito mode.\n\n## Account locked\n\nAfter 5 failed attempts, accounts lock for 15 minutes.`,
    tags: ['login', 'password', '2fa', 'troubleshooting', 'access'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 2341,
    helpfulCount: 421,
    relatedArticleIds: ['KBA-004'],
    created_at: '2025-09-01T08:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'KBA-013',
    title: 'What to do if attachments fail to upload',
    slug: 'attachment-upload-issues',
    categoryId: 'KBC-006',
    excerpt: "Upload failures are usually caused by file size limits, unsupported formats, or network issues.",
    content: `If an attachment fails to upload, try these steps.\n\n## Check file size\n\nEach file must be under 25MB. Total per ticket: 100MB.\n\n## Check file format\n\nOnly supported types are accepted. Contact support if your format isn't listed.\n\n## Network issues\n\nSwitch to a wired connection or try a different network.`,
    tags: ['attachments', 'upload', 'troubleshooting', 'files', 'error'],
    authorId: 'USR-001',
    isPublished: true,
    viewCount: 312,
    helpfulCount: 54,
    relatedArticleIds: ['KBA-008'],
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
  },
];

function searchKB(query: string, categoryId?: string): KBSearchResult[] {
  const q = query.toLowerCase().trim();
  let articles = MOCK_KB_ARTICLES.filter((a) => a.isPublished);
  if (categoryId) articles = articles.filter((a) => a.categoryId === categoryId);
  if (!q) return articles.slice(0, 10).map((a) => ({ article: a, score: 1, highlights: [] }));

  return articles
    .map((a) => {
      const titleMatch = a.title.toLowerCase().includes(q);
      const excerptMatch = a.excerpt.toLowerCase().includes(q);
      const contentMatch = a.content.toLowerCase().includes(q);
      const tagMatch = a.tags.some((t) => t.toLowerCase().includes(q));
      if (!titleMatch && !excerptMatch && !contentMatch && !tagMatch) return null;
      const score =
        (titleMatch ? 0.5 : 0) + (tagMatch ? 0.25 : 0) +
        (excerptMatch ? 0.15 : 0) + (contentMatch ? 0.1 : 0);
      return { article: a, score: Math.min(score, 1), highlights: titleMatch ? [a.title] : [a.excerpt.slice(0, 80)] };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, 10) as KBSearchResult[];
}

// ── Notifications ─────────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOTIF-C001',
    userId: 'CUST-001',
    type: 'ticket_status_changed' as never,
    title: 'TKT-C001 status updated',
    message: 'Ticket "SSO login broken after Azure AD certificate renewal" has been updated to In Progress.',
    isRead: false,
    resourceType: 'ticket',
    resourceId: 'TKT-C001',
    created_at: '2026-04-16T07:45:00Z',
  },
  {
    id: 'NOTIF-C002',
    userId: 'CUST-001',
    type: 'ticket_comment' as never,
    title: 'New comment on TKT-C001',
    message: 'James Wu commented: "Just to confirm — the password login workaround is working..."',
    isRead: false,
    resourceType: 'ticket',
    resourceId: 'TKT-C001',
    created_at: '2026-04-16T08:00:00Z',
  },
  {
    id: 'NOTIF-C003',
    userId: 'CUST-001',
    type: 'sla_at_risk' as never,
    title: 'SLA at risk — TKT-C001',
    message: 'Resolution SLA for TKT-C001 is at risk. Deadline: 2026-04-17 08:00 UTC.',
    isRead: false,
    resourceType: 'ticket',
    resourceId: 'TKT-C001',
    created_at: '2026-04-15T20:00:00Z',
  },
  {
    id: 'NOTIF-C004',
    userId: 'CUST-001',
    type: 'ticket_created' as never,
    title: 'New ticket from Lucas Fernandez',
    message: 'Lucas Fernandez submitted: "File upload fails silently for files over 20MB".',
    isRead: true,
    resourceType: 'ticket',
    resourceId: 'TKT-C007',
    created_at: '2026-04-16T07:00:00Z',
  },
  {
    id: 'NOTIF-C005',
    userId: 'CUST-001',
    type: 'ticket_status_changed' as never,
    title: 'TKT-C003 acknowledged',
    message: 'Ticket "Email notifications not arriving" has been acknowledged by James Okafor.',
    isRead: true,
    resourceType: 'ticket',
    resourceId: 'TKT-C003',
    created_at: '2026-04-14T14:00:00Z',
  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

const MOCK_TICKET_VOLUME = [
  { date: '2026-03-17', created: 2, resolved: 1, closed: 1 },
  { date: '2026-03-24', created: 1, resolved: 2, closed: 1 },
  { date: '2026-03-31', created: 3, resolved: 1, closed: 2 },
  { date: '2026-04-07', created: 2, resolved: 3, closed: 1 },
  { date: '2026-04-14', created: 4, resolved: 1, closed: 0 },
];

const MOCK_SLA_COMPLIANCE = [
  { period: 'Jan 2026', responseCompliance: 0.95, resolutionCompliance: 0.90, totalTickets: 12, breachedTickets: 1 },
  { period: 'Feb 2026', responseCompliance: 0.97, resolutionCompliance: 0.92, totalTickets: 9, breachedTickets: 1 },
  { period: 'Mar 2026', responseCompliance: 0.93, resolutionCompliance: 0.88, totalTickets: 14, breachedTickets: 2 },
  { period: 'Apr 2026', responseCompliance: 0.88, resolutionCompliance: 0.83, totalTickets: 8, breachedTickets: 1 },
];

const MOCK_RESOLUTION_TRENDS = [
  { period: 'Jan 2026', avgResolutionHours: 18.4, medianResolutionHours: 14.2, p95ResolutionHours: 48.0 },
  { period: 'Feb 2026', avgResolutionHours: 22.1, medianResolutionHours: 18.5, p95ResolutionHours: 56.0 },
  { period: 'Mar 2026', avgResolutionHours: 16.8, medianResolutionHours: 12.0, p95ResolutionHours: 40.0 },
  { period: 'Apr 2026', avgResolutionHours: 28.5, medianResolutionHours: 24.0, p95ResolutionHours: 72.0 },
];

const MOCK_MONTHLY_VOLUME = [
  { month: 'Oct 2025', created: 8,  resolved: 6  },
  { month: 'Nov 2025', created: 11, resolved: 9  },
  { month: 'Dec 2025', created: 5,  resolved: 7  },
  { month: 'Jan 2026', created: 14, resolved: 11 },
  { month: 'Feb 2026', created: 9,  resolved: 10 },
  { month: 'Mar 2026', created: 16, resolved: 13 },
  { month: 'Apr 2026', created: 12, resolved: 14 },
];

const MOCK_CATEGORY_BREAKDOWN = [
  { category: 'Technical',   count: 28, percentage: 35 },
  { category: 'Billing',     count: 22, percentage: 28 },
  { category: 'Account',     count: 16, percentage: 20 },
  { category: 'Integration', count: 8,  percentage: 10 },
  { category: 'Other',       count: 6,  percentage: 7  },
];

const MOCK_SEVERITY_DISTRIBUTION = [
  { priority: 'CRITICAL', count: 4,  percentage: 5  },
  { priority: 'HIGH',     count: 14, percentage: 18 },
  { priority: 'MEDIUM',   count: 35, percentage: 44 },
  { priority: 'LOW',      count: 27, percentage: 34 },
];

const MOCK_RESOLUTION_BY_SEVERITY = [
  { priority: 'CRITICAL', avgHours: 2.8  },
  { priority: 'HIGH',     avgHours: 7.4  },
  { priority: 'MEDIUM',   avgHours: 16.2 },
  { priority: 'LOW',      avgHours: 39.5 },
];

const MOCK_USER_PREFERENCES = {
  accentColor: 'cobalt' as const,
  colorMode: 'system' as const,
  density: 'comfortable' as const,
  emailOnNewReply: true,
  emailOnStatusChange: true,
  emailOnMention: true,
  emailDigest: false,
  browserPush: false,
};

// ── AI — classify-text (text-based, no ticket ID needed) ──────────────────────
// Real implementation would call an LLM with the title+description.
// Mock: returns a deterministic result based on keywords in the input.

function classifyText(body: string): unknown {
  const text = body.toLowerCase();
  let category = TicketCategory.SUPPORT;
  let priority = TicketPriority.MEDIUM;
  let catConf = 0.72;
  let priConf = 0.70;
  let catReasoning = 'Description matches general support request patterns.';
  let priReasoning = 'No strong urgency signals detected; defaulting to Medium.';
  const priFactors: string[] = ['Issue reported without explicit urgency'];

  if (text.includes('error') || text.includes('bug') || text.includes('broken') || text.includes('fail') || text.includes('crash')) {
    category = TicketCategory.BUG;
    catConf = 0.89;
    catReasoning = 'Description contains error/failure language consistent with a bug report.';
  } else if (text.includes('feature') || text.includes('request') || text.includes('enhance') || text.includes('would like') || text.includes('add support')) {
    category = TicketCategory.FEATURE_REQUEST;
    catConf = 0.85;
    catReasoning = 'Description uses feature request language (request/enhance/would like).';
  } else if (text.includes('how') || text.includes('question') || text.includes('help') || text.includes('explain') || text.includes('understand')) {
    category = TicketCategory.QUESTION;
    catConf = 0.83;
    catReasoning = 'Description phrased as a question or request for explanation.';
  } else if (text.includes('outage') || text.includes('down') || text.includes('incident') || text.includes('production') || text.includes('critical')) {
    category = TicketCategory.INCIDENT;
    catConf = 0.91;
    catReasoning = 'Description includes incident/outage language affecting production.';
  }

  if (text.includes('all users') || text.includes('everyone') || text.includes('production') || text.includes('outage') || text.includes('locked out')) {
    priority = TicketPriority.CRITICAL;
    priConf = 0.88;
    priReasoning = 'Multiple users affected or production system involved.';
    priFactors.push('Wide user impact', 'Production system affected');
  } else if (text.includes('broken') || text.includes('fail') || text.includes('error') || text.includes('not working') || text.includes('cannot')) {
    priority = TicketPriority.HIGH;
    priConf = 0.82;
    priReasoning = 'Functional failure detected with no stated workaround.';
    priFactors.push('Functionality broken', 'No workaround mentioned');
  } else if (text.includes('slow') || text.includes('performance') || text.includes('occasionally') || text.includes('sometimes')) {
    priority = TicketPriority.MEDIUM;
    priConf = 0.76;
    priReasoning = 'Performance or intermittent issue — not blocking but affects experience.';
    priFactors.push('Intermittent or performance issue');
  }

  return {
    data: {
      category,
      priority,
      categoryConfidence: catConf,
      priorityConfidence: priConf,
      categoryReasoning: catReasoning,
      priorityReasoning: priReasoning,
      priorityFactors: priFactors,
    },
  };
}

// ── AI Digest ─────────────────────────────────────────────────────────────────
// Derives a dashboard digest from the mock ticket data. The real backend would
// run this computation server-side across the full tenant dataset.

function computeAIDigest(): unknown {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── At-risk tickets: resolution SLA state is 'at_risk' ──────────────────────
  const atRiskTickets = MOCK_TICKETS
    .filter((t) =>
      t.sla?.resolutionState === ('at_risk' as never) &&
      t.status !== TicketStatus.RESOLVED &&
      t.status !== TicketStatus.CLOSED
    )
    .map((t) => {
      const hoursLeft = t.sla?.resolutionDeadline
        ? Math.max(0, Math.round((new Date(t.sla.resolutionDeadline).getTime() - now.getTime()) / 3_600_000))
        : null;
      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        reason: hoursLeft !== null
          ? `Resolution deadline in ${hoursLeft}h`
          : 'Resolution SLA at risk',
        urgency: (t.priority === TicketPriority.CRITICAL || (hoursLeft !== null && hoursLeft < 4)) ? 'high' : 'medium',
        deadlineAt: t.sla?.resolutionDeadline,
      };
    });

  // ── Tag pattern detection: tags appearing in 2+ tickets ─────────────────────
  const tagMap = new Map<string, { count: number; ticketIds: string[] }>();
  MOCK_TICKETS.forEach((t) => {
    if (t.status === TicketStatus.CLOSED) return; // ignore closed
    t.tags.forEach((tag) => {
      if (!tagMap.has(tag)) tagMap.set(tag, { count: 0, ticketIds: [] });
      const entry = tagMap.get(tag)!;
      entry.count += 1;
      entry.ticketIds.push(t.id);
    });
  });
  const patterns = Array.from(tagMap.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([tag, v]) => ({
      label: `${v.count} tickets tagged "${tag}"`,
      ticketCount: v.count,
      tags: [tag],
      suggestion: 'This may indicate a recurring issue. Consider creating a KB article.',
    }));

  // ── Response gaps: active tickets with no activity in 2+ days ───────────────
  const responseGaps = MOCK_TICKETS
    .filter((t) =>
      t.status !== TicketStatus.RESOLVED &&
      t.status !== TicketStatus.CLOSED &&
      new Date(t.updated_at) < twoDaysAgo
    )
    .map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      waitingDays: Math.floor((now.getTime() - new Date(t.updated_at).getTime()) / 86_400_000),
      // In mock data we can't know who replied last, so we default to 'agent'
      // The real backend checks last comment author vs the client's org
      waitingFor: 'agent' as const,
    }));

  // ── Stale tickets: unresolved and older than 7 days (for admin KPI) ──────────
  const stalledCount = MOCK_TICKETS.filter((t) =>
    t.status !== TicketStatus.RESOLVED &&
    t.status !== TicketStatus.CLOSED &&
    new Date(t.created_at) < sevenDaysAgo
  ).length;

  const needsAttentionCount = atRiskTickets.length + responseGaps.filter((g) => g.waitingFor === 'client').length;

  const summaryParts: string[] = [];
  if (atRiskTickets.length > 0) summaryParts.push(`${atRiskTickets.length} ticket${atRiskTickets.length !== 1 ? 's' : ''} at SLA risk`);
  if (responseGaps.length > 0) summaryParts.push(`${responseGaps.length} awaiting a response`);
  if (patterns.length > 0) summaryParts.push(`${patterns.length} recurring pattern${patterns.length !== 1 ? 's' : ''} detected`);

  return {
    data: {
      generatedAt: now.toISOString(),
      needsAttentionCount,
      needsAttentionSummary: needsAttentionCount > 0
        ? `${needsAttentionCount} ticket${needsAttentionCount !== 1 ? 's' : ''} need your attention right now.`
        : 'Everything looks on track — no tickets need immediate attention.',
      atRiskTickets,
      patterns,
      responseGaps,
      stalledCount,
      digestSummary: summaryParts.length > 0 ? summaryParts.join(', ') + '.' : 'All tickets are on track.',
    },
  };
}

// ── Route table ───────────────────────────────────────────────────────────────

type RouteHandler = (url: string, method: string, body?: unknown) => unknown;

const routes: Array<{ test: (path: string, method: string) => boolean; handle: RouteHandler }> = [

  // ── Auth ──────────────────────────────────────────────────────────────────
  { test: (p, m) => m === 'POST' && p.endsWith('/user/login'), handle: () => MOCK_LOGIN_RESPONSE },
  { test: (p, m) => m === 'GET' && p.includes('/user/auth/session'), handle: () => MOCK_SESSION_RESPONSE },
  { test: (p, m) => m === 'POST' && p.includes('/auth/logout'), handle: () => ({ success: true }) },
  { test: (p, m) => m === 'POST' && p.includes('/token/refresh'), handle: () => MOCK_SESSION_RESPONSE },
  { test: (p, m) => m === 'POST' && p.includes('/auth/reset-password'), handle: () => ({ success: true, message: 'If this email is registered, a reset link has been sent.' }) },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  { test: (p, m) => m === 'GET' && p.includes('/dashboard/kpis'), handle: () => ({ data: MOCK_DASHBOARD }) },

  // ── Tickets: list ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.endsWith('/tickets/list'),
    handle: (url) => {
      const params = qp(url);
      const page = parseInt(params.get('page') ?? '1', 10);
      const page_size = parseInt(params.get('page_size') ?? '25', 10);
      const search = (params.get('search') ?? '').toLowerCase();
      const statuses = params.getAll('status');
      const priorities = params.getAll('priority');

      let filtered = [...MOCK_TICKETS];
      // For CLIENT_USER, only show their own tickets
      if (ACTIVE_PERSONA_KEY === 'CLIENT_USER') {
        filtered = filtered.filter((t) => t.createdBy === ACTIVE_USER.id);
      }
      if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search) || t.ticketNumber.toLowerCase().includes(search));
      if (statuses.length) filtered = filtered.filter((t) => statuses.includes(t.status));
      if (priorities.length) filtered = filtered.filter((t) => priorities.includes(t.priority));

      filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const paged = paginate(filtered, page, page_size);
      return { ...paged, meta: { total: paged.total, page: paged.page, total_pages: paged.total_pages, page_size: paged.page_size } };
    },
  },

  // ── Tickets: single ───────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/tickets\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'tickets');
      const ticket = MOCK_TICKETS.find((t) => t.id === id || t.ticketNumber === id);
      if (!ticket) return jsonResponse({ error: 'Not found' }, 404);
      return { data: ticket };
    },
  },

  // ── Tickets: create ───────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && /\/tickets$/.test(p),
    handle: (_url, _method, body) => {
      const payload = (body ?? {}) as Record<string, unknown>;
      const newTicket: Ticket = {
        id: `TKT-C${String(Date.now()).slice(-4)}`,
        ticketNumber: `TKT-C${String(Date.now()).slice(-4)}`,
        title: String(payload.title ?? 'New Ticket'),
        description: String(payload.description ?? ''),
        status: TicketStatus.OPEN,
        priority: (payload.priority as TicketPriority) ?? TicketPriority.MEDIUM,
        category: (payload.category as TicketCategory) ?? TicketCategory.SUPPORT,
        tags: (payload.tags as string[]) ?? [],
        createdBy: ACTIVE_USER.id,
        organizationId: ACTIVE_USER.organizationId,
        projectId: payload.projectId as string | undefined,
        attachments: [],
        commentCount: 0,
        creator: ACTIVE_USER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { data: newTicket };
    },
  },

  // ── Tickets: update ───────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'PATCH' && p.includes('/tickets/'),
    handle: (url, _method, body) => {
      const id = extractAfter(url, 'tickets');
      const ticket = MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0];
      const payload = (body ?? {}) as Partial<Ticket>;
      return { data: { ...ticket, ...payload, updated_at: new Date().toISOString() } };
    },
  },

  // ── Tickets: transition ───────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/transition'),
    handle: (url, _method, body) => {
      const id = extractAfter(url, 'tickets');
      const ticket = MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0];
      const payload = (body ?? {}) as { toStatus?: TicketStatus };
      const newStatus = payload.toStatus ?? ticket.status;
      return {
        data: {
          ...ticket,
          status: newStatus,
          resolved_at: newStatus === TicketStatus.RESOLVED ? new Date().toISOString() : ticket.resolved_at,
          closed_at: newStatus === TicketStatus.CLOSED ? new Date().toISOString() : ticket.closed_at,
          updated_at: new Date().toISOString(),
        },
      };
    },
  },

  // ── Comments ──────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/comments'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'tickets');
      return MOCK_COMMENTS[ticketId] ?? [];
    },
  },
  {
    test: (p, m) => m === 'POST' && p.includes('/comments'),
    handle: (_url, _method, body) => {
      const payload = (body ?? {}) as Record<string, unknown>;
      return {
        data: {
          id: `CMT-${Date.now()}`,
          ticketId: payload.ticket_id ?? '',
          authorId: ACTIVE_USER.id,
          author: ACTIVE_USER,
          content: String(payload.message ?? ''),
          isInternal: false,
          attachments: [],
          mentions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    },
  },

  // ── Attachments ───────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/attachments'),
    handle: (_url, _method, body) => {
      const payload = (body ?? {}) as Record<string, unknown>;
      return {
        data: {
          id: Date.now(),
          file_name: String(payload.file_name ?? 'file'),
          file_type: String(payload.file_type ?? 'application/octet-stream'),
          file_path: String(payload.file_path ?? '#'),
          tenant_id: ACTIVE_USER.organizationId,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      };
    },
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/projects$/.test(p),
    handle: (url) => {
      const page = parseInt(qp(url).get('page') ?? '1', 10);
      return paginate(MOCK_PROJECTS, page, 20);
    },
  },
  {
    test: (p, m) => m === 'GET' && /\/projects\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0] };
    },
  },

  // ── AI Projects (client-facing subset) ───────────────────────────────────
  // Status report — clients see narrative summary, no churn risk
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/status-report$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_CP_PROJECT_STATUS_REPORTS[id] ?? null };
    },
  },
  // Milestone predictions — client-safe delivery confidence view
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/milestone-predictions$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_CP_MILESTONE_PREDICTIONS[id] ?? [] };
    },
  },
  // Ask AI about project history — scoped to client's own project
  {
    test: (p, m) => m === 'POST' && /\/ai\/projects\/[^/]+\/ask$/.test(p),
    handle: async (_url, _method, body) => {
      const parsed = body ? JSON.parse(body) : {};
      const q = (parsed.question as string ?? '').toLowerCase();
      let answer = 'I don\'t have a specific answer for that question based on the project history. Please raise a ticket if you need further clarification from the team.';
      if (q.includes('migration') || q.includes('data')) {
        answer = 'Data Migration Phase 1 is currently in progress and on track for April 30. The team is processing your field mapping document. Once confirmed, the migration pipeline will run and results will be available for your review before UAT.';
      } else if (q.includes('sso') || q.includes('login') || q.includes('saml')) {
        answer = 'The SSO integration is underway. Your Azure AD metadata has been received and SAML endpoints are being configured. A test login link will be sent by April 19. Once confirmed, we\'ll proceed with role mapping.';
      } else if (q.includes('milestone') || q.includes('deadline') || q.includes('date')) {
        answer = 'Your current milestones are: Infrastructure Setup (complete), Data Migration Phase 1 (due April 30 — on track), and UAT & Sign-off (due June 15 — on track). The AI is 89% confident both remaining milestones will be met on schedule.';
      } else if (q.includes('ticket') || q.includes('issue') || q.includes('open')) {
        answer = 'You currently have 3 open tickets on the Acme Platform Migration project. 2 were resolved this week. The open items are being actively worked by your assigned team. You can view full details in the ticket section.';
      }
      return { data: { answer, confidence: 0.82, sourceTicketIds: [], cannotAnswer: false } };
    },
  },

  // ── Knowledge Base: categories ────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/knowledge-base/categories'),
    handle: () => ({ data: MOCK_KB_CATEGORIES }),
  },

  // ── Knowledge Base: search ────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/knowledge-base/search'),
    handle: (url) => {
      const params = qp(url);
      return { data: searchKB(params.get('query') ?? '', params.get('categoryId') ?? undefined) };
    },
  },

  // ── Knowledge Base: helpful vote ──────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/knowledge-base/articles/') && p.includes('/helpful'),
    handle: (url) => {
      const parts = getPath(url).split('/');
      const idx = parts.lastIndexOf('articles');
      const id = parts[idx + 1];
      const article = MOCK_KB_ARTICLES.find((a) => a.id === id);
      if (article) article.helpfulCount += 1;
      return { data: { success: true } };
    },
  },

  // ── Knowledge Base: single article ────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/knowledge-base\/articles\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'articles');
      const article = MOCK_KB_ARTICLES.find((a) => a.id === id || a.slug === id);
      if (!article) return jsonResponse({ error: 'Not found' }, 404);
      return { data: article };
    },
  },

  // ── AI — KB Deflection (pre-ticket query → related articles) ────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/kb-deflect'),
    handle: (url) => {
      const query = (qp(url).get('query') ?? '').toLowerCase();
      const limit = parseInt(qp(url).get('limit') ?? '5', 10);
      const words = query.split(/\s+/).filter((w) => w.length > 3);
      const suggestions = MOCK_KB_ARTICLES
        .filter((a) => a.isPublished)
        .map((a) => {
          const matchCount = words.filter((w) => a.title.toLowerCase().includes(w) || a.excerpt.toLowerCase().includes(w) || a.tags.some((t: string) => t.includes(w))).length;
          const score = Math.min(0.3 + (matchCount / Math.max(words.length, 1)) * 0.7, 1);
          return { articleId: a.id, title: a.title, excerpt: a.excerpt, score, reasoning: 'Similar topic found in knowledge base' };
        })
        .filter((s) => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return { data: suggestions };
    },
  },

  // ── AI — KB Ask / RAG ─────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/kb-ask'),
    handle: async (_url, _method, body) => {
      const parsed = (body ?? {}) as { question?: string };
      const question = (parsed.question ?? '').toLowerCase();
      const matchingArticles = MOCK_KB_ARTICLES
        .filter((a) => a.isPublished && (a.title.toLowerCase().split(' ').some((w: string) => w.length > 4 && question.includes(w)) || a.tags.some((t: string) => question.includes(t))))
        .slice(0, 3);
      const canAnswer = matchingArticles.length > 0;
      return {
        data: {
          answer: canAnswer
            ? `Based on our knowledge base: ${matchingArticles[0].excerpt} For full details, see the linked article${matchingArticles.length > 1 ? 's' : ''} below.`
            : "I couldn't find a specific answer in our knowledge base for that question. Please create a support ticket and our team will help you directly.",
          confidence: canAnswer ? 0.72 + Math.random() * 0.2 : 0.1,
          sourceArticleIds: matchingArticles.map((a: KBArticle) => a.id),
          followUpQuestions: canAnswer
            ? [`How do I change my ${matchingArticles[0].tags[0] ?? 'settings'}?`, 'What are the system requirements?', 'Can I get a refund?']
            : [],
          cannotAnswer: !canAnswer,
        },
      };
    },
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/notifications$/.test(p),
    handle: (url) => {
      const unreadOnly = qp(url).get('unreadOnly') === 'true';
      const items = unreadOnly ? MOCK_NOTIFICATIONS.filter((n) => !n.isRead) : MOCK_NOTIFICATIONS;
      return paginate(items, 1, 50);
    },
  },
  { test: (p, m) => m === 'POST' && p.includes('/notifications/'), handle: () => ({ data: { success: true } }) },

  // ── Users ─────────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/users$/.test(p),
    handle: (url) => {
      const search = (qp(url).get('search') ?? '').toLowerCase();
      const filtered = search ? MOCK_TEAM_MEMBERS.filter((u) => u.displayName.toLowerCase().includes(search)) : MOCK_TEAM_MEMBERS;
      return paginate(filtered, 1, 20);
    },
  },
  {
    test: (p, m) => m === 'GET' && /\/users\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'users');
      return { data: MOCK_TEAM_MEMBERS.find((u) => u.id === id) ?? ACTIVE_USER };
    },
  },
  { test: (p, m) => m === 'POST' && p.includes('/users/invite'), handle: () => ({ data: { success: true } }) },
  { test: (p, m) => (m === 'PATCH' || m === 'DELETE') && /\/users\/[^/]+$/.test(p), handle: () => ({ data: { success: true } }) },

  // ── Organizations ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/organizations$/.test(p),
    handle: () => paginate([{
      id: 'ORG-002', name: 'Acme Corp', slug: 'acme-corp',
      domain: 'acmecorp.com', isActive: true, plan: 'enterprise',
      created_at: '2024-06-01T00:00:00Z', updated_at: '2026-04-10T00:00:00Z',
    }], 1, 20),
  },
  { test: (p, m) => m === 'PATCH' && p.includes('/organizations/'), handle: () => ({ data: { success: true } }) },

  // ── Analytics ────────────────────────────────────────────────────────────
  { test: (p, m) => m === 'GET' && p.includes('/analytics/ticket-volume'),        handle: () => ({ data: MOCK_TICKET_VOLUME }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/sla-compliance'),       handle: () => ({ data: MOCK_SLA_COMPLIANCE }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/resolution-trends'),    handle: () => ({ data: MOCK_RESOLUTION_TRENDS }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/agent-performance'),    handle: () => ({ data: [] }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/monthly-volume'),       handle: () => ({ data: MOCK_MONTHLY_VOLUME }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/category-breakdown'),   handle: () => ({ data: MOCK_CATEGORY_BREAKDOWN }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/severity-distribution'),handle: () => ({ data: MOCK_SEVERITY_DISTRIBUTION }) },
  { test: (p, m) => m === 'GET' && p.includes('/analytics/resolution-by-severity'),handle: () => ({ data: MOCK_RESOLUTION_BY_SEVERITY }) },

  // ── User Preferences ─────────────────────────────────────────────────────
  { test: (p, m) => m === 'GET' && p.includes('/users/me/preferences'), handle: () => ({ data: MOCK_USER_PREFERENCES }) },
  {
    test: (p, m) => m === 'PATCH' && p.includes('/users/me/preferences'),
    handle: (_url, _method, body) => {
      const patch = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
      return { data: { ...MOCK_USER_PREFERENCES, ...patch } };
    },
  },

  // ── AI — classify-text ────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/classify-text'),
    handle: (_url, _method, body) => {
      const payload = (body ?? {}) as { title?: string; description?: string };
      const combinedText = `${payload.title ?? ''} ${payload.description ?? ''}`;
      return classifyText(combinedText);
    },
  },

  // ── AI — Digest (customer dashboard) ─────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.endsWith('/ai/digest'),
    handle: () => computeAIDigest(),
  },

  // ── AI — Summary (used on ticket detail) ─────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/summary/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'summary');
      const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
      return {
        data: {
          id: `AI-SUM-${ticketId}`,
          type: 'summary',
          ticketId,
          suggestion: {
            summary: ticket ? `Ticket regarding "${ticket.title}". Current status: ${ticket.status}. ${ticket.commentCount} comments.` : 'No summary available.',
            keyPoints: ticket ? [
              `Priority: ${ticket.priority}`,
              `Category: ${ticket.category}`,
              `Created: ${ticket.created_at.slice(0, 10)}`,
              ticket.assignedTo ? 'Assigned to a 3SC agent' : 'Not yet assigned',
            ] : [],
            sentiment: 'neutral',
            confidence: 0.78,
          },
          confidence: 0.78,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      };
    },
  },
];

// ── Mock fetch installer ──────────────────────────────────────────────────────

export function installMockHandler(): void {
  sessionStorage.setItem('tenant_id', MOCK_API_USER.tenant_id);
  sessionStorage.setItem('user_id', String(MOCK_API_USER.user_id));

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    const method = (
      init?.method ??
      (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).method : undefined) ??
      'GET'
    ).toUpperCase();

    const path = getPath(rawUrl);

    // Parse request body for POST/PATCH handlers
    let parsedBody: unknown;
    if (init?.body) {
      try { parsedBody = JSON.parse(init.body as string); } catch { parsedBody = init.body; }
    }

    for (const route of routes) {
      let matched = false;
      try { matched = route.test(path, method); } catch { continue; }

      if (matched) {
        await delay(SIMULATED_DELAY_MS);
        try {
          const result = await Promise.resolve(route.handle(rawUrl, method, parsedBody));
          if (result instanceof Response) return result;
          return jsonResponse(result);
        } catch (err) {
          console.error('[Mock] Handler threw for', method, path, err);
          return jsonResponse({ error: 'Mock handler error' }, 500);
        }
      }
    }

    console.warn('[Mock] No mock for:', method, path, '— passing through');
    return jsonResponse({ error: 'No mock handler' }, 501);
  };

  console.info(
    '%c[Meridian Customer Portal Mock API] ✓ Active',
    'color: #34d399; font-weight: 600; font-size: 12px;',
  );
}
