// ═══════════════════════════════════════════════════════════════
// @3sc/api — RTK Query API Layer
// ═══════════════════════════════════════════════════════════════

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { API_CONFIG, AUTH_CONFIG, PORTAL_CONFIG } from '@3sc/config';
import type {
  Ticket,
  TicketCreatePayload,
  TicketUpdatePayload,
  TicketTransitionPayload,
  BulkTicketUpdatePayload,
  BulkTicketUpdateResult,
  TicketFilters,
  Comment,
  CommentCreatePayload,
  Attachment,

  AttachmentRecord,
  PresignedUpload,
  Project,
  Milestone,
  KBArticle,
  KBSearchResult,
  KBCategory,
  Notification,
  DashboardSummary,
  TicketVolumeData,
  SLAComplianceData,
  ResolutionTrendData,
  AgentPerformance,
  AnalyticsFilters,
  MonthlyVolumeData,
  CategoryBreakdownData,
  SeverityDistributionData,
  ResolutionBySeverityData,
  CsatKpiData,
  CsatTrendData,
  NpsBreakdownData,
  FeedbackThemeData,
  UserPreferences,
  UserPreferencesUpdatePayload,
  User,
  Organization,
  AuditLogEntry,
  RoutingRule,
  AISuggestion,
  AIClassificationSuggestion,
  AIPrioritySuggestion,
  AIRoutingSuggestion,
  AIReplySuggestion,
  AISummarySuggestion,
  AIETASuggestion,
  AISearchResult,
  AITextClassificationResult,
  AIDigest,
  AIKBSuggestion,
  AIKBDraftResult,
  AIKBGap,
  AIKBAnswer,
  ProjectHealthScore,
  ProjectTicketCluster,
  ProjectScopeDrift,
  ProjectChurnRisk,
  ProjectStatusReport,
  ProjectQAAnswer,
  ProjectNextBestAction,
  ProjectKnowledgeEntry,
  ProjectMilestonePrediction,
  PaginatedResponse,
  ApiResponse,
  SessionInfo,
  LoginCredentials,
  UserRole,
  InviteUserPayload,
  DeliveryFeature,
  DeliveryStatus,
  DeliveryFeatureCreatePayload,
  DeliveryRiskItem,
  DeliveryPrioritisedFeature,
  DeliveryFeatureDraft,
  OnboardingProject,
  OnboardingTaskUpdatePayload,
  OnboardingCreatePayload,
  OnboardingUpdatePayload,
  OnboardingHealthPrediction,
  OnboardingBlockerSummary,
  OnboardingNextAction,
  FeatureRequest,
  FeatureRequestClassification,
  RoadmapPersonalisedSummary,
  EscalatedTicket,
  EscalationAssignPayload,
  EscalationResolvePayload,
  // User management extensions
  Skill,
  UserSkill,
  UserWorkload,
  UserWorkloadUpdatePayload,
  PermissionOverride,
  PermissionOverridePayload,
  AssignmentScoringWeights,
  AssignmentScoringWeightsPayload,
  AgentAssignSuggestion,
  SkillGap,
  Permission,
  SLAPolicy,
  SLAPolicyUpdatePayload,
  SystemSettings,
  SystemSettingsUpdatePayload,
  // Documents
  Document,
  DocumentCreatePayload,
  DocumentUpdatePayload,
  DocumentStats,
  DocumentDepartment,
} from '@3sc/types';
import { SLAState } from '@3sc/types';

// ── Raw API shapes (snake_case from backend) ────────────────────
interface RawApiAttachment {
  id: string;
  file_name?: string;
  file_type?: string;
  file_path?: string;
  filename?: string;
  mime_type?: string;
  storage_key?: string;
  size_bytes?: number;
  uploaded_by?: string;
  tenant_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface RawApiComment {
  id: number;
  ticket_id: number;
  tenant_id: string;
  user_id: number;
  parent_id: number | null;
  message: string;
  is_deleted: boolean;
  attachments: RawApiAttachment[];
  mentions: number[];
  created_at: string;
  updated_at: string;
}

function mapRawComment(raw: RawApiComment): import('@3sc/types').Comment {
  return {
    id: String(raw.id),
    ticketId: String(raw.ticket_id),
    authorId: String(raw.user_id),
    content: raw.message,
    isInternal: false,
    parentId: raw.parent_id != null ? String(raw.parent_id) : undefined,
    attachments: raw.attachments.map((a) => ({
      id: String(a.id),
      fileName: a.filename ?? a.file_name ?? '',
      fileSize: a.size_bytes ?? 0,
      mimeType: a.mime_type ?? a.file_type ?? 'application/octet-stream',
      url: '',
      uploadedBy: a.uploaded_by ?? raw.tenant_id ?? '',
      created_at: a.created_at,
    })),
    mentions: raw.mentions.map(String),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

// ── Raw Ticket shape (snake_case from backend) ──────────────────
interface RawApiTicketUser {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email: string;
  avatar_url: string | null;
}

interface RawApiTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  requester_id: string | null;
  assignee_id: string | null;
  tenant_id: string;
  project_id?: string | null;
  sla_policy_id: string | null;
  sla_deadline_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  comment_count?: number;
  attachment_count?: number;
  creator?: RawApiTicketUser;
  requester?: RawApiTicketUser;
  assignee?: RawApiTicketUser | null;
  _count?: { comments: number };
  comments?: RawApiComment[];
  attachments?: RawApiAttachment[];
}

function mapRawTicketUser(raw?: RawApiTicketUser | null): import('@3sc/types').User | undefined {
  if (!raw) return undefined;
  const displayName =
    raw.display_name ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') ||
    raw.email;
  return {
    id: raw.id,
    email: raw.email,
    displayName,
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    avatarUrl: raw.avatar_url ?? undefined,
    role: (raw.role ?? 'CLIENT_USER') as import('@3sc/types').UserRole,
    permissions: [],
    organizationId: '',
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as import('@3sc/types').User;
}

function computeSla(raw: RawApiTicket): import('@3sc/types').SLAInfo | undefined {
  if (!raw.sla_deadline_at) return undefined;
  const deadline = new Date(raw.sla_deadline_at);
  const now = Date.now();
  const msRemaining = deadline.getTime() - now;
  const isResolved = !!(raw.resolved_at || raw.closed_at);

  let resolutionState: import('@3sc/types').SLAState;
  let resolutionMet: boolean;
  if (isResolved) {
    const resolvedAt = new Date(raw.resolved_at ?? raw.closed_at!);
    resolutionMet = resolvedAt <= deadline;
    resolutionState = resolutionMet ? SLAState.MET : SLAState.BREACHED;
  } else if (msRemaining < 0) {
    resolutionMet = false;
    resolutionState = SLAState.BREACHED;
  } else if (msRemaining < 2 * 60 * 60 * 1000) {
    resolutionMet = false;
    resolutionState = SLAState.AT_RISK;
  } else {
    resolutionMet = false;
    resolutionState = SLAState.ON_TRACK;
  }

  const responseMet = !!raw.first_response_at;
  let responseState: import('@3sc/types').SLAState;
  if (responseMet) {
    responseState = SLAState.MET;
  } else if (msRemaining < 0) {
    responseState = SLAState.BREACHED;
  } else if (msRemaining < 30 * 60 * 1000) {
    responseState = SLAState.AT_RISK;
  } else {
    responseState = SLAState.ON_TRACK;
  }

  return {
    resolutionDeadline: raw.sla_deadline_at,
    resolutionState,
    resolutionMet,
    responseDeadline: raw.sla_deadline_at,
    responseState,
    responseMet,
  };
}

function mapRawTicket(raw: RawApiTicket): import('@3sc/types').Ticket {
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number,
    title: raw.title,
    description: raw.description ?? '',
    status: raw.status as import('@3sc/types').TicketStatus,
    priority: raw.priority as import('@3sc/types').TicketPriority,
    category: raw.category as import('@3sc/types').TicketCategory,
    tags: raw.tags ?? [],
    createdBy: raw.requester_id ?? '',
    assignedTo: raw.assignee_id ?? undefined,
    organizationId: raw.tenant_id,
    projectId: raw.project_id ?? undefined,
    sla: computeSla(raw),
    attachments: (raw.attachments ?? []).map((a) => ({
      id: String(a.id),
      fileName: a.filename ?? a.file_name ?? '',
      fileSize: a.size_bytes ?? 0,
      mimeType: a.mime_type ?? a.file_type ?? 'application/octet-stream',
      url: '',
      uploadedBy: a.uploaded_by ?? raw.tenant_id ?? '',
      created_at: a.created_at,
    })),
    commentCount: raw.comment_count ?? raw._count?.comments ?? 0,
    creator: mapRawTicketUser(raw.creator ?? raw.requester),
    assignee: mapRawTicketUser(raw.assignee ?? undefined),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    resolved_at: raw.resolved_at ?? undefined,
    closed_at: raw.closed_at ?? undefined,
  };
}

function mapRawUser(raw: any): import('@3sc/types').User {
  if (!raw) return raw;
  const displayName =
    raw.displayName ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') ||
    raw.email ||
    '';
  return {
    id: raw.id,
    email: raw.email ?? '',
    displayName,
    firstName: raw.first_name ?? raw.firstName ?? '',
    lastName: raw.last_name ?? raw.lastName ?? '',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? undefined,
    role: (raw.role ?? 'CLIENT_USER') as import('@3sc/types').UserRole,
    permissions: raw.permissions ?? [],
    organizationId: raw.tenant_id ?? raw.organizationId ?? '',
    isActive: raw.is_active ?? raw.isActive ?? true,
    lastLoginAt: raw.last_login_at ?? raw.lastLoginAt ?? undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
    internalSubRole: raw.internal_sub_role ?? raw.internalSubRole ?? undefined,
    department: raw.department ?? undefined,
    timezone: raw.timezone ?? undefined,
    mfaEnabled: raw.mfaEnabled ?? raw.mfa_enabled ?? undefined,
    skills: raw.skills ?? undefined,
    workload: raw.workload ?? undefined,
    permissionOverrides: raw.permissionOverrides ?? raw.permission_overrides ?? undefined,
  };
}

function mapRawRoutingRule(raw: any): import('@3sc/types').RoutingRule {
  const conditions: import('@3sc/types').RoutingCondition[] = Array.isArray(raw.condition)
    ? raw.condition
    : Array.isArray(raw.conditions)
      ? raw.conditions
      : [];
  const assignTo: string =
    (raw.action as any)?.assignTo ??
    (raw.action as any)?.assign_to ??
    raw.assign_to ??
    raw.assignTo ??
    '';
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? undefined,
    conditions,
    assignTo,
    priority: raw.priority ?? 0,
    isActive: raw.is_active ?? raw.isActive ?? true,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

function routingRuleToBackend(rule: Partial<import('@3sc/types').RoutingRule>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (rule.name !== undefined) out.name = rule.name;
  if (rule.description !== undefined) out.description = rule.description;
  if (rule.conditions !== undefined) out.condition = rule.conditions;
  if (rule.assignTo !== undefined) out.action = { assignTo: rule.assignTo };
  if (rule.priority !== undefined) out.priority = rule.priority;
  if (rule.isActive !== undefined) out.is_active = rule.isActive;
  return out;
}

// ── Base Query with Auth Retry ──────────────────────────────────
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.baseUrl,
  credentials: 'include', // Send HttpOnly cookies with every request
  timeout: API_CONFIG.timeout,
  prepareHeaders: (headers) => {
    headers.set('X-Portal-Type', PORTAL_CONFIG.type);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Inject tenant_id into every request's query params
  const state = api.getState() as { auth?: { session?: { tenantId?: string } } };
  const tenantId = state.auth?.session?.tenantId;

  let adjustedArgs = args;
  if (tenantId) {
    const base: FetchArgs = typeof args === 'string' ? { url: args } : { ...args };
    base.params = { tenant_id: tenantId, ...(base.params ?? {}) };
    adjustedArgs = base;
  }

  let result = await rawBaseQuery(adjustedArgs, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Attempt token refresh
    const refreshResult = await rawBaseQuery(
      { url: AUTH_CONFIG.refreshPath, method: 'POST' },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      // Retry original request
      result = await rawBaseQuery(adjustedArgs, api, extraOptions);
    } else {
      // Dispatch session expired event
      api.dispatch({ type: 'auth/sessionExpired' });
    }
  }

  return result;
};

// ── API Definition ──────────────────────────────────────────────
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Ticket', 'TicketList', 'Comment', 'Attachment',
    'Project', 'Milestone', 'KBArticle', 'KBCategory',
    'Notification', 'User', 'Organization', 'AuditLog',
    'Analytics', 'Dashboard', 'RoutingRule', 'AI',
    'Session', 'UserPreferences', 'Delivery', 'Onboarding', 'Roadmap', 'Escalations',
    'SLAPolicy', 'SystemSettings', 'SimilarTickets', 'CopilotHistory', 'CopilotSessions',
    'Document', 'DocumentList', 'DocumentStats',
  ],
  endpoints: (builder) => ({
    // ── Auth ────────────────────────────────────────────────
    login: builder.mutation<SessionInfo, LoginCredentials>({
      query: (credentials) => ({
        url: AUTH_CONFIG.loginPath,
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: ApiResponse<SessionInfo>) => response.data,
      invalidatesTags: ['Session'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: AUTH_CONFIG.logoutPath,
        method: 'POST',
      }),
      invalidatesTags: ['Session'],
    }),

    getSession: builder.query<SessionInfo, void>({
      query: () => AUTH_CONFIG.sessionPath,
      transformResponse: (response: ApiResponse<SessionInfo>) => response.data,
      providesTags: ['Session'],
    }),

    // ── Tickets ─────────────────────────────────────────────
    getTickets: builder.query<PaginatedResponse<Ticket>, TicketFilters>({
      query: (filters) => ({
        url: '/tickets/list',
        params: filters,
      }),
      transformResponse: (response: { data: RawApiTicket[]; page?: number; page_size?: number; total?: number; total_pages?: number }) => {
        const arr: RawApiTicket[] = Array.isArray(response.data) ? response.data : [];
        return {
          data: arr.map(mapRawTicket),
          total: response.total ?? arr.length,
          page: response.page ?? 1,
          page_size: response.page_size ?? arr.length,
          total_pages: response.total_pages ?? 1,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Ticket' as const, id })),
              { type: 'TicketList' },
            ]
          : [{ type: 'TicketList' }],
    }),

    getTicket: builder.query<Ticket, string>({
      query: (id) => `/tickets/${id}`,
      transformResponse: (response: ApiResponse<RawApiTicket>) => mapRawTicket(response.data),
      providesTags: (_result, _error, id) => [{ type: 'Ticket', id }],
    }),

    createTicket: builder.mutation<Ticket, TicketCreatePayload>({
      query: (body) => ({
        url: '/tickets',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<RawApiTicket> | RawApiTicket) => {
        const raw = (response as ApiResponse<RawApiTicket>).data ?? (response as RawApiTicket);
        return mapRawTicket(raw);
      },
      invalidatesTags: ['TicketList', 'Dashboard'],
    }),

    updateTicket: builder.mutation<Ticket, { id: string; payload: TicketUpdatePayload }>({
      query: ({ id, payload }) => ({
        url: `/tickets/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<RawApiTicket> | RawApiTicket) => {
        const raw = (response as ApiResponse<RawApiTicket>).data ?? (response as RawApiTicket);
        return mapRawTicket(raw);
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Ticket', id },
        { type: 'TicketList' },
        'Dashboard',
      ],
    }),

    deleteTicket: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tickets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Ticket', id },
        { type: 'TicketList' },
        'Dashboard',
      ],
    }),

    transitionTicket: builder.mutation<Ticket, TicketTransitionPayload>({
      query: ({ ticketId, toStatus, comment }) => ({
        url: `/tickets/${ticketId}/transition`,
        method: 'POST',
        body: { to_status: toStatus, comment },
      }),
      transformResponse: (response: ApiResponse<RawApiTicket> | RawApiTicket) => {
        const raw = (response as ApiResponse<RawApiTicket>).data ?? (response as RawApiTicket);
        return mapRawTicket(raw);
      },
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketList' },
        'Dashboard',
      ],
    }),

    bulkUpdateTickets: builder.mutation<BulkTicketUpdateResult, BulkTicketUpdatePayload>({
      query: (body) => ({
        url: '/tickets/bulk-update',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => {
        // Handle both wrapped { data: { data: [...], updated: N } } and unwrapped { data: [...], updated: N }
        const raw = response.data && response.updated === undefined ? response.data : response;
        return {
          data: raw.data.map(mapRawTicket),
          updated: raw.updated,
        };
      },
      invalidatesTags: ['TicketList', 'Dashboard'],
    }),

    // ── Comments ────────────────────────────────────────────
    getComments: builder.query<Comment[], string>({
      query: (ticketId) => `/tickets/${ticketId}/comments`,
      transformResponse: (response: ApiResponse<any[]> | any[]) => {
        const raw = Array.isArray(response) ? response : response.data;

        const mapOne = (c: any): Comment => ({
          id: c.id,
          ticketId: c.ticket_id,
          authorId: c.author?.id ?? '',
          content: c.body ?? c.message ?? c.content ?? '',
          isInternal: c.is_internal ?? false,
          parentId: c.parent_id ?? undefined,
          mentions: c.mentions ?? [],
          attachments: (c.attachments ?? []).map((a: any) => ({
            id: a.id,
            fileName: a.filename ?? a.file_name ?? '',
            fileSize: a.size_bytes ?? 0,
            mimeType: a.mime_type ?? a.file_type ?? '',
            url: a.storage_key ?? a.file_path ?? '',
            uploadedBy: a.uploaded_by ?? '',
            created_at: a.created_at,
          })),
          author: c.author
            ? {
                id: c.author.id,
                displayName: c.author.display_name ?? ([c.author.first_name, c.author.last_name].filter(Boolean).join(' ') || c.author.email),
                email: c.author.email ?? '',
                avatarUrl: c.author.avatar_url ?? undefined,
                role: c.author.role,
                firstName: c.author.first_name ?? '',
                lastName: c.author.last_name ?? '',
                permissions: [],
                organizationId: '',
                isActive: true,
                created_at: '',
                updated_at: '',
              } as import('@3sc/types').User
            : undefined,
          created_at: c.created_at,
          updated_at: c.updated_at,
        });

        // Flatten nested replies into the same array so the UI's parentId lookup works
        const result: Comment[] = [];
        for (const c of raw) {
          result.push(mapOne(c));
          for (const r of c.replies ?? []) {
            result.push(mapOne(r));
          }
        }
        return result;
      },
      providesTags: (_result, _error, ticketId) => [{ type: 'Comment', id: ticketId }],
    }),

    createComment: builder.mutation<Comment, CommentCreatePayload>({
      query: (body) => ({
      //query: ({ ticketId, ...body }) => ({
       // url: `/tickets/${ticketId}/comments`,
        url: `/comments`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<any>) => {
        const c = response.data;
        return {
          id: c.id,
          ticketId: c.ticket_id,
          authorId: c.author?.id ?? '',
          content: c.body ?? c.message ?? '',
          isInternal: c.is_internal ?? false,
          parentId: c.parent_id ?? undefined,
          mentions: c.mentions ?? [],
          attachments: [],
          author: c.author
            ? {
                id: c.author.id,
                displayName: c.author.display_name ?? c.author.email,
                email: c.author.email ?? '',
                avatarUrl: c.author.avatar_url ?? undefined,
                role: c.author.role,
                firstName: '', lastName: '', permissions: [],
                organizationId: '', isActive: true, created_at: '', updated_at: '',
              } as import('@3sc/types').User
            : undefined,
          created_at: c.created_at,
          updated_at: c.updated_at,
        } as Comment;
      },
      invalidatesTags: (_result, _error, { ticket_id }) => [
        { type: 'Comment', id: ticket_id },
        { type: 'Ticket', id: ticket_id },
      ],
    }),

    // ── Attachments ─────────────────────────────────────────
    createAttachment: builder.mutation<AttachmentRecord, { file: File; projectId?: string }>({
      query: ({ file, projectId }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_name', file.name);
        formData.append('file_type', file.type);
        return {
          url: '/attachments',
          method: 'POST',
          body: formData,
          params: projectId ? { project_id: projectId } : undefined,
        };
      },
      transformResponse: (response: ApiResponse<AttachmentRecord>) => response.data,
      invalidatesTags: ['Attachment'],
    }),

    deleteAttachment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/attachments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Attachment', 'Ticket', 'Comment'],
    }),

    getPresignedUpload: builder.mutation<PresignedUpload, { fileName: string; mimeType: string }>({
      query: (body) => ({
        url: '/attachments/presign',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<PresignedUpload>) => response.data,
    }),

    confirmUpload: builder.mutation<Attachment, { fileKey: string; ticketId?: string }>({
      query: (body) => ({
        url: '/attachments/confirm',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Attachment>) => response.data,
      invalidatesTags: ['Attachment'],
    }),

    // ── Projects ────────────────────────────────────────────
    getProjects: builder.query<PaginatedResponse<Project>, { page?: number; page_size?: number }>({
      query: (params) => ({ url: '/projects', params }),
      transformResponse: (response: { data: Project[]; page: number; page_size: number; total: number; total_pages: number }) => ({
        data: response.data.map((p) => ({
          ...p,
          milestones: (p as any).metadata?.milestones ?? (p as any).milestones ?? [],
          ticketCount: (p as any).metadata?.ticketCount ?? (p as any).ticketCount ?? 0,
          openTicketCount: (p as any).metadata?.openTicketCount ?? (p as any).openTicketCount ?? 0,
          resolvedThisWeek: (p as any).metadata?.resolvedThisWeek ?? (p as any).resolvedThisWeek ?? 0,
        })),
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Project' as const, id })), 'Project']
          : ['Project'],
    }),

    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      transformResponse: (response: ApiResponse<Project>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, Partial<Project>>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      transformResponse: (response: ApiResponse<Project>) => response.data,
      invalidatesTags: ['Project'],
    }),

    updateProject: builder.mutation<Project, { id: string } & Partial<Project>>({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      transformResponse: (response: ApiResponse<Project>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),

    // ── AI Projects ──────────────────────────────────────────

    /** Computed health score for a project (velocity + SLA + sentiment) */
    getProjectHealth: builder.query<ProjectHealthScore, string>({
      query: (projectId) => `/ai/projects/${projectId}/health`,
      transformResponse: (response: ApiResponse<ProjectHealthScore>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    /** Semantic ticket clusters within a project */
    getProjectClusters: builder.query<ProjectTicketCluster[], string>({
      query: (projectId) => `/ai/projects/${projectId}/clusters`,
      transformResponse: (response: ApiResponse<ProjectTicketCluster[]>) => response.data,
    }),

    /** Scope drift flags — tickets semantically outside declared scope */
    getProjectScopeDrift: builder.query<ProjectScopeDrift[], string>({
      query: (projectId) => `/ai/projects/${projectId}/scope-drift`,
      transformResponse: (response: ApiResponse<ProjectScopeDrift[]>) => response.data,
    }),

    /** Churn risk scoring for a project/client relationship */
    getProjectChurnRisk: builder.query<ProjectChurnRisk, string>({
      query: (projectId) => `/ai/projects/${projectId}/churn-risk`,
      transformResponse: (response: ApiResponse<ProjectChurnRisk>) => response.data,
    }),

    /** Generate (or retrieve cached) weekly status report */
    getProjectStatusReport: builder.query<ProjectStatusReport, string>({
      query: (projectId) => `/ai/projects/${projectId}/status-report`,
      transformResponse: (response: ApiResponse<ProjectStatusReport>) => response.data,
    }),

    /** Ask a natural-language question grounded in project history */
    askProject: builder.mutation<ProjectQAAnswer, { projectId: string; question: string }>({
      query: ({ projectId, question }) => ({
        url: `/ai/projects/${projectId}/ask`,
        method: 'POST',
        body: { question },
      }),
      transformResponse: (response: ApiResponse<ProjectQAAnswer>) => response.data,
    }),

    /** Recommended next action for the agent working a project */
    getProjectNextAction: builder.query<ProjectNextBestAction, string>({
      query: (projectId) => `/ai/projects/${projectId}/next-action`,
      transformResponse: (response: ApiResponse<ProjectNextBestAction>) => response.data,
    }),

    /** Knowledge entries extracted from closed projects (for onboarding context) */
    getProjectKnowledge: builder.query<ProjectKnowledgeEntry[], string>({
      query: (organizationId) => `/ai/projects/knowledge?orgId=${organizationId}`,
      transformResponse: (response: ApiResponse<ProjectKnowledgeEntry[]>) => response.data,
    }),

    /** Milestone delivery predictions for a project */
    getProjectMilestonePredictions: builder.query<ProjectMilestonePrediction[], string>({
      query: (projectId) => `/ai/projects/${projectId}/milestone-predictions`,
      transformResponse: (response: ApiResponse<ProjectMilestonePrediction[]>) => response.data,
    }),

    // ── Knowledge Base ──────────────────────────────────────
    searchKB: builder.query<KBSearchResult[], { query: string; limit?: number }>({
      query: (params) => ({ url: '/knowledge-base/search', params }),
      transformResponse: (response: ApiResponse<KBSearchResult[]>) => response.data,
    }),

    getKBArticle: builder.query<KBArticle, string>({
      query: (id) => `/knowledge-base/articles/${id}`,
      transformResponse: (response: ApiResponse<KBArticle>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'KBArticle', id }],
    }),

    getKBCategories: builder.query<KBCategory[], void>({
      query: () => '/knowledge-base/categories',
      transformResponse: (response: ApiResponse<KBCategory[]>) => response.data,
      providesTags: ['KBCategory'],
    }),

    createKBArticle: builder.mutation<KBArticle, Partial<KBArticle>>({
      query: (body) => ({ url: '/knowledge-base/articles', method: 'POST', body }),
      transformResponse: (response: ApiResponse<KBArticle>) => response.data,
      invalidatesTags: ['KBArticle', 'KBCategory'],
    }),

    updateKBArticle: builder.mutation<KBArticle, { id: string } & Partial<KBArticle>>({
      query: ({ id, ...body }) => ({ url: `/knowledge-base/articles/${id}`, method: 'PATCH', body }),
      transformResponse: (response: ApiResponse<KBArticle>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'KBArticle', id }, 'KBCategory'],
    }),

    deleteKBArticle: builder.mutation<void, string>({
      query: (id) => ({ url: `/knowledge-base/articles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['KBArticle', 'KBCategory'],
    }),

    voteHelpful: builder.mutation<void, string>({
      query: (id) => ({ url: `/knowledge-base/articles/${id}/helpful`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'KBArticle', id }],
    }),

    // ── Notifications ───────────────────────────────────────
    getNotifications: builder.query<
      PaginatedResponse<Notification> & { unreadCount: number },
      { page?: number; limit?: number; unreadOnly?: boolean }
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params.page !== undefined) queryParams.page = params.page;
        if (params.limit !== undefined) queryParams.limit = params.limit;
        if (params.unreadOnly !== undefined) queryParams.unread_only = params.unreadOnly;
        return { url: '/notifications', params: queryParams };
      },
      transformResponse: (response: any) => {
        const rawData = Array.isArray(response.data) ? response.data : [];
        const mapped = rawData.map((n: any) => {
          const data = n.data ?? {};
          let resourceType: string | undefined = n.resourceType;
          let resourceId: string | undefined = n.resourceId;
          if (!resourceType && data.ticket_id) {
            resourceType = 'ticket';
            resourceId = data.ticket_id;
          } else if (!resourceType && data.project_id) {
            resourceType = 'project';
            resourceId = data.project_id;
          }
          return {
            id: n.id,
            userId: n.user_id ?? n.userId,
            type: n.type,
            title: n.title,
            message: n.body ?? n.message,
            isRead: n.is_read ?? n.isRead,
            data,
            resourceType,
            resourceId,
            created_at: n.created_at,
          };
        });
        return {
          data: mapped,
          page: response.page ?? 1,
          page_size: response.page_size ?? mapped.length,
          total: response.total ?? mapped.length,
          total_pages: response.total_pages ?? 1,
          unreadCount: response.unread_count ?? 0,
        };
      },
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    // ── Users ───────────────────────────────────────────────
    getUsers: builder.query<PaginatedResponse<User>, { page?: number; role?: string; search?: string; tenant_id?: string }>({
      query: (params) => ({ url: '/users', params }),
      transformResponse: (response: any) => ({
        data: (response.data ?? []).map(mapRawUser),
        total: response.total ?? 0,
        page: response.page ?? 1,
        page_size: response.page_size ?? 25,
        total_pages: response.total_pages ?? 1,
      }),
      providesTags: ['User'],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    updateUser: builder.mutation<User, { id: string; payload: Partial<User> }>({
      query: ({ id, payload }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      invalidatesTags: ['User'],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    inviteUser: builder.mutation<User, InviteUserPayload>({
      query: (body) => ({
        url: '/users/invite',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      invalidatesTags: ['User'],
    }),

    // ── Organizations ───────────────────────────────────────
    getOrganizations: builder.query<PaginatedResponse<Organization>, { page?: number }>({
      query: (params) => ({ url: '/organizations', params }),
      providesTags: ['Organization'],
    }),

    updateOrganization: builder.mutation<Organization, { id: string; payload: Partial<Pick<Organization, 'name' | 'domain' | 'logoUrl' | 'isActive'>> }>({
      query: ({ id, payload }) => ({
        url: `/organizations/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<Organization>) => response.data,
      invalidatesTags: ['Organization'],
    }),

    // ── Dashboard ───────────────────────────────────────────
    getDashboard: builder.query<DashboardSummary, void>({
      query: () => '/dashboard/kpis',
      transformResponse: (response: ApiResponse<DashboardSummary>) => response.data,
      providesTags: ['Dashboard'],
    }),

    // ── Analytics ───────────────────────────────────────────
    getTicketVolume: builder.query<TicketVolumeData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/ticket-volume', params }),
      transformResponse: (response: ApiResponse<TicketVolumeData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getSLACompliance: builder.query<SLAComplianceData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/sla-compliance', params }),
      transformResponse: (response: ApiResponse<SLAComplianceData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getResolutionTrends: builder.query<ResolutionTrendData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/resolution-trends', params }),
      transformResponse: (response: ApiResponse<ResolutionTrendData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getAgentPerformance: builder.query<AgentPerformance[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/agent-performance', params }),
      transformResponse: (response: ApiResponse<AgentPerformance[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getMonthlyVolume: builder.query<MonthlyVolumeData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/monthly-volume', params }),
      transformResponse: (response: ApiResponse<MonthlyVolumeData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getCategoryBreakdown: builder.query<CategoryBreakdownData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/category-breakdown', params }),
      transformResponse: (response: ApiResponse<CategoryBreakdownData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getSeverityDistribution: builder.query<SeverityDistributionData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/severity-distribution', params }),
      transformResponse: (response: ApiResponse<SeverityDistributionData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getResolutionBySeverity: builder.query<ResolutionBySeverityData[], AnalyticsFilters>({
      query: (params) => ({ url: '/analytics/resolution-by-severity', params }),
      transformResponse: (response: ApiResponse<ResolutionBySeverityData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    // ── CSAT / NPS ──────────────────────────────────────────
    getCsatKpis: builder.query<CsatKpiData, AnalyticsFilters>({
      query: (params) => ({ url: '/feedback/kpis', params }),
      transformResponse: (response: ApiResponse<CsatKpiData>) => response.data,
      providesTags: ['Analytics'],
    }),

    getCsatTrends: builder.query<CsatTrendData[], AnalyticsFilters>({
      query: (params) => ({ url: '/feedback/trends', params }),
      transformResponse: (response: ApiResponse<CsatTrendData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    getNpsBreakdown: builder.query<NpsBreakdownData, AnalyticsFilters>({
      query: (params) => ({ url: '/feedback/nps-breakdown', params }),
      transformResponse: (response: ApiResponse<NpsBreakdownData>) => response.data,
      providesTags: ['Analytics'],
    }),

    getFeedbackThemes: builder.query<FeedbackThemeData[], AnalyticsFilters>({
      query: (params) => ({ url: '/feedback/themes', params }),
      transformResponse: (response: ApiResponse<FeedbackThemeData[]>) => response.data,
      providesTags: ['Analytics'],
    }),

    // ── User Preferences ────────────────────────────────────
    getUserPreferences: builder.query<UserPreferences, void>({
      query: () => '/users/me/preferences',
      transformResponse: (response: ApiResponse<UserPreferences>) => response.data,
      providesTags: ['UserPreferences'],
    }),

    updateUserPreferences: builder.mutation<UserPreferences, UserPreferencesUpdatePayload>({
      query: (payload) => ({ url: '/users/me/preferences', method: 'PATCH', body: payload }),
      transformResponse: (response: ApiResponse<UserPreferences>) => response.data,
      invalidatesTags: ['UserPreferences'],
    }),

    getMe: builder.query<User, void>({
      query: () => '/users/me',
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      providesTags: [{ type: 'User', id: 'ME' }],
    }),

    updateMe: builder.mutation<User, { firstName?: string; lastName?: string; jobTitle?: string; phone?: string; avatarUrl?: string }>({
      query: (payload) => ({ url: '/users/me', method: 'PATCH', body: payload }),
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      invalidatesTags: ['User', { type: 'User', id: 'ME' }],
    }),

    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: (payload) => ({ url: '/auth/change-password', method: 'POST', body: payload }),
    }),

    // ── SLA Policy ──────────────────────────────────────────
    getSLAPolicy: builder.query<SLAPolicy, void>({
      query: () => '/sla-policy',
      transformResponse: (response: ApiResponse<SLAPolicy>) => response.data,
      providesTags: ['SLAPolicy'],
    }),

    updateSLAPolicy: builder.mutation<SLAPolicy, SLAPolicyUpdatePayload>({
      query: (payload) => ({ url: '/sla-policy', method: 'PATCH', body: payload }),
      transformResponse: (response: ApiResponse<SLAPolicy>) => response.data,
      invalidatesTags: ['SLAPolicy'],
    }),

    // ── System Settings ─────────────────────────────────────
    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => '/system-settings',
      transformResponse: (response: ApiResponse<SystemSettings>) => response.data,
      providesTags: ['SystemSettings'],
    }),

    updateSystemSettings: builder.mutation<SystemSettings, SystemSettingsUpdatePayload>({
      query: (payload) => ({ url: '/system-settings', method: 'PATCH', body: payload }),
      transformResponse: (response: ApiResponse<SystemSettings>) => response.data,
      invalidatesTags: ['SystemSettings'],
    }),

    // ── Audit Logs ──────────────────────────────────────────
    getAuditLogs: builder.query<PaginatedResponse<AuditLogEntry>, {
      page?: number;
      page_size?: number;
      resourceType?: string;
      userId?: string;
    }>({
      query: (params) => ({ url: '/audit-logs', params }),
      providesTags: ['AuditLog'],
    }),

    // ── Routing Rules ───────────────────────────────────────
    getRoutingRules: builder.query<RoutingRule[], void>({
      query: () => '/routing-rules',
      transformResponse: (response: ApiResponse<any[]> | any[]) => {
        const arr: any[] = (response as ApiResponse<any[]>).data ?? (response as any[]);
        if (!Array.isArray(arr)) return [];
        return arr.map(mapRawRoutingRule);
      },
      providesTags: ['RoutingRule'],
    }),

    createRoutingRule: builder.mutation<RoutingRule, Omit<RoutingRule, 'id' | 'created_at' | 'updated_at'>>({
      query: (body) => ({
        url: '/routing-rules',
        method: 'POST',
        body: routingRuleToBackend(body),
      }),
      transformResponse: (response: ApiResponse<any>) => mapRawRoutingRule(response.data ?? response),
      invalidatesTags: ['RoutingRule'],
    }),

    updateRoutingRule: builder.mutation<RoutingRule, { id: string; payload: Partial<RoutingRule> }>({
      query: ({ id, payload }) => ({
        url: `/routing-rules/${id}`,
        method: 'PATCH',
        body: routingRuleToBackend(payload),
      }),
      transformResponse: (response: ApiResponse<any>) => mapRawRoutingRule(response.data ?? response),
      invalidatesTags: ['RoutingRule'],
    }),

    deleteRoutingRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/routing-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoutingRule'],
    }),

    // ── AI Endpoints ────────────────────────────────────────
    getAIClassification: builder.query<AISuggestion<AIClassificationSuggestion>, string>({
      query: (ticketId) => `/ai/classify/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIClassificationSuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_classification` }],
    }),

    getAIPriority: builder.query<AISuggestion<AIPrioritySuggestion>, string>({
      query: (ticketId) => `/ai/priority/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIPrioritySuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_priority` }],
    }),

    getAIRouting: builder.query<AISuggestion<AIRoutingSuggestion>, string>({
      query: (ticketId) => `/ai/route/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIRoutingSuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_route` }],
    }),

    getAISuggestedReply: builder.query<AISuggestion<AIReplySuggestion>, string>({
      query: (ticketId) => `/ai/suggest-reply/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIReplySuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_reply` }],
    }),

    getAISummary: builder.query<AISuggestion<AISummarySuggestion>, string>({
      query: (ticketId) => `/ai/summary/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AISummarySuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_summary` }],
    }),

    getAIETA: builder.query<AISuggestion<AIETASuggestion>, string>({
      query: (ticketId) => `/ai/eta/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIETASuggestion>>) => response.data,
      providesTags: (_r, _e, ticketId) => [{ type: 'AI' as const, id: `${ticketId}_eta` }],
    }),

    getAIDigest: builder.query<AIDigest, void>({
      query: () => '/ai/digest',
      transformResponse: (response: ApiResponse<AIDigest>) => response.data,
      providesTags: ['AI'],
    }),

    classifyText: builder.mutation<AITextClassificationResult, { title: string; description: string }>({
      query: (body) => ({
        url: '/ai/classify-text',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<AITextClassificationResult>) => response.data,
    }),

    aiSemanticSearch: builder.query<AISearchResult, { query: string; scope?: string }>({
      query: (params) => ({ url: '/ai/search', params }),
      transformResponse: (response: ApiResponse<AISearchResult>) => response.data,
    }),

    acceptAISuggestion: builder.mutation<void, { suggestionId: string; agentId?: string }>({
      query: ({ suggestionId, agentId }) => ({
        url: `/ai/suggestions/${suggestionId}/accept`,
        method: 'POST',
        body: agentId ? { agentId } : undefined,
      }),
      // suggestionId = "sugg_{ticketId}_{type}" — only invalidate the one suggestion + its ticket
      invalidatesTags: (_r, _e, { suggestionId }) => {
        const parts = suggestionId.split('_');
        const type = parts[parts.length - 1];
        const ticketId = parts.slice(1, parts.length - 1).join('_');
        return [
          { type: 'AI' as const, id: `${ticketId}_${type}` },
          { type: 'Ticket' as const, id: ticketId },
        ];
      },
    }),

    rejectAISuggestion: builder.mutation<void, { suggestionId: string; reason?: string }>({
      query: ({ suggestionId, reason }) => ({
        url: `/ai/suggestions/${suggestionId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      // Only invalidate the one suggestion that was rejected
      invalidatesTags: (_r, _e, { suggestionId }) => {
        const parts = suggestionId.split('_');
        const type = parts[parts.length - 1];
        const ticketId = parts.slice(1, parts.length - 1).join('_');
        return [{ type: 'AI' as const, id: `${ticketId}_${type}` }];
      },
    }),

    // ── AI Knowledge Base ──────────────────────────────────────────
    /** Get KB articles most relevant to a ticket (semantic match on title + description) */
    getAIKBSuggestions: builder.query<AIKBSuggestion[], string>({
      query: (ticketId) => `/ai/kb-suggest/${ticketId}`,
      transformResponse: (response: ApiResponse<AIKBSuggestion[]>) => response.data,
      providesTags: ['AI'],
    }),

    /** Get KB articles relevant to a free-form query (used for ticket deflection on create) */
    getAIKBDeflections: builder.query<AIKBSuggestion[], { query: string; limit?: number }>({
      query: (params) => ({ url: '/ai/kb-deflect', params }),
      transformResponse: (response: ApiResponse<AIKBSuggestion[]>) => response.data,
    }),

    /** Generate a KB article draft from a topic description */
    generateKBDraft: builder.mutation<AIKBDraftResult, { topic: string; categoryId?: string; tone?: 'technical' | 'friendly' | 'formal' }>({
      query: (body) => ({
        url: '/ai/kb-draft',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<AIKBDraftResult>) => response.data,
    }),

    /** Get KB coverage gaps detected from recurring ticket patterns */
    getKBGaps: builder.query<AIKBGap[], void>({
      query: () => '/ai/kb-gaps',
      transformResponse: (response: ApiResponse<AIKBGap[]>) => response.data,
      providesTags: ['AI'],
    }),

    /** Ask a free-form question; answer is grounded in KB articles (RAG) */
    askKB: builder.mutation<AIKBAnswer, { question: string; articleId?: string }>({
      query: (body) => ({
        url: '/ai/kb-ask',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<AIKBAnswer>) => response.data,
    }),

    // ── Delivery Board ──────────────────────────────────────────
    getDeliveryFeatures: builder.query<DeliveryFeature[], void>({
      query: () => '/delivery/features',
      transformResponse: (response: ApiResponse<any[]> | any) => {
        const raw: any[] = Array.isArray(response) ? response : (response.data ?? []);
        return raw.map((f: any): DeliveryFeature => {
          const dateStr: string = f.updated_at ?? f.created_at ?? new Date().toISOString();
          const d = new Date(dateStr);
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const quarter: string = f.quarter ?? `Q${q} ${d.getFullYear()}`;

          const t = (f.title ?? '').toLowerCase();
          const category: string = f.category ?? (
            t.includes('ai') || t.includes('suggest') || t.includes('classif') ? 'AI'
            : t.includes('sla') || t.includes('breach') || t.includes('alert') ? 'Notifications'
            : t.includes('analytic') || t.includes('dashboard') || t.includes('report') ? 'Analytics'
            : t.includes('2fa') || t.includes('auth') || t.includes('security') || t.includes('factor') ? 'Security'
            : t.includes('mobile') || t.includes('ios') || t.includes('android') ? 'Mobile'
            : t.includes('webhook') || t.includes('integration') || t.includes('slack') || t.includes('jira') ? 'Integrations'
            : t.includes('roadmap') || t.includes('portal') || t.includes('branding') || t.includes('theme') ? 'Portal'
            : t.includes('onboarding') || t.includes('tracker') ? 'Onboarding'
            : t.includes('ticket') || t.includes('bulk') ? 'Tickets'
            : 'Other'
          );

          const status = (f.status ?? 'BACKLOG').toUpperCase().replace(/ /g, '_') as DeliveryStatus;

          return {
            id: f.id,
            title: f.title ?? '',
            description: f.description ?? '',
            status,
            upvotes: f.upvotes ?? f.votes ?? 0,
            quarter,
            category,
            isPublic: f.is_public ?? f.isPublic ?? true,
            hasVoted: f.has_voted ?? f.hasVoted ?? false,
            eta: f.due_date ?? f.eta ?? undefined,
            assignee: f.assignee ?? undefined,
            assigneeId: f.assignee_id ?? f.assigneeId ?? undefined,
            requestedByOrgIds: f.requested_by_org_ids ?? f.requestedByOrgIds ?? undefined,
            created_at: f.created_at,
            updated_at: f.updated_at,
          };
        });
      },
      providesTags: ['Delivery'],
    }),
    createDeliveryFeature: builder.mutation<DeliveryFeature, DeliveryFeatureCreatePayload>({
      query: (body) => ({ url: '/delivery/features', method: 'POST', body }),
      transformResponse: (response: ApiResponse<DeliveryFeature>) => response.data,
      invalidatesTags: ['Delivery'],
    }),
    updateDeliveryFeature: builder.mutation<DeliveryFeature, { id: string; data: Partial<DeliveryFeature> }>({
      query: ({ id, data }) => ({ url: `/delivery/features/${id}`, method: 'PATCH', body: data }),
      transformResponse: (response: ApiResponse<DeliveryFeature>) => response.data,
      invalidatesTags: ['Delivery'],
    }),
    deleteDeliveryFeature: builder.mutation<void, string>({
      query: (id) => ({ url: `/delivery/features/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Delivery'],
    }),

    // ── Onboarding (internal) ───────────────────────────────────
    getOnboardingProjects: builder.query<OnboardingProject[], void>({
      query: () => '/onboarding',
      transformResponse: (response: ApiResponse<OnboardingProject[]>) => response.data,
      providesTags: ['Onboarding'],
    }),
    getOnboardingProject: builder.query<OnboardingProject, string>({
      query: (id) => `/onboarding/${id}`,
      transformResponse: (response: ApiResponse<OnboardingProject>) => response.data,
      providesTags: ['Onboarding'],
    }),
    createOnboardingProject: builder.mutation<OnboardingProject, OnboardingCreatePayload>({
      query: (body) => ({ url: '/onboarding', method: 'POST', body }),
      transformResponse: (response: ApiResponse<OnboardingProject>) => response.data,
      invalidatesTags: ['Onboarding'],
    }),
    updateOnboardingProject: builder.mutation<OnboardingProject, { id: string; data: OnboardingUpdatePayload }>({
      query: ({ id, data }) => ({ url: `/onboarding/${id}`, method: 'PATCH', body: data }),
      transformResponse: (response: ApiResponse<OnboardingProject>) => response.data,
      invalidatesTags: ['Onboarding'],
    }),
    deleteOnboardingProject: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/onboarding/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Onboarding'],
    }),
    updateOnboardingTask: builder.mutation<OnboardingProject, { onboardingId: string; taskId: string; data: OnboardingTaskUpdatePayload }>({
      query: ({ onboardingId, taskId, data }) => ({
        url: `/onboarding/${onboardingId}/tasks/${taskId}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<OnboardingProject>) => response.data,
      invalidatesTags: ['Onboarding'],
    }),

    // ── Onboarding (client) ─────────────────────────────────────
    getMyOnboarding: builder.query<OnboardingProject, void>({
      query: () => '/onboarding/my',
      transformResponse: (response: ApiResponse<OnboardingProject>) => response.data,
      providesTags: ['Onboarding'],
    }),

    // ── Roadmap ─────────────────────────────────────────────────
    getRoadmapFeatures: builder.query<DeliveryFeature[], void>({
      query: () => '/roadmap',
      transformResponse: (response: ApiResponse<any[]> | any) => {
        const raw: any[] = Array.isArray(response) ? response : (response.data ?? []);
        return raw.map((f: any): DeliveryFeature => {
          // Derive quarter from updated_at or created_at
          const dateStr: string = f.updated_at ?? f.created_at ?? new Date().toISOString();
          const d = new Date(dateStr);
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const quarter = `Q${q} ${d.getFullYear()}`;

          // Infer category from title keywords
          const t = (f.title ?? '').toLowerCase();
          const category: string =
            t.includes('ai') || t.includes('suggest') || t.includes('classif') ? 'AI'
            : t.includes('sla') || t.includes('breach') || t.includes('alert') ? 'Notifications'
            : t.includes('analytic') || t.includes('dashboard') || t.includes('report') ? 'Analytics'
            : t.includes('2fa') || t.includes('auth') || t.includes('security') || t.includes('factor') ? 'Security'
            : t.includes('mobile') || t.includes('ios') || t.includes('android') ? 'Mobile'
            : t.includes('webhook') || t.includes('integration') || t.includes('slack') || t.includes('jira') ? 'Integrations'
            : t.includes('roadmap') || t.includes('portal') || t.includes('branding') || t.includes('theme') ? 'Portal'
            : t.includes('onboarding') || t.includes('tracker') ? 'Onboarding'
            : t.includes('ticket') || t.includes('bulk') ? 'Tickets'
            : 'Other';

          // Uppercase status (backend stores lowercase: 'planned', 'released', etc.)
          const status = (f.status ?? 'planned').toUpperCase().replace(/ /g, '_') as DeliveryFeature['status'];

          return {
            id: f.id,
            title: f.title ?? '',
            description: f.description ?? '',
            status,
            upvotes: f.votes ?? f.upvotes ?? 0,
            quarter,
            category,
            isPublic: true,
            hasVoted: f.has_voted ?? f.hasVoted ?? false,
            eta: f.due_date ?? f.eta ?? undefined,
            assignee: f.assignee ?? undefined,
            assigneeId: f.assignee_id ?? f.assigneeId ?? undefined,
            requestedByOrgIds: f.requested_by_org_ids ?? f.requestedByOrgIds ?? undefined,
            created_at: f.created_at,
            updated_at: f.updated_at,
          };
        });
      },
      providesTags: ['Roadmap'],
    }),
    voteRoadmapFeature: builder.mutation<{ featureId: string; upvotes: number; hasVoted: boolean }, string>({
      query: (id) => ({ url: `/roadmap/features/${id}/vote`, method: 'POST' }),
      transformResponse: (response: ApiResponse<any> | any) => {
        const d = (response as any)?.data ?? response;
        return { featureId: d.feature_id ?? d.featureId ?? '', upvotes: d.upvotes ?? d.votes ?? 0, hasVoted: true };
      },
      invalidatesTags: ['Roadmap'],
    }),
    unvoteRoadmapFeature: builder.mutation<{ featureId: string; upvotes: number; hasVoted: boolean }, string>({
      query: (id) => ({ url: `/roadmap/features/${id}/vote`, method: 'DELETE' }),
      transformResponse: (response: ApiResponse<any> | any) => {
        const d = (response as any)?.data ?? response;
        return { featureId: d.feature_id ?? d.featureId ?? '', upvotes: d.upvotes ?? d.votes ?? 0, hasVoted: false };
      },
      invalidatesTags: ['Roadmap'],
    }),
    submitFeatureRequest: builder.mutation<FeatureRequest, { title: string; description: string }>({
      query: (body) => ({ url: '/roadmap/requests', method: 'POST', body }),
      transformResponse: (response: ApiResponse<FeatureRequest>) => response.data,
    }),

    // ── AI — Delivery ───────────────────────────────────────────
    getDeliveryRisk: builder.query<DeliveryRiskItem[], void>({
      query: () => '/ai/delivery/risk',
      transformResponse: (response: ApiResponse<DeliveryRiskItem[]>) => response.data,
      providesTags: ['AI'],
    }),
    prioritiseDelivery: builder.mutation<DeliveryPrioritisedFeature[], void>({
      query: () => ({ url: '/ai/delivery/prioritise', method: 'POST' }),
      transformResponse: (response: ApiResponse<DeliveryPrioritisedFeature[]>) => response.data,
    }),
    draftDeliveryFeature: builder.mutation<DeliveryFeatureDraft, { description: string }>({
      query: (body) => ({ url: '/ai/delivery/draft-feature', method: 'POST', body }),
      transformResponse: (response: ApiResponse<DeliveryFeatureDraft>) => response.data,
    }),

    // ── AI — Onboarding ─────────────────────────────────────────
    getOnboardingHealth: builder.query<OnboardingHealthPrediction, string>({
      query: (id) => `/ai/onboarding/${id}/health`,
      transformResponse: (response: ApiResponse<OnboardingHealthPrediction>) => response.data,
      providesTags: ['AI'],
    }),
    getOnboardingBlockerSummary: builder.mutation<OnboardingBlockerSummary, string>({
      query: (id) => ({ url: `/ai/onboarding/${id}/blocker-summary`, method: 'POST' }),
      transformResponse: (response: ApiResponse<OnboardingBlockerSummary>) => response.data,
    }),
    getOnboardingNextAction: builder.query<OnboardingNextAction, string>({
      query: (id) => `/ai/onboarding/${id}/next-action`,
      transformResponse: (response: ApiResponse<OnboardingNextAction>) => response.data,
      providesTags: ['AI'],
    }),

    // ── AI — Roadmap ────────────────────────────────────────────
    getRoadmapSummary: builder.query<RoadmapPersonalisedSummary, void>({
      query: () => '/ai/roadmap/summary',
      transformResponse: (response: ApiResponse<RoadmapPersonalisedSummary>) => response.data,
      providesTags: ['AI'],
    }),
    classifyFeatureRequest: builder.mutation<FeatureRequestClassification, { title: string; description: string }>({
      query: (body) => ({ url: '/ai/roadmap/classify-request', method: 'POST', body }),
      transformResponse: (response: ApiResponse<FeatureRequestClassification>) => response.data,
    }),

    // ── Escalations ─────────────────────────────────────────────
    getEscalations: builder.query<EscalatedTicket[], void>({
      query: () => '/escalations',
      transformResponse: (response: ApiResponse<any[]>) => {
        const now = Date.now();
        return (response.data ?? []).map((e: any) => {
          const createdAt = new Date(e.created_at).getTime();
          const timeInEscalationMinutes = Math.floor((now - createdAt) / 60_000);
          const priority = e.ticket?.priority ?? 'MEDIUM';
          const slaState =
            timeInEscalationMinutes >= 240 ? 'breached' :
            timeInEscalationMinutes >= 60  ? 'at_risk'  : 'on_track';
          return {
            ticketId: e.id,
            ticketNumber: e.ticket?.ticket_number ?? '',
            title: e.ticket?.title ?? '',
            clientName: e.ticket?.title ?? 'Unknown',
            clientId: e.tenant_id,
            severity: priority,
            reason: e.reason ?? '',
            timeInEscalationMinutes,
            assignedTo: e.escalated_to ?? undefined,
            slaState,
            created_at: e.created_at,
            _ticketId: e.ticket_id,
          } as EscalatedTicket & { _ticketId: string };
        });
      },
      providesTags: ['Escalations'],
    }),
    getEscalationAgents: builder.query<{ id: string; displayName: string; currentLoad: number }[], void>({
      query: () => '/escalations/agents',
      transformResponse: (response: ApiResponse<{ id: string; displayName: string; currentLoad: number }[]>) => response.data,
    }),
    assignEscalation: builder.mutation<{ success: boolean; assigneeName: string | null }, EscalationAssignPayload>({
      query: ({ ticketId, agentId }) => ({ url: `/escalations/${ticketId}/assign`, method: 'PATCH', body: { agentId } }),
      transformResponse: (response: ApiResponse<{ success: boolean; assigneeName: string | null }>) => response.data,
      invalidatesTags: ['Escalations'],
    }),
    resolveEscalation: builder.mutation<{ success: boolean }, EscalationResolvePayload>({
      query: ({ ticketId, resolution }) => ({ url: `/escalations/${ticketId}/resolve`, method: 'PATCH', body: { resolution } }),
      transformResponse: (response: ApiResponse<{ success: boolean }>) => response.data,
      invalidatesTags: ['Escalations'],
    }),

    // ── User Skills ─────────────────────────────────────────────
    /** Get skills assigned to a specific user */
    getUserSkills: builder.query<UserSkill[], string>({
      query: (userId) => `/users/${userId}/skills`,
      transformResponse: (response: ApiResponse<any[]>) => {
        const arr: any[] = response.data ?? (response as any) ?? [];
        return arr.map((us) => ({
          skillId: us.skill_id ?? us.skillId ?? us.id,
          skill: us.skill
            ? { id: us.skill.id, name: us.skill.name, category: us.skill.category, description: us.skill.description }
            : us.skill_id
              ? { id: us.skill_id, name: us.name ?? '', category: us.category ?? undefined, description: undefined }
              : undefined,
          level: (us.level ?? 'BEGINNER') as import('@3sc/types').SkillLevel,
          endorsements: us.proficiency,
        }));
      },
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    /** Replace a user's full skill list (ADMIN/LEAD only) */
    updateUserSkills: builder.mutation<UserSkill[], { userId: string; skillIds: { skillId: string; level: string }[] }>({
      query: ({ userId, skillIds }) => ({
        url: `/users/${userId}/skills`,
        method: 'PATCH',
        body: { skills: skillIds.map((s) => ({ skill_id: s.skillId, level: s.level })) },
      }),
      transformResponse: (response: ApiResponse<any[]>) => {
        const arr: any[] = response.data ?? (response as any) ?? [];
        return arr.map((us) => ({
          skillId: us.skill_id ?? us.skillId ?? us.id,
          skill: us.skill
            ? { id: us.skill.id, name: us.skill.name, category: us.skill.category, description: us.skill.description }
            : us.skill_id
              ? { id: us.skill_id, name: us.name ?? '', category: us.category ?? undefined, description: undefined }
              : undefined,
          level: (us.level ?? 'BEGINNER') as import('@3sc/types').SkillLevel,
          endorsements: us.proficiency,
        }));
      },
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),

    // ── Skill Taxonomy ──────────────────────────────────────────
    /** Get the global skill taxonomy list */
    getSkills: builder.query<Skill[], { category?: string; search?: string } | void>({
      query: (params) => ({ url: '/skills', params: params ?? {} }),
      transformResponse: (response: ApiResponse<Skill[]> | { data: Skill[] }) => {
        const arr = (response as ApiResponse<Skill[]>).data ?? (response as any);
        return Array.isArray(arr) ? arr : [];
      },
      providesTags: ['User'],
    }),
    /** ADMIN: add a new skill to the global taxonomy */
    createSkill: builder.mutation<Skill, { name: string; category: string; description?: string }>({
      query: (body) => ({ url: '/skills', method: 'POST', body }),
      transformResponse: (response: ApiResponse<Skill>) => response.data ?? (response as any),
      invalidatesTags: ['User'],
    }),

    // ── User Workload ───────────────────────────────────────────
    /** Get live workload metrics for a user */
    getUserWorkload: builder.query<UserWorkload, string>({
      query: (userId) => `/users/${userId}/workload`,
      transformResponse: (response: ApiResponse<any>) => {
        const d = response.data ?? response;
        return {
          assignedTickets: d.assigned_tickets ?? d.assignedTickets ?? 0,
          maxCapacity: d.max_capacity ?? d.maxCapacity ?? 20,
          availabilityStatus: (d.availability_status ?? d.availabilityStatus ?? 'AVAILABLE') as import('@3sc/types').AvailabilityStatus,
          availableFrom: d.available_from ?? d.availableFrom,
          utilizationPct: d.utilization_pct ?? d.utilizationPct ?? 0,
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    /** Update max capacity or availability status (ADMIN/LEAD) */
    updateUserWorkload: builder.mutation<UserWorkload, { userId: string; data: UserWorkloadUpdatePayload }>({
      query: ({ userId, data }) => ({ url: `/users/${userId}/workload`, method: 'PATCH', body: data }),
      transformResponse: (response: ApiResponse<any>) => {
        const d = response.data ?? response;
        return {
          assignedTickets: d.assigned_tickets ?? d.assignedTickets ?? 0,
          maxCapacity: d.max_capacity ?? d.maxCapacity ?? 20,
          availabilityStatus: (d.availability_status ?? d.availabilityStatus ?? 'AVAILABLE') as import('@3sc/types').AvailabilityStatus,
          availableFrom: d.available_from ?? d.availableFrom,
          utilizationPct: d.utilization_pct ?? d.utilizationPct ?? 0,
        };
      },
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),
    /** Get aggregated workload summary for all agents (LEAD/ADMIN dashboard widget) */
    getWorkloadSummary: builder.query<{
      totalAgents: number;
      availableAgents: number;
      busyAgents: number;
      awayAgents: number;
      offlineAgents: number;
      avgUtilization: number;
      overloadedAgents: number;
    }, void>({
      query: () => '/users/workload-summary',
      transformResponse: (response: ApiResponse<any>) => {
        const d = response.data ?? response;
        return {
          totalAgents: d.total_agents ?? d.totalAgents ?? 0,
          availableAgents: d.available_agents ?? d.availableAgents ?? 0,
          busyAgents: d.busy_agents ?? d.busyAgents ?? 0,
          awayAgents: d.away_agents ?? d.awayAgents ?? 0,
          offlineAgents: d.offline_agents ?? d.offlineAgents ?? 0,
          avgUtilization: d.avg_utilization ?? d.avgUtilization ?? 0,
          overloadedAgents: d.overloaded_agents ?? d.overloadedAgents ?? 0,
        };
      },
      providesTags: ['User'],
    }),

    // ── User Permission Overrides ───────────────────────────────
    /** Get a user's effective permission list + override breakdown (ADMIN only) */
    getUserPermissions: builder.query<{ effective: Permission[]; overrides: PermissionOverride[] }, string>({
      query: (userId) => `/users/${userId}/permissions`,
      transformResponse: (response: ApiResponse<{ effective: Permission[]; overrides: PermissionOverride[] }>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    /** ADMIN: add or remove a permission override on a user */
    updateUserPermission: builder.mutation<{ effective: Permission[]; overrides: PermissionOverride[] }, { userId: string; payload: PermissionOverridePayload }>({
      query: ({ userId, payload }) => ({ url: `/users/${userId}/permissions`, method: 'PATCH', body: payload }),
      transformResponse: (response: ApiResponse<{ effective: Permission[]; overrides: PermissionOverride[] }>) => response.data,
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),
    /** CLIENT_ADMIN: toggle a permission on/off for one of their org members (ceiling-enforced server-side) */
    toggleTeamMemberPermission: builder.mutation<{ effective: Permission[] }, { memberId: string; permission: Permission; enabled: boolean }>({
      query: ({ memberId, permission, enabled }) => ({
        url: `/team/members/${memberId}/permissions`,
        method: 'PATCH',
        body: { permission, enabled },
      }),
      transformResponse: (response: ApiResponse<{ effective: Permission[] }>) => response.data,
      invalidatesTags: ['User'],
    }),

    // ── Client Team Management ──────────────────────────────────
    /** CLIENT_ADMIN: get org-scoped member list (never includes internal 3SC staff) */
    getTeamMembers: builder.query<PaginatedResponse<User>, { page?: number; search?: string; role?: string }>({
      query: (params) => ({ url: '/team/members', params }),
      transformResponse: (response: any) => ({
        data: (response.data ?? []).map(mapRawUser),
        total: response.total ?? 0,
        page: response.page ?? 1,
        page_size: response.page_size ?? 25,
        total_pages: response.total_pages ?? 1,
      }),
      providesTags: ['User'],
    }),
    /** CLIENT_ADMIN: change a member's role within [CLIENT_ADMIN, CLIENT_USER] */
    updateTeamMemberRole: builder.mutation<User, { memberId: string; role: 'CLIENT_ADMIN' | 'CLIENT_USER' }>({
      query: ({ memberId, role }) => ({ url: `/team/members/${memberId}/role`, method: 'PATCH', body: { role } }),
      transformResponse: (response: ApiResponse<any>) => mapRawUser(response.data ?? response),
      invalidatesTags: ['User'],
    }),
    /** CLIENT_ADMIN: deactivate a member (soft delete only) */
    deactivateTeamMember: builder.mutation<{ success: boolean }, string>({
      query: (memberId) => ({ url: `/team/members/${memberId}`, method: 'DELETE' }),
      transformResponse: (response: ApiResponse<{ success: boolean }>) => response.data,
      invalidatesTags: ['User'],
    }),

    // ── Assignment Scoring Weights ──────────────────────────────
    /** Get the current global assignment scoring weights */
    getScoringWeights: builder.query<AssignmentScoringWeights, void>({
      query: () => '/users/scoring-weights',
      transformResponse: (response: ApiResponse<AssignmentScoringWeights>) => response.data,
      providesTags: ['User'],
    }),
    /** ADMIN: update the global scoring weights */
    updateScoringWeights: builder.mutation<AssignmentScoringWeights, AssignmentScoringWeightsPayload>({
      query: (body) => ({ url: '/users/scoring-weights', method: 'PATCH', body }),
      transformResponse: (response: ApiResponse<AssignmentScoringWeights>) => response.data,
      invalidatesTags: ['User'],
    }),

    // ── AI — Assignment Suggestions ─────────────────────────────
    /** Get top-3 agent suggestions for a ticket, ranked by scoring formula */
    getAssignSuggestions: builder.query<AgentAssignSuggestion[], string>({
      query: (ticketId) => `/ai/users/assign-suggest/${ticketId}`,
      transformResponse: (response: ApiResponse<AgentAssignSuggestion[]>) => response.data,
      providesTags: ['AI'],
    }),
    /** Get open tickets with no skill-matched agent (LEAD/ADMIN) */
    getSkillGaps: builder.query<SkillGap[], void>({
      query: () => '/ai/users/skill-gaps',
      transformResponse: (response: ApiResponse<SkillGap[]>) => response.data,
      providesTags: ['AI'],
    }),
    /** Suggest skills for an agent based on their ticket resolution history */
    suggestAgentSkills: builder.mutation<{ suggestedSkills: Skill[]; reasoning: string }, string>({
      query: (userId) => ({ url: `/ai/users/suggest-skills/${userId}`, method: 'POST' }),
      transformResponse: (response: ApiResponse<{ suggestedSkills: Skill[]; reasoning: string }>) => response.data,
    }),

    // ── Password Reset (ADMIN) ──────────────────────────────────
    /** ADMIN: trigger a password reset email for any user */
    adminResetPassword: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({ url: `/users/${userId}/reset-password`, method: 'POST' }),
      transformResponse: (response: ApiResponse<{ success: boolean }>) => response.data,
    }),

    // ── Similar Tickets ─────────────────────────────────────────
    /** Find resolved/closed tickets with similar title+description keywords */
    getSimilarTickets: builder.query<Array<{ ticketId: string; ticketNumber: string; title: string; status: string }>, { title: string; description?: string }>({
      query: (params) => ({ url: '/ai/similar-tickets', params }),
      transformResponse: (response: ApiResponse<Array<{ ticketId: string; ticketNumber: string; title: string; status: string }>>) => response.data ?? [],
      providesTags: ['SimilarTickets'],
    }),

    // ── AI Copilot ──────────────────────────────────────────────
    createCopilotSession: builder.mutation<{ id: string }, { context?: { page?: string; entityType?: string; entityId?: string } }>({
      query: (body) => ({ url: '/ai/copilot/sessions', method: 'POST', body }),
      transformResponse: (response: ApiResponse<{ id: string }>) => response.data,
    }),
    getCopilotSessions: builder.query<Array<{ id: string; title?: string; updated_at: string }>, { limit?: number }>({
      query: (params) => ({ url: '/ai/copilot/sessions', params }),
      transformResponse: (response: ApiResponse<Array<{ id: string; title?: string; updated_at: string }>>) => response.data ?? [],
      providesTags: ['CopilotSessions'],
    }),
    getCopilotHistory: builder.query<Array<{ id: string; role: string; content: string; toolCalls?: unknown; toolCallId?: string; createdAt: string }>, string>({
      query: (conversationId) => ({ url: `/ai/copilot/sessions/${conversationId}` }),
      transformResponse: (response: ApiResponse<Array<{ id: string; role: string; content: string; toolCalls?: unknown; toolCallId?: string; createdAt: string }>>) => response.data ?? [],
      providesTags: (result, error, id) => [{ type: 'CopilotHistory', id }],
    }),
    sendCopilotMessage: builder.mutation<
      { messages: Array<{ role: string; content: string; toolCalls?: unknown; toolCallId?: string }>; done: boolean },
      { conversationId: string; message: string }
    >({
      query: ({ conversationId, message }) => ({ url: `/ai/copilot/sessions/${conversationId}/chat`, method: 'POST', body: { conversationId, message } }),
      transformResponse: (response: ApiResponse<{ messages: Array<{ role: string; content: string; toolCalls?: unknown; toolCallId?: string }>; done: boolean }>) => response.data,
      invalidatesTags: (result, error, { conversationId }) => [{ type: 'CopilotHistory', id: conversationId }],
    }),
    executeCopilotDraft: builder.mutation<
      { type: string; data: unknown; message?: string },
      { conversationId: string; tool: string; payload: Record<string, unknown> }
    >({
      query: ({ conversationId, tool, payload }) => ({ url: `/ai/copilot/sessions/${conversationId}/execute-draft`, method: 'POST', body: { tool, payload } }),
      transformResponse: (response: ApiResponse<{ type: string; data: unknown; message?: string }>) => response.data,
      invalidatesTags: (result, error, { conversationId }) => [{ type: 'CopilotHistory', id: conversationId }],
    }),
    renameCopilotSession: builder.mutation<void, { conversationId: string; title: string }>({
      query: ({ conversationId, title }) => ({ url: `/ai/copilot/sessions/${conversationId}`, method: 'PATCH', body: { title } }),
      invalidatesTags: ['CopilotSessions'],
    }),
    deleteCopilotSession: builder.mutation<void, string>({
      query: (conversationId) => ({ url: `/ai/copilot/sessions/${conversationId}`, method: 'DELETE' }),
      invalidatesTags: ['CopilotSessions'],
    }),

    // ── Documents ───────────────────────────────────────────
    getDocuments: builder.query<PaginatedResponse<Document>, { tenant_id?: string; department?: string; search?: string; page?: number; page_size?: number }>({
      query: (params) => ({ url: '/documents', params }),
      transformResponse: (response: PaginatedResponse<Document> & { data: any[] }) => ({
        ...response,
        data: response.data.map((d: any) => ({
          id: d.id,
          tenantId: d.tenant_id,
          department: d.department,
          filename: d.filename,
          mimeType: d.mime_type,
          sizeBytes: d.size_bytes,
          downloadCount: d.download_count,
          uploadedBy: d.uploaded_by,
          uploaderName: d.uploader_name,
          created_at: d.created_at,
          updated_at: d.updated_at,
        })),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Document' as const, id })),
              { type: 'DocumentList' },
            ]
          : [{ type: 'DocumentList' }],
    }),

    getDocumentStats: builder.query<DocumentStats, { tenant_id?: string }>({
      query: (params) => ({ url: '/documents/stats', params }),
      transformResponse: (response: { total_files: number; total_departments: number; total_downloads: number }) => ({
        totalFiles: response.total_files,
        totalDepartments: response.total_departments,
        totalDownloads: response.total_downloads,
      }),
      providesTags: ['DocumentStats'],
    }),

    uploadDocument: builder.mutation<Document, DocumentCreatePayload>({
      query: (payload) => {
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('filename', payload.filename);
        formData.append('department', payload.department);
        if (payload.targetTenantId) {
          formData.append('target_tenant_id', payload.targetTenantId);
        }
        return {
          url: '/documents',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      transformResponse: (response: ApiResponse<Document>) => response.data,
      invalidatesTags: ['DocumentList', 'DocumentStats'],
    }),

    updateDocument: builder.mutation<Document, { id: string; body: DocumentUpdatePayload }>({
      query: ({ id, body }) => ({
        url: `/documents/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<Document>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Document', id },
        'DocumentList',
        'DocumentStats',
      ],
    }),

    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DocumentList', 'DocumentStats'],
    }),
  }),
});

// ── Export Hooks ─────────────────────────────────────────────────
export const {
  // Auth
  useLoginMutation,
  useLogoutMutation,
  useGetSessionQuery,
  // Tickets
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useBulkUpdateTicketsMutation,
  useDeleteTicketMutation,
  useTransitionTicketMutation,
  // Comments
  useGetCommentsQuery,
  useCreateCommentMutation,
  // Attachments
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  useGetPresignedUploadMutation,
  useConfirmUploadMutation,
  // Projects
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  // AI Projects
  useGetProjectHealthQuery,
  useGetProjectClustersQuery,
  useGetProjectScopeDriftQuery,
  useGetProjectChurnRiskQuery,
  useGetProjectStatusReportQuery,
  useAskProjectMutation,
  useGetProjectNextActionQuery,
  useGetProjectKnowledgeQuery,
  useGetProjectMilestonePredictionsQuery,
  // Knowledge Base
  useSearchKBQuery,
  useGetKBArticleQuery,
  useGetKBCategoriesQuery,
  useCreateKBArticleMutation,
  useUpdateKBArticleMutation,
  useDeleteKBArticleMutation,
  useVoteHelpfulMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  // Users
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useInviteUserMutation,
  // Organizations
  useGetOrganizationsQuery,
  useUpdateOrganizationMutation,
  // Dashboard
  useGetDashboardQuery,
  // Analytics
  useGetTicketVolumeQuery,
  useGetSLAComplianceQuery,
  useGetResolutionTrendsQuery,
  useGetAgentPerformanceQuery,
  useGetMonthlyVolumeQuery,
  useGetCategoryBreakdownQuery,
  useGetSeverityDistributionQuery,
  useGetResolutionBySeverityQuery,
  // CSAT / NPS
  useGetCsatKpisQuery,
  useGetCsatTrendsQuery,
  useGetNpsBreakdownQuery,
  useGetFeedbackThemesQuery,
  // User Preferences
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  // SLA Policy
  useGetSLAPolicyQuery,
  useUpdateSLAPolicyMutation,
  // System Settings
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  // Audit
  useGetAuditLogsQuery,
  // Routing
  useGetRoutingRulesQuery,
  useCreateRoutingRuleMutation,
  useUpdateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  // AI
  useGetAIDigestQuery,
  useGetAIClassificationQuery,
  useGetAIPriorityQuery,
  useGetAIRoutingQuery,
  useGetAISuggestedReplyQuery,
  useGetAISummaryQuery,
  useGetAIETAQuery,
  useClassifyTextMutation,
  useAiSemanticSearchQuery,
  useAcceptAISuggestionMutation,
  useRejectAISuggestionMutation,
  // AI Knowledge Base
  useGetAIKBSuggestionsQuery,
  useGetAIKBDeflectionsQuery,
  useGenerateKBDraftMutation,
  useGetKBGapsQuery,
  useAskKBMutation,
  // Delivery Board
  useGetDeliveryFeaturesQuery,
  useCreateDeliveryFeatureMutation,
  useUpdateDeliveryFeatureMutation,
  useDeleteDeliveryFeatureMutation,
  // Onboarding
  useGetOnboardingProjectsQuery,
  useGetOnboardingProjectQuery,
  useCreateOnboardingProjectMutation,
  useUpdateOnboardingProjectMutation,
  useDeleteOnboardingProjectMutation,
  useUpdateOnboardingTaskMutation,
  useGetMyOnboardingQuery,
  // Roadmap
  useGetRoadmapFeaturesQuery,
  useVoteRoadmapFeatureMutation,
  useUnvoteRoadmapFeatureMutation,
  useSubmitFeatureRequestMutation,
  // AI — Delivery
  useGetDeliveryRiskQuery,
  usePrioritiseDeliveryMutation,
  useDraftDeliveryFeatureMutation,
  // AI — Onboarding
  useGetOnboardingHealthQuery,
  useGetOnboardingBlockerSummaryMutation,
  useGetOnboardingNextActionQuery,
  // AI — Roadmap
  useGetRoadmapSummaryQuery,
  useClassifyFeatureRequestMutation,
  // Escalations
  useGetEscalationsQuery,
  useGetEscalationAgentsQuery,
  useAssignEscalationMutation,
  useResolveEscalationMutation,
  // User Skills
  useGetUserSkillsQuery,
  useUpdateUserSkillsMutation,
  // Skill Taxonomy
  useGetSkillsQuery,
  useCreateSkillMutation,
  // Workload
  useGetUserWorkloadQuery,
  useUpdateUserWorkloadMutation,
  useGetWorkloadSummaryQuery,
  // Permission Overrides
  useGetUserPermissionsQuery,
  useUpdateUserPermissionMutation,
  useToggleTeamMemberPermissionMutation,
  // Client Team Management
  useGetTeamMembersQuery,
  useUpdateTeamMemberRoleMutation,
  useDeactivateTeamMemberMutation,
  // Scoring Weights
  useGetScoringWeightsQuery,
  useUpdateScoringWeightsMutation,
  // AI — Assignment
  useGetAssignSuggestionsQuery,
  useGetSkillGapsQuery,
  useSuggestAgentSkillsMutation,
  // Password Reset
  useAdminResetPasswordMutation,
  // Similar Tickets
  useGetSimilarTicketsQuery,
  // AI Copilot
  useCreateCopilotSessionMutation,
  useGetCopilotSessionsQuery,
  useGetCopilotHistoryQuery,
  useSendCopilotMessageMutation,
  useExecuteCopilotDraftMutation,
  useRenameCopilotSessionMutation,
  useDeleteCopilotSessionMutation,
  // Documents
  useGetDocumentsQuery,
  useGetDocumentStatsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
} = api;
