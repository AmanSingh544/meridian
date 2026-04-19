# Meridian Platform — Backend API Specification

> **Purpose:** This document is the single source of truth for the frontend ↔ backend API contract.
> It covers every endpoint called by both the **Internal Console** (3SC staff) and the **Customer Portal** (client users).
> Backend engineers can use this document directly, or feed it to an AI tool (Claude, ChatGPT, Copilot) to scaffold the implementation.

---

## Contents

1. [General Conventions](#1-general-conventions)
2. [Authentication & Session](#2-authentication--session)
3. [Tickets](#3-tickets)
4. [Comments](#4-comments)
5. [Attachments](#5-attachments)
6. [Users & Members](#6-users--members)
7. [Organizations](#7-organizations)
8. [Projects](#8-projects)
9. [Knowledge Base](#9-knowledge-base)
10. [Notifications](#10-notifications)
11. [Dashboard](#11-dashboard)
12. [Analytics](#12-analytics)
13. [Audit Logs](#13-audit-logs)
14. [Routing Rules](#14-routing-rules)
15. [AI Endpoints](#15-ai-endpoints)
16. [Realtime / WebSocket Events](#16-realtime--websocket-events)
17. [Permission Matrix](#17-permission-matrix)
18. [Shared Type Definitions](#18-shared-type-definitions)
19. [Escalations](#19-escalations)
20. [SLA Policies](#20-sla-policies)
21. [System Settings](#21-system-settings)
22. [Routing Rules (Extended)](#22-routing-rules-extended)
23. [Branding](#23-branding)
24. [Compliance](#24-compliance)
25. [User Preferences](#25-user-preferences)
26. [Analytics (Extended)](#26-analytics-extended)

---

## 1. General Conventions

### Base URL
```
/api/v1
```
All endpoints below are relative to this base. E.g. `GET /tickets/list` → `GET /api/v1/tickets/list`.

### Multi-Tenancy
Every authenticated request carries a `tenant_id` query parameter injected automatically by the frontend:
```
GET /api/v1/tickets/list?tenant_id=ORG-002&page=1
```
The backend **must** scope all data queries to the provided `tenant_id`. Internal staff (AGENT/LEAD/ADMIN) may have cross-tenant access depending on their role.

### Authentication
- The backend uses **HttpOnly cookie-based sessions** (no Bearer token in `Authorization` header).
- Cookies are sent automatically with every request (`credentials: 'include'` on the frontend).
- On 401, the frontend automatically attempts a token refresh via `POST /token/refresh`, then retries the original request.

### Response Envelope
Every successful response must be wrapped:
```json
{
  "data": <payload>,
  "message": "optional human-readable string"
}
```

### Paginated Response Envelope
For list endpoints:
```json
{
  "data": [...],
  "page": 1,
  "page_size": 25,
  "total": 142,
  "total_pages": 6
}
```

### Error Response
```json
{
  "code": "TICKET_NOT_FOUND",
  "message": "Ticket with ID TKT-001 was not found.",
  "details": {
    "field": ["Validation message"]
  },
  "traceId": "abc-123"
}
```

### HTTP Status Codes
| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | Success, no body |
| 400 | Validation error |
| 401 | Unauthenticated — triggers frontend token refresh |
| 403 | Forbidden (authenticated but lacks permission) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate) |
| 422 | Unprocessable entity |
| 500 | Internal server error |

### Field Naming
- **Request bodies & response bodies:** `snake_case`
- **Query parameters:** `snake_case`
- Dates: ISO 8601 strings (`2026-04-16T09:00:00Z`)
- IDs: strings (UUID or prefixed string like `TKT-001`)

---

## 2. Authentication & Session

### POST `/user/login`
Authenticate a user and start a session.

**Request body:**
```json
{
  "email": "sarah@acmecorp.com",
  "password": "s3cur3P@ss",
  "tenantSlug": "acme-corp"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "tokens": {
    "access": "<access_token>",
    "refresh": "<refresh_token>"
  },
  "user": {
    "user_id": 101,
    "email": "sarah@acmecorp.com",
    "user_name": "Sarah Thompson",
    "role": "CLIENT_ADMIN",
    "permissions": ["TICKET_CREATE", "TICKET_VIEW_ORG", "TICKET_EDIT", "..."],
    "tenant_id": "ORG-002",
    "tenant_name": "Acme Corp"
  }
}
```

> **Note:** The `permissions` array is the source of truth for UI gating. The frontend does **not** derive permissions from the role name.

**Response `401`:** Invalid credentials.

---

### GET `/user/auth/session?tenant_id=ORG-002`
Validate current session and return session info. Called on every app load.

**Response `200`:**
```json
{
  "data": {
    "user_id": 101,
    "email": "sarah@acmecorp.com",
    "user_name": "Sarah Thompson",
    "role": "CLIENT_ADMIN",
    "permissions": ["TICKET_CREATE", "TICKET_VIEW_ORG", "..."],
    "tenant_id": "ORG-002",
    "tenant_name": "Acme Corp"
  }
}
```

**Response `401`:** Session expired or invalid — frontend will redirect to `/login`.

---

### POST `/auth/logout`
Invalidate the current session.

**Response `200`:** `{ "success": true }`

---

### POST `/token/refresh`
Refresh the access token using the refresh token (sent via cookie).

**Response `200`:** Same shape as `/user/auth/session`.
**Response `401`:** Refresh token invalid/expired — frontend dispatches `auth/sessionExpired` and redirects to login.

---

### POST `/auth/reset-password`
Request a password reset email.

**Request body:**
```json
{ "email": "sarah@acmecorp.com" }
```

**Response `200`:**
```json
{ "success": true, "message": "If this email is registered, a reset link has been sent." }
```
> Always return 200 regardless of whether the email exists (security best practice).

---

### POST `/auth/confirm-reset`
Set a new password using a reset token from the email link.

**Request body:**
```json
{
  "token": "<one-time-token-from-email>",
  "newPassword": "n3wP@ssw0rd"
}
```

**Response `200`:** `{ "success": true }`
**Response `400`:** Token invalid or expired.

---

## 3. Tickets

### Ticket Object
```json
{
  "id": "TKT-C001",
  "ticketNumber": "TKT-C001",
  "title": "SSO login broken after Azure AD certificate renewal",
  "description": "Full description text...",
  "status": "IN_PROGRESS",
  "priority": "CRITICAL",
  "category": "INCIDENT",
  "tags": ["sso", "azure-ad", "saml"],
  "createdBy": "CUST-001",
  "assignedTo": "USR-002",
  "organizationId": "ORG-002",
  "projectId": "PRJ-002",
  "sla": {
    "responseDeadline": "2026-04-16T10:00:00Z",
    "resolutionDeadline": "2026-04-17T08:00:00Z",
    "responseState": "met",
    "resolutionState": "at_risk",
    "responseMet": true,
    "resolutionMet": false
  },
  "attachments": [
    {
      "id": "ATT-C001",
      "fileName": "saml_error_log.txt",
      "fileSize": 14200,
      "mimeType": "text/plain",
      "url": "https://storage.example.com/...",
      "uploadedBy": "CUST-001",
      "created_at": "2026-04-12T09:15:00Z"
    }
  ],
  "commentCount": 5,
  "creator": { /* User object, see §18 */ },
  "assignee": { /* User object, see §18 */ },
  "created_at": "2026-04-12T09:00:00Z",
  "updated_at": "2026-04-16T07:45:00Z",
  "resolved_at": null,
  "closed_at": null
}
```

**Enum values:**

`status`: `OPEN` | `ACKNOWLEDGED` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`

`priority`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

`category`: `BUG` | `FEATURE_REQUEST` | `SUPPORT` | `BILLING` | `QUESTION` | `INCIDENT` | `TASK`

`sla.responseState` / `sla.resolutionState`: `on_track` | `at_risk` | `breached` | `paused` | `met`

**Valid status transitions:**
```
OPEN        → ACKNOWLEDGED, IN_PROGRESS, CLOSED
ACKNOWLEDGED → IN_PROGRESS, CLOSED
IN_PROGRESS  → RESOLVED, CLOSED
RESOLVED     → CLOSED, OPEN  (reopen)
CLOSED       → OPEN          (reopen)
```

---

### GET `/tickets/list`
Get a paginated, filtered list of tickets.

**Query parameters:**
| Param | Type | Description |
|---|---|---|
| `tenant_id` | string | Required. Injected by frontend. |
| `page` | integer | Default: 1 |
| `page_size` | integer | Default: 25 |
| `status` | string (repeatable) | Filter by status. Multiple values: `?status=OPEN&status=IN_PROGRESS` |
| `priority` | string (repeatable) | Filter by priority. Multiple values. |
| `category` | string (repeatable) | Filter by category. |
| `assignedTo` | string | Filter by assignee user ID. |
| `createdBy` | string | Filter by creator user ID. |
| `projectId` | string | Filter by project. |
| `search` | string | Full-text search across title, ticketNumber, tags. |
| `dateFrom` | ISO8601 | Filter tickets created after this date. |
| `dateTo` | ISO8601 | Filter tickets created before this date. |
| `sortBy` | string | Field to sort by. Default: `updated_at`. |
| `sortOrder` | `asc` \| `desc` | Default: `desc`. |

> **Important:** Array params are sent as repeated query keys, not comma-separated.
> Parse with `request.query.getAll('status')` or equivalent.

**Scoping by role:**
- `CLIENT_USER`: Return only tickets where `createdBy = current_user_id`
- `CLIENT_ADMIN`: Return all tickets where `organizationId = tenant_id`
- `AGENT` / `LEAD` / `ADMIN`: Return all tickets (cross-tenant)

**Response `200`:**
```json
{
  "data": [ /* Ticket[] */ ],
  "page": 1,
  "page_size": 25,
  "total": 47,
  "total_pages": 2
}
```

---

### GET `/tickets/:id`
Get a single ticket by ID.

**Response `200`:** `{ "data": <Ticket> }`
**Response `404`:** Ticket not found.

---

### POST `/tickets`
Create a new ticket.

**Request body:**
```json
{
  "title": "SSO login broken after Azure AD certificate renewal",
  "description": "Full description...",
  "priority": "CRITICAL",
  "category": "INCIDENT",
  "tags": ["sso", "azure-ad"],
  "projectId": "PRJ-002",
  "attachment_ids": [1001, 1002]
}
```

> `attachment_ids` are IDs returned by `POST /attachments` (see §5).
> Backend should associate those pre-uploaded attachments with the new ticket.

**Response `201`:** `{ "data": <Ticket> }`

**Side effects:**
- Trigger SLA clock start based on priority
- Apply routing rules (see §14) to auto-assign
- Emit realtime event `ticket:created` (see §16)

---

### PATCH `/tickets/:id/update`
Update ticket fields.

**Request body (all optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "HIGH",
  "category": "BUG",
  "tags": ["sso", "updated-tag"],
  "assignedTo": "USR-003"
}
```

**Response `200`:** `{ "data": <Ticket> }`

**Permissions required:**
- `TICKET_EDIT` to change title/description/category/tags
- `TICKET_ASSIGN` to change `assignedTo`

**Side effects:** Emit realtime event `ticket:updated`.

---

### DELETE `/tickets/:id`
Delete a ticket permanently.

**Response `204`:** No body.

**Permissions required:** `TICKET_DELETE`

---

### POST `/tickets/:id/transition`
Change a ticket's status.

**Request body:**
```json
{
  "toStatus": "IN_PROGRESS",
  "comment": "Optional reason/note for the transition (especially for reopens)"
}
```

**Response `200`:** `{ "data": <Ticket> }` with updated status and timestamp fields.

**Business rules:**
- Validate against `VALID_TICKET_TRANSITIONS` table above.
- If transition is invalid → `422` with `{ "code": "INVALID_TRANSITION" }`.
- When transitioning to `RESOLVED`: set `resolved_at = now()`.
- When transitioning to `CLOSED`: set `closed_at = now()`.
- When reopening (→ `OPEN`): clear `resolved_at`, `closed_at`.
- Pause/resume SLA if configured.
- If `comment` is provided, create an internal system comment on the ticket.

**Permissions required:** `TICKET_STATUS_CHANGE` (or `TICKET_REOPEN` for reopen transitions)

**Side effects:** Emit realtime event `ticket:status_changed`.

---

## 4. Comments

### Comment Object
```json
{
  "id": "CMT-001",
  "ticket_id": "TKT-C001",
  "tenant_id": "ORG-002",
  "user_id": 101,
  "parent_id": null,
  "message": "Comment content here.",
  "is_deleted": false,
  "is_internal": false,
  "attachments": [ /* AttachmentRecord[] */ ],
  "mentions": [102, 103],
  "created_at": "2026-04-12T09:20:00Z",
  "updated_at": "2026-04-12T09:20:00Z"
}
```

> The frontend maps this raw shape to camelCase internally. The backend must return snake_case.

### GET `/tickets/:id/comments`
Get all comments for a ticket.

**Scoping:**
- `CLIENT_USER` / `CLIENT_ADMIN`: Return only comments where `is_internal = false`.
- `AGENT` / `LEAD` / `ADMIN`: Return all comments including internal notes.

**Response `200`:** Array (not envelope) — `Comment[]` OR `{ "data": Comment[] }` (both accepted by frontend).

---

### POST `/comments`
Create a new comment.

**Request body:**
```json
{
  "ticket_id": "TKT-C001",
  "user_id": "101",
  "message": "Comment content here. @Sarah Thompson for visibility.",
  "isInternal": false,
  "parent_id": null,
  "mentioned_user_ids": ["CUST-001"],
  "attachment_ids": ["ATT-001", "ATT-002"]
}
```

**Response `201`:** `{ "data": <Comment> }`

**Permissions required:**
- `COMMENT_CREATE` for public comments
- `COMMENT_INTERNAL` for internal notes (`isInternal: true`) — if user lacks this, treat as public

**Side effects:**
- Emit realtime event `comment:created`
- Send notification to mentioned users (`@mentions`)
- Send notification to ticket assignee and creator (if not the commenter)

---

## 5. Attachments

### POST `/attachments`
Upload attachment metadata. The file itself is passed as form-data or metadata only (see note).

> **Current frontend implementation:** The frontend sends metadata only (not the actual binary). If you want binary upload, use the presigned URL flow below instead.

**Request body (`application/json`):**
```json
{
  "file_name": "saml_error_log.txt",
  "file_type": "text/plain",
  "file_path": "/uploads/saml_error_log.txt",
  "metadata": {}
}
```

**Response `200`:**
```json
{
  "data": {
    "id": 1001,
    "file_name": "saml_error_log.txt",
    "file_type": "text/plain",
    "file_path": "/uploads/saml_error_log.txt",
    "tenant_id": "ORG-002",
    "metadata": {},
    "created_at": "2026-04-16T10:00:00Z"
  }
}
```

> The returned `id` (integer) is passed as `attachment_ids[]` when creating a ticket or comment.

**Permissions required:** `ATTACHMENT_UPLOAD`

---

### POST `/attachments/presign`
(Optional — for direct S3/GCS upload flow)
Get a presigned upload URL.

**Request body:**
```json
{
  "fileName": "screenshot.png",
  "mimeType": "image/png"
}
```

**Response `200`:**
```json
{
  "data": {
    "uploadUrl": "https://storage.googleapis.com/bucket/...",
    "fileKey": "uploads/abc123/screenshot.png",
    "expiresAt": "2026-04-16T10:15:00Z"
  }
}
```

---

### POST `/attachments/confirm`
Confirm a completed presigned upload.

**Request body:**
```json
{
  "fileKey": "uploads/abc123/screenshot.png",
  "ticketId": "TKT-C001"
}
```

**Response `200`:** `{ "data": <Attachment> }`

---

## 6. Users & Members

### User Object
```json
{
  "id": "USR-001",
  "email": "alex.morgan@3sc.com",
  "displayName": "Alex Morgan",
  "firstName": "Alex",
  "lastName": "Morgan",
  "avatarUrl": "https://...",
  "role": "ADMIN",
  "permissions": ["TICKET_CREATE", "TICKET_VIEW_ALL", "..."],
  "organizationId": "ORG-001",
  "isActive": true,
  "lastLoginAt": "2026-04-16T08:30:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2026-04-16T08:30:00Z"
}
```

### GET `/users`
List users. Scoped by role.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `page_size` | integer | Default: 20 |
| `search` | string | Filter by name or email |
| `role` | string | Filter by role |

**Scoping:**
- `CLIENT_ADMIN`: Returns users where `organizationId = tenant_id`
- `AGENT` / `LEAD` / `ADMIN`: Returns all users (for assignment dropdowns)

**Response `200`:** Paginated `User[]`.

---

### GET `/users/:id`
Get a single user.

**Response `200`:** `{ "data": <User> }`

---

### PATCH `/users/:id`
Update a user's profile.

**Request body (all optional):**
```json
{
  "firstName": "Alex",
  "lastName": "Morgan",
  "avatarUrl": "https://...",
  "isActive": true
}
```

**Response `200`:** `{ "data": <User> }`

**Permissions required:** `MEMBER_MANAGE`

---

### DELETE `/users/:id`
Deactivate or delete a user.

**Response `204`:** No body.

**Permissions required:** `MEMBER_MANAGE`

---

### POST `/users/invite`
Invite a new user to the organisation by email.

**Request body:**
```json
{
  "email": "new.user@acmecorp.com",
  "role": "CLIENT_USER",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response `201`:** `{ "data": <User> }` with `isActive: false` until they accept.

**Side effects:** Send invitation email with a one-time token link.

**Permissions required:** `MEMBER_INVITE`

---

## 7. Organizations

### Organization Object
```json
{
  "id": "ORG-002",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logoUrl": "https://...",
  "domain": "acmecorp.com",
  "isActive": true,
  "plan": "enterprise",
  "created_at": "2024-06-01T00:00:00Z",
  "updated_at": "2026-04-10T00:00:00Z"
}
```

### GET `/organizations`
List organizations.

**Scoping:**
- `CLIENT_ADMIN` / `CLIENT_USER`: Returns only their own organization.
- `ADMIN`: Returns all organizations.

**Query params:** `page`, `page_size`

**Response `200`:** Paginated `Organization[]`.

---

### PATCH `/organizations/:id`
Update organization details.

**Request body (all optional):**
```json
{
  "name": "Acme Corporation",
  "domain": "acmecorp.com",
  "logoUrl": "https://cdn.example.com/logo.png"
}
```

**Response `200`:** `{ "data": <Organization> }`

**Permissions required:** `WORKSPACE_CONFIGURE`

---

## 8. Projects

### Project Object
```json
{
  "id": "PRJ-001",
  "name": "Acme Platform Migration",
  "description": "Full migration of legacy systems...",
  "status": "active",
  "organizationId": "ORG-002",
  "leadId": "CUST-001",
  "lead": { /* User object */ },
  "milestones": [
    {
      "id": "MS-001",
      "projectId": "PRJ-001",
      "title": "Infrastructure Setup",
      "dueDate": "2026-02-28T00:00:00Z",
      "isCompleted": true,
      "completedAt": "2026-02-25T00:00:00Z",
      "deliverables": []
    }
  ],
  "ticketCount": 8,
  "startDate": "2026-01-10T00:00:00Z",
  "targetDate": "2026-07-01T00:00:00Z",
  "completedAt": null,
  "created_at": "2026-01-10T09:00:00Z",
  "updated_at": "2026-04-10T14:30:00Z"
}
```

`project.status`: `planning` | `active` | `on_hold` | `completed` | `cancelled`

### GET `/projects`
List projects for the current tenant.

**Query params:** `page`, `page_size`

**Response `200`:** Paginated `Project[]`.

---

### GET `/projects/:id`
Get a single project with milestones.

**Response `200`:** `{ "data": <Project> }`

---

## 9. Knowledge Base

### KBArticle Object
```json
{
  "id": "KB-001",
  "title": "How to configure Azure AD SAML SSO",
  "content": "# Full markdown content...",
  "excerpt": "Step-by-step guide for configuring Azure AD SAML SSO...",
  "slug": "azure-ad-saml-sso",
  "categoryId": "KBC-001",
  "category": { "id": "KBC-001", "name": "Authentication & SSO", "slug": "auth-sso", "articleCount": 3 },
  "tags": ["sso", "azure-ad", "saml"],
  "authorId": "USR-001",
  "isPublished": true,
  "viewCount": 428,
  "helpfulCount": 312,
  "relatedArticleIds": ["KB-002", "KB-003"],
  "created_at": "2025-06-01T00:00:00Z",
  "updated_at": "2026-03-15T00:00:00Z"
}
```

### GET `/knowledge-base/search?query=azure+sso&limit=3`
Semantic / full-text search across KB articles.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `query` | string | Search query. Minimum 3 characters. |
| `limit` | integer | Max results to return. Default: 10. |

> This endpoint is called **while the user types** the ticket subject (debounced, 500ms) as a deflection mechanism — performance matters.

**Response `200`:**
```json
{
  "data": [
    {
      "article": { /* KBArticle object */ },
      "score": 0.92,
      "highlights": ["Step-by-step guide for configuring **Azure AD SAML SSO**..."]
    }
  ]
}
```

**Permissions required:** `KB_VIEW`

---

### GET `/knowledge-base/categories`
List all KB categories.

**Response `200`:** `{ "data": KBCategory[] }`

---

### GET `/knowledge-base/articles/:id`
Get a single KB article.

**Response `200`:** `{ "data": <KBArticle> }`

Side effect: Increment `viewCount`.

---

## 10. Notifications

### Notification Object
```json
{
  "id": "NOTIF-001",
  "userId": "CUST-001",
  "type": "ticket_status_changed",
  "title": "TKT-C001 status updated",
  "message": "Ticket has been updated to In Progress.",
  "isRead": false,
  "data": {},
  "resourceType": "ticket",
  "resourceId": "TKT-C001",
  "created_at": "2026-04-16T07:45:00Z"
}
```

`type` values: `ticket_created` | `ticket_updated` | `ticket_assigned` | `ticket_status_changed` | `ticket_comment` | `ticket_mention` | `sla_at_risk` | `sla_breached` | `project_update` | `system`

### GET `/notifications`
Get notifications for the current user.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `unreadOnly` | boolean | If `true`, return only unread notifications. |

**Response `200`:** Paginated `Notification[]`.

---

### POST `/notifications/:id/read`
Mark a single notification as read.

**Response `200`:** `{ "data": { "success": true } }`

---

### POST `/notifications/read-all`
Mark all of the current user's notifications as read.

**Response `200`:** `{ "data": { "success": true } }`

---

## 11. Dashboard

### GET `/dashboard/kpis`
Get dashboard summary KPIs for the current tenant/user.

**Scoping:**
- `CLIENT_USER`: KPIs scoped to their own tickets only.
- `CLIENT_ADMIN`: KPIs scoped to their organisation's tickets.
- `AGENT`: KPIs scoped to tickets assigned to them.
- `LEAD` / `ADMIN`: KPIs across all tenants.

**Response `200`:**
```json
{
  "data": {
    "total": 47,
    "openTickets": 14,
    "resolvedToday": 3,
    "avgResolutionTime": "2d 4h",
    "slaComplianceRate": 0.92,
    "by_priority": {
      "LOW": 8,
      "MEDIUM": 15,
      "HIGH": 18,
      "CRITICAL": 6
    },
    "by_status": {
      "OPEN": 12,
      "ACKNOWLEDGED": 5,
      "IN_PROGRESS": 18,
      "RESOLVED": 8,
      "CLOSED": 4
    },
    "recentActivity": [
      {
        "id": "ACT-001",
        "type": "status_change",
        "description": "TKT-001 status changed to IN_PROGRESS",
        "userId": "USR-002",
        "userName": "Priya Sharma",
        "resourceType": "ticket",
        "resourceId": "TKT-001",
        "timestamp": "2026-04-16T07:45:00Z"
      }
    ]
  }
}
```

---

## 12. Analytics

All analytics endpoints accept the same filter params and require `REPORT_VIEW` permission.

**Common query params:**
| Param | Type | Description |
|---|---|---|
| `dateFrom` | ISO8601 | Start of period (required) |
| `dateTo` | ISO8601 | End of period (required) |
| `organizationId` | string | Scope to specific org (ADMIN only) |
| `agentId` | string | Scope to specific agent (LEAD/ADMIN) |
| `status` | string (repeatable) | Filter by status |
| `priority` | string (repeatable) | Filter by priority |

---

### GET `/analytics/ticket-volume`
**Response `200`:**
```json
{
  "data": [
    { "date": "2026-04-14", "created": 4, "resolved": 1, "closed": 0 },
    { "date": "2026-04-15", "created": 2, "resolved": 3, "closed": 1 }
  ]
}
```

---

### GET `/analytics/sla-compliance`
**Response `200`:**
```json
{
  "data": [
    {
      "period": "Apr 2026",
      "responseCompliance": 0.93,
      "resolutionCompliance": 0.88,
      "totalTickets": 47,
      "breachedTickets": 5
    }
  ]
}
```

---

### GET `/analytics/resolution-trends`
**Response `200`:**
```json
{
  "data": [
    {
      "period": "Apr 2026",
      "avgResolutionHours": 28.5,
      "medianResolutionHours": 24.0,
      "p95ResolutionHours": 72.0
    }
  ]
}
```

---

### GET `/analytics/agent-performance`
**Response `200`:**
```json
{
  "data": [
    {
      "agentId": "USR-002",
      "agentName": "Priya Sharma",
      "ticketsAssigned": 18,
      "ticketsResolved": 15,
      "avgResolutionHours": 22.0,
      "slaCompliance": 0.91,
      "csatScore": 4.7
    }
  ]
}
```

---

## 13. Audit Logs

**Permissions required:** `AUDIT_VIEW` (ADMIN only)

### AuditLogEntry Object
```json
{
  "id": "AUD-001",
  "action": "ticket.status_changed",
  "resourceType": "ticket",
  "resourceId": "TKT-001",
  "userId": "USR-002",
  "userName": "Priya Sharma",
  "organizationId": "ORG-001",
  "changes": {
    "status": { "from": "OPEN", "to": "IN_PROGRESS" }
  },
  "metadata": { "ip": "192.168.1.1" },
  "ipAddress": "192.168.1.1",
  "created_at": "2026-04-16T07:45:00Z"
}
```

### GET `/audit-logs`
**Query params:** `page`, `page_size`, `resourceType`, `userId`

**Response `200`:** Paginated `AuditLogEntry[]`.

---

## 14. Routing Rules

**Permissions required:** `ESCALATION_CONFIGURE` (LEAD/ADMIN) to modify; read is unrestricted for internal staff.

### RoutingRule Object
```json
{
  "id": "RULE-001",
  "name": "Critical Incident Auto-Assign",
  "description": "All CRITICAL incidents go to Priya Sharma",
  "conditions": [
    { "field": "priority", "operator": "equals", "value": "CRITICAL" },
    { "field": "category", "operator": "equals", "value": "INCIDENT" }
  ],
  "assignTo": "USR-002",
  "priority": 1,
  "isActive": true,
  "created_at": "2026-01-15T09:00:00Z"
}
```

`condition.operator`: `equals` | `contains` | `in` | `not_in`

### GET `/routing-rules`
**Response `200`:** `{ "data": RoutingRule[] }` sorted by `priority` ascending.

---

### PATCH `/routing-rules/:id`
Update a routing rule.

**Request body (all optional):**
```json
{
  "name": "Updated name",
  "conditions": [ /* RoutingCondition[] */ ],
  "assignTo": "USR-003",
  "priority": 2,
  "isActive": false
}
```

**Response `200`:** `{ "data": <RoutingRule> }`

---

## 15. AI Endpoints

> AI endpoints are available to **internal staff only** (AGENT, LEAD, ADMIN) with `AI_SUGGEST` permission,
> **except** `POST /ai/classify-text` which is available to all authenticated users (used on the customer-facing create ticket form).

### AISuggestion Wrapper Object
All AI GET endpoints return this wrapper:
```json
{
  "data": {
    "id": "AI-SUG-001",
    "type": "classification",
    "ticketId": "TKT-001",
    "suggestion": { /* type-specific payload below */ },
    "confidence": 0.87,
    "reasoning": "Description contains error/failure language...",
    "status": "pending",
    "created_at": "2026-04-16T09:00:00Z"
  }
}
```

`type`: `classification` | `priority` | `routing` | `reply` | `summary` | `eta` | `search`

`status`: `pending` | `accepted` | `edited` | `rejected`

---

### GET `/ai/classify/:ticketId`
Suggest a category for an existing ticket.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "category": "BUG",
  "subcategory": "Authentication",
  "confidence": 0.89
}
```

---

### GET `/ai/priority/:ticketId`
Suggest a priority for an existing ticket.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "priority": "HIGH",
  "factors": ["User-facing functionality broken", "No workaround mentioned"],
  "confidence": 0.82
}
```

---

### GET `/ai/route/:ticketId`
Suggest an agent to assign the ticket to.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "agentId": "USR-002",
  "agentName": "Priya Sharma",
  "teamId": null,
  "teamName": null,
  "reason": "Priya has the highest resolution rate for SAML/SSO incidents.",
  "confidence": 0.91,
  "alternativeAgents": [
    { "agentId": "USR-003", "agentName": "James Okafor", "confidence": 0.74 }
  ]
}
```

---

### GET `/ai/suggest-reply/:ticketId`
Suggest a reply to the customer.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "content": "Hi Sarah, thank you for reporting this. We've identified the issue with your SAML certificate...",
  "tone": "professional",
  "confidence": 0.84
}
```

`tone`: `professional` | `friendly` | `technical`

---

### GET `/ai/summary/:ticketId`
Summarise the ticket thread.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "summary": "Customer reported SSO failure after Azure AD cert renewal. Agent identified stale metadata. Production fix scheduled.",
  "keyPoints": [
    "Root cause: stale SAML metadata after certificate renewal",
    "Workaround: password login still functional",
    "Fix scheduled: production deployment tonight 22:00 UTC"
  ],
  "sentiment": "neutral",
  "confidence": 0.78
}
```

`sentiment`: `positive` | `neutral` | `negative`

---

### GET `/ai/eta/:ticketId`
Estimate resolution time.

**Response `200`:** AISuggestion where `suggestion` is:
```json
{
  "estimatedHours": 18,
  "confidence": 0.72,
  "factors": ["Similar incidents resolved in 12-24h", "Assignee currently has 3 open tickets"],
  "range": { "low": 12, "high": 36 }
}
```

---

### POST `/ai/classify-text`
**Classify raw text before a ticket exists.** Called from the customer Create Ticket form as the user types (debounced). No `AI_SUGGEST` permission required — available to all authenticated users.

**Request body:**
```json
{
  "title": "SSO login broken after Azure AD certificate renewal",
  "description": "After renewing our Azure AD SAML certificate last Tuesday, all SSO logins are failing..."
}
```

**Response `200`:**
```json
{
  "data": {
    "category": "INCIDENT",
    "priority": "CRITICAL",
    "categoryConfidence": 0.91,
    "priorityConfidence": 0.88,
    "categoryReasoning": "Description includes incident/outage language affecting production.",
    "priorityReasoning": "Multiple users affected, production system involved.",
    "priorityFactors": [
      "Wide user impact",
      "Production system affected",
      "No workaround mentioned"
    ]
  }
}
```

> **Performance note:** This endpoint is called on a debounce while the user types. Target response time < 2s. Consider caching results for identical inputs.

---

### GET `/ai/search?query=database+outage&scope=tickets`
Semantic search across tickets, KB articles, and comments.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `query` | string | Natural language search query |
| `scope` | string | `tickets` \| `articles` \| `comments` \| (omit for all) |

**Response `200`:**
```json
{
  "data": {
    "query": "database outage",
    "results": [
      {
        "id": "TKT-001",
        "type": "ticket",
        "title": "Production database outage — Postgres primary down",
        "excerpt": "Primary Postgres instance stopped accepting connections...",
        "similarity": 0.94
      },
      {
        "id": "KB-007",
        "type": "article",
        "title": "Responding to database outages",
        "excerpt": "This runbook covers steps to take during a database outage...",
        "similarity": 0.81
      }
    ]
  }
}
```

---

### POST `/ai/suggestions/:suggestionId/accept`
Record that an agent accepted an AI suggestion. Also apply the suggestion to the ticket (e.g. update category/priority/assignee).

**Response `200`:** `{ "data": { "success": true } }`

---

### POST `/ai/suggestions/:suggestionId/reject`
Record that an agent rejected an AI suggestion.

**Request body:**
```json
{ "reason": "Priority is actually MEDIUM for this customer." }
```

**Response `200`:** `{ "data": { "success": true } }`

---

## 16. Realtime / WebSocket Events

**Connection:** `ws://<host>/ws?tenant_id=ORG-002&token=<access_token>`

All events follow this envelope:
```json
{
  "type": "<event_type>",
  "payload": { /* event-specific data */ },
  "timestamp": "2026-04-16T09:00:00Z",
  "tenantId": "ORG-002"
}
```

### Event Types

| Event | Payload | Who receives |
|---|---|---|
| `ticket:created` | `{ ticket: Ticket }` | All agents; ticket creator's org |
| `ticket:updated` | `{ ticket: Ticket, changes: Record<string,{from,to}> }` | Assignee, creator, org admins |
| `ticket:status_changed` | `{ ticketId, fromStatus, toStatus, byUserId }` | Assignee, creator, org admins |
| `ticket:assigned` | `{ ticketId, assignedTo, assignedBy }` | New assignee |
| `comment:created` | `{ comment: Comment }` | Ticket assignee, creator, mentioned users |
| `notification` | `{ notification: Notification }` | Target user only |
| `sla:warning` | `{ ticketId, state: "at_risk", deadline }` | Assignee, LEAD, ADMIN |
| `sla:breach` | `{ ticketId, deadline }` | Assignee, LEAD, ADMIN |
| `agent:status` | `{ agentId, status: "online"\|"offline"\|"busy" }` | All internal staff |
| `connection:status` | `{ status: "connected"\|"reconnecting"\|"disconnected" }` | Current user only |

---

## 17. Permission Matrix

The `permissions` array in the session response controls all UI and API access. The backend must enforce these on every request.

| Permission | CLIENT_ADMIN | CLIENT_USER | AGENT | LEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| `TICKET_CREATE` | ✓ | ✓ | | | ✓ |
| `TICKET_VIEW_OWN` | | ✓ | | | |
| `TICKET_VIEW_ORG` | ✓ | | | | |
| `TICKET_VIEW_ALL` | | | ✓ | ✓ | ✓ |
| `TICKET_EDIT` | ✓ | | ✓ | ✓ | ✓ |
| `TICKET_STATUS_CHANGE` | ✓ | | ✓ | ✓ | ✓ |
| `TICKET_ASSIGN` | | | | ✓ | ✓ |
| `TICKET_REOPEN` | ✓ | ✓ | | | ✓ |
| `TICKET_DELETE` | | | | ✓ | ✓ |
| `COMMENT_CREATE` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `COMMENT_DELETE` | | | | ✓ | ✓ |
| `COMMENT_INTERNAL` | | | ✓ | ✓ | ✓ |
| `ATTACHMENT_UPLOAD` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `ATTACHMENT_DELETE` | ✓ | | | ✓ | ✓ |
| `MEMBER_INVITE` | ✓ | | | | ✓ |
| `MEMBER_MANAGE` | ✓ | | | | ✓ |
| `MEMBER_VIEW` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `REPORT_VIEW` | ✓ | | | ✓ | ✓ |
| `REPORT_EXPORT` | ✓ | | | ✓ | ✓ |
| `KB_VIEW` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `KB_MANAGE` | | | | | ✓ |
| `SLA_VIEW` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `SLA_CONFIGURE` | | | | ✓ | ✓ |
| `ESCALATION_CONFIGURE` | | | | ✓ | ✓ |
| `AI_SUGGEST` | | | ✓ | ✓ | ✓ |
| `AI_FEEDBACK` | | | ✓ | ✓ | ✓ |
| `AUDIT_VIEW` | | | | | ✓ |
| `WORKSPACE_CONFIGURE` | ✓ | | | | ✓ |

---

## 18. Shared Type Definitions

These TypeScript-style type definitions describe the exact shape of all objects. They are language-agnostic — use them as your schema reference regardless of backend language.

```typescript
// ── Enums ──────────────────────────────────────────────────────────────────

enum UserRole {
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  CLIENT_USER  = 'CLIENT_USER',
  AGENT        = 'AGENT',
  LEAD         = 'LEAD',
  ADMIN        = 'ADMIN',
}

enum TicketStatus {
  OPEN         = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS  = 'IN_PROGRESS',
  RESOLVED     = 'RESOLVED',
  CLOSED       = 'CLOSED',
}

enum TicketPriority {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

enum TicketCategory {
  BUG             = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  SUPPORT         = 'SUPPORT',
  BILLING         = 'BILLING',
  QUESTION        = 'QUESTION',
  INCIDENT        = 'INCIDENT',
  TASK            = 'TASK',
}

enum SLAState {
  ON_TRACK = 'on_track',
  AT_RISK  = 'at_risk',
  BREACHED = 'breached',
  PAUSED   = 'paused',
  MET      = 'met',
}

enum AISuggestionType {
  CLASSIFICATION = 'classification',
  PRIORITY       = 'priority',
  ROUTING        = 'routing',
  REPLY          = 'reply',
  SUMMARY        = 'summary',
  ETA            = 'eta',
  SEARCH         = 'search',
}

enum AISuggestionStatus {
  PENDING  = 'pending',
  ACCEPTED = 'accepted',
  EDITED   = 'edited',
  REJECTED = 'rejected',
}

// ── Core Objects ───────────────────────────────────────────────────────────

interface SLAInfo {
  responseDeadline:     string;   // ISO8601
  resolutionDeadline:   string;   // ISO8601
  responseState:        SLAState;
  resolutionState:      SLAState;
  responseMet:          boolean;
  resolutionMet:        boolean;
  pausedAt?:            string;
  responseBreachedAt?:  string;
  resolutionBreachedAt?: string;
}

interface Attachment {
  id:          string;
  fileName:    string;
  fileSize:    number;     // bytes
  mimeType:    string;
  url:         string;
  uploadedBy:  string;     // user ID
  created_at:  string;
}

interface Ticket {
  id:            string;
  ticketNumber:  string;
  title:         string;
  description:   string;
  status:        TicketStatus;
  priority:      TicketPriority;
  category:      TicketCategory;
  tags:          string[];
  createdBy:     string;           // user ID
  assignedTo?:   string;           // user ID
  organizationId: string;
  projectId?:    string;
  sla?:          SLAInfo;
  attachments:   Attachment[];
  commentCount:  number;
  creator?:      User;
  assignee?:     User;
  created_at:    string;
  updated_at:    string;
  resolved_at?:  string;
  closed_at?:    string;
}

interface TicketCreatePayload {
  title:           string;
  description:     string;
  priority:        TicketPriority;
  category:        TicketCategory;
  tags?:           string[];
  projectId?:      string;
  attachment_ids?: number[];
}

interface TicketUpdatePayload {
  title?:       string;
  description?: string;
  priority?:    TicketPriority;
  category?:    TicketCategory;
  tags?:        string[];
  assignedTo?:  string;
}

interface TicketTransitionPayload {
  ticketId:  string;
  toStatus:  TicketStatus;
  comment?:  string;       // reason note (especially for reopens)
}

// Raw shape returned by backend for comments (snake_case)
interface RawApiComment {
  id:           number;
  ticket_id:    number;
  tenant_id:    string;
  user_id:      number;
  parent_id:    number | null;
  message:      string;
  is_deleted:   boolean;
  is_internal:  boolean;
  attachments:  RawApiAttachment[];
  mentions:     number[];
  created_at:   string;
  updated_at:   string;
}

interface CommentCreatePayload {
  ticket_id:            string;
  user_id:              string;
  message:              string;
  isInternal?:          boolean;
  parent_id?:           string;
  mentioned_user_ids?:  string[];
  attachment_ids?:      string[];
}

interface AttachmentCreatePayload {
  file_name:  string;
  file_type:  string;
  file_path:  string;
  metadata?:  Record<string, unknown>;
}

// The integer-ID record returned immediately after upload
interface AttachmentRecord {
  id:          number;
  file_name:   string;
  file_type:   string;
  file_path:   string;
  tenant_id:   string;
  metadata:    Record<string, unknown>;
  created_at:  string;
}

interface User {
  id:             string;
  email:          string;
  displayName:    string;
  firstName:      string;
  lastName:       string;
  avatarUrl?:     string;
  role:           UserRole;
  permissions:    string[];   // Permission enum values
  organizationId: string;
  isActive:       boolean;
  lastLoginAt?:   string;
  created_at:     string;
  updated_at:     string;
}

interface Organization {
  id:          string;
  name:        string;
  slug:        string;
  logoUrl?:    string;
  domain?:     string;
  isActive:    boolean;
  plan?:       string;
  created_at:  string;
  updated_at:  string;
}

interface DashboardSummary {
  total:               number;
  openTickets:         number;
  resolvedToday:       number;
  avgResolutionTime:   string;     // e.g. "2d 4h"
  slaComplianceRate:   number;     // 0–1
  by_priority:         Record<TicketPriority, number>;
  by_status:           Record<TicketStatus, number>;
  recentActivity?:     ActivityItem[];
}

interface ActivityItem {
  id:            string;
  type:          string;
  description:   string;
  userId:        string;
  userName:      string;
  resourceType:  string;
  resourceId:    string;
  timestamp:     string;
}

interface AISuggestion<T = unknown> {
  id:          string;
  type:        AISuggestionType;
  ticketId?:   string;
  suggestion:  T;
  confidence:  number;           // 0–1
  reasoning?:  string;
  status:      AISuggestionStatus;
  created_at:  string;
}

interface AITextClassificationResult {
  category:            TicketCategory;
  priority:            TicketPriority;
  categoryConfidence:  number;   // 0–1
  priorityConfidence:  number;   // 0–1
  categoryReasoning:   string;
  priorityReasoning:   string;
  priorityFactors:     string[];
}

interface RoutingRule {
  id:           string;
  name:         string;
  description?: string;
  conditions:   RoutingCondition[];
  assignTo:     string;          // user ID
  priority:     number;          // lower = higher priority
  isActive:     boolean;
  created_at:   string;
}

interface RoutingCondition {
  field:     string;
  operator:  'equals' | 'contains' | 'in' | 'not_in';
  value:     string | string[];
}

interface AuditLogEntry {
  id:             string;
  action:         string;        // e.g. "ticket.status_changed"
  resourceType:   string;
  resourceId:     string;
  userId:         string;
  userName:       string;
  organizationId: string;
  changes?:       Record<string, { from: unknown; to: unknown }>;
  metadata?:      Record<string, unknown>;
  ipAddress?:     string;
  created_at:     string;
}

interface Notification {
  id:            string;
  userId:        string;
  type:          string;          // NotificationType enum values
  title:         string;
  message:       string;
  isRead:        boolean;
  data?:         Record<string, unknown>;
  resourceType?: string;
  resourceId?:   string;
  created_at:    string;
}
```

---

## Quick Reference — All Endpoints

| Method | Path | Auth Required | Permission | Used By |
|---|---|---|---|---|
| POST | `/user/login` | No | — | Both portals |
| GET | `/user/auth/session` | Yes | — | Both portals |
| POST | `/auth/logout` | Yes | — | Both portals |
| POST | `/token/refresh` | Yes | — | Both portals |
| POST | `/auth/reset-password` | No | — | Both portals |
| POST | `/auth/confirm-reset` | No | — | Both portals |
| GET | `/tickets/list` | Yes | TICKET_VIEW_* | Both portals |
| GET | `/tickets/:id` | Yes | TICKET_VIEW_* | Both portals |
| POST | `/tickets` | Yes | TICKET_CREATE | Both portals |
| PATCH | `/tickets/:id/update` | Yes | TICKET_EDIT | Both portals |
| DELETE | `/tickets/:id` | Yes | TICKET_DELETE | Internal |
| POST | `/tickets/:id/transition` | Yes | TICKET_STATUS_CHANGE | Both portals |
| GET | `/tickets/:id/comments` | Yes | — (scoped) | Both portals |
| POST | `/comments` | Yes | COMMENT_CREATE | Both portals |
| POST | `/attachments` | Yes | ATTACHMENT_UPLOAD | Both portals |
| POST | `/attachments/presign` | Yes | ATTACHMENT_UPLOAD | Both portals |
| POST | `/attachments/confirm` | Yes | ATTACHMENT_UPLOAD | Both portals |
| GET | `/users` | Yes | MEMBER_VIEW | Both portals |
| GET | `/users/:id` | Yes | MEMBER_VIEW | Both portals |
| PATCH | `/users/:id` | Yes | MEMBER_MANAGE | Both portals |
| DELETE | `/users/:id` | Yes | MEMBER_MANAGE | Both portals |
| POST | `/users/invite` | Yes | MEMBER_INVITE | Both portals |
| GET | `/organizations` | Yes | — (scoped) | Both portals |
| PATCH | `/organizations/:id` | Yes | WORKSPACE_CONFIGURE | Both portals |
| GET | `/projects` | Yes | — | Both portals |
| GET | `/projects/:id` | Yes | — | Both portals |
| GET | `/knowledge-base/search` | Yes | KB_VIEW | Both portals |
| GET | `/knowledge-base/categories` | Yes | KB_VIEW | Both portals |
| GET | `/knowledge-base/articles/:id` | Yes | KB_VIEW | Both portals |
| GET | `/notifications` | Yes | — | Both portals |
| POST | `/notifications/:id/read` | Yes | — | Both portals |
| POST | `/notifications/read-all` | Yes | — | Both portals |
| GET | `/dashboard/kpis` | Yes | — (scoped) | Both portals |
| GET | `/analytics/ticket-volume` | Yes | REPORT_VIEW | Both portals |
| GET | `/analytics/sla-compliance` | Yes | REPORT_VIEW | Both portals |
| GET | `/analytics/resolution-trends` | Yes | REPORT_VIEW | Both portals |
| GET | `/analytics/agent-performance` | Yes | REPORT_VIEW | Internal |
| GET | `/audit-logs` | Yes | AUDIT_VIEW | Internal |
| GET | `/routing-rules` | Yes | — (internal staff) | Internal |
| PATCH | `/routing-rules/:id` | Yes | ESCALATION_CONFIGURE | Internal |
| GET | `/ai/classify/:ticketId` | Yes | AI_SUGGEST | Internal |
| GET | `/ai/priority/:ticketId` | Yes | AI_SUGGEST | Internal |
| GET | `/ai/route/:ticketId` | Yes | AI_SUGGEST | Internal |
| GET | `/ai/suggest-reply/:ticketId` | Yes | AI_SUGGEST | Internal |
| GET | `/ai/summary/:ticketId` | Yes | AI_SUGGEST | Both portals |
| GET | `/ai/eta/:ticketId` | Yes | AI_SUGGEST | Internal |
| POST | `/ai/classify-text` | Yes | — (all users) | Customer portal |
| GET | `/ai/search` | Yes | AI_SUGGEST | Internal |
| POST | `/ai/suggestions/:id/accept` | Yes | AI_FEEDBACK | Internal |
| POST | `/ai/suggestions/:id/reject` | Yes | AI_FEEDBACK | Internal |

---

*Generated from the Meridian 3SC Platform frontend codebase. Last updated: 2026-04-16.*

---

---

# Addendum — Customer Dashboard & AI Digest Layer

> **Context for backend:** This addendum covers new endpoints and permission changes introduced when building the Customer Portal dashboard. The dashboard has two distinct views — one for `CLIENT_ADMIN` (org-wide command centre) and one for `CLIENT_USER` (personal ticket view). The central new piece is `GET /ai/digest`, a server-computed AI intelligence feed scoped to the caller's organisation. All changes here are additive — nothing in the original spec is modified.
>
> **Last updated:** 2026-04-17

---

## A1. New Permissions

Two new permission strings must be added to the permission system and included in the session's `permissions` array when applicable.

### `AI_DIGEST`
Grants access to the AI digest endpoint (`GET /ai/digest`). This is a **client-facing** AI feature — intentionally separate from `AI_SUGGEST` which is for internal staff agent tools.

| Role | Has `AI_DIGEST` |
|---|:---:|
| CLIENT_ADMIN | ✓ |
| CLIENT_USER | ✓ |
| AGENT | ✗ |
| LEAD | ✗ |
| ADMIN | ✓ |

**Rationale:** Agents and Leads have `AI_SUGGEST` which serves an equivalent purpose on the internal side (ticket-level AI analysis). Giving them `AI_DIGEST` as well would create confusion about which AI surface to consult. The digest is specifically designed for *customers* monitoring their own org's support health.

---

### `AI_KB_SUGGEST`
Grants access to AI-suggested KB articles on the dashboard and ticket creation form. Unlike `AI_DIGEST`, this is available to all roles — it's a lightweight read-only feature with no data sensitivity concerns.

| Role | Has `AI_KB_SUGGEST` |
|---|:---:|
| CLIENT_ADMIN | ✓ |
| CLIENT_USER | ✓ |
| AGENT | ✓ |
| LEAD | ✓ |
| ADMIN | ✓ |

**Implementation note:** `AI_KB_SUGGEST` does not require a new endpoint — it gates whether the frontend calls the existing `GET /knowledge-base/search` for proactive suggestions. No backend change is needed beyond including this permission in the session payload.

---

### Updated Permission Matrix (additions only)

Append these two rows to the permission matrix in §17:

| Permission | CLIENT_ADMIN | CLIENT_USER | AGENT | LEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| `AI_DIGEST` | ✓ | ✓ | | | ✓ |
| `AI_KB_SUGGEST` | ✓ | ✓ | ✓ | ✓ | ✓ |

Also add `PROJECT_VIEW` to `CLIENT_ADMIN` — it was absent from the original matrix but is required for the dashboard project health panel:

| Permission | CLIENT_ADMIN | CLIENT_USER | AGENT | LEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| `PROJECT_VIEW` | ✓ | | | | ✓ |

---

## A2. New Endpoint — `GET /ai/digest`

### Purpose
Returns a server-computed AI intelligence digest for the caller's organisation. Called once on customer dashboard load. Surfaces three categories of insight that would require manual scanning to detect:

1. **At-risk tickets** — active tickets where the resolution SLA is `at_risk` or `breached`, ordered by deadline urgency
2. **Recurring patterns** — clusters of tickets sharing the same tags that indicate a systemic or recurring issue
3. **Response gaps** — active tickets with no activity for 2+ days, with attribution of *who* is holding the conversation up (client or agent)

### Endpoint

```
GET /api/v1/ai/digest
```

**Auth required:** Yes

**Permission required:** `AI_DIGEST`

**Query params:** None (scope derived entirely from `tenant_id` in the request, which is auto-injected from the session)

**Scoping:**
- `CLIENT_ADMIN` / `CLIENT_USER`: Digest covers all tickets in `organizationId = tenant_id`
- `ADMIN`: Same scoping as `CLIENT_ADMIN` (digest is always org-scoped, never cross-tenant)

---

### Response `200`

```json
{
  "data": {
    "generatedAt": "2026-04-17T09:00:00Z",
    "needsAttentionCount": 3,
    "needsAttentionSummary": "2 tickets are at SLA risk and 1 ticket is awaiting your response.",
    "atRiskTickets": [
      {
        "ticketId": "TKT-C001",
        "ticketNumber": "TKT-C001",
        "title": "SSO login broken after Azure AD certificate renewal",
        "reason": "Resolution deadline in 6h",
        "urgency": "high",
        "deadlineAt": "2026-04-17T08:00:00Z"
      },
      {
        "ticketId": "TKT-C005",
        "ticketNumber": "TKT-C005",
        "title": "Data migration Phase 1 — file import errors",
        "reason": "Resolution deadline in 18h",
        "urgency": "medium",
        "deadlineAt": "2026-04-18T09:00:00Z"
      }
    ],
    "patterns": [
      {
        "label": "4 tickets tagged \"saml\"",
        "ticketCount": 4,
        "tags": ["saml"],
        "suggestion": "This may indicate a recurring issue. Consider creating a KB article."
      },
      {
        "label": "3 tickets tagged \"authentication\"",
        "ticketCount": 3,
        "tags": ["authentication"],
        "suggestion": "This may indicate a recurring issue. Consider creating a KB article."
      }
    ],
    "responseGaps": [
      {
        "ticketId": "TKT-C004",
        "ticketNumber": "TKT-C004",
        "title": "Request: Custom field support for ticket forms",
        "waitingDays": 3,
        "waitingFor": "agent"
      }
    ],
    "digestSummary": "2 tickets at SLA risk, 2 recurring patterns detected, 1 response gap."
  }
}
```

---

### Response field definitions

| Field | Type | Description |
|---|---|---|
| `generatedAt` | ISO8601 | Server time at which the digest was computed. The frontend may use this to show "as of X". |
| `needsAttentionCount` | integer | Total count of items the user should act on now: `atRiskTickets.length + responseGaps where waitingFor = "client"`. |
| `needsAttentionSummary` | string | One plain-English sentence summarising what needs attention. Used as the headline in the dashboard banner. |
| `atRiskTickets` | `AIDigestAtRiskTicket[]` | Tickets with SLA `resolutionState` of `at_risk` or `breached`, sorted by `deadlineAt` ascending (most urgent first). Max 10. Excludes `RESOLVED` and `CLOSED` tickets. |
| `patterns` | `AIDigestPattern[]` | Tag clusters where the same tag appears on 2 or more active (non-closed) tickets. Sorted by `ticketCount` descending. Max 5. |
| `responseGaps` | `AIDigestResponseGap[]` | Active tickets with no `updated_at` change in 2+ days. Max 10. |
| `digestSummary` | string | One-line summary of the full digest. Used as a tooltip or secondary text. |

---

### Type definitions for digest objects

```typescript
interface AIDigestAtRiskTicket {
  ticketId:    string;
  ticketNumber: string;
  title:       string;
  reason:      string;          // human-readable, e.g. "Resolution deadline in 6h"
  urgency:     'high' | 'medium';
  deadlineAt?: string;          // ISO8601, the resolution SLA deadline
}

// urgency rules:
//   'high'   if priority is CRITICAL, OR hours remaining < 4
//   'medium' otherwise

interface AIDigestPattern {
  label:       string;          // "4 tickets tagged \"saml\""
  ticketCount: number;
  tags:        string[];        // the tags forming this cluster
  suggestion:  string;          // advisory text shown to the user
}

// Pattern detection algorithm:
//   1. Take all tickets where status NOT IN (RESOLVED, CLOSED)
//   2. Build a frequency map: tag -> list of ticket IDs that have it
//   3. Keep only tags where count >= 2
//   4. Sort by count desc, take top 5
//   5. Optionally: use semantic similarity to group related tags (e.g. "saml" + "sso")
//      and merge them into one cluster. If not implementing semantic grouping initially,
//      simple exact-match is acceptable.

interface AIDigestResponseGap {
  ticketId:    string;
  ticketNumber: string;
  title:       string;
  waitingDays: number;          // floor((now - updated_at) / 86400)
  waitingFor:  'client' | 'agent';
}

// waitingFor logic:
//   Look at the most recent comment on the ticket.
//   If the most recent comment author belongs to the ticket's organizationId  → waitingFor = 'agent'
//   If the most recent comment author is an internal 3SC staff member          → waitingFor = 'client'
//   If there are no comments at all                                            → waitingFor = 'agent'
//   (The frontend shows this to help the CLIENT_ADMIN understand whether the
//    delay is on their team or on the 3SC team.)
```

---

### Business rules

1. **Scope is always org-scoped.** The digest only ever surfaces tickets belonging to `tenant_id`. A `CLIENT_USER` calling this endpoint receives the same digest as `CLIENT_ADMIN` for their org — the `needsAttentionSummary` phrasing may differ but the underlying data scope is the same.

2. **Exclude terminal states.** `atRiskTickets`, `patterns`, and `responseGaps` must all exclude tickets with `status IN (RESOLVED, CLOSED)`.

3. **`needsAttentionCount` is actionable items only.** It counts `atRiskTickets.length` + the subset of `responseGaps` where `waitingFor = 'client'`. Response gaps where `waitingFor = 'agent'` are informational (the client can chase their 3SC agent) but not directly actionable by the client, so they do not inflate the count.

4. **Caching.** The digest is relatively expensive to compute (requires reading ticket + comment data). Cache the result per `tenant_id` with a TTL of **5–10 minutes**. A stale digest is acceptable on a dashboard; staleness beyond 10 minutes is not.

5. **Empty states.** If all three arrays are empty, return the response with empty arrays and `needsAttentionCount: 0`. Do not return a 404. The frontend handles the "all clear" state.

6. **`generatedAt` must reflect actual computation time**, not request time — if returning a cached result, `generatedAt` should be the time the cache was populated, so the frontend can show "Updated 4 minutes ago."

---

### Response `403`

If the caller does not have `AI_DIGEST` permission:

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have permission to access the AI digest."
}
```

---

## A3. Updated Dashboard KPI Endpoint

### `GET /dashboard/kpis` — additions

The existing `/dashboard/kpis` endpoint already returns `DashboardSummary`. Two new fields are needed by the admin dashboard for KPI trend calculations. These should be added to the response:

**Add to `DashboardSummary`:**

```typescript
interface DashboardSummary {
  // ... all existing fields ...

  // NEW: count of tickets that are not RESOLVED/CLOSED and were created > 7 days ago
  // Used for the "Stalled" KPI tile on the admin dashboard
  stalledTicketCount: number;

  // NEW: count of tickets created in the last 7 days
  // Used for the "Tickets This Week" KPI tile
  ticketsThisWeekCount: number;
}
```

**Example response addition:**
```json
{
  "data": {
    "total": 47,
    "openTickets": 12,
    "resolvedToday": 3,
    "avgResolutionTime": "2d 4h",
    "slaComplianceRate": 0.88,
    "by_priority": { "LOW": 4, "MEDIUM": 8, "HIGH": 6, "CRITICAL": 2 },
    "by_status": { "OPEN": 5, "ACKNOWLEDGED": 3, "IN_PROGRESS": 4, "RESOLVED": 8, "CLOSED": 27 },
    "stalledTicketCount": 2,
    "ticketsThisWeekCount": 7,
    "recentActivity": [ /* ActivityItem[] — existing field, no change */ ]
  }
}
```

> **Note:** The frontend currently derives `stalledTicketCount` and `ticketsThisWeekCount` by filtering the local ticket list. Moving these to the server response is preferable because the frontend only has a page of tickets (max 50), which may not represent the full org. The server has visibility of all tickets.

---

## A4. Flow Context — How the Dashboard Calls These APIs

This section describes the exact sequence of API calls the customer portal dashboard makes on load, so the backend can understand the criticality and caching requirements of each.

### CLIENT_USER load sequence

```
1. GET /user/auth/session              ← already cached from app init
2. GET /tickets/list?page=1&page_size=50&sortBy=updated_at&sortOrder=desc
   (scoped by backend to createdBy = current user)
3. GET /ai/digest                      ← gated on AI_DIGEST permission
4. GET /knowledge-base/search?query=<open-ticket-tags>&limit=3
   (gated on AI_KB_SUGGEST; query derived from tags of open tickets in step 2)
```

Steps 2, 3, and 4 are fired in parallel (RTK Query). Step 4 only fires after step 2 resolves (because it needs ticket tags to build the query).

### CLIENT_ADMIN load sequence

```
1. GET /user/auth/session              ← already cached
2. GET /tickets/list?page=1&page_size=50&sortBy=updated_at&sortOrder=desc
3. GET /dashboard/kpis
4. GET /projects?page=1&page_size=20
5. GET /ai/digest                      ← gated on AI_DIGEST
6. GET /analytics/sla-compliance?dateFrom=<60d ago>&dateTo=<now>
7. GET /analytics/resolution-trends?dateFrom=<60d ago>&dateTo=<now>
```

Steps 2–7 are all fired in parallel. `sla-compliance` and `resolution-trends` are used only for the trend delta arrows on the KPI tiles (e.g. SLA compliance went up/down vs last month). They are lower priority — if they are slow, the KPI tiles render without trend arrows first, then update when the data arrives.

---

## A5. Quick Reference — New / Changed Endpoints

| Method | Path | Permission | Used By | Notes |
|---|---|---|---|---|
| GET | `/ai/digest` | `AI_DIGEST` | Customer portal | **New.** Org-scoped AI intelligence digest. Cache 5–10 min per tenant. |

**No other endpoints are new.** The following are existing endpoints whose *usage context* has expanded:

| Method | Path | Change |
|---|---|---|
| GET | `/dashboard/kpis` | Add `stalledTicketCount` and `ticketsThisWeekCount` to response |
| GET | `/knowledge-base/search` | Now also called from dashboard for KB suggestions (existing endpoint, no API change) |
| GET | `/analytics/sla-compliance` | Now called from dashboard (existing endpoint, no API change) |
| GET | `/analytics/resolution-trends` | Now called from dashboard (existing endpoint, no API change) |

---

## A6. New Type Definitions (append to §18)

```typescript
// ── New Permission values ──────────────────────────────────────────────────

// Add to the Permission enum:
// AI_DIGEST     = 'AI_DIGEST'      — client-facing dashboard AI digest
// AI_KB_SUGGEST = 'AI_KB_SUGGEST'  — proactive KB article suggestions (all roles)
// PROJECT_VIEW  = 'PROJECT_VIEW'   — view projects list (CLIENT_ADMIN already had access; now formalised)

// ── AI Digest Types ────────────────────────────────────────────────────────

interface AIDigestAtRiskTicket {
  ticketId:     string;
  ticketNumber: string;
  title:        string;
  reason:       string;           // e.g. "Resolution deadline in 6h"
  urgency:      'high' | 'medium';
  deadlineAt?:  string;           // ISO8601
}

interface AIDigestPattern {
  label:       string;            // e.g. "4 tickets tagged \"saml\""
  ticketCount: number;
  tags:        string[];
  suggestion:  string;            // advisory text for the user
}

interface AIDigestResponseGap {
  ticketId:     string;
  ticketNumber: string;
  title:        string;
  waitingDays:  number;           // whole days since last update
  waitingFor:   'client' | 'agent';
}

interface AIDigest {
  generatedAt:           string;  // ISO8601 — when the digest was computed (not request time)
  needsAttentionCount:   number;  // atRiskTickets.length + client-side responseGaps.length
  needsAttentionSummary: string;  // one plain-English sentence for the dashboard banner
  atRiskTickets:         AIDigestAtRiskTicket[];
  patterns:              AIDigestPattern[];
  responseGaps:          AIDigestResponseGap[];
  digestSummary:         string;  // one-line overall summary
}

// ── DashboardSummary additions ─────────────────────────────────────────────

// Extend the existing DashboardSummary interface with:
interface DashboardSummaryAdditions {
  stalledTicketCount:    number;  // unresolved tickets older than 7 days
  ticketsThisWeekCount:  number;  // tickets created in the last 7 days
}
```

---

*Addendum generated from the Meridian 3SC Platform frontend codebase. Last updated: 2026-04-17.*

---
---
---

# ══════════════════════════════════════════════════════════════════════════════
# ADDENDUM A7 — Knowledge Base Full CRUD & Helpfulness API
# ══════════════════════════════════════════════════════════════════════════════
#
# Context for backend engineers / AI code generators
# ─────────────────────────────────────────────────────────────────────────────
# The original API spec (Part 9) defined only three READ-ONLY KB endpoints:
#   GET /knowledge-base/search
#   GET /knowledge-base/categories
#   GET /knowledge-base/articles/:id
#
# This addendum documents the FIVE NEW endpoints added as part of the
# Knowledge Base feature build (April 2026):
#   POST   /knowledge-base/articles            — create article (KB_MANAGE)
#   PATCH  /knowledge-base/articles/:id        — update article (KB_MANAGE)
#   DELETE /knowledge-base/articles/:id        — delete article (KB_MANAGE)
#   POST   /knowledge-base/articles/:id/helpful — record helpfulness vote (KB_VIEW)
#   GET    /knowledge-base/search              — EXTENDED with categoryId filter (existing, updated)
#
# It also documents the full data model, business rules, permission matrix,
# and implementation notes needed for a complete backend implementation.
# ══════════════════════════════════════════════════════════════════════════════

---

## A7. Knowledge Base — Full CRUD API

### Overview & Feature Context

The Knowledge Base allows **internal staff (ADMIN role)** to author and publish support articles,
and **all users (AGENT, LEAD, CLIENT_USER, CLIENT_ADMIN)** to search and read them.

**Two portals consume the KB:**

| Portal | Users | Capabilities |
|---|---|---|
| Internal Console | AGENT, LEAD, ADMIN | Read all articles. ADMIN can create/edit/delete. |
| Customer Portal | CLIENT_USER, CLIENT_ADMIN | Read published articles only. Search, browse by category, view article detail, vote helpful. |

**Permission matrix for KB endpoints:**

| Permission | Roles | What it gates |
|---|---|---|
| `KB_VIEW` | AGENT, LEAD, ADMIN, CLIENT_USER, CLIENT_ADMIN | Search, read articles, browse categories |
| `KB_MANAGE` | ADMIN only | Create, update, delete articles |

---

### Data Model

#### KBCategory Object
```json
{
  "id": "KBC-001",
  "name": "Getting Started",
  "slug": "getting-started",
  "description": "New to Meridian? Start here for setup guides and onboarding walkthroughs.",
  "articleCount": 4,
  "parentId": null
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier, e.g. `KBC-001` |
| `name` | string | Display name shown in the UI |
| `slug` | string | URL-safe version of name, unique |
| `description` | string \| null | Short description shown on category card |
| `articleCount` | integer | Count of **published** articles in this category |
| `parentId` | string \| null | Reserved for nested categories (future) |

**Seeded categories (6):**

| id | name |
|---|---|
| KBC-001 | Getting Started |
| KBC-002 | Account & Billing |
| KBC-003 | Tickets & Workflows |
| KBC-004 | Integrations |
| KBC-005 | Security & Compliance |
| KBC-006 | Troubleshooting |

---

#### KBArticle Object (full)
```json
{
  "id": "KBA-001",
  "title": "How to create your first support ticket",
  "slug": "create-first-ticket",
  "categoryId": "KBC-001",
  "category": {
    "id": "KBC-001",
    "name": "Getting Started",
    "slug": "getting-started",
    "description": "...",
    "articleCount": 4
  },
  "excerpt": "Step-by-step guide to submitting a support request...",
  "content": "Creating a support ticket is the fastest way...\n\n## Step 1\n...",
  "tags": ["tickets", "getting started", "submit"],
  "authorId": "USR-001",
  "author": {
    "id": "USR-001",
    "displayName": "Alex Morgan",
    "email": "alex.morgan@3sc.com",
    "role": "ADMIN"
  },
  "isPublished": true,
  "viewCount": 1842,
  "helpfulCount": 314,
  "relatedArticleIds": ["KBA-002", "KBA-008"],
  "created_at": "2025-09-01T09:00:00Z",
  "updated_at": "2026-03-15T11:20:00Z"
}
```

| Field | Type | Required on create | Notes |
|---|---|---|---|
| `id` | string | auto | Server-generated, e.g. `KBA-001` |
| `title` | string | yes | 3–200 chars |
| `slug` | string | auto | Derived from title. Must be unique per tenant. URL-safe. |
| `categoryId` | string \| null | no | Must be a valid `KBCategory.id` or null |
| `category` | KBCategory \| null | auto | Populated on read via join |
| `excerpt` | string | yes | 10–300 chars. Shown in search results and category listings. |
| `content` | string | yes | Full article body. Plain text with lightweight markdown-style formatting (`##` headings, `-` lists). Min 50 chars. |
| `tags` | string[] | no | Array of lowercase tag strings. Max 10 tags, each max 30 chars. |
| `authorId` | string | auto | Set to the authenticated user's ID on create. Not updatable via API. |
| `author` | User (partial) | auto | Populated on read via join |
| `isPublished` | boolean | no | Default `false` (draft). Set to `true` to publish. |
| `viewCount` | integer | auto | Starts at 0. Incremented on each `GET /knowledge-base/articles/:id` call. |
| `helpfulCount` | integer | auto | Starts at 0. Incremented by `POST /knowledge-base/articles/:id/helpful`. |
| `relatedArticleIds` | string[] | no | Array of other `KBArticle.id` values. Max 10 entries. |
| `created_at` | ISO8601 | auto | Set on creation |
| `updated_at` | ISO8601 | auto | Updated on every write |

---

#### KBSearchResult Object
```json
{
  "article": { /* KBArticle object */ },
  "score": 0.92,
  "highlights": [
    "Step-by-step guide for submitting a **support request**..."
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `article` | KBArticle | Full article object |
| `score` | float | Relevance score 0.0–1.0. Descending sort. |
| `highlights` | string[] | Snippets with matched terms bolded. May be empty array. |

---

### Endpoint Details

---

#### GET `/knowledge-base/search` *(updated)*

Search KB articles. Called on the customer portal KB page and proactively during ticket creation (deflection).

**Authentication:** Required  
**Permission:** `KB_VIEW`  
**Who calls it:** Both portals. Internal console for agent-facing KB suggestions in the AI panel.

**Query parameters:**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query` | string | no | `""` | Search terms. If empty, returns top articles by `viewCount`. |
| `limit` | integer | no | `10` | Max results. Range: 1–50. |
| `categoryId` | string | no | — | **NEW.** Filter results to this category only. Ignored if empty. |
| `tenant_id` | string | yes | — | Injected automatically by the frontend. |

**Scoring algorithm (recommendation):**
- Title match → highest weight (0.5)
- Tag match → high weight (0.25)
- Excerpt match → medium weight (0.15)
- Content match → low weight (0.1)
- Only return articles where `isPublished = true` for `CLIENT_USER` / `CLIENT_ADMIN` roles.
- Internal roles (`AGENT`, `LEAD`, `ADMIN`) may also see draft articles (`isPublished = false`) — include a `publishedOnly` query param or derive from role.

**Response `200`:**
```json
{
  "data": [
    {
      "article": {
        "id": "KBA-001",
        "title": "How to create your first support ticket",
        "slug": "create-first-ticket",
        "categoryId": "KBC-001",
        "category": { "id": "KBC-001", "name": "Getting Started", "slug": "getting-started", "articleCount": 4 },
        "excerpt": "Step-by-step guide to submitting a support request...",
        "content": "...",
        "tags": ["tickets", "getting started"],
        "authorId": "USR-001",
        "isPublished": true,
        "viewCount": 1842,
        "helpfulCount": 314,
        "relatedArticleIds": ["KBA-002"],
        "created_at": "2025-09-01T09:00:00Z",
        "updated_at": "2026-03-15T11:20:00Z"
      },
      "score": 0.85,
      "highlights": ["Step-by-step guide to submitting a **support request**"]
    }
  ]
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `400` | `INVALID_LIMIT` | `limit` is outside 1–50 |
| `403` | `PERMISSION_DENIED` | Missing `KB_VIEW` |

**Performance note:** This endpoint is called on every keystroke (debounced 400ms on the frontend). Target response time: **< 300ms**. Use full-text search index (PostgreSQL `tsvector`, Elasticsearch, or similar). Do not do a full table scan.

---

#### GET `/knowledge-base/categories` *(existing, no changes)*

List all KB categories with article counts.

**Authentication:** Required  
**Permission:** `KB_VIEW`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "KBC-001",
      "name": "Getting Started",
      "slug": "getting-started",
      "description": "New to Meridian? Start here for setup guides and onboarding walkthroughs.",
      "articleCount": 4,
      "parentId": null
    },
    {
      "id": "KBC-002",
      "name": "Account & Billing",
      "slug": "account-billing",
      "description": "Manage your subscription, invoices, payment methods, and account settings.",
      "articleCount": 3,
      "parentId": null
    }
  ]
}
```

**Implementation note:** `articleCount` must reflect only **published** articles for client roles and **all** articles for internal roles, OR always reflect published articles (simpler, recommended).

---

#### GET `/knowledge-base/articles/:id` *(updated — side effect documented)*

Fetch a single article by ID or slug.

**Authentication:** Required  
**Permission:** `KB_VIEW`  
**Path param:** `id` — accepts either the article UUID (`KBA-001`) or the slug (`create-first-ticket`).

**Side effect:** Increment `viewCount` by 1 on every successful request. This should be fire-and-forget (async, non-blocking — don't delay the response for this).

**Visibility rules:**
- `CLIENT_USER` / `CLIENT_ADMIN` — only see articles where `isPublished = true`. Return `404` if the article exists but is a draft.
- `AGENT`, `LEAD`, `ADMIN` — see all articles regardless of publish state.

**Response `200`:**
```json
{
  "data": {
    "id": "KBA-001",
    "title": "How to create your first support ticket",
    "slug": "create-first-ticket",
    "categoryId": "KBC-001",
    "category": {
      "id": "KBC-001",
      "name": "Getting Started",
      "slug": "getting-started",
      "description": "New to Meridian? Start here for setup guides and onboarding walkthroughs.",
      "articleCount": 4
    },
    "excerpt": "Step-by-step guide to submitting a support request and setting the right priority.",
    "content": "Creating a support ticket is the fastest way to get help from our team...\n\n## Step 1 — Log in\n...",
    "tags": ["tickets", "getting started", "submit", "new ticket"],
    "authorId": "USR-001",
    "author": {
      "id": "USR-001",
      "displayName": "Alex Morgan",
      "email": "alex.morgan@3sc.com",
      "avatarUrl": null,
      "role": "ADMIN"
    },
    "isPublished": true,
    "viewCount": 1843,
    "helpfulCount": 314,
    "relatedArticleIds": ["KBA-002", "KBA-008"],
    "created_at": "2025-09-01T09:00:00Z",
    "updated_at": "2026-03-15T11:20:00Z"
  }
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `404` | `KB_ARTICLE_NOT_FOUND` | Article doesn't exist or is a draft visible to a client role |
| `403` | `PERMISSION_DENIED` | Missing `KB_VIEW` |

---

#### POST `/knowledge-base/articles` *(NEW)*

Create a new KB article.

**Authentication:** Required  
**Permission:** `KB_MANAGE` (ADMIN only)  
**Method:** `POST`  
**Content-Type:** `application/json`

**Request body:**
```json
{
  "title": "How to configure two-factor authentication",
  "categoryId": "KBC-001",
  "excerpt": "Enable TOTP-based 2FA on your account using Google Authenticator or Authy.",
  "content": "Two-factor authentication adds a second layer of security...\n\n## How to enable\n\n1. Go to Account Settings.\n2. Click Enable 2FA.\n3. Scan the QR code.",
  "tags": ["security", "2fa", "authentication"],
  "isPublished": false,
  "relatedArticleIds": ["KBA-004", "KBA-012"],
  "slug": "configure-two-factor-authentication"
}
```

**Request body fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | yes | 3–200 chars |
| `categoryId` | string \| null | no | Must exist in `kb_categories` if provided |
| `excerpt` | string | yes | 10–300 chars |
| `content` | string | yes | Min 50 chars |
| `tags` | string[] | no | Max 10 items. Each tag max 30 chars, lowercase. Default: `[]` |
| `isPublished` | boolean | no | Default: `false` |
| `relatedArticleIds` | string[] | no | Must be valid `KBArticle.id` values. Max 10. Default: `[]` |
| `slug` | string | no | If provided, must be URL-safe and unique per tenant. If omitted, auto-derive from `title`. |

**Slug derivation (if not provided):**
```
slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
```
If slug already exists for the tenant, append `-2`, `-3`, etc.

**Behaviour:**
- `authorId` is set to the authenticated user's ID (from session). Not accepted from client.
- `viewCount` = 0, `helpfulCount` = 0.
- `created_at` and `updated_at` = current timestamp.

**Response `201`:**
```json
{
  "data": {
    "id": "KBA-014",
    "title": "How to configure two-factor authentication",
    "slug": "configure-two-factor-authentication",
    "categoryId": "KBC-001",
    "category": { "id": "KBC-001", "name": "Getting Started", "slug": "getting-started", "articleCount": 5 },
    "excerpt": "Enable TOTP-based 2FA on your account...",
    "content": "...",
    "tags": ["security", "2fa", "authentication"],
    "authorId": "USR-001",
    "author": { "id": "USR-001", "displayName": "Alex Morgan", "email": "alex.morgan@3sc.com", "role": "ADMIN" },
    "isPublished": false,
    "viewCount": 0,
    "helpfulCount": 0,
    "relatedArticleIds": ["KBA-004", "KBA-012"],
    "created_at": "2026-04-17T10:30:00Z",
    "updated_at": "2026-04-17T10:30:00Z"
  },
  "message": "Article created successfully."
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing required fields, invalid field values |
| `400` | `DUPLICATE_SLUG` | Provided slug already exists for this tenant |
| `403` | `PERMISSION_DENIED` | Missing `KB_MANAGE` |
| `422` | `INVALID_RELATED_ARTICLES` | One or more `relatedArticleIds` don't exist |

**Audit log:** Write an entry to the audit log: `{ action: "kb_article_created", resourceType: "kb_article", resourceId: <new article id> }`.

---

#### PATCH `/knowledge-base/articles/:id` *(NEW)*

Update an existing KB article. Partial update — only provided fields are changed.

**Authentication:** Required  
**Permission:** `KB_MANAGE` (ADMIN only)  
**Method:** `PATCH`  
**Content-Type:** `application/json`  
**Path param:** `id` — article UUID.

**Request body (all fields optional):**
```json
{
  "title": "Updated title",
  "categoryId": "KBC-002",
  "excerpt": "Updated excerpt text...",
  "content": "Updated full content body...",
  "tags": ["updated", "tags"],
  "isPublished": true,
  "relatedArticleIds": ["KBA-003"],
  "slug": "updated-slug"
}
```

| Field | Type | Validation (same as create) |
|---|---|---|
| `title` | string | 3–200 chars if provided |
| `categoryId` | string \| null | Must exist or null |
| `excerpt` | string | 10–300 chars if provided |
| `content` | string | Min 50 chars if provided |
| `tags` | string[] | Max 10 items |
| `isPublished` | boolean | — |
| `relatedArticleIds` | string[] | Max 10, must exist |
| `slug` | string | Must be unique per tenant if provided |

**Read-only fields (ignored even if sent):** `id`, `authorId`, `viewCount`, `helpfulCount`, `created_at`.

**Behaviour:**
- `updated_at` is always refreshed to the current timestamp.
- If `isPublished` changes from `false` → `true`, this is a **publish event**. Optionally emit a realtime notification to agents.
- If `slug` is updated and the old slug was bookmarked/linked externally, consider a redirect table (optional, not required by frontend).

**Response `200`:**
```json
{
  "data": { /* full updated KBArticle object */ },
  "message": "Article updated successfully."
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `400` | `DUPLICATE_SLUG` | New slug already taken |
| `403` | `PERMISSION_DENIED` | Missing `KB_MANAGE` |
| `404` | `KB_ARTICLE_NOT_FOUND` | Article doesn't exist |
| `422` | `INVALID_RELATED_ARTICLES` | Invalid `relatedArticleIds` |

**Audit log:** `{ action: "kb_article_updated", resourceType: "kb_article", resourceId: <id>, changes: { field: [old, new] } }`.

---

#### DELETE `/knowledge-base/articles/:id` *(NEW)*

Delete a KB article. **Soft delete recommended** — set a `deleted_at` timestamp rather than hard-deleting, so audit trail and related article references aren't broken.

**Authentication:** Required  
**Permission:** `KB_MANAGE` (ADMIN only)  
**Method:** `DELETE`  
**Path param:** `id` — article UUID.

**Behaviour:**
- Set `deleted_at = NOW()` and `isPublished = false`.
- The article must NOT appear in any search results or category article counts after deletion.
- If other articles reference this article in `relatedArticleIds`, those references can remain (dangling IDs are handled gracefully in the frontend — silently ignored if the referenced article returns 404).
- Hard delete is acceptable if soft delete is not required by your data retention policy.

**Response `200`:**
```json
{
  "data": { "success": true },
  "message": "Article deleted successfully."
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `403` | `PERMISSION_DENIED` | Missing `KB_MANAGE` |
| `404` | `KB_ARTICLE_NOT_FOUND` | Article doesn't exist or already deleted |

**Audit log:** `{ action: "kb_article_deleted", resourceType: "kb_article", resourceId: <id> }`.

---

#### POST `/knowledge-base/articles/:id/helpful` *(NEW)*

Record that a user found the article helpful. Simple vote counter — no undo, no per-user deduplication required (MVP).

**Authentication:** Required  
**Permission:** `KB_VIEW`  
**Method:** `POST`  
**Path param:** `id` — article UUID.  
**Request body:** Empty (no body required).

**Behaviour:**
- Atomically increment `helpfulCount` by 1 on the article row.
- No per-user tracking required at MVP — a user can vote multiple times if they reload the page (the frontend prevents this in a single session via local state, but doesn't persist the vote across sessions).
- Optional: Store `(user_id, article_id)` in a `kb_helpful_votes` table to prevent duplicate votes per user. If duplicate vote detected, return `200` but don't increment (idempotent).

**Response `200`:**
```json
{
  "data": { "success": true }
}
```

**Error responses:**
| Status | Code | When |
|---|---|---|
| `403` | `PERMISSION_DENIED` | Missing `KB_VIEW` |
| `404` | `KB_ARTICLE_NOT_FOUND` | Article doesn't exist |

---

### Full Endpoint Summary Table

| Method | Endpoint | Auth | Permission | Portals | New/Updated |
|---|---|---|---|---|---|
| `GET` | `/knowledge-base/search` | Yes | `KB_VIEW` | Both | Updated (added `categoryId` param) |
| `GET` | `/knowledge-base/categories` | Yes | `KB_VIEW` | Both | Existing, no change |
| `GET` | `/knowledge-base/articles/:id` | Yes | `KB_VIEW` | Both | Updated (visibility rules documented) |
| `POST` | `/knowledge-base/articles` | Yes | `KB_MANAGE` | Internal Console | **NEW** |
| `PATCH` | `/knowledge-base/articles/:id` | Yes | `KB_MANAGE` | Internal Console | **NEW** |
| `DELETE` | `/knowledge-base/articles/:id` | Yes | `KB_MANAGE` | Internal Console | **NEW** |
| `POST` | `/knowledge-base/articles/:id/helpful` | Yes | `KB_VIEW` | Customer Portal | **NEW** |

---

### User Flow Diagrams

#### Customer Portal — KB Browse & Read Flow
```
Customer visits /knowledge
  → GET /knowledge-base/categories                   (render category grid)
  → GET /knowledge-base/search?query=&limit=6        (render featured articles)

Customer clicks category card
  → GET /knowledge-base/search?query=<name>&limit=10&categoryId=<id>

Customer types in search box (debounced 400ms)
  → GET /knowledge-base/search?query=<text>&limit=10

Customer clicks article
  → GET /knowledge-base/articles/:id                 (viewCount++)
  → GET /knowledge-base/articles/:relatedId1         (for each relatedArticleId — sidebar)

Customer clicks "Yes, it helped"
  → POST /knowledge-base/articles/:id/helpful        (helpfulCount++)
```

#### Internal Console — KB Manage Flow
```
Admin visits /knowledge
  → GET /knowledge-base/search?query=&limit=50       (articles table)
  → GET /knowledge-base/categories                   (categories tab)

Admin clicks "New Article"
  → renders editor form locally
  → GET /knowledge-base/categories                   (populate category select)

Admin saves
  → POST /knowledge-base/articles                    (201 Created)
  → navigate back to /knowledge

Admin clicks "Edit"
  → GET /knowledge-base/articles/:id                 (pre-populate form)
  → user edits
  → PATCH /knowledge-base/articles/:id               (200 OK)
  → navigate back to /knowledge

Admin clicks "Delete" → confirms
  → DELETE /knowledge-base/articles/:id              (200 OK)
  → article removed from table (RTK Query cache invalidated)
```

---

### Database Schema (Suggested)

```sql
-- Categories (typically seeded, not created via API)
CREATE TABLE kb_categories (
  id          VARCHAR(20)  PRIMARY KEY,         -- e.g. KBC-001
  tenant_id   VARCHAR(20)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  description TEXT,
  parent_id   VARCHAR(20)  REFERENCES kb_categories(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Articles
CREATE TABLE kb_articles (
  id                  VARCHAR(20)   PRIMARY KEY,    -- e.g. KBA-001
  tenant_id           VARCHAR(20)   NOT NULL,
  title               VARCHAR(200)  NOT NULL,
  slug                VARCHAR(220)  NOT NULL,
  category_id         VARCHAR(20)   REFERENCES kb_categories(id),
  excerpt             VARCHAR(300)  NOT NULL,
  content             TEXT          NOT NULL,
  tags                TEXT[]        NOT NULL DEFAULT '{}',
  author_id           VARCHAR(20)   NOT NULL,       -- references users.id
  is_published        BOOLEAN       NOT NULL DEFAULT FALSE,
  view_count          INTEGER       NOT NULL DEFAULT 0,
  helpful_count       INTEGER       NOT NULL DEFAULT 0,
  related_article_ids TEXT[]        NOT NULL DEFAULT '{}',
  deleted_at          TIMESTAMPTZ,                  -- soft delete
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug),

  -- Full-text search index
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

CREATE INDEX idx_kb_articles_tenant    ON kb_articles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kb_articles_published ON kb_articles(tenant_id, is_published) WHERE deleted_at IS NULL;
CREATE INDEX idx_kb_articles_fts       ON kb_articles USING GIN(search_vector);
CREATE INDEX idx_kb_articles_category  ON kb_articles(tenant_id, category_id) WHERE deleted_at IS NULL;

-- Optional: per-user helpful votes for deduplication
CREATE TABLE kb_helpful_votes (
  article_id VARCHAR(20) NOT NULL REFERENCES kb_articles(id),
  user_id    VARCHAR(20) NOT NULL,
  voted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);
```

---

### RTK Query Cache Invalidation (Frontend — for reference)

The frontend uses RTK Query tag-based cache invalidation. Understanding this helps you reason about why certain mutations must return the full updated object:

| Mutation | Invalidates |
|---|---|
| `POST /knowledge-base/articles` | `KBArticle` (list), `KBCategory` (articleCount changes) |
| `PATCH /knowledge-base/articles/:id` | `KBArticle` (this id), `KBCategory` |
| `DELETE /knowledge-base/articles/:id` | `KBArticle` (list), `KBCategory` |
| `POST /knowledge-base/articles/:id/helpful` | `KBArticle` (this id — refetches helpfulCount) |

**Implication:** Every mutating endpoint must return the full object (or `{ success: true }` for delete/helpful) so the frontend can update its local cache correctly.

---

### Error Code Reference (KB-specific)

| Code | HTTP Status | Description |
|---|---|---|
| `KB_ARTICLE_NOT_FOUND` | 404 | Article with given ID or slug doesn't exist, is deleted, or is a draft not visible to this role |
| `KB_CATEGORY_NOT_FOUND` | 404 | Category referenced in `categoryId` doesn't exist |
| `DUPLICATE_SLUG` | 400 | Provided or derived slug already exists for this tenant |
| `INVALID_RELATED_ARTICLES` | 422 | One or more IDs in `relatedArticleIds` don't exist |
| `INVALID_LIMIT` | 400 | `limit` param is outside allowed range |

---

*Addendum A7 generated from the Meridian 3SC Platform frontend codebase and Knowledge Base feature implementation. Last updated: 2026-04-17.*

---

---

# Addendum A8 — AI-Integrated Knowledge Base Endpoints

> **Context for backend engineers / AI tools:**
> This addendum documents **5 new AI-powered KB endpoints** added as part of the AI Knowledge Base feature layer.
> The frontend already calls all of these endpoints via RTK Query. Mock implementations exist in the frontend for development.
> All endpoints follow the same `{ data: ... }` response envelope as the rest of the spec.
>
> **Key architectural principle:** These are AI orchestration endpoints. The backend calls an LLM (e.g. Claude via Anthropic API) or a vector/embedding service (e.g. OpenAI Embeddings + pgvector) internally and returns structured results. The frontend never calls the LLM directly.

---

## A8.1 — New AI KB Type Definitions

### `AIKBSuggestion`

Returned by the KB-suggest and KB-deflect endpoints.

```json
{
  "articleId": "uuid",
  "title": "string",
  "excerpt": "string",
  "score": 0.87,
  "reasoning": "Matches ticket topic: Account Management"
}
```

| Field | Type | Description |
|---|---|---|
| `articleId` | `UUID` | ID of the recommended KB article |
| `title` | `string` | Article title (denormalised for performance) |
| `excerpt` | `string` | Short article summary (max 300 chars) |
| `score` | `float 0-1` | Semantic similarity / relevance score |
| `reasoning` | `string` | Human-readable explanation of why this was suggested |

---

### `AIKBDraftResult`

Returned by the KB draft generation endpoint.

```json
{
  "title": "How to Enable Two-Factor Authentication",
  "excerpt": "A step-by-step guide to enabling 2FA on your account...",
  "content": "## Overview\n\n...",
  "suggestedTags": ["2fa", "security", "authentication"],
  "suggestedCategoryId": "uuid-or-null"
}
```

| Field | Type | Description |
|---|---|---|
| `title` | `string` | AI-generated article title |
| `excerpt` | `string` | Short summary max 300 chars |
| `content` | `string` | Full article body in pseudo-markdown (`##` headings, `-` lists, `1.` numbered steps) |
| `suggestedTags` | `string[]` | Up to 5 relevant tags |
| `suggestedCategoryId` | `UUID or null` | Best-matching category from the tenant's existing categories |

---

### `AIKBGap`

Represents a topic cluster with no KB coverage.

```json
{
  "id": "gap-1",
  "topic": "Two-factor authentication setup",
  "description": "23 tickets in the last 30 days ask about enabling 2FA but no KB article covers this.",
  "ticketCount": 23,
  "sampleTicketIds": ["uuid1", "uuid2"],
  "suggestedTitle": "How to Enable Two-Factor Authentication",
  "priority": "high"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable identifier for this gap (hash of the topic cluster centroid) |
| `topic` | `string` | Short topic label |
| `description` | `string` | Why this is a gap — ticket volume, time window |
| `ticketCount` | `integer` | Number of tickets matching this topic in the analysis window |
| `sampleTicketIds` | `UUID[]` | Up to 5 representative ticket IDs |
| `suggestedTitle` | `string` | AI-suggested KB article title to fill this gap |
| `priority` | `"high" or "medium" or "low"` | Based on ticket volume and recency |

---

### `AIKBAnswer`

Returned by the RAG Q&A endpoint.

```json
{
  "answer": "Based on our knowledge base: you can reset your password by...",
  "confidence": 0.82,
  "sourceArticleIds": ["uuid1", "uuid2"],
  "followUpQuestions": ["How do I enable 2FA?", "What if I don't receive the email?"],
  "cannotAnswer": false
}
```

| Field | Type | Description |
|---|---|---|
| `answer` | `string` | Grounded answer text — must be factually derived from source articles only. |
| `confidence` | `float 0-1` | Retrieval confidence. Below 0.4 = likely cannot answer. |
| `sourceArticleIds` | `UUID[]` | IDs of KB articles used to generate the answer |
| `followUpQuestions` | `string[]` | 2-4 suggested follow-up questions the user might ask |
| `cannotAnswer` | `boolean` | `true` if no relevant KB content was found. `answer` should contain a helpful fallback. |

---

## A8.2 — Endpoints

### `GET /api/v1/ai/kb-suggest/:ticketId`

**Purpose:** Returns the top 3 KB articles most semantically relevant to an existing ticket.
Used in the agent workspace AI panel so agents can quickly share articles with customers.

**Auth:** JWT required. Permission: `AI_KB_SUGGEST` (AGENT, LEAD, ADMIN).

**Path params:**
- `ticketId` — UUID of the ticket

**Response `200 OK`:**
```json
{
  "data": [
    {
      "articleId": "uuid",
      "title": "How to Reset Your Password",
      "excerpt": "Step-by-step instructions for resetting...",
      "score": 0.91,
      "reasoning": "Ticket title and description contain password reset topic — direct match with KB article."
    }
  ]
}
```

**Implementation notes:**
1. Fetch ticket `title + description + tags` from DB.
2. Concatenate as: `"{title}. {description}"`.
3. Embed this text using your embedding model (e.g. `text-embedding-3-small`).
4. Cosine-similarity search against KB article embedding index (only `isPublished = true`, same `tenant_id`).
5. Return top 3 by score. If score < 0.35 for all candidates, return empty array `[]`.
6. Populate `reasoning` with one-sentence LLM call or a template string.
7. Cache result by `ticketId` for 5 minutes (TTL). Bust when ticket title/description changes.

**Error responses:**
- `404` — Ticket not found
- `403` — Missing `AI_KB_SUGGEST` permission

---

### `GET /api/v1/ai/kb-deflect`

**Purpose:** Given a free-form user query (ticket title + partial description), returns up to 5 KB articles that might answer the question — shown to the customer *before* they submit a ticket.

**Auth:** JWT required. Available to all authenticated users including customers.

**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | yes | Free-form text (title + description concatenated) |
| `limit` | `integer` | no | Max results (1-10, default 5) |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "articleId": "uuid",
      "title": "How to Reset Your Password",
      "excerpt": "Step-by-step instructions...",
      "score": 0.88,
      "reasoning": "Similar topic found in knowledge base"
    }
  ]
}
```

**Implementation notes:**
1. Embed the `query` string.
2. Cosine-similarity search against KB article embeddings (published only, same tenant).
3. Apply minimum score threshold of `0.40`. Return empty array if nothing meets threshold.
4. No LLM call needed for reasoning — use template: `"Similar topic found in knowledge base"` or `"Matches category: {category.name}"`.
5. This endpoint is called frequently with debounce — keep p99 latency under 200ms. Pre-compute article embeddings; never compute them on-request.

---

### `POST /api/v1/ai/kb-draft`

**Purpose:** Generates a structured KB article draft from a topic description using an LLM.

**Auth:** JWT required. Permission: `KB_MANAGE` (LEAD, ADMIN).

**Request body:**
```json
{
  "topic": "How to enable two-factor authentication",
  "categoryId": "uuid-optional",
  "tone": "friendly"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `topic` | `string` | yes | Article topic description (5-500 chars) |
| `categoryId` | `UUID` | no | If provided, tailor content to this category |
| `tone` | `"technical" or "friendly" or "formal"` | no | Writing style (default: `"friendly"`) |

**Response `200 OK`:**
```json
{
  "data": {
    "title": "How to Enable Two-Factor Authentication",
    "excerpt": "A step-by-step guide to securing your account with 2FA...",
    "content": "## Overview\n\n...\n\n## Steps\n\n1. Go to Settings\n2. Click Enable 2FA\n...",
    "suggestedTags": ["2fa", "security", "authentication"],
    "suggestedCategoryId": "uuid-or-null"
  }
}
```

**Implementation notes:**
1. Call LLM with a structured prompt specifying: topic, tone, and the required output format (title, excerpt, content using `##` headings and `-` or `1.` lists, tags).
2. If `categoryId` provided, fetch category name and include in prompt for context.
3. For `suggestedCategoryId`: embed generated title + excerpt, find nearest category embedding (if similarity > 0.5), return that category ID; else null.
4. Validate LLM JSON output schema. Retry once if malformed.
5. Rate limit: max 20 draft requests per tenant per hour. Return `429` with `Retry-After` header when exceeded.

**Error responses:**
- `400` — `topic` is empty or too long
- `429` — Rate limit exceeded
- `500` — LLM call failed

---

### `GET /api/v1/ai/kb-gaps`

**Purpose:** Returns a list of topic clusters detected from recent ticket patterns that have no corresponding KB article.

**Auth:** JWT required. Permission: `KB_MANAGE` (LEAD, ADMIN only).

**Query params:** None — uses `tenant_id` from JWT.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "gap-abc123",
      "topic": "Two-factor authentication setup",
      "description": "23 tickets in the last 30 days ask about enabling 2FA but no KB article covers this.",
      "ticketCount": 23,
      "sampleTicketIds": ["uuid1", "uuid2", "uuid3"],
      "suggestedTitle": "How to Enable Two-Factor Authentication",
      "priority": "high"
    }
  ]
}
```

**Implementation notes:**

Gap detection runs as a **background job** (daily or triggered by significant ticket volume change), not on-request:

1. Pull last 30 days of tickets for the tenant (all statuses).
2. Cluster ticket titles + descriptions using embedding vectors (k-means or DBSCAN, suggested k=20 or auto-tuned).
3. For each cluster:
   - Compute centroid embedding.
   - Find nearest KB article embedding (cosine similarity).
   - If nearest article similarity < 0.55 → **gap detected**.
4. For each gap: use LLM to generate `topic`, `description`, `suggestedTitle`.
5. Sort gaps by `ticketCount` descending.
6. Assign `priority`: 20+ tickets → `"high"`, 10-19 → `"medium"`, else `"low"`.
7. Store results in `ai_kb_gaps` table with `computed_at` timestamp.

On request:
- Return pre-computed results from `ai_kb_gaps` table.
- If data is stale (> 24h): trigger async recompute, return stale data with `X-Cache-Status: STALE` header.
- Maximum 20 gaps returned.

**Error responses:**
- `403` — Missing `KB_MANAGE` permission

---

### `POST /api/v1/ai/kb-ask`

**Purpose:** RAG Q&A endpoint. Accepts a free-form question and returns an answer grounded in the tenant's KB articles.

**Auth:** JWT required. Available to all authenticated users (customers + staff).

**Request body:**
```json
{
  "question": "How do I reset my password if I don't have access to my email?",
  "articleId": "uuid-optional"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | `string` | yes | The user's question (5-500 chars) |
| `articleId` | `UUID` | no | If provided, prioritise context from this article. Still searches broadly. |

**Response `200 OK`:**
```json
{
  "data": {
    "answer": "If you no longer have access to your email, you can contact our support team with your account ID for manual verification.",
    "confidence": 0.79,
    "sourceArticleIds": ["uuid1", "uuid2"],
    "followUpQuestions": [
      "What identity verification is required?",
      "How long does account recovery take?"
    ],
    "cannotAnswer": false
  }
}
```

**RAG Pipeline:**

1. **Retrieve:** Embed `question`. Search KB article embeddings (cosine similarity, published only, same tenant). Retrieve top 5 chunks by score.
   - If `articleId` provided: boost that article's chunks to appear in top 3.

2. **Threshold check:** If no chunk scores >= 0.40, set `cannotAnswer: true` and return:
   `"I couldn't find a specific answer in our knowledge base. Please create a support ticket and our team will help you directly."`
   Return `sourceArticleIds: []`, `confidence: 0.1`.

3. **Generate:** Call LLM with retrieved chunks as context. Instruct to answer using ONLY provided context, in 2-4 concise sentences.

4. **Follow-ups:** Generate 2-3 suggested follow-up questions via a second LLM call or combined prompt.

5. **Confidence:** Set `confidence` = average of top 3 retrieved chunk cosine similarities.

6. **Rate limit:** Max 50 questions per user per hour.

7. **Audit log:** Persist every question + answer to `ai_kb_ask_log` table for quality review and GDPR compliance.

**Error responses:**
- `400` — `question` is empty or too long
- `429` — Rate limit exceeded
- `500` — LLM or embedding service unavailable

---

## A8.3 — Infrastructure Requirements

### Embedding Pipeline

1. **Model:** `text-embedding-3-small` (OpenAI) or `voyage-2` (Anthropic) — 1536-dim float vectors.
2. **Storage:** `pgvector` extension in PostgreSQL, `vector(1536)` column.
3. **Index:** HNSW index for fast ANN search:
   ```sql
   CREATE INDEX ON kb_article_embeddings USING hnsw (embedding vector_cosine_ops);
   ```
4. **Triggers:** Re-embed after article create, update (title/content/excerpt changed), or delete.
5. **Chunking:** For long articles (> 500 tokens), split into overlapping 300-token segments. Store `chunk_index`. Deduplicate by article in retrieval results.

### Suggested Schema

```sql
-- Article embeddings
CREATE TABLE kb_article_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536) NOT NULL,
  model       VARCHAR(64) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, chunk_index)
);
CREATE INDEX ON kb_article_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON kb_article_embeddings (tenant_id, article_id);

-- Gap detection results
CREATE TABLE ai_kb_gaps (
  id                VARCHAR(64) PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  topic             TEXT NOT NULL,
  description       TEXT NOT NULL,
  ticket_count      INTEGER NOT NULL,
  sample_ticket_ids UUID[] NOT NULL DEFAULT '{}',
  suggested_title   TEXT NOT NULL,
  priority          VARCHAR(8) NOT NULL CHECK (priority IN ('high','medium','low')),
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON ai_kb_gaps (tenant_id, computed_at DESC);

-- RAG Q&A audit log (GDPR: apply 90-day retention policy)
CREATE TABLE ai_kb_ask_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  user_id           UUID NOT NULL,
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  confidence        NUMERIC(4,3) NOT NULL,
  source_article_ids UUID[] NOT NULL DEFAULT '{}',
  cannot_answer     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON ai_kb_ask_log (tenant_id, created_at DESC);
```

---

## A8.4 — Cache Invalidation Reference

| Endpoint | Cache strategy |
|---|---|
| `GET /ai/kb-suggest/:ticketId` | Cache by `tenant_id + ticketId`, TTL 5 min. Bust when ticket title/description changes. |
| `GET /ai/kb-deflect` | No caching — query changes constantly. Keep latency low via pre-computed embeddings. |
| `POST /ai/kb-draft` | No caching. Apply rate limiting per tenant. |
| `GET /ai/kb-gaps` | Read from `ai_kb_gaps` table, TTL 24h. Background job recomputes. |
| `POST /ai/kb-ask` | No caching. Log to `ai_kb_ask_log`. Apply per-user rate limit. |

---

## A8.5 — Permission Summary

| Endpoint | CUSTOMER | AGENT | LEAD | ADMIN |
|---|---|---|---|---|
| `GET /ai/kb-suggest/:ticketId` | No | Yes | Yes | Yes |
| `GET /ai/kb-deflect` | Yes | Yes | Yes | Yes |
| `POST /ai/kb-draft` | No | No | Yes | Yes |
| `GET /ai/kb-gaps` | No | No | Yes | Yes |
| `POST /ai/kb-ask` | Yes | Yes | Yes | Yes |

---

## A8.6 — End-to-End User Flows

### Flow 1: Ticket Deflection (Customer Portal)

```
Customer types ticket title + description (debounced 500ms)
  → GET /ai/kb-deflect?query={combined}&limit=3
  → Backend: embed query → vector search → return matches with score > 0.40
  → Frontend: show "We found articles that might answer your question" panel
  → Customer clicks article → reads KB → resolves issue without submitting ticket
```

### Flow 2: Agent KB Assist (Internal Console)

```
Agent opens ticket workspace → AI Panel loads
  → GET /ai/kb-suggest/{ticketId}
  → Backend: embed ticket content → vector search → return top 3 articles
  → Agent sees "Relevant KB Articles" with match scores in AI Panel drawer
  → Agent pastes article link into reply to customer
```

### Flow 3: AI Article Authoring with Gap Detection (Internal Console)

```
Admin clicks "AI Gaps" tab in Knowledge Base page
  → GET /ai/kb-gaps (pre-computed, TTL 24h)
  → Frontend: shows gap cards with ticket count, priority, suggested title
  → Admin clicks "+ Create Article" on a gap
  → Navigate to editor: title pre-filled, AI Draft panel auto-open
  → Admin clicks "Generate" → POST /ai/kb-draft
  → LLM generates structured draft → editor populates all fields
  → Admin reviews, edits, publishes → gap resolved
```

### Flow 4: RAG Q&A (Customer Portal)

```
Customer reads KB article, has follow-up question
  → Types in "Ask AI about this topic" widget
  → POST /ai/kb-ask { question, articleId }
  → Backend: embed question → retrieve chunks → LLM generates grounded answer
  → Frontend: shows answer + confidence bar + suggested follow-up questions
  → If cannotAnswer: shows fallback + "Create a Ticket" button
```

---

*Addendum A8 generated from the Meridian 3SC Platform frontend codebase — AI Knowledge Base feature layer. Last updated: 2026-04-17.*

---

---
---
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
---
---

# Addendum A9 — AI-Native Projects Feature Layer

> **Purpose:** This addendum covers every new and updated API endpoint introduced by the AI-Native Projects feature.
> It is self-contained: a backend engineer (or AI tool) can read only this addendum and implement every endpoint described here without reading the rest of the spec — though the General Conventions in Section 1 still apply (base URL `/api/v1`, response envelope, multi-tenancy via `tenant_id`, HttpOnly cookie auth).
>
> **Audience:** Backend engineers, AI code-generation tools (Claude, ChatGPT, GitHub Copilot), and QA teams writing integration tests.
>
> **Last updated:** 2026-04-17

---

## A9.1 — Overview & Architecture

The AI-Native Projects feature adds two capability layers on top of the existing Project entity:

**Layer 1 — Project CRUD extensions** (Section A9.2)
Standard REST operations that extend the existing `/projects` resource with new fields (`scope`, `openTicketCount`, `resolvedThisWeek`, `organization`).

**Layer 2 — AI Project Intelligence** (Section A9.3)
Nine new AI endpoints under `/ai/projects/` that power:
- Health scoring (velocity + SLA + sentiment composite)
- Semantic ticket clustering (theme detection inside a project)
- Scope drift detection (tickets outside declared scope)
- Churn risk scoring (client relationship health)
- Weekly status report generation (LLM narrative)
- Natural-language Q&A over project history (RAG)
- Next best action recommendation (agent nudge)
- Knowledge extraction from closed projects
- Milestone delivery predictions (velocity extrapolation)

### Who sees what

| Feature | Internal (AGENT) | Internal (LEAD/ADMIN) | Client (CLIENT_USER/CLIENT_ADMIN) |
|---|---|---|---|
| Project list + detail | ✓ | ✓ | ✓ (own org only) |
| Create / edit project | — | ✓ | — |
| AI health score | — | ✓ (`AI_PROJECT_INSIGHTS`) | — |
| Ticket clusters | — | ✓ (`AI_PROJECT_INSIGHTS`) | — |
| Scope drift flags | — | ✓ (`AI_PROJECT_INSIGHTS`) | — |
| Churn risk | — | ✓ (`AI_PROJECT_INSIGHTS`) | — (never exposed) |
| Status report | — | ✓ (`AI_PROJECT_REPORTS`) | ✓ (sanitised version) |
| Next best action | — | ✓ (`AI_PROJECT_INSIGHTS`) | — |
| Ask AI (Q&A) | ✓ (`AI_PROJECT_QA`) | ✓ | ✓ (own project only) |
| Milestone predictions | ✓ | ✓ | ✓ (own project only) |
| Knowledge entries | — | ✓ | — |

---

## A9.2 — Updated Project Endpoints

### A9.2.1 — Updated `Project` Schema

The `Project` entity gains the following new fields. All existing fields remain unchanged.

```typescript
interface Project {
  // ── Existing fields (unchanged) ──────────────────────
  id: string;                  // UUID, e.g. "PRJ-001"
  name: string;
  description: string;
  status: ProjectStatus;       // "planning" | "active" | "on_hold" | "completed" | "cancelled"
  organizationId: string;      // UUID of the client org
  leadId?: string;             // UUID of the assigned 3SC lead
  lead?: User;                 // Populated join
  milestones: Milestone[];
  ticketCount: number;
  startDate?: string;          // ISO 8601
  targetDate?: string;         // ISO 8601
  completedAt?: string;        // ISO 8601
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601

  // ── New fields ────────────────────────────────────────
  scope?: string;
  // Plain-text statement of what is in and out of scope.
  // Used by the backend for semantic scope drift detection (embedding).
  // Stored as plain text in the DB. Max 2000 chars.

  organization?: Organization;
  // Full organization object (populated join). Return when fetching single project.
  // Omit from list endpoints for performance.

  openTicketCount?: number;
  // Pre-computed count of tickets in status OPEN, ACKNOWLEDGED, or IN_PROGRESS.
  // Updated on ticket status change. Can be a denormalised counter column.

  resolvedThisWeek?: number;
  // Count of tickets transitioned to RESOLVED or CLOSED in the last 7 calendar days.
  // Computed at query time or cached with a 1-hour TTL.
}
```

### A9.2.2 — `GET /projects`

**No change to endpoint path or query params.**
Add the new fields (`openTicketCount`, `resolvedThisWeek`) to each project in the response.
Do NOT include `organization` (full join) in list responses — use `organizationId` only.

**Response (updated):**
```json
{
  "data": [
    {
      "id": "PRJ-001",
      "name": "Customer Support Platform",
      "description": "...",
      "scope": "Deliver a multi-tenant SaaS support platform...",
      "status": "active",
      "organizationId": "ORG-002",
      "leadId": "USR-002",
      "lead": { "id": "USR-002", "displayName": "Priya Sharma", ... },
      "milestones": [...],
      "ticketCount": 56,
      "openTicketCount": 14,
      "resolvedThisWeek": 8,
      "startDate": "2025-11-01T00:00:00Z",
      "targetDate": "2026-05-15T00:00:00Z",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "page": 1,
  "page_size": 25,
  "total": 5,
  "total_pages": 1
}
```

**Permission scoping:**
- `AGENT/LEAD/ADMIN`: all projects (cross-tenant)
- `CLIENT_ADMIN/CLIENT_USER`: only projects where `organizationId = session.tenantId`

---

### A9.2.3 — `GET /projects/:id`

**No change to path.**
Returns full project detail including `organization` (populated join) and all new fields.

**Response (updated):**
```json
{
  "data": {
    "id": "PRJ-001",
    "name": "Customer Support Platform",
    "description": "...",
    "scope": "Deliver a multi-tenant SaaS support platform including ticket management...",
    "status": "active",
    "organizationId": "ORG-002",
    "organization": {
      "id": "ORG-002",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "logoUrl": null,
      "isActive": true
    },
    "leadId": "USR-002",
    "lead": { "id": "USR-002", "displayName": "Priya Sharma", "email": "priya@3sc.com", ... },
    "milestones": [
      {
        "id": "MS-001",
        "projectId": "PRJ-001",
        "title": "Requirement Analysis",
        "description": "Gather and sign off on full requirements",
        "dueDate": "2025-11-30T00:00:00Z",
        "isCompleted": true,
        "completedAt": "2025-11-28T00:00:00Z",
        "deliverables": []
      }
    ],
    "ticketCount": 56,
    "openTicketCount": 14,
    "resolvedThisWeek": 8,
    "startDate": "2025-11-01T00:00:00Z",
    "targetDate": "2026-05-15T00:00:00Z",
    "created_at": "2025-10-20T09:00:00Z",
    "updated_at": "2026-04-15T11:30:00Z"
  }
}
```

---

### A9.2.4 — `POST /projects` *(New)*

Create a new project.

**Permission required:** `PROJECT_CREATE` (LEAD, ADMIN)

**Request body:**
```json
{
  "name": "Mobile App Revamp",
  "description": "Redesigning the mobile application with improved UX.",
  "scope": "Redesign and rebuild iOS and Android apps using React Native. Excludes backend.",
  "status": "planning",
  "organizationId": "ORG-003",
  "leadId": "USR-006",
  "startDate": "2026-04-01T00:00:00Z",
  "targetDate": "2026-07-30T00:00:00Z"
}
```

**Validation:**
- `name`: required, max 200 chars
- `organizationId`: required, must reference existing org
- `status`: defaults to `"planning"` if omitted
- `scope`: optional, max 2000 chars — if provided, **trigger async scope embedding** (see A9.3.4)

**Response:** Full `Project` object wrapped in `{ "data": { ... } }`.

**Side effects:**
1. Create `project_scope_embeddings` record if `scope` is provided (async, non-blocking).
2. Emit `project:created` realtime event to connected clients for the org.

---

### A9.2.5 — `PATCH /projects/:id` *(New)*

Update project fields. Partial update — only provided fields are changed.

**Permission required:** `PROJECT_EDIT` (LEAD, ADMIN)

**Request body (all fields optional):**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "scope": "Updated scope statement",
  "status": "active",
  "leadId": "USR-003",
  "targetDate": "2026-06-01T00:00:00Z"
}
```

**Important:** If `scope` is updated, **re-trigger scope embedding** asynchronously. The old embedding is replaced.

**Response:** Full updated `Project` object.

---

## A9.3 — AI Project Intelligence Endpoints

> **Infrastructure note:** All endpoints in this section require:
> - A vector database (pgvector on PostgreSQL, or Pinecone/Weaviate)
> - An LLM API (Claude claude-sonnet-4-6 recommended — same model used elsewhere on the platform)
> - An embedding model (text-embedding-3-small or equivalent)
> - A job queue for async computation (Redis + BullMQ recommended)
>
> Endpoints that are expensive to compute should be **pre-computed on a schedule** and cached. The response always returns cached data with a `generatedAt` timestamp. A `?refresh=true` query param forces recomputation.

---

### A9.3.1 — `GET /ai/projects/:projectId/health`

**What it does:**
Returns a composite health score for a project based on three signals:
1. **Velocity trend** — rate of ticket resolution over the last 14 days vs. the 14 days before
2. **SLA breach risk** — fraction of open tickets that are at-risk or breached
3. **Client sentiment** — average sentiment of the last 20 client-facing comments on the project's tickets

These three signals are combined into a 0–100 score, mapped to Green/Amber/Red, and an LLM is called to write a plain-English explanation.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/:projectId/health`

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `refresh` | boolean | false | Force recomputation even if cache is warm |

**Computation algorithm:**
```
velocityScore  = clamp(currentVelocity / baselineVelocity * 50, 0, 50)
slaScore       = (1 - breachedFraction) * 30
sentimentScore = (positiveRatio * 20)
rawScore       = velocityScore + slaScore + sentimentScore

color = rawScore >= 70 ? "green" : rawScore >= 45 ? "amber" : "red"

explanation = LLM.generate(
  prompt: "Given this project data: [velocity_delta, sla_state, sentiment_trend, overdue_milestones],
           write a 2-3 sentence plain-English health summary for a project manager.",
  model: "claude-sonnet-4-6"
)
```

**Response:**
```json
{
  "data": {
    "projectId": "PRJ-001",
    "color": "amber",
    "score": 62,
    "explanation": "Resolution velocity has declined 34% over the last 10 days. Two tickets have exceeded SLA with no agent response. Sentiment in client comments shifted from neutral to mildly negative. Milestone MS-003 (Backend APIs) is 12 days past due.",
    "velocityTrend": "declining",
    "slaBreachRisk": 0.61,
    "openBlockers": 3,
    "generatedAt": "2026-04-17T06:00:00Z"
  }
}
```

**Response fields:**
| Field | Type | Description |
|---|---|---|
| `projectId` | string | The queried project ID |
| `color` | `"green" \| "amber" \| "red"` | Health signal |
| `score` | number (0–100) | Composite numeric score |
| `explanation` | string | LLM-generated plain-English reason |
| `velocityTrend` | `"improving" \| "stable" \| "declining"` | Direction of resolution velocity |
| `slaBreachRisk` | number (0–1) | Fraction of open tickets at SLA risk |
| `openBlockers` | number | Count of tickets with no agent activity > 48h |
| `generatedAt` | ISO 8601 | When this was last computed |

**Caching:** Compute nightly at 06:00 UTC per project. TTL 24h. Invalidated on `?refresh=true`.

**DB table required:**
```sql
CREATE TABLE project_health_cache (
  project_id     TEXT PRIMARY KEY REFERENCES projects(id),
  color          TEXT NOT NULL CHECK (color IN ('green','amber','red')),
  score          INTEGER NOT NULL,
  explanation    TEXT NOT NULL,
  velocity_trend TEXT NOT NULL,
  sla_breach_risk NUMERIC(4,3) NOT NULL,
  open_blockers  INTEGER NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### A9.3.2 — `GET /ai/projects/:projectId/clusters`

**What it does:**
Groups the project's tickets into semantic clusters using embedding-based clustering. Each cluster gets an AI-generated label, keyword list, and sentiment classification. Surfaces recurring themes the agent may not have noticed manually.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/:projectId/clusters`

**Computation algorithm:**
```
1. Fetch all tickets for the project (title + description concatenated)
2. Embed each ticket with text-embedding-3-small → 1536-dim vector
3. Run HDBSCAN (min_cluster_size=3) or k-means (k = ceil(ticketCount/5), max 8)
4. For each cluster:
   a. Extract top TF-IDF keywords from ticket texts in the cluster
   b. Call LLM: "Label this cluster of support tickets in 4-6 words: [sample ticket titles]"
   c. Run sentiment classifier on concatenated ticket content → positive/neutral/negative
5. Cache result for 12h or until new tickets are added to the project
```

**Response:**
```json
{
  "data": [
    {
      "id": "CL-001",
      "label": "Authentication & Login Issues",
      "ticketCount": 12,
      "ticketIds": ["TKT-001", "TKT-002", "TKT-003"],
      "topKeywords": ["login", "SSO", "2FA", "session", "token"],
      "sentiment": "negative"
    },
    {
      "id": "CL-002",
      "label": "SLA Configuration & Reporting",
      "ticketCount": 9,
      "ticketIds": ["TKT-016", "TKT-017"],
      "topKeywords": ["sla", "policy", "breach", "export", "csv"],
      "sentiment": "neutral"
    }
  ]
}
```

**Response fields (per cluster):**
| Field | Type | Description |
|---|---|---|
| `id` | string | Cluster ID (stable per cache TTL) |
| `label` | string | LLM-generated 4–6 word label |
| `ticketCount` | number | Number of tickets in this cluster |
| `ticketIds` | string[] | IDs of tickets in the cluster |
| `topKeywords` | string[] | Top 5 TF-IDF keywords |
| `sentiment` | `"positive" \| "neutral" \| "negative"` | Majority sentiment of cluster |

**DB table required:**
```sql
CREATE TABLE project_ticket_clusters (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id),
  label          TEXT NOT NULL,
  ticket_ids     TEXT[] NOT NULL,
  top_keywords   TEXT[] NOT NULL,
  sentiment      TEXT NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### A9.3.3 — `GET /ai/projects/:projectId/scope-drift`

**What it does:**
For each ticket in the project, computes cosine similarity between the ticket embedding and the project's scope embedding. Tickets below a similarity threshold (0.6) are flagged as potential scope drift, and an LLM generates a plain-English explanation of why the ticket appears to be out of scope.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/:projectId/scope-drift`

**Prerequisite:** The project must have a `scope` field set. If `scope` is null, return `[]`.

**Computation algorithm:**
```
scopeEmbedding = embed(project.scope)  // cached in project_scope_embeddings

for each ticket in project:
  ticketEmbedding = embed(ticket.title + " " + ticket.description)
  similarity = cosine_similarity(scopeEmbedding, ticketEmbedding)

  if similarity < 0.6:
    reasoning = LLM.generate(
      "This ticket: [title]. Project scope: [scope]. Explain in one sentence why this ticket
       may be outside the declared scope."
    )
    flag ticket as scope drift with similarity + reasoning
```

**Response:**
```json
{
  "data": [
    {
      "ticketId": "TKT-015",
      "ticketTitle": "Feature: Webhook support for ticket status changes",
      "similarity": 0.42,
      "flagged": true,
      "reasoning": "Webhook integrations with external systems (Jira, Slack) were explicitly excluded from project scope."
    },
    {
      "ticketId": "TKT-006",
      "ticketTitle": "Add bulk ticket export to CSV",
      "similarity": 0.55,
      "flagged": true,
      "reasoning": "Bulk export is adjacent but not listed in the original delivery scope. Likely a post-go-live enhancement."
    }
  ]
}
```

**Response fields (per drift item):**
| Field | Type | Description |
|---|---|---|
| `ticketId` | string | The ticket ID |
| `ticketTitle` | string | Ticket title (for display without extra fetch) |
| `similarity` | number (0–1) | Cosine similarity to scope embedding |
| `flagged` | boolean | Always `true` in this response (only flagged tickets returned) |
| `reasoning` | string | LLM-generated one-sentence explanation |

**DB table required:**
```sql
CREATE TABLE project_scope_embeddings (
  project_id   TEXT PRIMARY KEY REFERENCES projects(id),
  embedding    vector(1536) NOT NULL,
  scope_hash   TEXT NOT NULL,   -- SHA256 of scope text, used to detect staleness
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Requires pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
```

---

### A9.3.4 — `GET /ai/projects/:projectId/churn-risk`

**What it does:**
Scores the risk that a client will disengage, escalate, or churn from this engagement. Computed from behavioural signals extracted from the project's communication history. **Never exposed to clients** — internal-only.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/:projectId/churn-risk`

**Signals used (feature vector for scoring):**
| Signal | How extracted |
|---|---|
| Client response latency | Avg hours between agent comment and next client comment (last 14 days) |
| Response latency trend | Is response latency increasing? (slope over 14 days) |
| Comment volume trend | Is client commenting less than before? |
| Comment length trend | Are client comments getting shorter? |
| Escalation signal | New stakeholders CC'd on last 3 emails / comments? |
| Ticket-open rate | Is client opening more tickets than usual? |
| Days since last client action | Last ticket/comment created or updated by client |
| Unanswered agent messages | Count of agent comments with no client reply in 7 days |
| Project status | `on_hold` = elevated risk base score |

**Scoring:**
```
score = weighted_logistic(signal_vector)
// Weights tuned on historical engagement data
// score: 0.0 (no risk) → 1.0 (certain churn)
level = score < 0.3 ? "low" : score < 0.6 ? "medium" : "high"

signals = top 3-5 contributing features, written in plain English by LLM
recommendation = LLM.generate("Given churn risk [level] and signals [list], write a 1-2 sentence recommendation for the project lead.")
```

**Response:**
```json
{
  "data": {
    "projectId": "PRJ-003",
    "score": 0.79,
    "level": "high",
    "signals": [
      "3 unanswered emails over 18 days",
      "Client cc'd their CTO on last message (escalation signal)",
      "No ticket activity from client side in 3 weeks",
      "Project on-hold status unchanged for 25 days"
    ],
    "recommendation": "Urgent: escalate to account manager. Prepare a written status summary and a clear ask. Consider a contract review if no response within 48 hours."
  }
}
```

**Response fields:**
| Field | Type | Description |
|---|---|---|
| `projectId` | string | The queried project |
| `score` | number (0–1) | Churn probability score |
| `level` | `"low" \| "medium" \| "high"` | Bucketed risk level |
| `signals` | string[] | Top 3–5 contributing signals in plain English |
| `recommendation` | string | LLM-generated action recommendation for the lead |

**Caching:** Compute daily per active project. TTL 24h.

---

### A9.3.5 — `GET /ai/projects/:projectId/status-report`

**What it does:**
Generates (or returns cached) a weekly project status report as a structured narrative. Internal staff see the full version; clients see a sanitised version that omits internal metrics (no churn risk, no internal blocker details).

**Permission required:**
- Internal: `AI_PROJECT_REPORTS` (LEAD, ADMIN)
- Client: any authenticated user with `PROJECT_VIEW` and `organizationId` matching the project

**Endpoint:** `GET /api/v1/ai/projects/:projectId/status-report`

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `refresh` | boolean | false | Force regeneration |

**Computation:**
```
context = {
  projectName: project.name,
  period: "Apr 10 – Apr 17, 2026",
  resolvedThisWeek: count(tickets resolved in last 7 days),
  openCount: count(open tickets),
  blockers: tickets with no agent activity > 48h OR externally blocked,
  nextMilestone: next incomplete milestone + dueDate,
  milestonePrediction: from /ai/projects/:id/milestone-predictions,
  recentComments: last 10 client-facing comments (summary)
}

report = LLM.generate(
  system: "You are a professional project manager writing a weekly status update.
           Write clearly and concisely. Do not use jargon. Do not reveal internal metrics.
           The audience is the client stakeholder.",
  user: JSON.stringify(context),
  output_schema: {
    summary: string,          // 2-3 sentence narrative
    resolvedThisWeek: number,
    openCount: number,
    blockers: string[],       // Client-friendly blocker descriptions
    nextSteps: string[],      // Specific asks or upcoming actions
    onTrack: boolean,
    milestoneConfidence: string  // e.g. "89% confident milestone will be met by April 30"
  }
)
```

**Response:**
```json
{
  "data": {
    "projectId": "PRJ-001",
    "period": "Apr 10 – Apr 17, 2026",
    "summary": "The team resolved 8 tickets this week, primarily addressing login reliability issues and SLA reporting queries...",
    "resolvedThisWeek": 8,
    "openCount": 14,
    "blockers": [
      "MS-003 (Backend APIs) delayed — awaiting client environment access credentials",
      "TKT-010 blocked by a third-party email provider outage (external dependency)"
    ],
    "nextSteps": [
      "Request client environment credentials by April 18",
      "Complete SLA engine integration by April 22",
      "Begin QA milestone prep by April 25"
    ],
    "onTrack": false,
    "milestoneConfidence": "71% confident the revised April 29 target will be met if environment access is granted by April 18.",
    "generatedAt": "2026-04-17T06:00:00Z"
  }
}
```

**Response fields:**
| Field | Type | Description |
|---|---|---|
| `projectId` | string | Project ID |
| `period` | string | Human-readable date range |
| `summary` | string | LLM-generated 2–3 sentence narrative |
| `resolvedThisWeek` | number | Tickets resolved in last 7 days |
| `openCount` | number | Currently open tickets |
| `blockers` | string[] | Client-friendly blocker descriptions |
| `nextSteps` | string[] | Recommended next actions / client asks |
| `onTrack` | boolean | Whether the project is on track for its target date |
| `milestoneConfidence` | string | LLM-written confidence statement for next milestone |
| `generatedAt` | ISO 8601 | Generation timestamp |

**Caching:** Generate once per week (Monday 08:00 UTC) per project. Store as a report record. Return cached until next Monday unless `?refresh=true`.

**DB table required:**
```sql
CREATE TABLE project_status_reports (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL REFERENCES projects(id),
  period       TEXT NOT NULL,
  report_json  JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, period)
);
```

---

### A9.3.6 — `POST /ai/projects/:projectId/ask`

**What it does:**
Answers a free-form natural-language question about a project using RAG (Retrieval-Augmented Generation). The answer is grounded in the project's actual ticket history, comments, milestones, and status reports.

**Permission required:** `AI_PROJECT_QA` (all internal roles + client users for their own projects)

**Client scoping:** If the caller is a client user, validate `project.organizationId === session.tenantId` before answering. Return 403 otherwise.

**Endpoint:** `POST /api/v1/ai/projects/:projectId/ask`

**Request body:**
```json
{
  "question": "Why is the Backend APIs milestone delayed?"
}
```

**Request fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | Yes | Free-form question, max 500 chars |

**RAG pipeline:**
```
1. Embed the question → query vector

2. Retrieve relevant context:
   a. Vector search over project ticket embeddings (top 5 by cosine similarity)
   b. Vector search over project comment embeddings (top 5)
   c. Fetch current milestone status for the project
   d. Fetch latest status report summary (if exists)

3. Build prompt:
   system: "You are a project assistant. Answer the user's question based ONLY on the
            provided project context. Do not invent information. If you cannot answer
            from the context, set cannotAnswer: true."
   context: [retrieved tickets, comments, milestones, status summary]
   question: user's question

4. Call LLM → parse structured response:
   {
     answer: string,
     confidence: 0.0–1.0,
     sourceTicketIds: string[],
     cannotAnswer: boolean
   }
```

**Response:**
```json
{
  "data": {
    "answer": "The Backend APIs milestone (MS-003) is currently 12 days overdue. The primary blocker is missing client environment access credentials. A revised target of April 29 has been proposed internally, pending credential delivery by April 18.",
    "confidence": 0.78,
    "sourceTicketIds": ["TKT-001", "TKT-010"],
    "cannotAnswer": false
  }
}
```

**Response fields:**
| Field | Type | Description |
|---|---|---|
| `answer` | string | LLM-generated answer grounded in project history |
| `confidence` | number (0–1) | Model confidence score |
| `sourceTicketIds` | string[] | Ticket IDs used as source context |
| `cannotAnswer` | boolean | True if the question cannot be answered from available context |

**Rate limit:** 20 requests per user per hour per project.

---

### A9.3.7 — `GET /ai/projects/:projectId/next-action`

**What it does:**
Returns the single highest-priority recommended next action for the agent or lead working this project. The recommendation is computed from a rule engine (not a pure LLM call) with an LLM-written description. Rules are deterministic and auditable.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/:projectId/next-action`

**Rule engine (evaluated in priority order):**
```
1. If client hasn't responded in > 5 days AND project is active:
   → "Send interim status update to client"
   urgency: "high"
   draftMessage: LLM.generate("Write a short professional project update email...")

2. If a milestone is overdue AND no update was sent in last 3 days:
   → "Send revised milestone estimate to client"
   urgency: "high"
   draftMessage: LLM.generate(...)

3. If churnRisk.level === "high":
   → "Escalate to account manager"
   urgency: "high"

4. If there are scope drift flags AND no review has been logged:
   → "Review scope drift flags and confirm billing scope"
   urgency: "medium"

5. If the next milestone is within 7 days AND open tickets > 5:
   → "Accelerate open ticket resolution before milestone"
   urgency: "medium"

6. Default (healthy project):
   → "Schedule next weekly sync call"
   urgency: "low"
```

**Response:**
```json
{
  "data": {
    "projectId": "PRJ-001",
    "action": "Send interim status update to client — 5 days without communication",
    "reason": "The client's last message was April 12. The milestone is overdue and 3 tickets are blocked.",
    "urgency": "high",
    "draftMessage": "Hi [Client Name],\n\nQuick update on the Customer Support Platform project:\n\n..."
  }
}
```

**Response fields:**
| Field | Type | Description |
|---|---|---|
| `projectId` | string | Project ID |
| `action` | string | Short action label for display |
| `reason` | string | Explanation of why this action is recommended |
| `urgency` | `"high" \| "medium" \| "low"` | Priority level |
| `draftMessage` | string \| null | LLM-written draft message (for high-urgency communication actions only) |

**Caching:** Compute every 6 hours per active project. Invalidated when a new comment is posted or a ticket changes status.

---

### A9.3.8 — `GET /ai/projects/knowledge`

**What it does:**
Returns the knowledge library — structured summaries extracted from closed projects. Used by agents onboarding to a new project for the same client, or when creating a new project, to surface lessons learned from past engagements.

**Permission required:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Endpoint:** `GET /api/v1/ai/projects/knowledge`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `orgId` | string | Filter knowledge entries to a specific organization |
| `page` | number | Page number (default 1) |
| `page_size` | number | Items per page (default 20) |

**How knowledge is extracted (triggered on project close):**
```
When project.status is set to "completed" or "cancelled":

1. Fetch all tickets, comments, and milestones for the project
2. Summarise with LLM:
   system: "You are a project knowledge extractor. Analyse this completed project
            and extract structured lessons for future projects."
   output_schema: {
     summary: string,              // 2-3 sentence overview
     problemStatement: string,     // What the client needed
     resolutionApproach: string,   // How it was delivered
     blockersSeen: string[],       // Main obstacles encountered
     recommendations: string[]     // Lessons learned / advice for similar future projects
   }
3. Store in project_knowledge table
```

**Response:**
```json
{
  "data": [
    {
      "id": "PKE-001",
      "projectId": "PRJ-004",
      "projectName": "Internal Admin Dashboard",
      "summary": "Delivered a full-stack internal operations dashboard on time and under budget.",
      "problemStatement": "The client needed a centralised operations view replacing 4 separate spreadsheet-based workflows.",
      "resolutionApproach": "Single-page React application backed by a REST API with role-based access control.",
      "blockersSeen": [
        "Environment provisioning delayed by 2 weeks at project start",
        "SSO integration required unplanned work — 3 extra days"
      ],
      "recommendations": [
        "Always provision environments in week 1, not when development starts",
        "Clarify SSO requirements in scoping — it's almost always needed and almost always underestimated"
      ],
      "created_at": "2026-03-20T10:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1,
  "total_pages": 1
}
```

**DB table required:**
```sql
CREATE TABLE project_knowledge (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           TEXT NOT NULL REFERENCES projects(id),
  organization_id      TEXT NOT NULL REFERENCES organizations(id),
  summary              TEXT NOT NULL,
  problem_statement    TEXT NOT NULL,
  resolution_approach  TEXT NOT NULL,
  blockers_seen        TEXT[] NOT NULL DEFAULT '{}',
  recommendations      TEXT[] NOT NULL DEFAULT '{}',
  embedding            vector(1536),   -- for semantic search in future
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### A9.3.9 — `GET /ai/projects/:projectId/milestone-predictions`

**What it does:**
For each incomplete milestone in the project, predicts whether it will be delivered on time. Uses velocity extrapolation (current ticket close rate vs. open ticket count) and dependency analysis (blocking tickets). Returns a confidence range (low / high estimate) and a plain-English reasoning.

**Permission required:** Any authenticated user with `PROJECT_VIEW` (clients see only their own projects).

**Endpoint:** `GET /api/v1/ai/projects/:projectId/milestone-predictions`

**Computation algorithm:**
```
currentVelocity = tickets_resolved_last_7_days / 7  // tickets per day

for each incomplete milestone:
  openTicketsForMilestone = estimate from historical patterns + open ticket count
  daysNeeded = openTicketsForMilestone / max(currentVelocity, 0.5)
  predictedDate = today + daysNeeded

  onTrack = predictedDate <= milestone.dueDate

  confidence = based on velocity variance (how consistent the past 14 days have been)
  confidenceLow  = predictedDate - (confidence_interval_days)
  confidenceHigh = predictedDate + (confidence_interval_days)

  blockingTicketIds = tickets in OPEN/IN_PROGRESS with no activity > 48h

  reasoning = LLM.generate(
    "Given velocity [X] tickets/week, [N] open tickets, and [B] blockers,
     explain in 1-2 sentences whether milestone [name] will be met by [date]."
  )
```

**Response:**
```json
{
  "data": [
    {
      "milestoneId": "MS-003",
      "milestoneName": "Backend APIs",
      "scheduledDate": "2026-03-31T00:00:00Z",
      "predictedDate": "2026-04-29T00:00:00Z",
      "onTrack": false,
      "confidenceLow": "2026-04-25T00:00:00Z",
      "confidenceHigh": "2026-05-05T00:00:00Z",
      "blockingTicketIds": ["TKT-001", "TKT-010"],
      "reasoning": "Current velocity of 8 tickets/week with 14 open and 2 external blockers. Assuming access credentials arrive by April 18, April 29 is the 75th-percentile outcome."
    },
    {
      "milestoneId": "MS-004",
      "milestoneName": "QA & UAT",
      "scheduledDate": "2026-04-30T00:00:00Z",
      "predictedDate": "2026-05-10T00:00:00Z",
      "onTrack": false,
      "confidenceLow": "2026-05-07T00:00:00Z",
      "confidenceHigh": "2026-05-17T00:00:00Z",
      "blockingTicketIds": [],
      "reasoning": "Dependent on MS-003 completion. If APIs land April 29, UAT starts May 1 and the median 10-day window puts delivery at May 10."
    }
  ]
}
```

**Response fields (per milestone):**
| Field | Type | Description |
|---|---|---|
| `milestoneId` | string | Milestone ID |
| `milestoneName` | string | Milestone title |
| `scheduledDate` | ISO 8601 | Original planned date |
| `predictedDate` | ISO 8601 | AI-predicted delivery date |
| `onTrack` | boolean | Whether predicted ≤ scheduled |
| `confidenceLow` | ISO 8601 | Optimistic bound (25th percentile) |
| `confidenceHigh` | ISO 8601 | Pessimistic bound (75th percentile) |
| `blockingTicketIds` | string[] | Tickets blocking this milestone |
| `reasoning` | string | LLM-written 1–2 sentence explanation |

**Only incomplete milestones are returned.** Completed milestones are omitted.

**Caching:** Compute every 6 hours per active project. Invalidated on ticket status change.

---

## A9.4 — New Permission Values

The following permission strings must be added to the permission system and included in the session payload:

| Permission | Description | Roles |
|---|---|---|
| `PROJECT_VIEW` | View project list and detail | AGENT, LEAD, ADMIN, CLIENT_ADMIN, CLIENT_USER |
| `PROJECT_CREATE` | Create new projects | LEAD, ADMIN |
| `PROJECT_EDIT` | Edit project fields and milestones | LEAD, ADMIN |
| `PROJECT_DELETE` | Delete (or archive) projects | ADMIN |
| `AI_PROJECT_INSIGHTS` | Access AI health, clusters, scope drift, churn risk, next action | LEAD, ADMIN |
| `AI_PROJECT_REPORTS` | Generate and view AI status reports | LEAD, ADMIN |
| `AI_PROJECT_QA` | Ask AI questions over project history | AGENT, LEAD, ADMIN, CLIENT_ADMIN, CLIENT_USER |

---

## A9.5 — Updated Permission Matrix (Projects section)

```
┌──────────────────────────┬──────────────┬─────────────┬───────┬──────┬───────┐
│ Permission               │ CLIENT_ADMIN │ CLIENT_USER │ AGENT │ LEAD │ ADMIN │
├──────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
│ PROJECT_VIEW             │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
│ PROJECT_CREATE           │              │             │       │  ✓   │   ✓   │
│ PROJECT_EDIT             │              │             │       │  ✓   │   ✓   │
│ PROJECT_DELETE           │              │             │       │      │   ✓   │
├──────────────────────────┼──────────────┼─────────────┼───────┼──────┼───────┤
│ AI_PROJECT_INSIGHTS      │              │             │       │  ✓   │   ✓   │
│ AI_PROJECT_REPORTS       │              │             │       │  ✓   │   ✓   │
│ AI_PROJECT_QA            │      ✓       │      ✓      │   ✓   │  ✓   │   ✓   │
└──────────────────────────┴──────────────┴─────────────┴───────┴──────┴───────┘

Client scope rule: CLIENT_ADMIN and CLIENT_USER can only access projects where
project.organizationId === session.tenantId. Enforce this at the database query
level, not in application code.
```

---

## A9.6 — Complete Type Definitions

```typescript
// ── Project (updated) ────────────────────────────────────────────
type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

interface Project {
  id: string;
  name: string;
  description: string;
  scope?: string;               // NEW — plain text scope statement
  status: ProjectStatus;
  organizationId: string;
  organization?: Organization;  // NEW — populated join (single fetch only)
  leadId?: string;
  lead?: User;
  milestones: Milestone[];
  ticketCount: number;
  openTicketCount?: number;     // NEW — denormalised counter
  resolvedThisWeek?: number;    // NEW — computed, 7-day window
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  created_at: string;
  updated_at: string;
}

// ── AI Project types (all new) ────────────────────────────────────

type ProjectHealthColor = "green" | "amber" | "red";

interface ProjectHealthScore {
  projectId: string;
  color: ProjectHealthColor;
  score: number;                  // 0–100
  explanation: string;
  velocityTrend: "improving" | "stable" | "declining";
  slaBreachRisk: number;          // 0–1
  openBlockers: number;
  generatedAt: string;            // ISO 8601
}

interface ProjectTicketCluster {
  id: string;
  label: string;
  ticketCount: number;
  ticketIds: string[];
  topKeywords: string[];
  sentiment: "positive" | "neutral" | "negative";
}

interface ProjectScopeDrift {
  ticketId: string;
  ticketTitle: string;
  similarity: number;             // 0–1 cosine similarity to scope embedding
  flagged: boolean;
  reasoning: string;
}

interface ProjectChurnRisk {
  projectId: string;
  score: number;                  // 0–1
  level: "low" | "medium" | "high";
  signals: string[];
  recommendation: string;
}

interface ProjectStatusReport {
  projectId: string;
  period: string;                 // e.g. "Apr 10 – Apr 17, 2026"
  summary: string;
  resolvedThisWeek: number;
  openCount: number;
  blockers: string[];
  nextSteps: string[];
  onTrack: boolean;
  milestoneConfidence: string;
  generatedAt: string;            // ISO 8601
}

interface ProjectQAAnswer {
  answer: string;
  confidence: number;             // 0–1
  sourceTicketIds: string[];
  cannotAnswer: boolean;
}

interface ProjectNextBestAction {
  projectId: string;
  action: string;
  reason: string;
  urgency: "high" | "medium" | "low";
  draftMessage?: string;          // Only for communication-type actions
}

interface ProjectKnowledgeEntry {
  id: string;
  projectId: string;
  projectName: string;
  summary: string;
  problemStatement: string;
  resolutionApproach: string;
  blockersSeen: string[];
  recommendations: string[];
  created_at: string;             // ISO 8601
}

interface ProjectMilestonePrediction {
  milestoneId: string;
  milestoneName: string;
  scheduledDate: string;          // ISO 8601
  predictedDate: string;          // ISO 8601
  onTrack: boolean;
  confidenceLow: string;          // ISO 8601 — optimistic bound
  confidenceHigh: string;         // ISO 8601 — pessimistic bound
  blockingTicketIds: string[];
  reasoning: string;
}
```

---

## A9.7 — Database Schema Summary

```sql
-- Existing table: projects (add new columns)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS open_ticket_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_this_week INTEGER NOT NULL DEFAULT 0;

-- Trigger to keep open_ticket_count up to date
CREATE OR REPLACE FUNCTION update_project_open_ticket_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET open_ticket_count = (
    SELECT COUNT(*) FROM tickets
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
      AND status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_open_ticket_count
AFTER INSERT OR UPDATE OF status OR DELETE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_project_open_ticket_count();

-- AI caching tables
CREATE TABLE IF NOT EXISTS project_health_cache (
  project_id      TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  color           TEXT NOT NULL CHECK (color IN ('green','amber','red')),
  score           INTEGER NOT NULL,
  explanation     TEXT NOT NULL,
  velocity_trend  TEXT NOT NULL,
  sla_breach_risk NUMERIC(4,3) NOT NULL,
  open_blockers   INTEGER NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_scope_embeddings (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL,
  scope_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_ticket_clusters (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  ticket_ids   TEXT[] NOT NULL,
  top_keywords TEXT[] NOT NULL,
  sentiment    TEXT NOT NULL CHECK (sentiment IN ('positive','neutral','negative')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_status_reports (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  report_json  JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, period)
);

CREATE TABLE IF NOT EXISTS project_knowledge (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          TEXT NOT NULL REFERENCES projects(id),
  organization_id     TEXT NOT NULL REFERENCES organizations(id),
  summary             TEXT NOT NULL,
  problem_statement   TEXT NOT NULL,
  resolution_approach TEXT NOT NULL,
  blockers_seen       TEXT[] NOT NULL DEFAULT '{}',
  recommendations     TEXT[] NOT NULL DEFAULT '{}',
  embedding           vector(1536),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Required extension
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## A9.8 — Endpoint Summary Table

| Method | Endpoint | Permission | Cached | Description |
|---|---|---|---|---|
| `GET` | `/projects` | `PROJECT_VIEW` | — | List all projects (updated schema) |
| `GET` | `/projects/:id` | `PROJECT_VIEW` | — | Single project with org join |
| `POST` | `/projects` | `PROJECT_CREATE` | — | Create project |
| `PATCH` | `/projects/:id` | `PROJECT_EDIT` | — | Update project fields |
| `GET` | `/ai/projects/:id/health` | `AI_PROJECT_INSIGHTS` | 24h | Composite health score |
| `GET` | `/ai/projects/:id/clusters` | `AI_PROJECT_INSIGHTS` | 12h | Semantic ticket clusters |
| `GET` | `/ai/projects/:id/scope-drift` | `AI_PROJECT_INSIGHTS` | 12h | Out-of-scope ticket flags |
| `GET` | `/ai/projects/:id/churn-risk` | `AI_PROJECT_INSIGHTS` | 24h | Client churn risk score |
| `GET` | `/ai/projects/:id/status-report` | `AI_PROJECT_REPORTS` / `PROJECT_VIEW` | weekly | AI-written status report |
| `POST` | `/ai/projects/:id/ask` | `AI_PROJECT_QA` | — | RAG Q&A over project history |
| `GET` | `/ai/projects/:id/next-action` | `AI_PROJECT_INSIGHTS` | 6h | Next best action recommendation |
| `GET` | `/ai/projects/knowledge` | `AI_PROJECT_INSIGHTS` | — | Lessons from closed projects |
| `GET` | `/ai/projects/:id/milestone-predictions` | `PROJECT_VIEW` | 6h | Milestone delivery predictions |

---

## A9.9 — End-to-End User Flow Diagrams

### Flow 1: Agent opens a project (Internal Console)

```
Agent navigates to /projects
  → GET /projects (list with health badges)
  → GET /ai/projects/:id/health (per card, parallel)
  → Agent sees grid: project cards with Green/Amber/Red health dot

Agent clicks a project card
  → GET /projects/:id (full detail)
  → GET /ai/projects/:id/health
  → GET /ai/projects/:id/next-action
  → GET /ai/projects/:id/milestone-predictions
  → Frontend: renders KPI strip, next action banner, tab layout

Agent opens AI Intelligence tab
  → GET /ai/projects/:id/clusters
  → GET /ai/projects/:id/scope-drift
  → GET /ai/projects/:id/milestone-predictions (already cached)
  → Frontend: renders cluster cards, scope drift flags, prediction rows
```

### Flow 2: Lead generates status report and sends to client

```
Lead opens project detail → Overview tab
  → GET /ai/projects/:id/status-report (returns cached weekly report)
  → Lead reviews narrative, blockers, next steps in the card
  → Lead clicks "Copy" or sends via email client
  → Client receives professional update with no internal metrics exposed
```

### Flow 3: Client asks a question about their project

```
Client opens /projects/:id → "Ask AI" tab (Customer Portal)
  → Types: "Are we on track for the June 15 UAT milestone?"
  → POST /ai/projects/:id/ask { question: "Are we on track for..." }
  → Backend: embed question → retrieve milestone data + recent tickets + status report
  → LLM generates grounded answer with milestone confidence
  → Frontend: shows answer + confidence bar
  → If cannotAnswer: "Please raise a ticket if you need further clarification"
```

### Flow 4: Lead receives churn warning and acts

```
Nightly job runs → computes churn risk for all active projects
  → PRJ-003 scores 0.79 (high)
  → project_health_cache updated with color: "red"

Lead opens /projects/PRJ-003
  → Health badge: "! Critical — 31/100"
  → Churn Risk sidebar card: HIGH — signals listed
  → Next Action banner: "Escalate to account manager — client unresponsive for 18 days"
  → Lead clicks "View Draft" → sees AI-written escalation email
  → Lead copies draft, edits, sends to account manager
```

---

*Addendum A9 generated from the Meridian 3SC Platform frontend codebase — AI-Native Projects feature layer. Last updated: 2026-04-17.*

---

---

## 19. Escalations

> **Permission gate:** `ESCALATION_VIEW` to read. `TICKET_ASSIGN` to assign. `TICKET_STATUS_CHANGE` to resolve.
> AGENT sees only escalations on tickets assigned to them. LEAD + ADMIN see all.

### 19.1 List Escalated Tickets

```
GET /api/v1/escalations
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically by frontend |
| `page` | integer | No | Default: 1 |
| `page_size` | integer | No | Default: 25, max: 100 |
| `severity` | string | No | Filter by severity: `CRITICAL`, `HIGH`, `MEDIUM` |
| `assigned_to` | UUID | No | Filter by assignee agent ID |
| `unassigned_only` | boolean | No | If true, return only unassigned escalations |
| `sort_by` | string | No | `time_in_escalation` (default), `severity`, `created_at` |
| `sort_order` | string | No | `asc` \| `desc` (default: `desc`) |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "ticketId": "uuid",
      "ticketNumber": "TKT-026",
      "title": "Workflow freeze on approve",
      "clientName": "Acme Corp",
      "clientId": "uuid",
      "severity": "HIGH",
      "escalatedBy": "Nikita K.",
      "escalatedByUserId": "uuid",
      "reason": "SLA breach imminent",
      "timeInEscalationMinutes": 102,
      "assignedTo": null,
      "assigneeName": null,
      "slaState": "at_risk",
      "created_at": "2026-04-17T08:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 25,
  "total": 4,
  "total_pages": 1,
  "meta": {
    "unassignedCount": 1,
    "breachedCount": 2,
    "atRiskCount": 2
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `ESCALATION_FORBIDDEN` | 403 | Caller lacks `ESCALATION_VIEW` |

---

### 19.2 Get Single Escalation Detail

```
GET /api/v1/escalations/:ticketId
```

**Path Params:** `ticketId` — UUID of the ticket

**Response `200 OK`:**
```json
{
  "data": {
    "ticketId": "uuid",
    "ticketNumber": "TKT-026",
    "title": "Workflow freeze on approve",
    "description": "Full ticket description...",
    "clientName": "Acme Corp",
    "clientId": "uuid",
    "severity": "HIGH",
    "escalatedBy": "Nikita K.",
    "escalatedByUserId": "uuid",
    "reason": "SLA breach imminent",
    "timeInEscalationMinutes": 102,
    "assignedTo": null,
    "assigneeName": null,
    "slaState": "at_risk",
    "sla": {
      "responseDeadline": "2026-04-17T10:00:00Z",
      "resolutionDeadline": "2026-04-17T18:00:00Z",
      "responseState": "met",
      "resolutionState": "at_risk",
      "responseMet": true,
      "resolutionMet": false
    },
    "availableAgents": [
      { "id": "uuid", "displayName": "Ravi M.", "currentLoad": 4 },
      { "id": "uuid", "displayName": "Priya S.", "currentLoad": 2 }
    ],
    "created_at": "2026-04-17T08:30:00Z"
  }
}
```

---

### 19.3 Assign Escalated Ticket

```
POST /api/v1/escalations/:ticketId/assign
```

**Permission:** `TICKET_ASSIGN`

**Request Body:**
```json
{
  "agentId": "uuid"
}
```

**Validation:**
- `agentId` — required, must be a valid active AGENT/LEAD user

**Response `200 OK`:**
```json
{
  "data": {
    "ticketId": "uuid",
    "assignedTo": "uuid",
    "assigneeName": "Ravi M.",
    "message": "Ticket TKT-026 assigned to Ravi M."
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `ESCALATION_ASSIGN_FORBIDDEN` | 403 | Caller lacks `TICKET_ASSIGN` |
| `AGENT_NOT_FOUND` | 404 | `agentId` does not match an active agent |
| `TICKET_NOT_ESCALATED` | 422 | Ticket is not in escalated state |

---

### 19.4 Batch Assign (Assign All Unassigned)

```
POST /api/v1/escalations/batch-assign
```

**Permission:** `TICKET_ASSIGN`

**Request Body:**
```json
{
  "agentId": "uuid",
  "ticketIds": ["uuid1", "uuid2"]
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "assigned": 2,
    "failed": 0,
    "results": [
      { "ticketId": "uuid1", "success": true },
      { "ticketId": "uuid2", "success": true }
    ]
  }
}
```

---

### 19.5 Resolve Escalation

```
POST /api/v1/escalations/:ticketId/resolve
```

**Permission:** `TICKET_STATUS_CHANGE`

**Request Body:**
```json
{
  "resolution": "Optional resolution note visible in ticket timeline"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "ticketId": "uuid",
    "status": "RESOLVED",
    "resolvedAt": "2026-04-17T14:30:00Z"
  }
}
```

---

### 19.6 Escalation Summary (Dashboard Widget)

```
GET /api/v1/escalations/summary
```

**Permission:** `ESCALATION_VIEW`

**Response `200 OK`:**
```json
{
  "data": {
    "total": 4,
    "unassigned": 1,
    "breached": 2,
    "atRisk": 2,
    "avgTimeInEscalationMinutes": 215,
    "byClient": [
      { "clientName": "Acme Corp", "count": 2 },
      { "clientName": "Beta Ltd", "count": 2 }
    ]
  }
}
```

---

---

## 20. SLA Policies

> **Permission gate:** `SLA_VIEW` to read. `SLA_CONFIGURE` to create/update/delete.
> Policies can be global (no `organizationId`) or per-org overrides.

### 20.1 List SLA Policies

```
GET /api/v1/sla-policies
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `organization_id` | UUID | No | Filter to a specific org's override; omit for global |
| `include_global` | boolean | No | Default: true — include the global default policy |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Standard SLA",
      "description": "Default policy for all organisations",
      "isDefault": true,
      "organizationId": null,
      "priorities": {
        "CRITICAL": { "responseHours": 2, "resolutionHours": 8 },
        "HIGH":     { "responseHours": 8, "resolutionHours": 48 },
        "MEDIUM":   { "responseHours": 24, "resolutionHours": 120 },
        "LOW":      { "responseHours": 48, "resolutionHours": 240 }
      },
      "escalationRules": {
        "autoEscalateAtPercent": 80,
        "notifyAdminAtPercent": 60,
        "s1ReAlertIntervalMinutes": 30
      },
      "businessHours": {
        "startTime": "09:00",
        "endTime": "18:00",
        "timezone": "Asia/Kolkata",
        "pauseOnWeekends": false
      },
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-04-10T12:00:00Z"
    }
  ]
}
```

---

### 20.2 Get SLA Policy by ID

```
GET /api/v1/sla-policies/:id
```

**Response `200 OK`:** Full `SLAPolicy` object (same shape as list item above).

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `SLA_POLICY_NOT_FOUND` | 404 | Policy ID not found |

---

### 20.3 Create SLA Policy

```
POST /api/v1/sla-policies
```

**Permission:** `SLA_CONFIGURE`

**Request Body:**
```json
{
  "name": "Enterprise SLA",
  "description": "Higher-tier SLA for enterprise clients",
  "organizationId": "uuid-or-null",
  "priorities": {
    "CRITICAL": { "responseHours": 1, "resolutionHours": 4 },
    "HIGH":     { "responseHours": 4, "resolutionHours": 24 },
    "MEDIUM":   { "responseHours": 12, "resolutionHours": 72 },
    "LOW":      { "responseHours": 24, "resolutionHours": 120 }
  },
  "escalationRules": {
    "autoEscalateAtPercent": 75,
    "notifyAdminAtPercent": 50,
    "s1ReAlertIntervalMinutes": 15
  },
  "businessHours": {
    "startTime": "08:00",
    "endTime": "20:00",
    "timezone": "Asia/Kolkata",
    "pauseOnWeekends": false
  }
}
```

**Validation:**
- `name` — required, max 100 chars
- `priorities` — all four priority levels required
- `responseHours` — required, positive integer, > 0
- `resolutionHours` — required, must be > `responseHours` for same priority
- `autoEscalateAtPercent` — 1–100
- `notifyAdminAtPercent` — 1–100, must be ≤ `autoEscalateAtPercent`
- `s1ReAlertIntervalMinutes` — positive integer, min 5
- `startTime` / `endTime` — `HH:mm` format, `endTime` must be after `startTime`
- `timezone` — valid IANA timezone string

**Response `201 Created`:** Full `SLAPolicy` object.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `SLA_CONFIGURE_FORBIDDEN` | 403 | Caller lacks `SLA_CONFIGURE` |
| `SLA_RESOLUTION_BEFORE_RESPONSE` | 422 | resolutionHours ≤ responseHours for a priority |
| `INVALID_TIMEZONE` | 422 | Timezone string not recognised |

---

### 20.4 Update SLA Policy

```
PATCH /api/v1/sla-policies/:id
```

**Permission:** `SLA_CONFIGURE`

**Request Body:** Partial `SLAPolicyUpdatePayload` — any combination of `name`, `description`, `priorities`, `escalationRules`, `businessHours`. Unspecified fields are left unchanged.

**Response `200 OK`:** Updated full `SLAPolicy` object.

---

### 20.5 Delete SLA Policy

```
DELETE /api/v1/sla-policies/:id
```

**Permission:** `SLA_CONFIGURE`

**Constraints:**
- Cannot delete the `isDefault: true` global policy.
- Cannot delete a policy currently referenced by any active ticket.

**Response `204 No Content`**

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `SLA_POLICY_IN_USE` | 422 | Policy is referenced by active tickets |
| `SLA_POLICY_DEFAULT_DELETE` | 422 | Cannot delete the system default policy |

---

### 20.6 Preview SLA Impact

```
POST /api/v1/sla-policies/:id/preview
```

**Permission:** `SLA_CONFIGURE`

Returns a count of currently open tickets that would change SLA state if the policy were applied.

**Request Body:**
```json
{
  "priorities": {
    "CRITICAL": { "responseHours": 1, "resolutionHours": 4 }
  }
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "totalAffectedTickets": 12,
    "wouldBreach": 3,
    "wouldBeAtRisk": 5,
    "wouldImprove": 4,
    "details": [
      { "ticketId": "uuid", "ticketNumber": "TKT-011", "currentState": "on_track", "newState": "breached" }
    ]
  }
}
```

---

### 20.7 Assign Policy to Organization

```
PUT /api/v1/organizations/:orgId/sla-policy
```

**Permission:** `SLA_CONFIGURE`

**Request Body:**
```json
{
  "policyId": "uuid"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "organizationId": "uuid",
    "policyId": "uuid",
    "policyName": "Enterprise SLA"
  }
}
```

---

---

## 21. System Settings

> **Permission gate:** `SYSTEM_CONFIGURE` (ADMIN only) for all write operations.
> `SYSTEM_CONFIGURE` also required for reads — this data is not exposed to non-admins.
>
> **Security note:** `aiApiKey` is write-only. It is never returned in GET responses.
> The GET response will include an `aiApiKeySet: boolean` field instead.

### 21.1 Get System Settings

```
GET /api/v1/system/settings
```

**Permission:** `SYSTEM_CONFIGURE`

**Response `200 OK`:**
```json
{
  "data": {
    "notifications": {
      "emailOnSLABreach": true,
      "slackIntegrationEnabled": true,
      "slackChannel": "#support-alerts",
      "dailyDigestEnabled": false,
      "dailyDigestTime": "09:00",
      "clientStatusNotifications": true
    },
    "aiFeatures": {
      "triageAgentEnabled": true,
      "similarTicketSuggestionsEnabled": true,
      "kbDeflectionEnabled": true,
      "autoGenerateKBArticlesEnabled": false,
      "weeklyProjectSummariesEnabled": true,
      "aiProvider": "anthropic",
      "aiModelName": "claude-sonnet-4-6",
      "aiApiKeySet": true,
      "aiBaseUrl": null
    },
    "access": {
      "ssoEnabled": false,
      "twoFactorRequired": false,
      "auditLoggingEnabled": true,
      "ipAllowlistEnabled": false,
      "ipAllowlist": []
    },
    "updated_at": "2026-04-10T12:00:00Z",
    "updatedBy": "uuid"
  }
}
```

---

### 21.2 Update System Settings

```
PATCH /api/v1/system/settings
```

**Permission:** `SYSTEM_CONFIGURE`

**Request Body:** Partial `SystemSettingsUpdatePayload` — any combination of sections. Unspecified sections are left unchanged.

```json
{
  "notifications": {
    "slackIntegrationEnabled": true,
    "slackChannel": "#support-escalations"
  },
  "aiFeatures": {
    "triageAgentEnabled": false
  }
}
```

**Validation:**
- `slackChannel` — must start with `#`, max 80 chars
- `dailyDigestTime` — `HH:mm` format
- `aiProvider` — one of `anthropic`, `openai`, `custom`
- `aiModelName` — max 100 chars
- `aiApiKey` — write-only, stored encrypted, never returned; min 20 chars
- `aiBaseUrl` — valid URL, required only when `aiProvider` is `custom`
- `ipAllowlist` — array of valid IPv4/IPv6 addresses or CIDR blocks

**Response `200 OK`:** Full `SystemSettings` object (with `aiApiKeySet` boolean, never the key itself).

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `SYSTEM_CONFIGURE_FORBIDDEN` | 403 | Caller lacks `SYSTEM_CONFIGURE` |
| `INVALID_SLACK_CHANNEL` | 422 | Channel name format invalid |
| `INVALID_AI_BASE_URL` | 422 | Base URL not a valid URL |
| `INVALID_IP_CIDR` | 422 | One or more IPs in allowlist invalid |

---

### 21.3 Test AI Provider Connection

```
POST /api/v1/system/settings/ai/test
```

**Permission:** `SYSTEM_CONFIGURE`

Sends a minimal test prompt to the configured AI provider and returns success/failure.

**Request Body:**
```json
{}
```
_(Uses the currently saved AI configuration — no body required.)_

**Response `200 OK`:**
```json
{
  "data": {
    "success": true,
    "provider": "anthropic",
    "modelName": "claude-sonnet-4-6",
    "latencyMs": 312,
    "message": "Connection successful"
  }
}
```

**Response `200 OK` (connection failed):**
```json
{
  "data": {
    "success": false,
    "provider": "anthropic",
    "modelName": "claude-sonnet-4-6",
    "latencyMs": null,
    "message": "Authentication failed — check your API key",
    "errorCode": "INVALID_API_KEY"
  }
}
```

---

### 21.4 Export All Data (Danger Zone)

```
POST /api/v1/system/export
```

**Permission:** `SYSTEM_CONFIGURE`

Triggers an asynchronous data export. Returns a job ID to poll for completion.

**Request Body:**
```json
{
  "format": "csv",
  "scope": ["tickets", "comments", "users", "organizations", "audit_logs"],
  "tenant_id": "uuid-or-null"
}
```

**Validation:**
- `format` — `csv` or `json`
- `scope` — array of one or more: `tickets`, `comments`, `users`, `organizations`, `audit_logs`, `kb_articles`
- `tenant_id` — optional; null exports all tenants

**Response `202 Accepted`:**
```json
{
  "data": {
    "jobId": "export-uuid",
    "status": "queued",
    "estimatedMinutes": 5,
    "downloadUrl": null
  }
}
```

---

### 21.5 Get Export Job Status

```
GET /api/v1/system/export/:jobId
```

**Permission:** `SYSTEM_CONFIGURE`

**Response `200 OK`:**
```json
{
  "data": {
    "jobId": "export-uuid",
    "status": "completed",
    "downloadUrl": "https://storage.example.com/exports/export-uuid.zip?sig=...",
    "expiresAt": "2026-04-18T14:00:00Z",
    "fileSizeBytes": 2048000
  }
}
```

`status` values: `queued`, `in_progress`, `completed`, `failed`

---

### 21.6 Reset Demo Data (Danger Zone)

```
POST /api/v1/system/reset-demo
```

**Permission:** `SYSTEM_CONFIGURE`

Restores the demo tenant to its seed state. Only valid for tenants flagged as `is_demo: true`.

**Request Body:**
```json
{
  "tenant_id": "uuid",
  "confirm": true
}
```

**Validation:**
- `confirm` — must be `true`
- Tenant must have `is_demo: true` in the database

**Response `200 OK`:**
```json
{
  "data": {
    "resetAt": "2026-04-18T10:00:00Z",
    "message": "Demo data restored to seed state"
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `NOT_DEMO_TENANT` | 422 | Target tenant is not flagged as a demo |
| `CONFIRM_REQUIRED` | 422 | `confirm` field not set to true |

---

### 21.7 Purge Closed Tickets (Danger Zone)

```
POST /api/v1/system/purge-tickets
```

**Permission:** `SYSTEM_CONFIGURE`

Permanently deletes tickets with `status: CLOSED` older than the specified threshold.

**Request Body:**
```json
{
  "olderThanDays": 90,
  "tenant_id": "uuid-or-null",
  "confirm": true
}
```

**Validation:**
- `olderThanDays` — integer, min 30
- `confirm` — must be `true`

**Response `200 OK`:**
```json
{
  "data": {
    "purgedCount": 142,
    "purgedAt": "2026-04-18T10:05:00Z",
    "freedStorageBytes": 51200000
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `PURGE_MIN_DAYS` | 422 | `olderThanDays` less than 30 |
| `CONFIRM_REQUIRED` | 422 | `confirm` not true |

---

---

## 22. Routing Rules (Extended)

> Extends the existing Section 14 with full CRUD, drag-sort, and simulation.
> **Permission:** `ROUTING_VIEW` to read. `ESCALATION_CONFIGURE` to create/update/delete/simulate.

### 22.1 List Routing Rules

```
GET /api/v1/routing-rules
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `is_active` | boolean | No | Filter by active/inactive |
| `page` | integer | No | Default: 1 |
| `page_size` | integer | No | Default: 50 |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Critical to Senior SPOC",
      "description": "Route all critical tickets directly to senior agents",
      "conditions": [
        { "field": "priority", "operator": "equals", "value": "CRITICAL" }
      ],
      "assignTo": "uuid",
      "assignToName": "Ravi M.",
      "priority": 1,
      "isActive": true,
      "matchCount": 42,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-04-10T08:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 8,
  "total_pages": 1
}
```

---

### 22.2 Get Routing Rule

```
GET /api/v1/routing-rules/:id
```

**Response `200 OK`:** Full routing rule object.

---

### 22.3 Create Routing Rule

```
POST /api/v1/routing-rules
```

**Permission:** `ESCALATION_CONFIGURE`

**Request Body:**
```json
{
  "name": "DS Module to Priya",
  "description": "All DS module tickets go to Priya",
  "conditions": [
    { "field": "module", "operator": "equals", "value": "DS" },
    { "field": "priority", "operator": "in", "value": ["CRITICAL", "HIGH"] }
  ],
  "assignTo": "uuid",
  "isActive": true
}
```

**Condition fields:**

| Field | Operators | Value type |
|---|---|---|
| `priority` | `equals`, `in`, `not_in` | TicketPriority or array |
| `category` | `equals`, `in`, `not_in` | TicketCategory or array |
| `module` | `equals`, `contains`, `in` | string or array |
| `organization_id` | `equals`, `in` | UUID or array |
| `tags` | `contains` | string |
| `keyword` | `contains` | string — matches title/description |

**Validation:**
- `name` — required, max 100 chars
- `conditions` — min 1 condition, max 10 conditions per rule
- `assignTo` — required UUID of an active AGENT/LEAD user
- Rule `priority` is auto-assigned as `max(existing) + 1`

**Response `201 Created`:** Full routing rule.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `ROUTING_CONFIGURE_FORBIDDEN` | 403 | Lacks `ESCALATION_CONFIGURE` |
| `AGENT_NOT_FOUND` | 404 | `assignTo` agent not found |
| `ROUTING_CONDITION_INVALID` | 422 | Condition field/operator combination invalid |
| `ROUTING_MAX_CONDITIONS` | 422 | More than 10 conditions |

---

### 22.4 Update Routing Rule

```
PATCH /api/v1/routing-rules/:id
```

**Permission:** `ESCALATION_CONFIGURE`

**Request Body:** Partial — any combination of `name`, `description`, `conditions`, `assignTo`, `isActive`.

**Response `200 OK`:** Full updated routing rule.

---

### 22.5 Delete Routing Rule

```
DELETE /api/v1/routing-rules/:id
```

**Permission:** `ESCALATION_CONFIGURE`

**Response `204 No Content`**

---

### 22.6 Reorder Routing Rules (Drag Priority)

```
PUT /api/v1/routing-rules/reorder
```

**Permission:** `ESCALATION_CONFIGURE`

**Request Body:**
```json
{
  "orderedIds": ["uuid3", "uuid1", "uuid4", "uuid2"]
}
```

The backend reassigns `priority` values 1..N to match the given order.

**Validation:**
- `orderedIds` — must contain all existing routing rule IDs for the tenant (no partial reorders)

**Response `200 OK`:**
```json
{
  "data": {
    "reordered": 4,
    "message": "Routing rule priority order updated"
  }
}
```

---

### 22.7 Simulate Routing Rule

```
POST /api/v1/routing-rules/simulate
```

**Permission:** `ESCALATION_CONFIGURE`

Tests what rule(s) would match a hypothetical ticket, without creating it.

**Request Body:**
```json
{
  "priority": "CRITICAL",
  "category": "BUG",
  "module": "DS",
  "organization_id": "uuid",
  "tags": ["urgent", "prod-down"],
  "title": "API timeout causing data loss",
  "description": "Optional description text for keyword matching"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "matchedRule": {
      "id": "uuid",
      "name": "Critical to Senior SPOC",
      "priority": 1
    },
    "assignedTo": {
      "id": "uuid",
      "displayName": "Ravi M."
    },
    "evaluatedRules": [
      { "id": "uuid1", "name": "Critical to Senior SPOC", "matched": true,  "priority": 1 },
      { "id": "uuid2", "name": "DS Module to Priya",       "matched": true,  "priority": 2 },
      { "id": "uuid3", "name": "Billing to Finance",       "matched": false, "priority": 3 }
    ],
    "note": "First matching rule wins. Rule priority 1 applied."
  }
}
```

---

---

## 23. Branding

> **Permission gate:** `BRANDING_CONFIGURE` for write operations.
> GET branding for the caller's own org requires only authentication (used at portal load time).
> ADMIN can read/write branding for any org.

### 23.1 Get Organization Branding

```
GET /api/v1/organizations/:orgId/branding
```

**Auth:** Any authenticated user whose `tenant_id` matches `orgId`. ADMIN can access any org.

**Response `200 OK`:**
```json
{
  "data": {
    "organizationId": "uuid",
    "logoUrl": "https://cdn.example.com/logos/acme-logo.png",
    "faviconUrl": "https://cdn.example.com/favicons/acme-fav.ico",
    "portalDisplayName": "Acme Support Portal",
    "primaryColor": "#6366f1",
    "accentColor": "#818cf8",
    "customCssUrl": null,
    "updated_at": "2026-04-10T08:00:00Z"
  }
}
```

If branding has not been configured, all fields are null and defaults are used:
```json
{
  "data": {
    "organizationId": "uuid",
    "logoUrl": null,
    "faviconUrl": null,
    "portalDisplayName": "Support Portal",
    "primaryColor": "#6366f1",
    "accentColor": null,
    "customCssUrl": null,
    "updated_at": null
  }
}
```

---

### 23.2 Update Organization Branding

```
PATCH /api/v1/organizations/:orgId/branding
```

**Permission:** `BRANDING_CONFIGURE` — CLIENT_ADMIN may only update their own org; ADMIN may update any.

**Request Body:**
```json
{
  "portalDisplayName": "Acme Support Hub",
  "primaryColor": "#0ea5e9",
  "accentColor": "#38bdf8"
}
```

**Validation:**
- `portalDisplayName` — max 80 chars
- `primaryColor` — valid 6-digit hex `#RRGGBB`
- `accentColor` — valid 6-digit hex `#RRGGBB`
- `logoUrl` — valid HTTPS URL, max 512 chars (use presigned upload endpoint to get URL first)
- `faviconUrl` — valid HTTPS URL, max 512 chars
- `customCssUrl` — valid HTTPS URL, max 512 chars (ADMIN only — rejected for CLIENT_ADMIN)

**Response `200 OK`:** Full `OrgBranding` object.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `BRANDING_FORBIDDEN` | 403 | Lacks `BRANDING_CONFIGURE` |
| `BRANDING_CROSS_ORG` | 403 | CLIENT_ADMIN attempting to modify another org's branding |
| `INVALID_HEX_COLOR` | 422 | Color value is not a valid hex |
| `CUSTOM_CSS_ADMIN_ONLY` | 403 | `customCssUrl` attempted by non-ADMIN |

---

### 23.3 Upload Branding Logo

```
POST /api/v1/organizations/:orgId/branding/logo-upload
```

**Permission:** `BRANDING_CONFIGURE`

Returns a presigned S3 URL to upload the logo directly from the browser.

**Request Body:**
```json
{
  "fileName": "acme-logo.png",
  "fileType": "image/png",
  "fileSizeBytes": 48000
}
```

**Validation:**
- `fileType` — one of `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`
- `fileSizeBytes` — max 2MB (2,097,152 bytes)

**Response `200 OK`:**
```json
{
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/logos/acme-uuid.png?sig=...",
    "fileKey": "logos/acme-uuid.png",
    "publicUrl": "https://cdn.example.com/logos/acme-uuid.png",
    "expiresAt": "2026-04-18T10:15:00Z"
  }
}
```

After uploading to `uploadUrl`, call `PATCH /branding` with `logoUrl: publicUrl`.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `LOGO_FILE_TOO_LARGE` | 422 | File exceeds 2MB |
| `LOGO_INVALID_TYPE` | 422 | File type not allowed |

---

---

## 24. Compliance

> **Permission gate:** `COMPLIANCE_VIEW` (ADMIN only).

### 24.1 Get Compliance Overview

```
GET /api/v1/compliance/overview
```

**Permission:** `COMPLIANCE_VIEW`

**Response `200 OK`:**
```json
{
  "data": {
    "dataRetentionPolicy": {
      "closedTicketRetentionDays": 90,
      "auditLogRetentionDays": 365,
      "attachmentRetentionDays": 180
    },
    "slaComplianceSummary": {
      "period": "2026-03-01 to 2026-03-31",
      "totalTickets": 284,
      "slaMetCount": 261,
      "slaBreachedCount": 23,
      "compliancePercent": 91.9
    },
    "pendingGDPRRequests": 2,
    "lastAuditExportAt": "2026-03-31T23:00:00Z",
    "nextScheduledPurge": "2026-04-25T02:00:00Z"
  }
}
```

---

### 24.2 Get / Update Data Retention Policy

```
GET /api/v1/compliance/data-retention
```

**Permission:** `COMPLIANCE_VIEW`

**Response `200 OK`:**
```json
{
  "data": {
    "closedTicketRetentionDays": 90,
    "auditLogRetentionDays": 365,
    "attachmentRetentionDays": 180
  }
}
```

```
PATCH /api/v1/compliance/data-retention
```

**Permission:** `COMPLIANCE_VIEW`

**Request Body:**
```json
{
  "closedTicketRetentionDays": 180,
  "auditLogRetentionDays": 730
}
```

**Validation:**
- `closedTicketRetentionDays` — integer, min 30, max 3650
- `auditLogRetentionDays` — integer, min 90, max 3650
- `attachmentRetentionDays` — integer, min 30, max 3650

**Response `200 OK`:** Updated policy object.

---

### 24.3 List GDPR Erasure Requests

```
GET /api/v1/compliance/gdpr-erasure
```

**Permission:** `COMPLIANCE_VIEW`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | `pending` \| `in_progress` \| `completed` \| `rejected` |
| `page` | integer | Default: 1 |
| `page_size` | integer | Default: 25 |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "requestedBy": "uuid",
      "targetUserId": "uuid",
      "targetEmail": "user@example.com",
      "status": "pending",
      "requestedAt": "2026-04-15T10:00:00Z",
      "completedAt": null,
      "notes": null
    }
  ],
  "page": 1,
  "page_size": 25,
  "total": 2,
  "total_pages": 1
}
```

---

### 24.4 Create GDPR Erasure Request

```
POST /api/v1/compliance/gdpr-erasure
```

**Permission:** `COMPLIANCE_VIEW`

**Request Body:**
```json
{
  "targetEmail": "user@example.com",
  "notes": "User submitted erasure request via support email on 2026-04-15"
}
```

**Validation:**
- `targetEmail` — valid email format, must match an existing user

**Response `201 Created`:** Full `GDPRErasureRequest` object.

---

### 24.5 Process GDPR Erasure Request

```
PATCH /api/v1/compliance/gdpr-erasure/:id
```

**Permission:** `COMPLIANCE_VIEW`

**Request Body:**
```json
{
  "status": "completed",
  "notes": "User data anonymised — tickets pseudonymised, PII removed from profile"
}
```

**Validation:**
- `status` — `in_progress`, `completed`, or `rejected`

**Response `200 OK`:** Updated `GDPRErasureRequest` object.

---

### 24.6 Download SLA Compliance Report

```
GET /api/v1/compliance/sla-report
```

**Permission:** `COMPLIANCE_VIEW`

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `date_from` | ISO8601 date | Yes | Report period start (date only, e.g. `2026-03-01`) |
| `date_to` | ISO8601 date | Yes | Report period end |
| `organization_id` | UUID | No | Filter to one org; omit for all |
| `format` | string | No | `json` (default) or `csv` |

**Response `200 OK` (json):**
```json
{
  "data": {
    "period": "2026-03-01 to 2026-03-31",
    "generatedAt": "2026-04-18T10:00:00Z",
    "summary": {
      "totalTickets": 284,
      "slaMetCount": 261,
      "slaBreachedCount": 23,
      "compliancePercent": 91.9
    },
    "byPriority": [
      { "priority": "CRITICAL", "total": 12, "met": 11, "breached": 1, "percent": 91.7 },
      { "priority": "HIGH",     "total": 48, "met": 44, "breached": 4, "percent": 91.7 },
      { "priority": "MEDIUM",   "total": 156, "met": 144, "breached": 12, "percent": 92.3 },
      { "priority": "LOW",      "total": 68, "met": 62, "breached": 6,  "percent": 91.2 }
    ],
    "byOrganization": [
      { "orgId": "uuid", "orgName": "Acme Corp", "total": 84, "met": 79, "percent": 94.1 }
    ],
    "breachedTickets": [
      {
        "ticketId": "uuid",
        "ticketNumber": "TKT-011",
        "priority": "CRITICAL",
        "breachType": "resolution",
        "breachDurationMinutes": 45,
        "orgName": "Acme Corp"
      }
    ]
  }
}
```

**Response `200 OK` (csv):** `Content-Type: text/csv` with `Content-Disposition: attachment; filename="sla-compliance-report.csv"`

---

---

## 25. User Preferences

> Each user can store personal appearance preferences.
> These are scoped to the individual user, not the org or tenant.

### 25.1 Get User Preferences

```
GET /api/v1/users/me/preferences
```

**Auth:** Any authenticated user (own preferences only).

**Response `200 OK`:**
```json
{
  "data": {
    "accentColor": "cobalt",
    "colorMode": "dark"
  }
}
```

Default if not yet set: `{ "accentColor": "cobalt", "colorMode": "system" }`

---

### 25.2 Update User Preferences

```
PATCH /api/v1/users/me/preferences
```

**Auth:** Any authenticated user.

**Request Body:**
```json
{
  "accentColor": "rose",
  "colorMode": "dark"
}
```

**Validation:**
- `accentColor` — one of `cobalt`, `emerald`, `violet`, `rose`, `amber`, `slate`
- `colorMode` — one of `light`, `dark`, `system`

**Response `200 OK`:**
```json
{
  "data": {
    "accentColor": "rose",
    "colorMode": "dark"
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `INVALID_ACCENT_COLOR` | 422 | Accent color not in allowed list |
| `INVALID_COLOR_MODE` | 422 | Color mode not in allowed list |

---

---

## 26. Analytics (Extended)

> Extends the existing Section 12 with additional chart endpoints used by the new 4-chart analytics page in both portals.
> **Permission:** `REPORT_VIEW` for all endpoints. CLIENT_ADMIN scoped to own org; LEAD/ADMIN see all tenants.

### 26.1 Tickets by Month

```
GET /api/v1/analytics/tickets-by-month
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `months` | integer | No | Number of months to return, default: 8, max: 24 |
| `organization_id` | UUID | No | ADMIN/LEAD only — filter to one org |

**Response `200 OK`:**
```json
{
  "data": [
    { "month": "2025-09", "label": "Sep", "created": 3, "resolved": 2, "closed": 1 },
    { "month": "2025-10", "label": "Oct", "created": 5, "resolved": 4, "closed": 3 },
    { "month": "2025-11", "label": "Nov", "created": 4, "resolved": 5, "closed": 2 },
    { "month": "2025-12", "label": "Dec", "created": 7, "resolved": 4, "closed": 3 },
    { "month": "2026-01", "label": "Jan", "created": 3, "resolved": 6, "closed": 4 },
    { "month": "2026-02", "label": "Feb", "created": 2, "resolved": 2, "closed": 2 },
    { "month": "2026-03", "label": "Mar", "created": 2, "resolved": 1, "closed": 1 },
    { "month": "2026-04", "label": "Apr", "created": 1, "resolved": 0, "closed": 0 }
  ]
}
```

---

### 26.2 Category Breakdown

```
GET /api/v1/analytics/category-breakdown
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `date_from` | ISO8601 | No | Default: 90 days ago |
| `date_to` | ISO8601 | No | Default: now |
| `organization_id` | UUID | No | ADMIN/LEAD only |

**Response `200 OK`:**
```json
{
  "data": [
    { "category": "SUPPORT",         "label": "Environment issue", "count": 94,  "percent": 33.1 },
    { "category": "BUG",             "label": "Bug / Code defect", "count": 71,  "percent": 25.0 },
    { "category": "QUESTION",        "label": "Config gap",        "count": 57,  "percent": 20.1 },
    { "category": "FEATURE_REQUEST", "label": "Other",             "count": 62,  "percent": 21.8 }
  ]
}
```

---

### 26.3 Severity Distribution

```
GET /api/v1/analytics/severity-distribution
```

**Query Parameters:** Same as category-breakdown.

**Response `200 OK`:**
```json
{
  "data": [
    { "severity": "CRITICAL", "label": "S1", "count": 8,  "color": "#ef4444" },
    { "severity": "HIGH",     "label": "S2", "count": 6,  "color": "#f59e0b" },
    { "severity": "MEDIUM",   "label": "S3", "count": 3,  "color": "#22c55e" },
    { "severity": "LOW",      "label": "S4", "count": 1,  "color": "#94a3b8" }
  ]
}
```

---

### 26.4 Average Resolution Time by Month

```
GET /api/v1/analytics/avg-resolution-time
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `months` | integer | No | Default: 4, max: 12 |
| `organization_id` | UUID | No | ADMIN/LEAD only |
| `unit` | string | No | `hours` (default) or `days` |

**Response `200 OK`:**
```json
{
  "data": [
    { "month": "2025-10", "label": "Oct", "avgResolutionTime": 1.7, "unit": "days" },
    { "month": "2025-11", "label": "Nov", "avgResolutionTime": 2.1, "unit": "days" },
    { "month": "2025-12", "label": "Dec", "avgResolutionTime": 3.4, "unit": "days" },
    { "month": "2026-01", "label": "Jan", "avgResolutionTime": 3.2, "unit": "days" }
  ]
}
```

---

### 26.5 Analytics Summary (for date-range picker)

```
GET /api/v1/analytics/summary
```

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Injected automatically |
| `date_from` | ISO8601 | Yes | Period start |
| `date_to` | ISO8601 | Yes | Period end |
| `organization_id` | UUID | No | ADMIN/LEAD only |

**Response `200 OK`:**
```json
{
  "data": {
    "period": { "from": "2026-03-01", "to": "2026-03-31" },
    "totalCreated": 48,
    "totalResolved": 44,
    "totalClosed": 38,
    "avgResolutionDays": 2.8,
    "slaCompliancePercent": 91.9,
    "topCategory": { "category": "SUPPORT", "count": 18 },
    "changeVsPrevPeriod": {
      "created": +12,
      "resolved": +8,
      "slaCompliance": -1.2
    }
  }
}
```

---

### 26.6 Export Analytics Report

```
POST /api/v1/analytics/export
```

**Permission:** `REPORT_EXPORT`

**Request Body:**
```json
{
  "date_from": "2026-03-01",
  "date_to": "2026-03-31",
  "organization_id": null,
  "format": "csv",
  "include": ["tickets_by_month", "category_breakdown", "severity_distribution", "avg_resolution_time"]
}
```

**Validation:**
- `format` — `csv` or `pdf`
- `include` — array of one or more chart keys
- `date_from` / `date_to` — required, `date_to` after `date_from`

**Response `200 OK`:** File download or `{ "data": { "downloadUrl": "..." } }` depending on format.

---

### 26.7 Agent Performance Table

```
GET /api/v1/analytics/agent-performance
```

**Permission:** `REPORT_VIEW` — LEAD/ADMIN only (CLIENT_ADMIN cannot see internal agent stats)

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `date_from` | ISO8601 | Yes | Period start |
| `date_to` | ISO8601 | Yes | Period end |
| `page` | integer | No | Default: 1 |
| `page_size` | integer | No | Default: 25 |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "agentId": "uuid",
      "agentName": "Ravi M.",
      "ticketsAssigned": 28,
      "ticketsResolved": 26,
      "avgResolutionHours": 14.2,
      "slaCompliance": 0.928,
      "csatScore": 4.6,
      "escalationCount": 1
    }
  ],
  "page": 1,
  "page_size": 25,
  "total": 8,
  "total_pages": 1
}
```

---

*Addendum A10 — Feature expansion: Escalations, SLA Policies, System Settings, Routing (Extended), Branding, Compliance, User Preferences, Analytics (Extended). Last updated: 2026-04-18.*

---

## Addendum A11 — Delivery Board, Onboarding Tracker, Product Roadmap + AI

*Added: 2026-04-19. Revised: 2026-04-19 — full atomic spec with complete request/response schemas, business rules, error codes, and AI implementation context.*

---

### A11.0 — Architecture & Context

This addendum covers **20 new endpoints** across 5 feature domains:

| Domain | Caller | Endpoints |
|---|---|---|
| Delivery Board | Internal Console (LEAD, ADMIN) | CRUD on features + move + delete |
| Onboarding (internal) | Internal Console (LEAD, ADMIN) | List all orgs' onboarding projects, update tasks |
| Onboarding (client) | Customer Portal (CLIENT_ADMIN, CLIENT_USER) | View own onboarding, update CLIENT-owned tasks |
| Product Roadmap | Customer Portal (CLIENT_ADMIN, CLIENT_USER) | View public roadmap, vote, submit requests |
| AI | Both apps | Risk analysis, prioritisation, drafting, health, next action, classify, summarise |

**Multi-tenancy:** All endpoints are tenant-scoped via `tenant_id` (automatically injected by the frontend RTK Query base query). Internal staff (AGENT/LEAD/ADMIN) have cross-tenant read access where their permission allows.

**Shared `DeliveryFeature` object:** The same `delivery_features` table serves both the **internal Delivery Board** (all features) and the **client Roadmap** (only `is_public = true`). The `has_voted` boolean on `GET /roadmap` is computed per-user — join the `feature_votes` table filtered by the requesting user's ID.

**Escalations `GET /escalations/agents`:** This endpoint (new, added with the Escalations page refactor) returns the list of available agents for assignment. The frontend's `AssignDropdown` component populates from this endpoint. **The existing spec §19 does not cover this endpoint — it is added here.**

---

### A11.1 — New & Updated Permissions

These permission values must exist in the backend's permission enum/registry:

| Permission | Description | Roles |
|---|---|---|
| `DELIVERY_VIEW` | Read delivery features board | LEAD, ADMIN |
| `DELIVERY_MANAGE` | Create, edit, move, delete delivery features | ADMIN |
| `ONBOARDING_VIEW` | View all onboarding projects (internal) | LEAD, ADMIN |
| `ONBOARDING_MANAGE` | Update any task status (internal) | LEAD, ADMIN |
| `ROADMAP_VOTE` | Vote/unvote on public roadmap features | CLIENT_ADMIN, CLIENT_USER |
| `ROADMAP_REQUEST` | Submit a new feature request | CLIENT_ADMIN |
| `AI_DIGEST` | AI roadmap summary (client-facing) | CLIENT_ADMIN, CLIENT_USER |
| `AI_PROJECT_INSIGHTS` | AI delivery risk + onboarding health + next action | LEAD, ADMIN |
| `AI_PROJECT_REPORTS` | AI blocker summary + delivery draft + prioritise | LEAD, ADMIN |

---

### A11.2 — Escalations Agent List (Gap in §19)

This endpoint was missing from §19. It is called by `GET /escalations/agents` on the Escalations page to populate the assign-agent dropdown.

#### `GET /api/v1/escalations/agents`

**Auth:** `TICKET_ASSIGN`

**Business rules:**
- Returns active agents for the same tenant.
- `currentLoad` = count of tickets currently in `IN_PROGRESS` status assigned to that agent.
- Used by the `AssignDropdown` component to show workload badges (green ≤2, amber ≤4, red >4).
- ADMIN + LEAD only — agents cannot see this list.

**Query Parameters:** `tenant_id` (auto-injected)

**Response `200 OK`:**
```json
{
  "data": [
    { "id": "USR-002", "displayName": "Priya Sharma",  "currentLoad": 2 },
    { "id": "USR-003", "displayName": "James Okafor",  "currentLoad": 4 },
    { "id": "USR-004", "displayName": "Nina Patel",    "currentLoad": 1 },
    { "id": "USR-005", "displayName": "Arjun Tiwari",  "currentLoad": 3 }
  ]
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `TICKET_ASSIGN` |

---

### A11.3 — Delivery Board

#### Context for AI / Backend Implementation

The Delivery Board is a **Kanban-style view** for 3SC internal staff showing all product features in a pipeline. Features move left-to-right through six statuses: `BACKLOG → PLANNED → IN_DEV → IN_QA → IN_STAGING → RELEASED`. Every feature has an `is_public` flag — when true it appears on the client-facing Product Roadmap. The `upvotes` count is the aggregated total of votes from all client users across all orgs.

---

#### `GET /api/v1/delivery/features`

**Auth:** `DELIVERY_VIEW` (LEAD, ADMIN)

**Business rules:**
- Returns all delivery features for the tenant, across all statuses.
- The client roadmap (`GET /roadmap`) is a filtered subset of this same table where `is_public = true`. Do **not** create a separate table.
- Results ordered by `upvotes DESC` within each status, then `created_at ASC`.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Auto-injected |
| `status` | string | No | One of `BACKLOG`, `PLANNED`, `IN_DEV`, `IN_QA`, `IN_STAGING`, `RELEASED` |
| `quarter` | string | No | e.g. `Q2 2026` — exact match |
| `is_public` | boolean | No | `true` / `false` |
| `category` | string | No | Exact match on category string |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "FEAT-001",
      "title": "SLA Breach Alerts",
      "description": "Real-time notifications when tickets approach or breach SLA thresholds.",
      "status": "RELEASED",
      "assignee": "Priya Sharma",
      "assigneeId": "USR-002",
      "eta": "2026-02-28T00:00:00Z",
      "upvotes": 34,
      "quarter": "Q1 2026",
      "isPublic": true,
      "category": "Notifications",
      "requestedByOrgIds": ["ORG-001", "ORG-003"],
      "created_at": "2025-11-01T00:00:00Z",
      "updated_at": "2026-02-28T00:00:00Z"
    }
  ]
}
```

> `hasVoted` is **not** returned here — it is only computed for `GET /roadmap` (client endpoint). Internal staff do not vote.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `DELIVERY_VIEW` |

---

#### `POST /api/v1/delivery/features`

**Auth:** `DELIVERY_MANAGE` (ADMIN)

**Business rules:**
- Creates a new feature. Default `status` is `BACKLOG` if not provided.
- `upvotes` initialised to `0`.
- `is_public` defaults to `false` if not specified.
- The feature is immediately available in the Delivery Board. It only appears on the client Roadmap once `is_public` is set to `true` (via `PATCH`).

**Request Body:**
```json
{
  "title": "Two-Factor Authentication",
  "description": "TOTP-based 2FA for all users. Optional enforcement per-organisation.",
  "status": "BACKLOG",
  "category": "Security",
  "quarter": "Q3 2026",
  "is_public": false,
  "assignee_id": "USR-002",
  "eta": "2026-09-30T00:00:00Z"
}
```

**Field Validation:**
- `title` — required, 3–200 chars
- `description` — optional, max 2000 chars
- `status` — optional, must be valid `DeliveryStatus` enum value; defaults to `BACKLOG`
- `category` — optional, free-text string (e.g. `"AI"`, `"Security"`)
- `quarter` — optional, format `Q[1-4] YYYY` (e.g. `"Q3 2026"`)
- `is_public` — optional boolean, default `false`
- `assignee_id` — optional, must be valid AGENT/LEAD/ADMIN user ID
- `eta` — optional ISO 8601 datetime

**Response `201 Created`:** Full `DeliveryFeature` object (same schema as GET above).

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `DELIVERY_MANAGE` |
| `VALIDATION_ERROR` | 400 | Missing `title` or invalid field value |
| `ASSIGNEE_NOT_FOUND` | 404 | `assignee_id` not found |

---

#### `PATCH /api/v1/delivery/features/:id`

**Auth:** `DELIVERY_MANAGE` (ADMIN) for full edit; `DELIVERY_VIEW` (LEAD) for status move only.

**Business rules:**
- ADMIN can update any field.
- LEAD can only send `{ "status": "<DeliveryStatus>" }` — any other fields in the body from a LEAD must be rejected with `403 INSUFFICIENT_PERMISSION`.
- Moving a feature from `RELEASED` back to any earlier status is **allowed** (e.g. hotfix scenarios).
- When `is_public` transitions `false → true`, the feature becomes visible on the client Roadmap immediately.
- When `is_public` transitions `true → false`, votes are **preserved** in the DB but hidden from clients. If re-published, votes resume showing.
- Updating `upvotes` directly via this endpoint is **forbidden** — votes are mutated only via `POST /roadmap/features/:id/vote` and `DELETE /roadmap/features/:id/vote`.

**Path Params:** `id` — feature ID (e.g. `FEAT-001`)

**Request Body (ADMIN — any combination of fields):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "IN_DEV",
  "category": "Security",
  "quarter": "Q3 2026",
  "is_public": true,
  "assignee_id": "USR-003",
  "eta": "2026-09-30T00:00:00Z"
}
```

**Request Body (LEAD — status move only):**
```json
{ "status": "IN_QA" }
```

**Response `200 OK`:** Full updated `DeliveryFeature` object.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Lacks `DELIVERY_VIEW` or LEAD trying to update non-status field |
| `NOT_FOUND` | 404 | Feature ID not found |
| `VALIDATION_ERROR` | 400 | Invalid `status` value or other constraint |
| `UPVOTES_IMMUTABLE` | 422 | Body includes `upvotes` field — reject |

---

#### `DELETE /api/v1/delivery/features/:id`

**Auth:** `DELIVERY_MANAGE` (ADMIN only)

**Business rules:**
- Hard delete. The feature is removed from the Delivery Board and the client Roadmap immediately.
- All associated votes (`feature_votes` table rows for this feature) must also be deleted (cascade).
- If any `FeatureRequest` has `linked_feature_id` pointing to this feature, set those to `null` (do not cascade-delete the requests).
- A `RELEASED` feature can be deleted (admin decision to remove from changelog).

**Path Params:** `id` — feature ID

**Response `204 No Content`**

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `DELIVERY_MANAGE` |
| `NOT_FOUND` | 404 | Feature ID not found |

---

### A11.4 — Onboarding (Internal Console)

#### Context for AI / Backend Implementation

The Onboarding tracker represents a structured project created by 3SC staff when a new client organisation goes live. Each `OnboardingProject` belongs to exactly one `Organisation`. It has multiple `OnboardingPhase` objects (ordered by `phase_number`), each containing `OnboardingTask` objects. Tasks have an `owner` field (`CLIENT` or `DELIVERY`) — only CLIENT-owned tasks can be checked off by client users; DELIVERY tasks are managed by 3SC staff. Progress is computed (not stored): `phase.progress = (done_tasks / total_tasks) * 100`, `overall_progress = average of phase progresses`.

---

#### `GET /api/v1/onboarding`

**Auth:** `ONBOARDING_VIEW` (LEAD, ADMIN)

**Business rules:**
- Returns all onboarding projects for the tenant (cross-org view for internal staff).
- Results ordered by `health` (BLOCKED first, AT_RISK second, ON_TRACK last), then by `go_live_date ASC`.
- The `phases` array and their `tasks` array must be fully nested in the response — no separate call needed to load phases/tasks.
- `blocker_count` = count of tasks with `status = BLOCKED` across all phases.
- `overall_progress` and `phase.progress` are computed server-side, not stored columns.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Auto-injected |
| `status` | string | No | `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, `CANCELLED` |
| `health` | string | No | `ON_TRACK`, `AT_RISK`, `BLOCKED` |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "ONB-001",
      "organizationId": "ORG-001",
      "organizationName": "TechNova Ltd",
      "leadAgentId": "USR-002",
      "leadAgentName": "Priya Sharma",
      "status": "IN_PROGRESS",
      "health": "ON_TRACK",
      "overallProgress": 62,
      "goLiveDate": "2026-06-01T00:00:00Z",
      "blockerCount": 0,
      "phases": [
        {
          "id": "PH-001",
          "phaseNumber": 1,
          "name": "Discovery & Scoping",
          "progress": 100,
          "status": "COMPLETED",
          "tasks": [
            {
              "id": "TASK-001",
              "title": "Complete requirements workshop",
              "description": "3-hour session to capture all integration points.",
              "owner": "DELIVERY",
              "dueDate": "2026-03-15T00:00:00Z",
              "status": "DONE",
              "completedAt": "2026-03-14T00:00:00Z"
            }
          ]
        }
      ],
      "created_at": "2026-02-01T00:00:00Z",
      "updated_at": "2026-04-10T00:00:00Z"
    }
  ]
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ONBOARDING_VIEW` |

---

#### `GET /api/v1/onboarding/:id`

**Auth:** `ONBOARDING_VIEW`

**Path Params:** `id` — onboarding project ID (e.g. `ONB-001`)

**Response `200 OK`:** Single `OnboardingProject` object, same schema as the list item above.

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ONBOARDING_VIEW` |
| `NOT_FOUND` | 404 | Onboarding project not found |

---

#### `PATCH /api/v1/onboarding/:id/tasks/:taskId`

**Auth:** `ONBOARDING_MANAGE` (LEAD, ADMIN) for any task. `CLIENT_ADMIN` for CLIENT-owned tasks only (see §A11.5).

**Business rules:**
- Internal staff (ONBOARDING_MANAGE) can update **any** task regardless of `owner`.
- Client users (CLIENT_ADMIN, CLIENT_USER) can only update tasks where `owner = CLIENT` — reject with 403 if they attempt a DELIVERY-owned task.
- Allowed `status` transitions for internal staff: any value in `OnboardingTaskStatus` (`PENDING`, `IN_PROGRESS`, `DONE`, `BLOCKED`).
- When `status` transitions to `DONE`, set `completed_at = now()` automatically.
- When `status` transitions away from `DONE`, clear `completed_at` (set to null).
- After any task update, recompute and persist `phase.progress` and `onboarding.overall_progress` (or compute them at read time — consistent with your chosen strategy).
- Also recompute `blocker_count` on the parent `OnboardingProject`.
- Emit a WebSocket event `onboarding:task_updated` (see §16) to notify other viewers of the same onboarding project in real time.

**Path Params:**
- `id` — onboarding project ID
- `taskId` — task ID

**Request Body:**
```json
{ "status": "IN_PROGRESS" }
```

**Response `200 OK`:**
```json
{
  "data": {
    "id": "TASK-003",
    "title": "Data mapping & transformation",
    "description": "Map 47 custom fields from legacy CRM.",
    "owner": "DELIVERY",
    "dueDate": "2026-04-20T00:00:00Z",
    "status": "IN_PROGRESS",
    "completedAt": null
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Lacks `ONBOARDING_MANAGE`, or client tried to update a DELIVERY task |
| `NOT_FOUND` | 404 | Onboarding project or task not found |
| `INVALID_STATUS` | 400 | `status` value not in enum |

---

### A11.5 — Onboarding (Customer Portal)

#### Context for AI / Backend Implementation

Client users access a **read-only view of their own organisation's onboarding project** via the Customer Portal. `GET /onboarding/my` is scoped entirely to the caller's `tenant_id` — no org ID is needed in the request. CLIENT_ADMIN users may also check off tasks that are `owner = CLIENT`, enabling them to mark their own team's deliverables as done.

---

#### `GET /api/v1/onboarding/my`

**Auth:** Any authenticated client user (`CLIENT_ADMIN`, `CLIENT_USER`)

**Business rules:**
- Scoped automatically to the caller's `tenant_id` — no query param needed.
- Returns the **single** active onboarding project for the org. If the org has no onboarding project, return `404` with code `ONBOARDING_NOT_FOUND`.
- If the org has multiple onboarding projects (e.g. re-onboarding), return the most recently created one that is not `COMPLETED` or `CANCELLED`. If all are completed, return the most recently completed one.
- The response shape is identical to `GET /onboarding/:id` (full nested phases + tasks).
- `has_voted` is not relevant here — that field only appears on roadmap responses.

**Response `200 OK`:** `OnboardingProject` object (same schema as §A11.4).

**Response `404`:**
```json
{
  "code": "ONBOARDING_NOT_FOUND",
  "message": "No onboarding project found for your organisation."
}
```

**Note:** The frontend shows a friendly "Onboarding not set up yet — contact your account manager" empty state when `404` is received. Return `404` (not `200` with null) so the frontend can distinguish "not found" from "loading error".

---

### A11.6 — Product Roadmap (Customer Portal)

#### Context for AI / Backend Implementation

The Product Roadmap is a public-facing view of the `delivery_features` table, filtered to `is_public = true`. Client users can **upvote** features they want prioritised, and **submit new feature requests**. Votes are stored in a join table `feature_votes (feature_id, user_id, org_id, created_at)` — unique constraint on `(feature_id, user_id)`. The `upvotes` count on `DeliveryFeature` is the aggregate `COUNT(*)` of this join table per feature. The `has_voted` boolean is computed per-request by checking if the calling user's ID exists in `feature_votes` for that feature.

---

#### `GET /api/v1/roadmap`

**Auth:** Any authenticated client user (`CLIENT_ADMIN`, `CLIENT_USER`)

**Business rules:**
- Returns only features where `is_public = true`.
- Results **grouped by `quarter`** on the frontend — the backend returns a flat array sorted by `quarter ASC NULLS LAST`, then `upvotes DESC` within each quarter.
- For each feature, compute `has_voted` by checking `feature_votes` where `feature_id = f.id AND user_id = <caller_id>`.
- Do **not** return `requestedByOrgIds` to client users (internal-only field) — omit or set to null in client responses.
- If `AI_DIGEST` permission present, the client may also call `GET /ai/roadmap/summary` for personalised highlights (separate endpoint).

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | Yes | Auto-injected |
| `status` | string | No | Filter by `DeliveryStatus` value |
| `category` | string | No | Exact match |
| `quarter` | string | No | e.g. `Q2 2026` |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "FEAT-001",
      "title": "SLA Breach Alerts",
      "description": "Real-time notifications when tickets approach or breach SLA thresholds.",
      "status": "RELEASED",
      "assignee": "Priya Sharma",
      "assigneeId": "USR-002",
      "eta": "2026-02-28T00:00:00Z",
      "upvotes": 34,
      "quarter": "Q1 2026",
      "isPublic": true,
      "category": "Notifications",
      "hasVoted": false,
      "created_at": "2025-11-01T00:00:00Z",
      "updated_at": "2026-02-28T00:00:00Z"
    }
  ]
}
```

> `requestedByOrgIds` is intentionally **omitted** from this response (client-facing).

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Unauthenticated or not a client user |

---

#### `POST /api/v1/roadmap/features/:id/vote`

**Auth:** `ROADMAP_VOTE` (CLIENT_ADMIN, CLIENT_USER)

**Business rules:**
- Inserts a row into `feature_votes (feature_id, user_id, org_id)`.
- Unique constraint on `(feature_id, user_id)` — if the user already voted, return `409 ALREADY_VOTED`.
- Increments `features.upvotes` counter (or recompute from join table — consistent with your chosen strategy).
- Adds the caller's `org_id` to `features.requested_by_org_ids` array if not already present.

**Path Params:** `id` — feature ID

**Response `200 OK`:**
```json
{
  "data": {
    "featureId": "FEAT-003",
    "upvotes": 42,
    "hasVoted": true
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ROADMAP_VOTE` |
| `NOT_FOUND` | 404 | Feature not found or `is_public = false` |
| `ALREADY_VOTED` | 409 | User has already voted on this feature |

---

#### `DELETE /api/v1/roadmap/features/:id/vote`

**Auth:** `ROADMAP_VOTE`

**Business rules:**
- Removes the `feature_votes` row for `(feature_id, caller_user_id)`.
- Decrements `features.upvotes` (or recompute). Never go below 0.
- Does **not** remove the org from `requested_by_org_ids` (other users from the same org may still have voted).
- If the user has not voted, return `409 NOT_VOTED`.

**Path Params:** `id` — feature ID

**Response `200 OK`:**
```json
{
  "data": {
    "featureId": "FEAT-003",
    "upvotes": 41,
    "hasVoted": false
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ROADMAP_VOTE` |
| `NOT_FOUND` | 404 | Feature not found |
| `NOT_VOTED` | 409 | User has not voted on this feature — nothing to remove |

---

#### `POST /api/v1/roadmap/requests`

**Auth:** `ROADMAP_REQUEST` (CLIENT_ADMIN only)

**Business rules:**
- Creates a new `FeatureRequest` record scoped to the caller's org.
- Status starts as `PENDING`. 3SC ADMIN staff can later change it to `ACCEPTED`, `REJECTED`, or `MERGED`.
- When `MERGED`, `linked_feature_id` points to the existing or newly created `DeliveryFeature`.
- The frontend calls `POST /ai/roadmap/classify-request` **before** this endpoint to get a pre-flight duplicate check and classification. However, this endpoint must perform its own deduplication logic independently — do not rely on the AI classification having been called.
- Deduplication: if a request with the same `title` (case-insensitive) from the same org was submitted within the last 30 days and is still `PENDING`, return `409 DUPLICATE_REQUEST`.

**Request Body:**
```json
{
  "title": "Bulk export tickets to CSV",
  "description": "We need to export all tickets for a given date range to CSV for our compliance team."
}
```

**Field Validation:**
- `title` — required, 5–200 chars
- `description` — optional, max 3000 chars

**Response `201 Created`:**
```json
{
  "data": {
    "id": "REQ-001",
    "title": "Bulk export tickets to CSV",
    "description": "We need to export all tickets for a given date range...",
    "submittedByUserId": "CUST-001",
    "submittedByOrgId": "ORG-002",
    "submittedByOrgName": "Acme Corp",
    "status": "PENDING",
    "linkedFeatureId": null,
    "created_at": "2026-04-19T12:00:00Z"
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ROADMAP_REQUEST` |
| `VALIDATION_ERROR` | 400 | `title` missing or too short/long |
| `DUPLICATE_REQUEST` | 409 | Same title submitted from same org within 30 days |

---

### A11.7 — AI: Delivery Board

#### Context for AI / Backend Implementation

All Delivery Board AI endpoints operate on the internal `delivery_features` table. They do **not** need `tenant_id` scoping beyond the standard multi-tenant middleware — the features table is already org-scoped. These endpoints are triggered manually by LEAD/ADMIN from the Delivery Board UI (not on a schedule). Results are displayed in a modal or as card overlays — they are **not persisted** to the DB; compute fresh each time.

---

#### `GET /api/v1/ai/delivery/risk`

**Auth:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Business rules:**
- Analyses features in statuses `IN_DEV`, `IN_QA`, `IN_STAGING` that have an `eta` set.
- A feature is HIGH risk if: `eta` is within 7 days and status is not RELEASED, OR `eta` has already passed.
- A feature is MEDIUM risk if: `eta` is within 14 days and `upvotes >= 10` (high demand, slipping).
- A feature is LOW risk if: in `IN_QA` or `IN_STAGING` with `eta` still >14 days away.
- Features with no `eta` set are excluded from risk analysis.
- The `reason` string should be LLM-generated and human-readable (e.g. "ETA passed 3 days ago with no release. 34 client upvotes affected.").
- The `recommendation` string is an actionable suggestion (e.g. "Immediately assign to a senior dev or reschedule ETA. Notify clients who voted.").

**Response `200 OK`:**
```json
{
  "data": [
    {
      "featureId": "FEAT-005",
      "featureTitle": "AI Knowledge Base Auto-Draft",
      "riskLevel": "HIGH",
      "reason": "ETA was 2026-04-15 (4 days ago). Feature is still IN_QA. 28 upvotes affected.",
      "daysUntilEta": -4,
      "recommendation": "Assign a reviewer immediately or reschedule ETA. Proactively notify client orgs who voted."
    }
  ]
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `AI_PROJECT_INSIGHTS` |

---

#### `POST /api/v1/ai/delivery/prioritise`

**Auth:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN)

**Business rules:**
- Operates on features in `BACKLOG` and `PLANNED` statuses only.
- Scoring factors (AI must weigh all of these):
  1. `upvotes` — direct client demand signal
  2. Number of distinct orgs in `requested_by_org_ids` — breadth of demand
  3. Strategic alignment: features in the `AI` or `Security` category score higher (configurable)
  4. Feature age: older BACKLOG items get a slight urgency boost
  5. Implementation complexity: inferred from description length + category (short + `Portal` = simpler)
- `score` is 0–100 normalised across all returned items.
- `suggestedStatus` is always `PLANNED` (move from BACKLOG) or `IN_DEV` (move from PLANNED). Never skip statuses.
- `reasoning` must be a human-readable explanation referencing the specific factors (e.g. "Ranked #1 because 52 upvotes across 4 orgs — highest demand in cohort. Suggested for immediate development.").

**Request Body:** `{}` (empty — backend fetches features internally)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "featureId": "FEAT-008",
      "featureTitle": "Bulk Ticket Actions",
      "suggestedStatus": "IN_DEV",
      "score": 87,
      "reasoning": "Ranked #1: 48 upvotes across 3 orgs, oldest BACKLOG item (6 months), low implementation complexity (UI workflow)."
    }
  ]
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `AI_PROJECT_INSIGHTS` |
| `INSUFFICIENT_DATA` | 422 | No BACKLOG/PLANNED features to analyse |

---

#### `POST /api/v1/ai/delivery/draft-feature`

**Auth:** `AI_PROJECT_REPORTS` (LEAD, ADMIN)

**Business rules:**
- Takes a raw feature title string and generates a structured draft.
- The AI must infer `suggested_category` from the title keywords (e.g. "Two-factor" → "Security").
- `suggested_quarter` is relative to today's date — suggest 1–2 quarters out depending on apparent complexity.
- `suggested_assignee_role` is a role hint (e.g. `"Senior Backend Engineer"`, `"UX Designer"`) based on the feature type — not a user ID.
- This endpoint is a **draft assist** tool — the output pre-fills the "Add Feature" modal. Nothing is persisted automatically.

**Request Body:**
```json
{ "title": "Two-Factor Authentication" }
```

**Field Validation:**
- `title` — required, 3–200 chars

**Response `200 OK`:**
```json
{
  "data": {
    "description": "TOTP/FIDO2-based two-factor authentication for all user accounts, with optional per-organisation enforcement and recovery codes.",
    "suggestedQuarter": "Q3 2026",
    "suggestedCategory": "Security",
    "suggestedAssigneeRole": "Senior Backend Engineer"
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `AI_PROJECT_REPORTS` |
| `VALIDATION_ERROR` | 400 | `title` missing or too short |
| `AI_UNAVAILABLE` | 503 | LLM call failed — return cached/fallback response if possible |

---

### A11.8 — AI: Onboarding

#### Context for AI / Backend Implementation

Onboarding AI endpoints are per-onboarding-project (`:id` path param). They analyse the nested phases and tasks structure of an `OnboardingProject` to produce health predictions and recommendations. The AI must have access to: task statuses, due dates, blocker count, go-live date, and overall progress. These are **not persisted** — computed fresh per request (results can be cached with a short TTL, e.g. 5 minutes).

---

#### `GET /api/v1/ai/onboarding/:id/health`

**Auth:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN) or any authenticated client user (scoped to their own org's onboarding only)

**Business rules:**
- Client users can call this with the ID of their own org's onboarding project. If they pass another org's ID, return `403`.
- `health` is one of `ON_TRACK`, `AT_RISK`, `BLOCKED`.
- `predicted_go_live` is the AI's estimated actual go-live date based on current velocity (task completion rate).
- `days_variance` is positive when predicted late (e.g. +12), negative when predicted early (e.g. -3).
- `confidence` is 0–1. Lower confidence when there are very few completed tasks (not enough data).
- Classification rules (AI can override with reasoning):
  - `BLOCKED` — any task with `status = BLOCKED` that is on the critical path (i.e. blocking a DELIVERY task in the current phase)
  - `AT_RISK` — `days_variance > 7`, or `overall_progress < expected_progress_by_now` by more than 15%
  - `ON_TRACK` — otherwise

**Path Params:** `id` — onboarding project ID

**Response `200 OK`:**
```json
{
  "data": {
    "onboardingId": "ONB-001",
    "health": "ON_TRACK",
    "confidence": 0.82,
    "reason": "All phases progressing at expected velocity. Data migration (Phase 2) is 25% complete with 18 days remaining — on schedule.",
    "predictedGoLive": "2026-06-01T00:00:00Z",
    "daysVariance": 0
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Client user requesting another org's onboarding |
| `NOT_FOUND` | 404 | Onboarding project not found |
| `INSUFFICIENT_DATA` | 422 | Not enough task completion data for prediction (< 2 tasks completed) |

---

#### `POST /api/v1/ai/onboarding/:id/blocker-summary`

**Auth:** `AI_PROJECT_REPORTS` (LEAD, ADMIN)

**Business rules:**
- Finds all tasks with `status = BLOCKED` and generates a plain-English summary.
- `most_urgent` is the single most critical blocked task — determined by: (1) is it on the critical path? (2) how many days overdue is its `due_date`?
- `blocker_count` is a simple count of all `BLOCKED` tasks across all phases.
- If `blocker_count = 0`, still return `200` with an appropriate summary.

**Path Params:** `id` — onboarding project ID

**Request Body:** `{}` (empty)

**Response `200 OK`:**
```json
{
  "data": {
    "onboardingId": "ONB-002",
    "summary": "2 tasks are blocked on data migration. Root cause is an unresolved custom field mapping issue requiring client IT sign-off.",
    "blockerCount": 2,
    "mostUrgent": "Data mapping & transformation — blocked 8 days. Client IT contact has not responded to the last 2 emails."
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `AI_PROJECT_REPORTS` |
| `NOT_FOUND` | 404 | Onboarding project not found |

---

#### `GET /api/v1/ai/onboarding/:id/next-action`

**Auth:** `AI_PROJECT_INSIGHTS` (LEAD, ADMIN) or `CLIENT_ADMIN` (own org's onboarding only)

**Business rules:**
- Returns a single, most important recommended next action.
- Priority assignment: `HIGH` if any BLOCKED task or `days_variance > 7`; `MEDIUM` if `AT_RISK`; `LOW` if `ON_TRACK`.
- `owned_by` tells the frontend whether to surface this to the client or to the delivery agent (`DELIVERY` = action for 3SC team, `CLIENT` = action for client team).
- `draft_message` is an optional ready-to-send email/message body the agent can copy. Generate this for DELIVERY-owned actions only (not surfaced to client users).
- Client users can call this for their own onboarding — they see `action`, `priority`, `owned_by`. They do **not** receive `draft_message` (omit from client responses).

**Path Params:** `id` — onboarding project ID

**Response `200 OK` (internal view):**
```json
{
  "data": {
    "onboardingId": "ONB-001",
    "action": "Chase client to begin dry-run sign-off review. Data mapping finishes this week — schedule the review call now to avoid a gap.",
    "priority": "MEDIUM",
    "ownedBy": "DELIVERY",
    "draftMessage": "Hi team, the data mapping work is wrapping up this week. Could we schedule a 30-minute call to walk through the dry-run results and confirm everything looks correct? Let me know your availability. Best, Priya"
  }
}
```

**Response `200 OK` (client view — `draft_message` omitted):**
```json
{
  "data": {
    "onboardingId": "ONB-001",
    "action": "Your team needs to review and sign off on the dry-run data migration results before we can proceed.",
    "priority": "MEDIUM",
    "ownedBy": "CLIENT"
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Client user requesting another org's onboarding |
| `NOT_FOUND` | 404 | Onboarding project not found |

---

### A11.9 — AI: Roadmap (Customer Portal)

#### Context for AI / Backend Implementation

Roadmap AI endpoints are **client-facing** — called from the Customer Portal. They personalise the roadmap experience based on the calling org's ticket history and vote history. The AI has access to: features voted on by the org, open tickets for the org (especially FEATURE_REQUEST category), and the org's top-voted categories.

---

#### `GET /api/v1/ai/roadmap/summary`

**Auth:** `AI_DIGEST` (CLIENT_ADMIN, CLIENT_USER)

**Business rules:**
- Generates a personalised summary for the calling org's users.
- `top_relevant_feature_ids` — IDs of up to 5 features most relevant to this org. Relevance is computed by:
  1. Features the org has already voted on (highest weight)
  2. Features in categories matching the org's most common ticket categories
  3. Features with upcoming ETAs (next 90 days)
  4. Features with the highest overall upvote count (tiebreaker)
- `headline` — 1–2 sentence summary explaining what's most relevant (e.g. "3 features in your most-requested categories are coming in Q2 2026.").
- `reasoning` — more detailed explanation for transparency.
- This endpoint is called once per roadmap page load (cached with 1-hour TTL per org).
- Do **not** expose which other orgs have voted or their ticket data.

**Response `200 OK`:**
```json
{
  "data": {
    "headline": "2 of your most-requested features are coming in Q2 2026, including Client Roadmap View and Custom Branding Themes.",
    "topRelevantFeatureIds": ["FEAT-003", "FEAT-006", "FEAT-009", "FEAT-010", "FEAT-012"],
    "reasoning": "These features were selected based on your organisation's votes (3), your top ticket categories (Portal, AI), and upcoming delivery dates."
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `AI_DIGEST` |
| `AI_UNAVAILABLE` | 503 | LLM unavailable — return `null` gracefully; frontend handles this silently |

---

#### `POST /api/v1/ai/roadmap/classify-request`

**Auth:** `ROADMAP_REQUEST` (CLIENT_ADMIN)

**Business rules:**
- Pre-flight check called **before** the user submits a feature request.
- Checks for duplicates: semantic similarity against existing features in `delivery_features` and pending requests in `feature_requests`.
- `is_duplicate = true` if any existing feature or request has similarity score ≥ 0.85.
- `similar_feature_id` and `similar_feature_title` — the closest match if `is_duplicate = true`.
- `similarity_score` — float 0–1, cosine similarity between the submitted text and the closest match.
- `suggested_quarter` — inferred from feature complexity and current roadmap load.
- `category` — inferred from title/description keywords.
- `recommendation` — human-readable guidance string shown in the UI (e.g. "This looks very similar to 'Bulk export tickets to CSV' already on our roadmap. You can vote for it instead of submitting a new request.").
- This endpoint does **not** create any record — it is purely analytical.

**Request Body:**
```json
{
  "title": "Export tickets to spreadsheet",
  "description": "We want to download all our tickets as an Excel file for our finance team."
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "isDuplicate": true,
    "similarFeatureId": "FEAT-009",
    "similarFeatureTitle": "Bulk Ticket Actions (includes CSV export)",
    "similarityScore": 0.91,
    "suggestedQuarter": "Q3 2026",
    "category": "Tickets",
    "recommendation": "This request is very similar to 'Bulk Ticket Actions' already on our roadmap (91% match). We recommend voting for that feature instead of submitting a new request."
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|---|---|---|
| `FORBIDDEN` | 403 | Caller lacks `ROADMAP_REQUEST` |
| `VALIDATION_ERROR` | 400 | `title` missing |
| `AI_UNAVAILABLE` | 503 | Return a safe default: `{ "isDuplicate": false, "category": "Other", "recommendation": "Request submitted for review." }` |

---

### A11.10 — Complete Type Definitions

All types referenced in this addendum. Append to §18 of the main spec.

```typescript
// ── DeliveryStatus ──────────────────────────────────────────────
type DeliveryStatus = 'BACKLOG' | 'PLANNED' | 'IN_DEV' | 'IN_QA' | 'IN_STAGING' | 'RELEASED';

// ── DeliveryFeature ─────────────────────────────────────────────
interface DeliveryFeature {
  id: string;                         // 'FEAT-001'
  title: string;
  description: string;
  status: DeliveryStatus;
  assignee?: string;                  // display name of assigned internal agent
  assigneeId?: string;                // UUID of assigned internal agent
  eta?: string;                       // ISO 8601 — expected release date
  upvotes: number;                    // aggregated count from feature_votes table
  quarter?: string;                   // 'Q2 2026' — for roadmap grouping
  isPublic: boolean;                  // true = visible in client roadmap
  category?: string;                  // 'AI', 'Security', 'Portal', etc.
  requestedByOrgIds?: string[];       // which org IDs have voted (internal only, omit from /roadmap)
  hasVoted?: boolean;                 // client-side only: current user has voted?
  created_at: string;                 // ISO 8601
  updated_at: string;                 // ISO 8601
}

// ── DeliveryFeatureCreatePayload ────────────────────────────────
interface DeliveryFeatureCreatePayload {
  title: string;
  description?: string;
  status?: DeliveryStatus;            // default: BACKLOG
  assigneeId?: string;
  eta?: string;
  quarter?: string;
  isPublic?: boolean;                 // default: false
  category?: string;
}

// ── AI — Delivery ───────────────────────────────────────────────
interface DeliveryRiskItem {
  featureId: string;
  featureTitle: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;                     // LLM-generated plain-English explanation
  daysUntilEta?: number;              // negative = already past ETA
  recommendation: string;             // actionable next step
}

interface DeliveryPrioritisedFeature {
  featureId: string;
  featureTitle: string;
  suggestedStatus: DeliveryStatus;    // PLANNED or IN_DEV
  score: number;                      // 0–100
  reasoning: string;                  // LLM-generated explanation of ranking
}

interface DeliveryFeatureDraft {
  description: string;
  suggestedQuarter: string;           // e.g. 'Q3 2026'
  suggestedCategory: string;          // e.g. 'Security'
  suggestedAssigneeRole: string;      // e.g. 'Senior Backend Engineer' (role hint, not user ID)
}

// ── OnboardingTaskStatus / Owner ────────────────────────────────
type OnboardingHealth      = 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';
type OnboardingStatus      = 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
type OnboardingTaskStatus  = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
type OnboardingTaskOwner   = 'CLIENT' | 'DELIVERY';
type OnboardingPhaseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  owner: OnboardingTaskOwner;
  dueDate: string;                    // ISO 8601
  status: OnboardingTaskStatus;
  completedAt?: string;               // ISO 8601, set automatically when status → DONE
}

interface OnboardingPhase {
  id: string;
  phaseNumber: number;                // 1-indexed, used for display
  name: string;
  progress: number;                   // 0–100, computed: (DONE tasks / total tasks) * 100
  status: OnboardingPhaseStatus;
  tasks: OnboardingTask[];
}

interface OnboardingProject {
  id: string;                         // 'ONB-001'
  organizationId: string;
  organizationName: string;
  leadAgentId: string;
  leadAgentName: string;
  status: OnboardingStatus;
  health: OnboardingHealth;
  overallProgress: number;            // 0–100, computed: average of phase.progress
  goLiveDate: string;                 // ISO 8601
  blockerCount: number;               // computed: count of BLOCKED tasks across all phases
  phases: OnboardingPhase[];
  created_at: string;
  updated_at: string;
}

// ── AI — Onboarding ─────────────────────────────────────────────
interface OnboardingHealthPrediction {
  onboardingId: string;
  health: OnboardingHealth;
  confidence: number;                 // 0–1
  reason: string;                     // LLM-generated explanation
  predictedGoLive: string;            // ISO 8601
  daysVariance: number;               // positive = late, negative = early
}

interface OnboardingBlockerSummary {
  onboardingId: string;
  summary: string;                    // plain-English overview
  blockerCount: number;
  mostUrgent?: string;                // description of the single most critical blocker
}

interface OnboardingNextAction {
  onboardingId: string;
  action: string;                     // what to do next
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  ownedBy: OnboardingTaskOwner;       // who should act: CLIENT or DELIVERY
  draftMessage?: string;              // ready-to-send message (omit from client responses)
}

// ── Roadmap ─────────────────────────────────────────────────────
interface FeatureRequest {
  id: string;                         // 'REQ-001'
  title: string;
  description: string;
  submittedByUserId: string;
  submittedByOrgId: string;
  submittedByOrgName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MERGED';
  linkedFeatureId?: string;           // set when status = MERGED
  created_at: string;
}

interface FeatureRequestClassification {
  isDuplicate: boolean;
  similarFeatureId?: string;
  similarFeatureTitle?: string;
  similarityScore?: number;           // 0–1 cosine similarity
  suggestedQuarter?: string;
  category: string;
  recommendation: string;             // human-readable guidance shown in UI
}

// ── AI — Roadmap ────────────────────────────────────────────────
interface RoadmapPersonalisedSummary {
  headline: string;                   // 1–2 sentence personalised summary
  topRelevantFeatureIds: string[];    // up to 5 feature IDs highlighted for this org
  reasoning: string;                  // longer explanation of why these were selected
}
```

---

### A11.11 — Database Schema Notes

**Tables needed for this addendum:**

```sql
-- Product features (shared between Delivery Board and Roadmap)
CREATE TABLE delivery_features (
  id              VARCHAR(20) PRIMARY KEY,   -- 'FEAT-001'
  tenant_id       UUID NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'BACKLOG',
  assignee_id     UUID REFERENCES users(id),
  eta             TIMESTAMPTZ,
  upvotes         INTEGER NOT NULL DEFAULT 0,
  quarter         VARCHAR(20),               -- 'Q2 2026'
  is_public       BOOLEAN NOT NULL DEFAULT false,
  category        VARCHAR(100),
  requested_by_org_ids  UUID[] DEFAULT '{}',  -- array of org IDs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user votes on roadmap features
CREATE TABLE feature_votes (
  feature_id  VARCHAR(20) NOT NULL REFERENCES delivery_features(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  org_id      UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_id, user_id)           -- prevents double-voting
);

-- Client-submitted feature requests
CREATE TABLE feature_requests (
  id                  VARCHAR(20) PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  submitted_by_user   UUID REFERENCES users(id),
  submitted_by_org    UUID NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  linked_feature_id   VARCHAR(20) REFERENCES delivery_features(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding projects
CREATE TABLE onboarding_projects (
  id              VARCHAR(20) PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  lead_agent_id   UUID REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  health          VARCHAR(20) NOT NULL DEFAULT 'ON_TRACK',
  go_live_date    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding phases (ordered within a project)
CREATE TABLE onboarding_phases (
  id              VARCHAR(20) PRIMARY KEY,
  onboarding_id   VARCHAR(20) NOT NULL REFERENCES onboarding_projects(id) ON DELETE CASCADE,
  phase_number    INTEGER NOT NULL,
  name            VARCHAR(200) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  UNIQUE (onboarding_id, phase_number)
);

-- Onboarding tasks (belong to a phase)
CREATE TABLE onboarding_tasks (
  id              VARCHAR(20) PRIMARY KEY,
  phase_id        VARCHAR(20) NOT NULL REFERENCES onboarding_phases(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  owner           VARCHAR(20) NOT NULL,      -- 'CLIENT' or 'DELIVERY'
  due_date        TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  completed_at    TIMESTAMPTZ
);
```

---

### A11.12 — Endpoint Summary Table

| # | Method | Path | Auth Permission | Caller |
|---|---|---|---|---|
| 1 | GET | `/delivery/features` | DELIVERY_VIEW | Internal |
| 2 | POST | `/delivery/features` | DELIVERY_MANAGE | Internal |
| 3 | PATCH | `/delivery/features/:id` | DELIVERY_MANAGE / DELIVERY_VIEW | Internal |
| 4 | DELETE | `/delivery/features/:id` | DELIVERY_MANAGE | Internal |
| 5 | GET | `/onboarding` | ONBOARDING_VIEW | Internal |
| 6 | GET | `/onboarding/:id` | ONBOARDING_VIEW | Internal |
| 7 | PATCH | `/onboarding/:id/tasks/:taskId` | ONBOARDING_MANAGE | Internal + Client |
| 8 | GET | `/onboarding/my` | (any client auth) | Client Portal |
| 9 | GET | `/roadmap` | (any client auth) | Client Portal |
| 10 | POST | `/roadmap/features/:id/vote` | ROADMAP_VOTE | Client Portal |
| 11 | DELETE | `/roadmap/features/:id/vote` | ROADMAP_VOTE | Client Portal |
| 12 | POST | `/roadmap/requests` | ROADMAP_REQUEST | Client Portal |
| 13 | GET | `/ai/delivery/risk` | AI_PROJECT_INSIGHTS | Internal |
| 14 | POST | `/ai/delivery/prioritise` | AI_PROJECT_INSIGHTS | Internal |
| 15 | POST | `/ai/delivery/draft-feature` | AI_PROJECT_REPORTS | Internal |
| 16 | GET | `/ai/onboarding/:id/health` | AI_PROJECT_INSIGHTS | Internal + Client |
| 17 | POST | `/ai/onboarding/:id/blocker-summary` | AI_PROJECT_REPORTS | Internal |
| 18 | GET | `/ai/onboarding/:id/next-action` | AI_PROJECT_INSIGHTS | Internal + Client |
| 19 | GET | `/ai/roadmap/summary` | AI_DIGEST | Client Portal |
| 20 | POST | `/ai/roadmap/classify-request` | ROADMAP_REQUEST | Client Portal |
| 21 | GET | `/escalations/agents` | TICKET_ASSIGN | Internal (gap from §19) |

---

### A11.13 — End-to-End User Flow Diagrams

#### Flow 1: ADMIN adds a feature to Delivery Board
1. ADMIN opens Delivery Board → `GET /delivery/features` loads the board.
2. ADMIN clicks "+ Add Feature" in BACKLOG column.
3. ADMIN types a title → optionally clicks "AI Draft" → `POST /ai/delivery/draft-feature` pre-fills description/category/quarter.
4. ADMIN submits → `POST /delivery/features` creates the feature (defaults `is_public = false`).
5. Board re-fetches via RTK Query cache invalidation (`Delivery` tag).

#### Flow 2: LEAD moves feature to IN_DEV
1. LEAD opens card menu → clicks "Move to In Dev".
2. `PATCH /delivery/features/:id` with body `{ "status": "IN_DEV" }`.
3. Card moves column immediately (optimistic UI). Board re-fetches.

#### Flow 3: Client user votes on roadmap
1. Client loads Roadmap page → `GET /roadmap` returns features with `has_voted` per item.
2. Client clicks ▲ vote button → `POST /roadmap/features/:id/vote`.
3. Response returns new `upvotes` count → card updates count optimistically.
4. Client clicks ▲ again (unvote) → `DELETE /roadmap/features/:id/vote`.

#### Flow 4: Client submits a feature request
1. Client clicks "Request a Feature" → types title.
2. Client clicks "Check for duplicates" → `POST /ai/roadmap/classify-request` returns classification.
3. If `isDuplicate = true`, UI shows warning and link to existing feature.
4. Client confirms submission → `POST /roadmap/requests` creates the request.

#### Flow 5: LEAD views onboarding AI insights
1. LEAD opens Onboarding page → `GET /onboarding` loads all projects.
2. LEAD clicks a project → side panel fires `GET /ai/onboarding/:id/health` + `GET /ai/onboarding/:id/next-action`.
3. LEAD clicks "Get blocker summary" button → `POST /ai/onboarding/:id/blocker-summary`.
4. LEAD updates a blocked task → `PATCH /onboarding/:id/tasks/:taskId` with `{ "status": "IN_PROGRESS" }`.

---

*Addendum A11 — Delivery Board, Onboarding Tracker, Product Roadmap + AI. Full atomic spec. Last updated: 2026-04-19.*
