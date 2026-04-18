// ═══════════════════════════════════════════════════════════════════════════
// MERIDIAN INTERNAL CONSOLE — MOCK FETCH HANDLER
// ═══════════════════════════════════════════════════════════════════════════
//
// Intercepts every fetch() call made by RTK Query and returns mock data.
// No extra dependencies — pure fetch monkey-patching.
//
// HOW IT WORKS
//   installMockHandler() replaces window.fetch with a wrapper that checks
//   the URL path against route matchers. Matched requests return a synthetic
//   Response with JSON mock data after a short simulated delay.
//   Unmatched requests (fonts, CDN assets) pass through to the real fetch.
//
// HOW TO REMOVE (when APIs are ready)
//   1. Delete the two lines in main.tsx that import and call installMockHandler
//   2. Delete this file and src/mocks/data.ts
//
// BASE URL: /api/v1  (from packages/config/src/index.ts → API_CONFIG.baseUrl)
// AUTH PATHS come from AUTH_CONFIG in the same file.
// ═══════════════════════════════════════════════════════════════════════════

import {
  MOCK_USERS,
  MOCK_ORGANIZATIONS,
  MOCK_TICKETS,
  MOCK_COMMENTS,
  MOCK_DASHBOARD,
  MOCK_TICKET_VOLUME,
  MOCK_SLA_COMPLIANCE,
  MOCK_RESOLUTION_TRENDS,
  MOCK_AGENT_PERFORMANCE,
  MOCK_AUDIT_LOGS,
  MOCK_AI_SUGGESTIONS,
  DEFAULT_AI_SUGGESTIONS,
  MOCK_AI_SEARCH_RESULTS,
  defaultSearchResult,
  MOCK_NOTIFICATIONS,
  MOCK_ROUTING_RULES,
  MOCK_PERSONAS,
  MOCK_KB_CATEGORIES,
  MOCK_KB_ARTICLES,
  MOCK_PROJECTS,
  MOCK_PROJECT_HEALTH,
  MOCK_PROJECT_CLUSTERS,
  MOCK_PROJECT_SCOPE_DRIFT,
  MOCK_PROJECT_CHURN_RISK,
  MOCK_PROJECT_STATUS_REPORTS,
  MOCK_PROJECT_NEXT_ACTIONS,
  MOCK_PROJECT_KNOWLEDGE,
  MOCK_PROJECT_MILESTONE_PREDICTIONS,
  MOCK_MONTHLY_VOLUME,
  MOCK_CATEGORY_BREAKDOWN,
  MOCK_SEVERITY_DISTRIBUTION,
  MOCK_RESOLUTION_BY_SEVERITY,
  MOCK_USER_PREFERENCES,
  MOCK_DELIVERY_FEATURES,
  MOCK_ONBOARDING_PROJECTS,
  MOCK_DELIVERY_RISKS,
  MOCK_DELIVERY_PRIORITISED,
  MOCK_DELIVERY_DRAFT,
  MOCK_ONBOARDING_HEALTH,
  MOCK_ONBOARDING_BLOCKERS,
  MOCK_ONBOARDING_NEXT_ACTIONS,
  MOCK_ESCALATIONS,
  MOCK_AGENTS,
} from './data';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIMULATED_DELAY_MS = 400;

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
  return {
    data: items.slice(start, start + page_size),
    page,
    page_size,
    total,
    total_pages,
  };
}

// Extract pathname from a URL string (handles both absolute and relative URLs)
function getPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // Relative URL — extract path before '?'
    return url.split('?')[0];
  }
}

// Extract query params
function qp(url: string): URLSearchParams {
  const idx = url.indexOf('?');
  return new URLSearchParams(idx >= 0 ? url.slice(idx + 1) : '');
}

// Extract the segment after a known path segment
// e.g. extractAfter('/api/v1/tickets/TKT-001', 'tickets') → 'TKT-001'
function extractAfter(url: string, segment: string): string {
  const path = getPath(url);
  const parts = path.split('/');
  const idx = parts.lastIndexOf(segment);
  if (idx < 0) return '';
  return parts[idx + 1]?.split('?')[0] ?? '';
}

// ── Active persona ────────────────────────────────────────────────────────────
// Change ACTIVE_PERSONA to switch which user the mock session uses:
//   MOCK_PERSONAS.ADMIN  — Alex Morgan   (full access, audit log, org management)
//   MOCK_PERSONAS.LEAD   — Priya Sharma  (assign tickets, SLA config, reports)
//   MOCK_PERSONAS.AGENT  — James Okafor  (tickets + comments only)
const ACTIVE_PERSONA = MOCK_PERSONAS.ADMIN;

// Convert the @3sc/types User shape → the raw API shape @3sc/auth expects
const MOCK_API_USER = {
  user_id: parseInt(ACTIVE_PERSONA.id.replace('USR-', ''), 10),
  email: ACTIVE_PERSONA.email,
  user_name: ACTIVE_PERSONA.displayName,
  role: ACTIVE_PERSONA.role as string,
  permissions: ACTIVE_PERSONA.permissions as string[],
  tenant_id: ACTIVE_PERSONA.organizationId,
  tenant_name: '3SC Internal',
};

// Shape for login() response
const MOCK_LOGIN_RESPONSE = {
  message: 'Login successful',
  tokens: { access: 'mock-access-token', refresh: 'mock-refresh-token' },
  user: MOCK_API_USER,
};

// Shape for getSession() response
const MOCK_SESSION_RESPONSE = {
  data: MOCK_API_USER,
};

// ── Route table ───────────────────────────────────────────────────────────────
// Each entry: { test(path, method) → boolean, handle(url, method) → response data }
// Routes are tested in order — first match wins.

type RouteHandler = (url: string, method: string, body?: string) => unknown;

const routes: Array<{ test: (path: string, method: string) => boolean; handle: RouteHandler }> = [

  // ── Auth ─────────────────────────────────────────────────────────────────
  // loginPath  = '/user/login'   → @3sc/auth login() expects { message, tokens, user: {...} }
  // sessionPath = '/user/auth/session' → getSession() expects { data: { user_id, ... } }
  {
    test: (p, m) => m === 'POST' && p.endsWith('/user/login'),
    handle: () => MOCK_LOGIN_RESPONSE,
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/user/auth/session'),
    handle: () => MOCK_SESSION_RESPONSE,
  },
  {
    test: (p, m) => m === 'POST' && p.includes('/auth/logout'),
    handle: () => ({ success: true }),
  },
  {
    test: (p, m) => m === 'POST' && p.includes('/token/refresh'),
    handle: () => MOCK_SESSION_RESPONSE,
  },
  {
    test: (p, m) => m === 'POST' && p.includes('/auth/reset-password'),
    handle: () => ({ success: true, message: 'If this email is registered, a reset link has been sent.' }),
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  // GET /api/v1/dashboard/kpis
  {
    test: (p, m) => m === 'GET' && p.includes('/dashboard/kpis'),
    handle: () => ({ data: MOCK_DASHBOARD }),
  },

  // ── Tickets: list ─────────────────────────────────────────────────────────
  // GET /api/v1/tickets/list
  {
    test: (p, m) => m === 'GET' && p.endsWith('/tickets/list'),
    handle: (url) => {
      const params = qp(url);
      const page       = parseInt(params.get('page')      ?? '1',  10);
      const page_size  = parseInt(params.get('page_size') ?? '25', 10);
      const search     = (params.get('search')   ?? '').toLowerCase();
      // RTK Query serialises array params as repeated keys: status=OPEN&status=IN_PROGRESS
      const statuses   = params.getAll('status');
      const priorities = params.getAll('priority');
      const assignedTo = params.get('assignedTo');
      const unassigned = params.get('unassigned') === 'true';
      const sortBy     = params.get('sortBy')    ?? 'updated_at';
      const sortOrder  = params.get('sortOrder') ?? 'desc';

      let filtered = [...MOCK_TICKETS];

      if (search)            filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(search) ||
        t.ticketNumber.toLowerCase().includes(search) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search))
      );
      if (statuses.length)   filtered = filtered.filter((t) => statuses.includes(t.status));
      if (priorities.length) filtered = filtered.filter((t) => priorities.includes(t.priority));
      if (assignedTo)        filtered = filtered.filter((t) => t.assignedTo === assignedTo);
      if (unassigned)        filtered = filtered.filter((t) => !t.assignedTo);

      filtered.sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[sortBy] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[sortBy] ?? '');
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });

      const paged = paginate(filtered, page, page_size);
      // RTK Query reads this directly (no transformResponse on getTickets)
      return {
        data:        paged.data,
        page:        paged.page,
        page_size:   paged.page_size,
        total:       paged.total,
        total_pages: paged.total_pages,
        meta: {
          total:       paged.total,
          page:        paged.page,
          total_pages: paged.total_pages,
          page_size:   paged.page_size,
        },
      };
    },
  },

  // ── Tickets: single ───────────────────────────────────────────────────────
  // GET /api/v1/tickets/:id
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
    handle: () => ({ data: MOCK_TICKETS[0] }),
  },

  // ── Tickets: update ───────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'PATCH' && p.includes('/tickets/'),
    handle: (url) => {
      const id = extractAfter(url, 'tickets');
      const ticket = MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0];
      return { data: ticket };
    },
  },

  // ── Tickets: transition ───────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/transition'),
    handle: (url) => {
      const id = extractAfter(url, 'tickets');
      const ticket = MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0];
      return { data: ticket };
    },
  },

  // ── Comments: list ─────────────────────────────────────────────────────────
  // GET /api/v1/tickets/:id/comments
  {
    test: (p, m) => m === 'GET' && p.includes('/comments'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'tickets');
      const comments = MOCK_COMMENTS[ticketId] ?? [];
      // getComments uses transformResponse expecting ApiResponse<RawApiComment[]>
      // but our mock data is already typed as Comment[] — return as raw array
      // The transformer handles both Array and { data: Array } shapes
      return comments;
    },
  },

  // ── Comments: create ──────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/comments'),
    handle: () => ({
      data: {
        id: `CMT-${Date.now()}`,
        ticketId: 'TKT-001',
        authorId: 'USR-002',
        author: MOCK_USERS.find((u) => u.id === 'USR-002'),
        content: 'Comment submitted.',
        isInternal: false,
        attachments: [],
        mentions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }),
  },

  // ── Users: list ────────────────────────────────────────────────────────────
  // GET /api/v1/users
  {
    test: (p, m) => m === 'GET' && /\/users$/.test(p),
    handle: (url) => {
      const params     = qp(url);
      const page       = parseInt(params.get('page') ?? '1', 10);
      const search     = (params.get('search') ?? '').toLowerCase();
      const role       = params.get('role');

      let filtered = [...MOCK_USERS];
      if (search) filtered = filtered.filter((u) =>
        u.displayName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
      if (role) filtered = filtered.filter((u) => u.role === role);

      return paginate(filtered, page, 20);
    },
  },

  // ── Users: single ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/users\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'users');
      return { data: MOCK_USERS.find((u) => u.id === id) ?? MOCK_USERS[0] };
    },
  },

  // ── Users: invite ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/users/invite'),
    handle: () => ({ data: { success: true } }),
  },

  // ── Users: update / delete ────────────────────────────────────────────────
  {
    test: (p, m) => (m === 'PATCH' || m === 'DELETE') && /\/users\/[^/]+$/.test(p),
    handle: () => ({ data: { success: true } }),
  },

  // ── Organizations: list ────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/organizations$/.test(p),
    handle: (url) => {
      const page = parseInt(qp(url).get('page') ?? '1', 10);
      return paginate(MOCK_ORGANIZATIONS, page, 20);
    },
  },

  // ── Organizations: update ─────────────────────────────────────────────────
  {
    test: (p, m) => m === 'PATCH' && p.includes('/organizations/'),
    handle: () => ({ data: { success: true } }),
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/ticket-volume'),
    handle: () => ({ data: MOCK_TICKET_VOLUME }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/sla-compliance'),
    handle: () => ({ data: MOCK_SLA_COMPLIANCE }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/resolution-trends'),
    handle: () => ({ data: MOCK_RESOLUTION_TRENDS }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/agent-performance'),
    handle: () => ({ data: MOCK_AGENT_PERFORMANCE }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/monthly-volume'),
    handle: () => ({ data: MOCK_MONTHLY_VOLUME }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/category-breakdown'),
    handle: () => ({ data: MOCK_CATEGORY_BREAKDOWN }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/severity-distribution'),
    handle: () => ({ data: MOCK_SEVERITY_DISTRIBUTION }),
  },
  {
    test: (p, m) => m === 'GET' && p.includes('/analytics/resolution-by-severity'),
    handle: () => ({ data: MOCK_RESOLUTION_BY_SEVERITY }),
  },

  // ── User Preferences ─────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/users/me/preferences'),
    handle: () => ({ data: MOCK_USER_PREFERENCES }),
  },
  {
    test: (p, m) => m === 'PATCH' && p.includes('/users/me/preferences'),
    handle: (_url, _method, body) => {
      const patch = body ? JSON.parse(body) : {};
      return { data: { ...MOCK_USER_PREFERENCES, ...patch } };
    },
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/audit-logs'),
    handle: (url) => {
      const params       = qp(url);
      const page         = parseInt(params.get('page') ?? '1', 10);
      const resourceType = params.get('resourceType');

      let filtered = [...MOCK_AUDIT_LOGS];
      if (resourceType) filtered = filtered.filter((e) => e.resourceType === resourceType);

      return paginate(filtered, page, 25);
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
  {
    test: (p, m) => m === 'POST' && p.includes('/notifications/'),
    handle: () => ({ data: { success: true } }),
  },

  // ── AI — Classification ───────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/classify/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'classify');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.classification };
    },
  },

  // ── AI — Priority ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/priority/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'priority');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.priority };
    },
  },

  // ── AI — Routing ──────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/route/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'route');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.routing };
    },
  },

  // ── AI — Suggested Reply ──────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/suggest-reply/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'suggest-reply');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.reply };
    },
  },

  // ── AI — Summary ──────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/summary/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'summary');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.summary };
    },
  },

  // ── AI — ETA ──────────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/eta/'),
    handle: (url) => {
      const ticketId = extractAfter(url, 'eta');
      const s = MOCK_AI_SUGGESTIONS[ticketId] ?? DEFAULT_AI_SUGGESTIONS(ticketId);
      return { data: s.eta };
    },
  },

  // ── AI — Classify Text (pre-ticket, used on create form) ─────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/classify-text'),
    handle: () => ({
      data: {
        category: 'BUG',
        priority: 'HIGH',
        categoryConfidence: 0.87,
        priorityConfidence: 0.82,
        categoryReasoning: 'Description mentions unexpected system behaviour and error messages, consistent with a bug report.',
        priorityReasoning: 'Issue affects core functionality and has user-visible impact without a known workaround.',
        priorityFactors: [
          'User-facing functionality broken',
          'No workaround mentioned',
          'Affects multiple users',
        ],
      },
    }),
  },

  // ── AI — Accept / Reject ──────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/suggestions/'),
    handle: () => ({ data: { success: true } }),
  },

  // ── AI — Semantic Search ──────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/search'),
    handle: (url) => {
      const query = (qp(url).get('query') ?? '').toLowerCase();
      for (const key of Object.keys(MOCK_AI_SEARCH_RESULTS)) {
        if (key.split(' ').some((k) => query.includes(k))) {
          return { data: MOCK_AI_SEARCH_RESULTS[key] };
        }
      }
      return { data: defaultSearchResult(query) };
    },
  },

  // ── AI — KB Suggestions (ticket → related articles) ──────────────────────
  {
    test: (p, m) => m === 'GET' && /\/ai\/kb-suggest\//.test(p),
    handle: (url) => {
      const ticketId = extractAfter(url, 'kb-suggest');
      const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
      const queryWords = ticket ? ticket.title.toLowerCase().split(' ') : [];
      const suggestions = MOCK_KB_ARTICLES
        .filter((a) => a.isPublished)
        .map((a) => {
          const score = queryWords.filter((w) => w.length > 3 && (a.title.toLowerCase().includes(w) || a.tags.some((t) => t.includes(w)))).length / Math.max(queryWords.length, 1);
          return { articleId: a.id, title: a.title, excerpt: a.excerpt, score: Math.min(0.35 + score * 0.65, 1), reasoning: `Matches ticket topic: ${a.category?.name ?? 'General'}` };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      return { data: suggestions };
    },
  },

  // ── AI — KB Deflection (free-form query → related articles) ──────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/kb-deflect'),
    handle: (url) => {
      const query = (qp(url).get('query') ?? '').toLowerCase();
      const limit = parseInt(qp(url).get('limit') ?? '5', 10);
      const words = query.split(/\s+/).filter((w) => w.length > 3);
      const suggestions = MOCK_KB_ARTICLES
        .filter((a) => a.isPublished)
        .map((a) => {
          const matchCount = words.filter((w) => a.title.toLowerCase().includes(w) || a.excerpt.toLowerCase().includes(w) || a.tags.some((t) => t.includes(w))).length;
          const score = Math.min(0.3 + (matchCount / Math.max(words.length, 1)) * 0.7, 1);
          return { articleId: a.id, title: a.title, excerpt: a.excerpt, score, reasoning: 'Similar topic found in knowledge base' };
        })
        .filter((s) => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return { data: suggestions };
    },
  },

  // ── AI — KB Draft Generation ──────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/kb-draft'),
    handle: async (_, body) => {
      const parsed = body ? JSON.parse(body) : {};
      const topic: string = parsed.topic ?? 'New Article';
      const tone: string = parsed.tone ?? 'friendly';
      const categoryId: string | undefined = parsed.categoryId;
      return {
        data: {
          title: `How to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
          excerpt: `A comprehensive guide covering ${topic}. This article walks you through the key concepts and steps needed to ${topic.toLowerCase()} effectively.`,
          content: `## Overview\n\nThis guide covers everything you need to know about ${topic}.\n\n## Prerequisites\n\n- Access to your account\n- Basic familiarity with the platform\n\n## Step-by-Step Guide\n\n1. Log in to your account\n2. Navigate to the relevant section\n3. Follow the steps outlined below\n\n## Common Issues\n\n- If you encounter an error, check your permissions\n- Contact support if the issue persists\n\n## Summary\n\nBy following this guide, you should now be able to ${topic.toLowerCase()} successfully.`,
          suggestedTags: topic.toLowerCase().split(' ').filter((w) => w.length > 3).slice(0, 5),
          suggestedCategoryId: categoryId ?? MOCK_KB_CATEGORIES[0]?.id,
        },
      };
    },
  },

  // ── AI — KB Gap Detection ─────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/kb-gaps'),
    handle: () => ({
      data: [
        { id: 'gap-1', topic: 'Two-factor authentication setup', description: '23 tickets in the last 30 days ask about enabling 2FA but no KB article covers this.', ticketCount: 23, sampleTicketIds: [MOCK_TICKETS[0]?.id ?? 'T-001'], suggestedTitle: 'How to Enable Two-Factor Authentication', priority: 'high' },
        { id: 'gap-2', topic: 'Invoice download process', description: '15 tickets ask how to download invoices from the billing section.', ticketCount: 15, sampleTicketIds: [MOCK_TICKETS[1]?.id ?? 'T-002'], suggestedTitle: 'Downloading Your Invoices', priority: 'high' },
        { id: 'gap-3', topic: 'API rate limits', description: '11 tickets from developer accounts ask about API rate limiting behaviour.', ticketCount: 11, sampleTicketIds: [MOCK_TICKETS[2]?.id ?? 'T-003'], suggestedTitle: 'Understanding API Rate Limits', priority: 'medium' },
        { id: 'gap-4', topic: 'Team member permissions', description: '9 tickets ask about setting permissions for team members.', ticketCount: 9, sampleTicketIds: [], suggestedTitle: 'Managing Team Member Permissions', priority: 'medium' },
      ],
    }),
  },

  // ── AI — KB Ask / RAG ─────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/ai/kb-ask'),
    handle: async (_, body) => {
      const parsed = body ? JSON.parse(body) : {};
      const question: string = (parsed.question ?? '').toLowerCase();
      const matchingArticles = MOCK_KB_ARTICLES
        .filter((a) => a.isPublished && (a.title.toLowerCase().split(' ').some((w) => w.length > 4 && question.includes(w)) || a.tags.some((t) => question.includes(t))))
        .slice(0, 3);
      const canAnswer = matchingArticles.length > 0;
      return {
        data: {
          answer: canAnswer
            ? `Based on our knowledge base: ${matchingArticles[0].excerpt} For full details, see the linked article${matchingArticles.length > 1 ? 's' : ''} below.`
            : "I couldn't find a specific answer in our knowledge base for that question. Please create a support ticket and our team will help you directly.",
          confidence: canAnswer ? 0.72 + Math.random() * 0.2 : 0.1,
          sourceArticleIds: matchingArticles.map((a) => a.id),
          followUpQuestions: canAnswer
            ? [`How do I reset my ${matchingArticles[0].tags[0] ?? 'settings'}?`, 'What are the system requirements?', 'Can I get a refund?']
            : [],
          cannotAnswer: !canAnswer,
        },
      };
    },
  },

  // ── Knowledge Base: categories ───────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/knowledge-base/categories'),
    handle: () => ({ data: MOCK_KB_CATEGORIES }),
  },

  // ── Knowledge Base: search ────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/knowledge-base/search'),
    handle: (url) => {
      const params = qp(url);
      const query = (params.get('query') ?? '').toLowerCase().trim();
      const categoryId = params.get('categoryId');
      const limit = parseInt(params.get('limit') ?? '10', 10);

      let articles = MOCK_KB_ARTICLES.filter((a) => a.isPublished);
      if (categoryId) articles = articles.filter((a) => a.categoryId === categoryId);

      if (!query) {
        return {
          data: articles.slice(0, limit).map((a) => ({ article: a, score: 1, highlights: [] })),
        };
      }

      const scored = articles
        .map((a) => {
          const titleMatch = a.title.toLowerCase().includes(query);
          const excerptMatch = a.excerpt.toLowerCase().includes(query);
          const contentMatch = a.content.toLowerCase().includes(query);
          const tagMatch = a.tags.some((t) => t.toLowerCase().includes(query));
          if (!titleMatch && !excerptMatch && !contentMatch && !tagMatch) return null;
          const score =
            (titleMatch ? 0.5 : 0) +
            (tagMatch ? 0.25 : 0) +
            (excerptMatch ? 0.15 : 0) +
            (contentMatch ? 0.1 : 0);
          const highlights: string[] = [];
          if (titleMatch) highlights.push(a.title);
          if (excerptMatch) highlights.push(a.excerpt.slice(0, 80));
          return { article: a, score: Math.min(score, 1), highlights };
        })
        .filter(Boolean)
        .sort((a, b) => b!.score - a!.score)
        .slice(0, limit);

      return { data: scored };
    },
  },

  // ── Knowledge Base: single article ───────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && /\/knowledge-base\/articles\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'articles');
      const article = MOCK_KB_ARTICLES.find((a) => a.id === id || a.slug === id);
      if (!article) return jsonResponse({ error: 'Not found' }, 404);
      return { data: article };
    },
  },

  // ── Knowledge Base: helpful vote ──────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/knowledge-base/articles/') && p.includes('/helpful'),
    handle: (url) => {
      const parts = getPath(url).split('/');
      const articleIdx = parts.lastIndexOf('articles');
      const id = parts[articleIdx + 1];
      const article = MOCK_KB_ARTICLES.find((a) => a.id === id);
      if (article) article.helpfulCount += 1;
      return { data: { success: true } };
    },
  },

  // ── Knowledge Base: create article ───────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && /\/knowledge-base\/articles$/.test(p),
    handle: () => {
      const newArticle = { ...MOCK_KB_ARTICLES[0], id: `KBA-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      MOCK_KB_ARTICLES.push(newArticle);
      return { data: newArticle };
    },
  },

  // ── Knowledge Base: update article ───────────────────────────────────────────
  {
    test: (p, m) => m === 'PATCH' && p.includes('/knowledge-base/articles/'),
    handle: (url) => {
      const id = extractAfter(url, 'articles');
      const article = MOCK_KB_ARTICLES.find((a) => a.id === id) ?? MOCK_KB_ARTICLES[0];
      return { data: { ...article, updated_at: new Date().toISOString() } };
    },
  },

  // ── Knowledge Base: delete article ───────────────────────────────────────────
  {
    test: (p, m) => m === 'DELETE' && p.includes('/knowledge-base/articles/'),
    handle: () => ({ data: { success: true } }),
  },

  // ── Routing Rules ─────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'GET' && p.includes('/routing-rules'),
    handle: () => ({ data: MOCK_ROUTING_RULES }),
  },
  {
    test: (p, m) => (m === 'PATCH' || m === 'PUT') && p.includes('/routing-rules/'),
    handle: (url) => {
      const id = extractAfter(url, 'routing-rules');
      const rule = MOCK_ROUTING_RULES.find((r) => r.id === id) ?? MOCK_ROUTING_RULES[0];
      return { data: rule };
    },
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  // GET /projects — paginated list
  {
    test: (p, m) => m === 'GET' && /\/projects$/.test(p),
    handle: (url) => {
      const params = qp(url);
      const page = parseInt(params.get('page') ?? '1', 10);
      const page_size = parseInt(params.get('page_size') ?? '25', 10);
      return paginate(MOCK_PROJECTS, page, page_size);
    },
  },
  // GET /projects/:id — single project
  {
    test: (p, m) => m === 'GET' && /\/projects\/[^/]+$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      const project = MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0];
      return { data: project };
    },
  },
  // POST /projects — create
  {
    test: (p, m) => m === 'POST' && /\/projects$/.test(p),
    handle: (_url, _method, body) => {
      const payload = body ? JSON.parse(body) : {};
      const newProject = {
        ...MOCK_PROJECTS[0],
        ...payload,
        id: `PRJ-${Date.now()}`,
        ticketCount: 0,
        openTicketCount: 0,
        resolvedThisWeek: 0,
        milestones: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { data: newProject };
    },
  },
  // PATCH /projects/:id — update
  {
    test: (p, m) => m === 'PATCH' && /\/projects\/[^/]+$/.test(p),
    handle: (url, _method, body) => {
      const id = extractAfter(url, 'projects');
      const project = MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0];
      const payload = body ? JSON.parse(body) : {};
      return { data: { ...project, ...payload, updated_at: new Date().toISOString() } };
    },
  },

  // ── AI Projects ───────────────────────────────────────────────────────────
  // GET /ai/projects/:id/health
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/health$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_HEALTH[id] ?? MOCK_PROJECT_HEALTH['PRJ-001'] };
    },
  },
  // GET /ai/projects/:id/clusters
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/clusters$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_CLUSTERS[id] ?? [] };
    },
  },
  // GET /ai/projects/:id/scope-drift
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/scope-drift$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_SCOPE_DRIFT[id] ?? [] };
    },
  },
  // GET /ai/projects/:id/churn-risk
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/churn-risk$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_CHURN_RISK[id] ?? { projectId: id, score: 0.1, level: 'low', signals: [], recommendation: 'No action needed.' } };
    },
  },
  // GET /ai/projects/:id/status-report
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/status-report$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_STATUS_REPORTS[id] ?? null };
    },
  },
  // POST /ai/projects/:id/ask
  {
    test: (p, m) => m === 'POST' && /\/ai\/projects\/[^/]+\/ask$/.test(p),
    handle: async (_url, _method, body) => {
      const { question } = body ? JSON.parse(body) : { question: '' };
      const q = (question as string).toLowerCase();
      let answer = 'Based on the project history, I don\'t have a specific answer to that question. Please check the ticket list or contact the project lead.';
      if (q.includes('auth') || q.includes('login')) {
        answer = 'Authentication issues have been a recurring theme in this project. Tickets TKT-001, TKT-002, and TKT-003 all relate to login and session problems. TKT-001 and TKT-002 were resolved by fixing the SSO token refresh flow. TKT-003 (2FA SMS for UK numbers) was resolved by switching to a Twilio international routing profile.';
      } else if (q.includes('delay') || q.includes('milestone') || q.includes('overdue')) {
        answer = 'The Backend APIs milestone (MS-003) is currently 12 days overdue. The primary blocker is missing client environment access credentials. A revised target of April 29 has been proposed internally, pending credential delivery by April 18.';
      } else if (q.includes('status') || q.includes('progress')) {
        answer = 'As of April 17: 42 of 56 tickets resolved. 8 resolved this week. 3 tickets blocked externally. The project is Amber health — velocity is declining and one milestone is overdue. The next milestone (QA & UAT) is scheduled for April 30 but is now predicted for May 10.';
      }
      return { data: { answer, confidence: 0.78, sourceTicketIds: ['TKT-001', 'TKT-002', 'TKT-003'], cannotAnswer: false } };
    },
  },
  // GET /ai/projects/:id/next-action
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/next-action$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_NEXT_ACTIONS[id] ?? null };
    },
  },
  // GET /ai/projects/knowledge
  {
    test: (p, m) => m === 'GET' && p.includes('/ai/projects/knowledge'),
    handle: () => ({ data: MOCK_PROJECT_KNOWLEDGE }),
  },
  // GET /ai/projects/:id/milestone-predictions
  {
    test: (p, m) => m === 'GET' && /\/ai\/projects\/[^/]+\/milestone-predictions$/.test(p),
    handle: (url) => {
      const id = extractAfter(url, 'projects');
      return { data: MOCK_PROJECT_MILESTONE_PREDICTIONS[id] ?? [] };
    },
  },

  // ── Attachments ───────────────────────────────────────────────────────────
  {
    test: (p, m) => m === 'POST' && p.includes('/attachments'),
    handle: () => ({ data: { id: `ATT-${Date.now()}`, url: '#' } }),
  },

  // ── Delivery Board ────────────────────────────────────────────────────────
  // GET /delivery/features
  {
    test: (p, m) => m === 'GET' && p.endsWith('/delivery/features'),
    handle: () => ({ data: MOCK_DELIVERY_FEATURES }),
  },
  // POST /delivery/features
  {
    test: (p, m) => m === 'POST' && p.endsWith('/delivery/features'),
    handle: (_url, _method, body) => {
      const payload = body ? JSON.parse(body) : {};
      const newFeature = {
        id: `DF-${Date.now()}`,
        assignee: undefined,
        assigneeId: undefined,
        eta: undefined,
        upvotes: 0,
        hasVoted: false,
        requestedByOrgIds: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload,
      };
      MOCK_DELIVERY_FEATURES.push(newFeature);
      return { data: newFeature };
    },
  },
  // PATCH /delivery/features/:id
  {
    test: (p, m) => m === 'PATCH' && /\/delivery\/features\/[^/]+$/.test(p),
    handle: (url, _method, body) => {
      const id = url.split('/delivery/features/')[1]?.split('?')[0];
      const idx = MOCK_DELIVERY_FEATURES.findIndex(f => f.id === id);
      if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
      const payload = body ? JSON.parse(body) : {};
      MOCK_DELIVERY_FEATURES[idx] = { ...MOCK_DELIVERY_FEATURES[idx], ...payload, updated_at: new Date().toISOString() };
      return { data: MOCK_DELIVERY_FEATURES[idx] };
    },
  },
  // DELETE /delivery/features/:id
  {
    test: (p, m) => m === 'DELETE' && /\/delivery\/features\/[^/]+$/.test(p),
    handle: (url) => {
      const id = url.split('/delivery/features/')[1]?.split('?')[0];
      const idx = MOCK_DELIVERY_FEATURES.findIndex(f => f.id === id);
      if (idx !== -1) MOCK_DELIVERY_FEATURES.splice(idx, 1);
      return { data: { success: true } };
    },
  },

  // ── Onboarding (internal) ─────────────────────────────────────────────────
  // GET /onboarding
  {
    test: (p, m) => m === 'GET' && p.endsWith('/onboarding'),
    handle: () => ({ data: MOCK_ONBOARDING_PROJECTS }),
  },
  // GET /onboarding/:id
  {
    test: (p, m) => m === 'GET' && /\/onboarding\/[^/]+$/.test(p) && !p.includes('/tasks/') && !p.includes('/my'),
    handle: (url) => {
      const id = url.split('/onboarding/')[1]?.split('?')[0];
      const project = MOCK_ONBOARDING_PROJECTS.find(o => o.id === id);
      if (!project) return jsonResponse({ error: 'Not found' }, 404);
      return { data: project };
    },
  },
  // PATCH /onboarding/:id/tasks/:taskId
  {
    test: (p, m) => m === 'PATCH' && /\/onboarding\/[^/]+\/tasks\/[^/]+$/.test(p),
    handle: (url, _method, body) => {
      const parts = url.split('/');
      const onbId = parts[parts.indexOf('onboarding') + 1];
      const taskId = parts[parts.indexOf('tasks') + 1]?.split('?')[0];
      const project = MOCK_ONBOARDING_PROJECTS.find(o => o.id === onbId);
      if (!project) return jsonResponse({ error: 'Not found' }, 404);
      const payload = body ? JSON.parse(body) : {};
      for (const phase of project.phases) {
        const task = phase.tasks.find(t => t.id === taskId);
        if (task) {
          Object.assign(task, payload);
          if (payload.status === 'DONE' && !task.completedAt) {
            task.completedAt = new Date().toISOString();
          }
          // recalc phase progress
          const done = phase.tasks.filter(t => t.status === 'DONE').length;
          phase.progress = Math.round((done / phase.tasks.length) * 100);
          break;
        }
      }
      project.updated_at = new Date().toISOString();
      return { data: project };
    },
  },

  // ── AI — Delivery ─────────────────────────────────────────────────────────
  // GET /ai/delivery/risk
  {
    test: (p, m) => m === 'GET' && p.endsWith('/ai/delivery/risk'),
    handle: () => ({ data: MOCK_DELIVERY_RISKS }),
  },
  // POST /ai/delivery/prioritise
  {
    test: (p, m) => m === 'POST' && p.endsWith('/ai/delivery/prioritise'),
    handle: () => ({ data: MOCK_DELIVERY_PRIORITISED }),
  },
  // POST /ai/delivery/draft-feature
  {
    test: (p, m) => m === 'POST' && p.endsWith('/ai/delivery/draft-feature'),
    handle: () => ({ data: MOCK_DELIVERY_DRAFT }),
  },

  // ── AI — Onboarding ───────────────────────────────────────────────────────
  // GET /ai/onboarding/:id/health
  {
    test: (p, m) => m === 'GET' && /\/ai\/onboarding\/[^/]+\/health$/.test(p),
    handle: (url) => {
      const id = url.split('/ai/onboarding/')[1]?.split('/health')[0];
      return { data: MOCK_ONBOARDING_HEALTH[id] ?? null };
    },
  },
  // POST /ai/onboarding/:id/blocker-summary
  {
    test: (p, m) => m === 'POST' && /\/ai\/onboarding\/[^/]+\/blocker-summary$/.test(p),
    handle: (url) => {
      const id = url.split('/ai/onboarding/')[1]?.split('/blocker-summary')[0];
      return { data: MOCK_ONBOARDING_BLOCKERS[id] ?? null };
    },
  },
  // GET /ai/onboarding/:id/next-action
  {
    test: (p, m) => m === 'GET' && /\/ai\/onboarding\/[^/]+\/next-action$/.test(p),
    handle: (url) => {
      const id = url.split('/ai/onboarding/')[1]?.split('/next-action')[0];
      return { data: MOCK_ONBOARDING_NEXT_ACTIONS[id] ?? null };
    },
  },

  // ── Escalations ───────────────────────────────────────────────────────────
  // GET /escalations
  {
    test: (p, m) => m === 'GET' && p.endsWith('/escalations'),
    handle: () => ({ data: MOCK_ESCALATIONS }),
  },
  // GET /escalations/agents
  {
    test: (p, m) => m === 'GET' && p.endsWith('/escalations/agents'),
    handle: () => ({ data: MOCK_AGENTS }),
  },
  // PATCH /escalations/:id/assign
  {
    test: (p, m) => m === 'PATCH' && /\/escalations\/[^/]+\/assign$/.test(p),
    handle: (_url, body) => {
      const { agentId } = body as unknown as { agentId: string };
      const agent = MOCK_AGENTS.find(a => a.id === agentId);
      return { data: { success: true, assigneeName: agent?.displayName ?? null } };
    },
  },
  // PATCH /escalations/:id/resolve
  {
    test: (p, m) => m === 'PATCH' && /\/escalations\/[^/]+\/resolve$/.test(p),
    handle: () => ({ data: { success: true } }),
  },
];

// ── Mock fetch installer ──────────────────────────────────────────────────────

const _realFetch = window.fetch.bind(window);

export function installMockHandler(): void {
  // Pre-seed sessionStorage so SessionInit skips the redirect-to-login path.
  // App.tsx reads tenant_id + user_id from sessionStorage to call checkSession().
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
      (typeof input !== 'string' && !(input instanceof URL)
        ? (input as Request).method
        : undefined) ??
      'GET'
    ).toUpperCase();

    const path = getPath(rawUrl);

    // Only intercept paths that belong to our API
    // Covers both /api/v1/... and any other relative API path
    const isApiPath =
      path.startsWith('/api/') ||
      path.startsWith('/user/') ||   // login/session paths
      path.startsWith('/auth/') ||
      path.startsWith('/token/') ||
      path.startsWith('/tickets') ||
      path.startsWith('/dashboard') ||
      path.startsWith('/analytics') ||
      path.startsWith('/audit') ||
      path.startsWith('/users') ||
      path.startsWith('/organizations') ||
      path.startsWith('/notifications') ||
      path.startsWith('/routing') ||
      path.startsWith('/knowledge') ||
      path.startsWith('/ai/') ||
      path.startsWith('/comments') ||
      path.startsWith('/attachments') ||
      path.startsWith('/projects') ||
      path.startsWith('/delivery') ||
      path.startsWith('/onboarding');

    // if (!isApiPath) {
    //   return _realFetch(input, init);
    // }

    for (const route of routes) {
      let matched = false;
      try {
        matched = route.test(path, method);
      } catch {
        continue;
      }

      if (matched) {
        await delay(SIMULATED_DELAY_MS);
        try {
          const bodyText = init?.body ? String(init.body) : undefined;
          const result = await Promise.resolve(route.handle(rawUrl, method, bodyText));
          // If the handler already returned a Response object, use it directly
          if (result instanceof Response) return result;
          return jsonResponse(result);
        } catch (err) {
          console.error('[Mock] Handler threw for', method, path, err);
          return jsonResponse({ error: 'Mock handler error' }, 500);
        }
      }
    }

    // No route matched — return a 501 to surface unhandled paths
    console.warn('[Mock] No mock for:', method, path, '— passing through');
    return jsonResponse({ error: 'No mock handler' }, 501);
  };

  console.info(
    '%c[Meridian Mock API] ✓ Active — all /api/v1/* calls are intercepted.',
    'color: #818cf8; font-weight: 600; font-size: 12px;',
  );
}
