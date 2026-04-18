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
import { API_CONFIG, AUTH_CONFIG } from '@3sc/config';
import type {
  Ticket,
  TicketCreatePayload,
  TicketUpdatePayload,
  TicketTransitionPayload,
  TicketFilters,
  Comment,
  CommentCreatePayload,
  Attachment,
  AttachmentCreatePayload,
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
} from '@3sc/types';

// ── Raw API shapes (snake_case from backend) ────────────────────
interface RawApiAttachment {
  id: number;
  file_name: string;
  file_type: string;
  file_path: string;
  tenant_id: string;
  metadata: Record<string, unknown>;
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
      fileName: a.file_name,
      fileSize: 0,
      mimeType: a.file_type,
      url: a.file_path,
      uploadedBy: raw.tenant_id,
      created_at: a.created_at,
    })),
    mentions: raw.mentions.map(String),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

// ── Base Query with Auth Retry ──────────────────────────────────
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.baseUrl,
  credentials: 'include', // Send HttpOnly cookies with every request
  timeout: API_CONFIG.timeout,
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
    'Session', 'UserPreferences',
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
      transformResponse: (response: ApiResponse<Ticket>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Ticket', id }],
    }),

    createTicket: builder.mutation<Ticket, TicketCreatePayload>({
      query: (body) => ({
        url: '/tickets',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Ticket>) => response.data,
      invalidatesTags: ['TicketList', 'Dashboard'],
    }),

    updateTicket: builder.mutation<Ticket, { id: string; payload: TicketUpdatePayload }>({
      query: ({ id, payload }) => ({
        url: `/tickets/${id}/update`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<Ticket>) => response.data,
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
      query: ({ ticketId, ...body }) => ({
        url: `/tickets/${ticketId}/transition`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Ticket>) => response.data,
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketList' },
        'Dashboard',
      ],
    }),

    // ── Comments ────────────────────────────────────────────
    getComments: builder.query<Comment[], string>({
      query: (ticketId) => `/tickets/${ticketId}/comments`,
      transformResponse: (response: ApiResponse<RawApiComment[]> | RawApiComment[]) => {
        const raw = Array.isArray(response) ? response : response.data;
        return raw.map(mapRawComment);
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
      transformResponse: (response: ApiResponse<Comment>) => response.data,
      invalidatesTags: (_result, _error, { ticket_id }) => [
        { type: 'Comment', id: ticket_id },
        { type: 'Ticket', id: ticket_id },
      ],
    }),

    // ── Attachments ─────────────────────────────────────────
    createAttachment: builder.mutation<AttachmentRecord, AttachmentCreatePayload>({
      query: (body) => ({
        url: '/attachments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attachment'],
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
    getNotifications: builder.query<PaginatedResponse<Notification>, { page?: number; unreadOnly?: boolean }>({
      query: (params) => ({ url: '/notifications', params }),
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
    getUsers: builder.query<PaginatedResponse<User>, { page?: number; role?: string; search?: string }>({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      transformResponse: (response: ApiResponse<User>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    updateUser: builder.mutation<User, { id: string; payload: Partial<User> }>({
      query: ({ id, payload }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<User>) => response.data,
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
      transformResponse: (response: ApiResponse<User>) => response.data,
      invalidatesTags: ['User'],
    }),

    // ── Organizations ───────────────────────────────────────
    getOrganizations: builder.query<PaginatedResponse<Organization>, { page?: number }>({
      query: (params) => ({ url: '/organizations', params }),
      providesTags: ['Organization'],
    }),

    updateOrganization: builder.mutation<Organization, { id: string; payload: Partial<Pick<Organization, 'name' | 'domain' | 'logoUrl'>> }>({
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
      transformResponse: (response: ApiResponse<RoutingRule[]>) => response.data,
      providesTags: ['RoutingRule'],
    }),

    updateRoutingRule: builder.mutation<RoutingRule, { id: string; payload: Partial<RoutingRule> }>({
      query: ({ id, payload }) => ({
        url: `/routing-rules/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<RoutingRule>) => response.data,
      invalidatesTags: ['RoutingRule'],
    }),

    // ── AI Endpoints ────────────────────────────────────────
    getAIClassification: builder.query<AISuggestion<AIClassificationSuggestion>, string>({
      query: (ticketId) => `/ai/classify/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIClassificationSuggestion>>) => response.data,
      providesTags: ['AI'],
    }),

    getAIPriority: builder.query<AISuggestion<AIPrioritySuggestion>, string>({
      query: (ticketId) => `/ai/priority/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIPrioritySuggestion>>) => response.data,
      providesTags: ['AI'],
    }),

    getAIRouting: builder.query<AISuggestion<AIRoutingSuggestion>, string>({
      query: (ticketId) => `/ai/route/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIRoutingSuggestion>>) => response.data,
      providesTags: ['AI'],
    }),

    getAISuggestedReply: builder.query<AISuggestion<AIReplySuggestion>, string>({
      query: (ticketId) => `/ai/suggest-reply/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIReplySuggestion>>) => response.data,
      providesTags: ['AI'],
    }),

    getAISummary: builder.query<AISuggestion<AISummarySuggestion>, string>({
      query: (ticketId) => `/ai/summary/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AISummarySuggestion>>) => response.data,
      providesTags: ['AI'],
    }),

    getAIETA: builder.query<AISuggestion<AIETASuggestion>, string>({
      query: (ticketId) => `/ai/eta/${ticketId}`,
      transformResponse: (response: ApiResponse<AISuggestion<AIETASuggestion>>) => response.data,
      providesTags: ['AI'],
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

    acceptAISuggestion: builder.mutation<void, { suggestionId: string }>({
      query: ({ suggestionId }) => ({
        url: `/ai/suggestions/${suggestionId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['AI'],
    }),

    rejectAISuggestion: builder.mutation<void, { suggestionId: string; reason?: string }>({
      query: ({ suggestionId, reason }) => ({
        url: `/ai/suggestions/${suggestionId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['AI'],
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
  useDeleteTicketMutation,
  useTransitionTicketMutation,
  // Comments
  useGetCommentsQuery,
  useCreateCommentMutation,
  // Attachments
  useCreateAttachmentMutation,
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
  // User Preferences
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  // Audit
  useGetAuditLogsQuery,
  // Routing
  useGetRoutingRulesQuery,
  useUpdateRoutingRuleMutation,
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
} = api;
