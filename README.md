# 3SC Platform — AI-Powered Customer Support & Issue Management

A production-ready, multi-tenant frontend platform comprising two React SPAs sharing a common enterprise architecture, design system, and utility packages.

## Architecture Overview

```
3sc-platform/
├── apps/
│   ├── customer-portal/       # Customer-facing SPA (port 3000)
│   └── internal-console/      # Internal operations SPA (port 3001)
├── packages/
│   ├── types/                 # Shared TypeScript domain types
│   ├── ui/                    # Shared design system components
│   ├── api/                   # RTK Query API layer (credentialed)
│   ├── auth/                  # Cookie-based auth service
│   ├── permissions/           # RBAC/ABAC permission engine
│   ├── realtime/              # WebSocket client w/ fallback polling
│   ├── hooks/                 # Shared React hooks
│   ├── utils/                 # Shared utility functions
│   ├── theme/                 # Design tokens & CSS variables
│   └── config/                # Shared configuration constants
└── vitest.config.ts           # Test configuration
```

## Tech Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React 18 + TypeScript | Type safety, ecosystem maturity |
| Build | Vite 5 | Fast HMR, native ESM, tree-shaking |
| State | Redux Toolkit + RTK Query | Server cache, typed slices, middleware |
| Routing | React Router v6 | Nested layouts, lazy loading, route guards |
| Auth | HttpOnly cookies | XSS-resistant, no token exposure |
| Realtime | Native WebSocket + polling fallback | Low latency, graceful degradation |
| Testing | Vitest | Fast, Vite-native, compatible API |
| Monorepo | npm workspaces | Zero config, native Node support |

## Authentication

Authentication uses **HttpOnly cookies only**. Tokens are never stored in localStorage, sessionStorage, or exposed to JavaScript.

- Login sends credentials; server sets HttpOnly cookie pair (access + refresh)
- All API requests use `credentials: 'include'`
- RTK Query base query automatically handles 401 → refresh → retry
- Session monitor checks expiry and refreshes proactively
- On session expiry, Redux dispatches `auth/sessionExpired`

## Permission System

Five roles with hierarchical permissions:

| Role | Scope | Key Capabilities |
|------|-------|-------------------|
| `customer_user` | Customer Portal | View/create tickets, KB search |
| `customer_admin` | Customer Portal | + edit tickets, manage users, view analytics |
| `agent` | Internal Console | Ticket workspace, AI features, internal notes |
| `lead` | Internal Console | + assign, escalate, manage routing/SLA/users |
| `admin` | Internal Console | Full access including audit logs |

Permission enforcement at three levels:
1. **Route guards** — `<ProtectedRoute permission={...}>` wraps routes
2. **Layout guards** — Sidebar navigation filtered by permissions
3. **Component guards** — `<PermissionGate>` wraps buttons, panels, actions

Helper methods: `canView()`, `canCreate()`, `canEdit()`, `canAssign()`, `canEscalate()`, `canManageUsers()`, `canViewAuditLog()`, `canUseAI()`, etc.

## Ticket State Machine

```
Open → Acknowledged → In Progress → Resolved → Closed
  ↓                       ↓            ↑          ↑
  └───────────────────────┴── Closed ──┘          │
                                                  │
  Closed → Open (reopen)                          │
  Resolved → Open (reopen) ───────────────────────┘
```

Enforced in UI via `VALID_TICKET_TRANSITIONS` map. Components use `useTicketTransitions(currentStatus)` to get valid next states and prevent invalid jumps. Invalid transitions are blocked in UI and handled gracefully if rejected by API.

## AI Integration

All AI features are advisory (human-in-the-loop):

| Feature | UI Component | Actions |
|---------|-------------|---------|
| Classification | `AIBanner` | Accept / Edit / Reject |
| Priority suggestion | `AISuggestionCard` | Accept / Edit / Reject |
| Routing recommendation | `AISuggestionCard` + alternatives | Accept / Edit / Reject |
| Suggested reply | `AISuggestionCard` inline in conversation | Accept / Edit / Reject |
| Thread summary | `Drawer` panel | View only |
| ETA prediction | Sidebar widget | Confidence bar |
| Semantic search | Search page | Similarity scores |

All AI components handle loading, unavailable, and fallback states. Confidence thresholds are configurable via `@3sc/config`.

## SLA Tracking

- Visual timers with response and resolution deadlines
- States: On Track → At Risk → Breached (+ Paused, Met)
- Color-coded badges and countdown timers
- Auto-refresh every 60 seconds
- Dashboard-level breach alerts

## Realtime

- WebSocket connection with automatic reconnect (exponential backoff, max 10 attempts)
- Heartbeat ping every 30 seconds
- Falls back to HTTP polling (15s interval) when WebSocket fails
- Connection status indicator in Internal Console sidebar
- Events flow into Redux store for live UI updates

## Customer Portal Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password auth |
| Dashboard | `/dashboard` | Metric cards, recent tickets, SLA summary |
| Ticket List | `/tickets` | Filterable/sortable/paginated table |
| Create Ticket | `/tickets/new` | Form with KB suggestions fallback |
| Ticket Detail | `/tickets/:id` | Timeline, comments, SLA, AI summary |
| Knowledge Base | `/knowledge` | Semantic search, categories, article detail |
| Projects | `/projects` | Project cards, milestones, progress |
| Notifications | `/notifications` | Read/unread, mark all read, click-to-navigate |

## Internal Console Pages

| Page | Route | Permission | Description |
|------|-------|-----------|-------------|
| Agent Dashboard | `/dashboard` | — | My queue, SLA risks, metrics |
| Ticket Queue | `/tickets` | — | All/Mine/Unassigned views, filters |
| Ticket Workspace | `/tickets/:id` | — | Full AI panel, internal notes, transitions |
| Search | `/search` | — | AI semantic search across all content |
| Analytics | `/analytics` | `analytics:view` | Volume, SLA compliance, agent perf |
| Users | `/users` | `user:view` | User management table |
| Organizations | `/organizations` | `org:view` | Org management |
| Audit Log | `/audit` | `audit:view` | Filterable audit trail |

## Shared UI Components

28+ production-grade components in `@3sc/ui`:

**Layout**: Button, Input, TextArea, Select, Card, MetricCard, Modal, ConfirmDialog, Drawer, Tabs

**Data**: DataTable, Pagination, SearchInput, Badge, StatusBadge, PriorityBadge, SLABadge, Timeline, Avatar

**Feedback**: Skeleton, SkeletonCard, EmptyState, ErrorState, ErrorBoundary, Toast/ToastProvider, Tooltip

**Domain**: ThreadedComments, FileUpload, SLATimer, PermissionGate, ConnectionIndicator

**AI**: AIBanner, AISuggestionCard, ConfidenceBar

## Getting Started

```bash
# Install dependencies
npm install

# Start both apps in parallel
npm run dev

# Start individually
npm run dev:portal    # http://localhost:3000
npm run dev:console   # http://localhost:3001

# Run tests
npm test

# Type check
npm run typecheck

# Build both apps
npm run build
```

## Environment Variables

Create `.env` files in each app directory:

```env
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=ws://localhost:8080/ws
```

## API Proxy

Both Vite dev servers proxy `/api` and `/ws` to `http://localhost:8080`. Configure the backend URL in `vite.config.ts`.

## Conventions

- **Feature-based** folder structure within each app
- **Shared packages** for cross-app logic (never duplicate)
- **Typed API contracts** in `@3sc/types` — single source of truth
- **Permission checks** centralized in `@3sc/permissions`, consumed via hooks
- **No tokens in client storage** — only HttpOnly cookies
- **AI is advisory** — always accept/edit/reject, never autonomous
- **State machine enforced** — invalid ticket transitions blocked in UI

## Backend Contract Questions

1. What is the exact cookie configuration? (domain, path, SameSite, Secure flags)
2. Does the refresh endpoint return a new session info payload or just set new cookies?
3. Are WebSocket connections authenticated via the same cookie, or do they need a separate token handshake?
4. What is the presigned upload flow? (S3-compatible? Separate confirmation endpoint?)
5. Are AI suggestion endpoints synchronous or do they return a job ID for polling?
6. What tenant isolation mechanism is used? (subdomain, header, path prefix?)
7. Is there a separate endpoint for "my tickets" vs filtered tickets, or is `assignedTo=me` sufficient?
8. What is the pagination contract? (cursor-based or offset-based?)

## Assumptions

- Backend provides REST API at `/api/v1/*` and WebSocket at `/ws`
- Authentication uses HttpOnly cookie pair (access + refresh tokens)
- Multi-tenancy is scoped via tenant ID in session, backend enforces isolation
- AI endpoints are synchronous and return suggestions with confidence scores
- File uploads use presigned URL flow (request → upload to storage → confirm)
- Pagination is offset-based with `page` and `page_size` parameters
- All timestamps are ISO 8601 strings
- The backend validates ticket state transitions and returns 422 for invalid ones

## License

Proprietary — 3SC Platform


## GitHub code versioning
 - create a new repository on github (say URL =  https://github.com/USERNAME/XYZ.git)
 - add the remote first:
      *git remote add origin URL*
    Verify
      *git remote -v*

      You should see:

      origin  https://github.com/USERNAME/XYZ.git (fetch)
      origin  https://github.com/USERNAME/XYZ.git (push)

    Then push
      *git add .*
      *git commit -m "Initial commit"*
      *git branch -M main*
      *git push -u origin main*

  - To make your project fully isolated run this inside this project only:

      *git config user.name "USERNAME"*
      *git config user.email "your-personal-email@gmail.com"*

        👉 This ensures:

        Office repos → use office email
        Personal repo → uses GitHub email

        git init → creates local repo
        git remote add origin → connects to remote
        git push → sends code