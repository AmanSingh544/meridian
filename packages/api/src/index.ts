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
  PaginatedResponse,
  ApiResponse,
  SessionInfo,
  LoginCredentials,
} from '@3sc/types';

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
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Attempt token refresh
    const refreshResult = await rawBaseQuery(
      { url: AUTH_CONFIG.refreshPath, method: 'POST' },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      // Retry original request
      result = await rawBaseQuery(args, api, extraOptions);
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
    'Session',
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
        url: '/tickets',
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
        url: `/tickets/${id}`,
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
      transformResponse: (response: ApiResponse<Comment[]>) => response.data,
      providesTags: (_result, _error, ticketId) => [{ type: 'Comment', id: ticketId }],
    }),

    createComment: builder.mutation<Comment, CommentCreatePayload>({
      query: ({ ticketId, ...body }) => ({
        url: `/tickets/${ticketId}/comments`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Comment>) => response.data,
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Comment', id: ticketId },
        { type: 'Ticket', id: ticketId },
      ],
    }),

    // ── Attachments ─────────────────────────────────────────
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
    getProjects: builder.query<PaginatedResponse<Project>, { page?: number; pageSize?: number }>({
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

    // ── Organizations ───────────────────────────────────────
    getOrganizations: builder.query<PaginatedResponse<Organization>, { page?: number }>({
      query: (params) => ({ url: '/organizations', params }),
      providesTags: ['Organization'],
    }),

    // ── Dashboard ───────────────────────────────────────────
    getDashboard: builder.query<DashboardSummary, void>({
      query: () => '/dashboard',
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

    // ── Audit Logs ──────────────────────────────────────────
    getAuditLogs: builder.query<PaginatedResponse<AuditLogEntry>, {
      page?: number;
      pageSize?: number;
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
  useTransitionTicketMutation,
  // Comments
  useGetCommentsQuery,
  useCreateCommentMutation,
  // Attachments
  useGetPresignedUploadMutation,
  useConfirmUploadMutation,
  // Projects
  useGetProjectsQuery,
  useGetProjectQuery,
  // Knowledge Base
  useSearchKBQuery,
  useGetKBArticleQuery,
  useGetKBCategoriesQuery,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  // Users
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  // Organizations
  useGetOrganizationsQuery,
  // Dashboard
  useGetDashboardQuery,
  // Analytics
  useGetTicketVolumeQuery,
  useGetSLAComplianceQuery,
  useGetResolutionTrendsQuery,
  useGetAgentPerformanceQuery,
  // Audit
  useGetAuditLogsQuery,
  // Routing
  useGetRoutingRulesQuery,
  useUpdateRoutingRuleMutation,
  // AI
  useGetAIClassificationQuery,
  useGetAIPriorityQuery,
  useGetAIRoutingQuery,
  useGetAISuggestedReplyQuery,
  useGetAISummaryQuery,
  useGetAIETAQuery,
  useAiSemanticSearchQuery,
  useAcceptAISuggestionMutation,
  useRejectAISuggestionMutation,
} = api;
