# User Management System — Backend Specification

> **Audience**: Backend engineers / AI code-generation tools  
> **Status**: Phase 2 — ready for implementation  
> **Related**: `docs/backend-api-spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Models](#2-data-models)
3. [Permission System](#3-permission-system)
4. [Assignment Scoring Formula](#4-assignment-scoring-formula)
5. [API Endpoints — Skill Taxonomy](#5-api-endpoints--skill-taxonomy)
6. [API Endpoints — User Skills](#6-api-endpoints--user-skills)
7. [API Endpoints — User Workload](#7-api-endpoints--user-workload)
8. [API Endpoints — Permission Overrides](#8-api-endpoints--permission-overrides)
9. [API Endpoints — Team Members (org-scoped)](#9-api-endpoints--team-members-org-scoped)
10. [API Endpoints — Assignment Scoring Weights](#10-api-endpoints--assignment-scoring-weights)
11. [API Endpoints — AI Assignment](#11-api-endpoints--ai-assignment)
12. [API Endpoints — User Invite (extended)](#12-api-endpoints--user-invite-extended)
13. [API Endpoints — Password Reset](#13-api-endpoints--password-reset)
14. [Extended User Object](#14-extended-user-object)
15. [Standard Error Envelope](#15-standard-error-envelope)
16. [Database Migration](#16-database-migration)
17. [Security Checklist](#17-security-checklist)
18. [Seed Data](#18-seed-data)
19. [Frontend Integration Notes](#19-frontend-integration-notes)

---

## 1. Overview

The User Management system extends the existing Role-Based Access Control (RBAC) with:

1. **Internal sub-roles** — granular categorisation of internal staff (AGENT / LEAD / ADMIN).
2. **Skill tracking** — per-agent skill taxonomy used for AI-powered ticket routing.
3. **Workload tracking** — per-agent ticket capacity, utilisation and availability status.
4. **Three-layer permission system** — role defaults → ADMIN grant overrides → ADMIN revoke overrides = effective permissions.
5. **Assignment scoring** — configurable weighted formula for matching tickets to agents.
6. **Skill-gap detection** — AI endpoint that identifies open tickets with no skill-matched agent.

### Common conventions

- All endpoints are prefixed `/api/v1/`
- All requests/responses use `Content-Type: application/json`
- Authentication via `Authorization: Bearer <jwt>` header on every request
- Timestamps are ISO 8601 UTC strings: `"2026-04-19T10:00:00Z"`
- Paginated list responses follow the standard envelope (see §14)
- All error responses follow the standard error envelope (see §15)

---

## 2. Data Models

### 2.1 UserRole (existing enum)

```
ADMIN | LEAD | AGENT | CLIENT_ADMIN | CLIENT_USER
```

### 2.2 InternalSubRole (new enum)

Layered **on top of** `UserRole` for internal staff only. Never set on `CLIENT_*` users.

| Value        | Default for role | Description                              |
|--------------|-----------------|------------------------------------------|
| `DEVELOPER`  | —               | Software developer / engineer            |
| `DELIVERY`   | —               | Project delivery / account management    |
| `SUPPORT`    | `AGENT`         | Support agent                            |
| `TEAM_LEAD`  | `LEAD`          | Team lead                                |
| `ADMIN`      | `ADMIN`         | Platform administrator                   |

**DB column on `users`**: `internal_sub_role ENUM('DEVELOPER','DELIVERY','SUPPORT','TEAM_LEAD','ADMIN') NULL`

### 2.3 Skill

```ts
interface Skill {
  id:          string;        // e.g. "SKL-001"
  name:        string;        // e.g. "Python"
  category:    string;        // e.g. "Technical"
  description: string | null;
  isActive:    boolean;
}
```

**DB table**: `skills(id, name, category, description, is_active, created_at)`

### 2.4 UserSkill

```ts
interface UserSkill {
  skillId:      string;                                   // FK → skills.id
  level:        'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  endorsements: number;                                   // default 0
}
```

**DB table**: `user_skills(user_id, skill_id, level, endorsements, updated_at)` — PK is `(user_id, skill_id)`

### 2.5 AvailabilityStatus (enum)

```ts
enum AvailabilityStatus {
  AVAILABLE      = 'AVAILABLE',
  BUSY           = 'BUSY',
  AWAY           = 'AWAY',
  DO_NOT_DISTURB = 'DO_NOT_DISTURB',
  OFFLINE        = 'OFFLINE',
}
```

> Previously typed as a string union with `'OFF'` — canonical value is now `'OFFLINE'`.

### 2.6 UserWorkload

```ts
interface UserWorkload {
  userId:             string;
  assignedTickets:    number;    // computed — count of open tickets assigned to this user
  maxCapacity:        number;    // stored — admin/user configurable, default 20
  utilizationPct:     number;    // computed — round(assignedTickets / maxCapacity * 100, 2)
  availabilityStatus: AvailabilityStatus;
}
```

**DB columns on `users`**: `max_capacity INT NOT NULL DEFAULT 20`, `availability_status ENUM(...) NOT NULL DEFAULT 'AVAILABLE'`

> `assignedTickets` and `utilizationPct` are always computed at query time — never stored or writable via API.

### 2.7 PermissionOverride

```ts
interface PermissionOverride {
  id:            string;              // UUID
  userId:        string;
  permission:    Permission;          // e.g. "DELIVERY_VIEW"
  type:          'GRANT' | 'REVOKE';
  grantedBy:     string;              // user ID of actor who created the override
  grantedByRole: string;              // role of that actor at time of creation
  reason:        string | null;
  createdAt:     string;              // ISO 8601
  expiresAt:     string | null;       // ISO 8601, null = never expires
}
```

**DB table**: `permission_overrides(id, user_id, permission, type, granted_by, granted_by_role, reason, created_at, expires_at)`  
**Uniqueness**: `UNIQUE(user_id, permission)` — one override row per user per permission (upsert on conflict).

### 2.8 AssignmentScoringWeights

```ts
interface AssignmentScoringWeights {
  wSkill:    number;   // 0.0 – 1.0, default 0.50
  wWorkload: number;   // 0.0 – 1.0, default 0.35
  wAvail:    number;   // 0.0 – 1.0, default 0.15
  updatedAt: string;
  updatedBy: string;   // user ID
}
```

**Invariant**: `wSkill + wWorkload + wAvail === 1.0` (±0.001 tolerance). Reject with 422 otherwise.

**DB table**: `assignment_scoring_weights` — single-row config (id always = 1). Use upsert.

### 2.9 AgentAssignSuggestion

```ts
interface AgentAssignSuggestion {
  agentId:           string;
  agentName:         string;
  avatarUrl:         string | null;
  score:             number;   // 0.0 – 1.0 composite
  skillMatchScore:   number;
  workloadScore:     number;
  availabilityScore: number;
  reasoning:         string;   // human-readable explanation
}
```

### 2.10 SkillGap

```ts
interface SkillGap {
  skillId:         string;
  skillName:       string;
  openTickets:     number;   // open tickets that require this skill
  agentsWithSkill: number;   // agents who have this skill (any level)
}
```

---

## 3. Permission System

### 3.1 Three-layer effective permission resolution

```
effectivePermissions(user) =
  (
    roleDefaultPermissions[user.role]
    ∪ { p | override ∈ permissionOverrides[user.id], override.type = 'GRANT',
            (override.expiresAt IS NULL OR override.expiresAt > NOW()) }
  )
  \ { p | override ∈ permissionOverrides[user.id], override.type = 'REVOKE' }
```

The backend **MUST** compute effective permissions at session creation / token refresh and embed them in the JWT payload as `"permissions": [...]`. The frontend treats the session payload as the source of truth and does not make a separate permissions API call on every page.

### 3.2 Role default permissions

`packages/permissions/src/index.ts` is the **canonical mapping**. The backend `ROLES` dict must mirror it exactly. Do not diverge — if you need to add a permission to a role, update both the frontend package and the backend dict atomically.

### 3.3 Internal-only permissions

These permissions **MUST NEVER** be assigned to `CLIENT_USER` or `CLIENT_ADMIN`, even via an ADMIN override. Attempting to do so must return `403`.

```
TICKET_VIEW_ALL     COMMENT_INTERNAL     SLA_CONFIGURE
ESCALATION_CONFIGURE  ROUTING_VIEW       AI_SUGGEST
AI_FEEDBACK         AI_PROJECT_INSIGHTS  AI_PROJECT_REPORTS
AI_PROJECT_QA       KB_MANAGE            MEMBER_MANAGE
AUDIT_VIEW          SYSTEM_CONFIGURE     COMPLIANCE_VIEW
DELIVERY_MANAGE     USER_PERMISSION_MANAGE  SKILL_ASSIGN
WORKLOAD_VIEW       SCORING_CONFIGURE    USER_IMPORT
PASSWORD_RESET
```

### 3.4 CLIENT_ADMIN ceiling rule

A `CLIENT_ADMIN` may only toggle a permission `p` for their org member when:

```
p ∈ actor.effectivePermissions  AND  p ∈ roleDefaults[CLIENT_USER]
```

If either condition fails → `403 PERMISSION_CEILING_EXCEEDED`.  
A `CLIENT_ADMIN` can only manage members of their own organisation (`target.organizationId == actor.organizationId`).

### 3.5 ADMIN-locked overrides

If a `GRANT` override has `grantedByRole ∈ { 'ADMIN', 'LEAD' }`, a `CLIENT_ADMIN` cannot delete or reverse it. Return `403 ADMIN_LOCKED_PERMISSION`.

---

## 4. Assignment Scoring Formula

```
score(agent, ticket) =
    skillMatchScore(agent, ticket)   × weights.wSkill
  + (1 − agent.utilizationPct / 100) × weights.wWorkload
  + availabilityBonus(agent.status)  × weights.wAvail
```

### 4.1 skillMatchScore

```
requiredSkills  = skills whose name matches any of ticket.tags or ticket.category
matchedSkills   = requiredSkills ∩ agent.skills

levelBonus = { BEGINNER: 0.6, INTERMEDIATE: 0.8, EXPERT: 1.0 }

skillMatchScore =
  if |requiredSkills| == 0  → 0.5   (neutral — ticket has no skill requirement)
  else → Σ levelBonus[agentSkill.level] for each skill in matchedSkills / |requiredSkills|
```

### 4.2 availabilityBonus

| Status             | Bonus |
|--------------------|-------|
| `AVAILABLE`        | 1.0   |
| `BUSY`             | 0.5   |
| `AWAY`             | 0.3   |
| `DO_NOT_DISTURB`   | 0.0   |
| `OFFLINE`          | 0.0   |

Return agents sorted by `score DESC`. Agents with `OFFLINE` or `DO_NOT_DISTURB` status are excluded from suggestions unless no other agents exist.

---

## 5. API Endpoints — Skill Taxonomy

---

### `GET /api/v1/skills`

Returns the full skill taxonomy list.

**Auth**: Any authenticated user (`Authorization: Bearer <jwt>`)

**Query parameters**:

| Param      | Type    | Required | Description                              |
|------------|---------|----------|------------------------------------------|
| `category` | string  | No       | Filter by category name (exact match)    |
| `search`   | string  | No       | Fuzzy search on `name`                   |
| `isActive` | boolean | No       | Default `true`. Pass `false` to include deactivated skills |

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "id": "SKL-001",
    "name": "Python",
    "category": "Technical",
    "description": "Python programming language",
    "isActive": true
  },
  {
    "id": "SKL-002",
    "name": "JavaScript",
    "category": "Technical",
    "description": "JavaScript / TypeScript",
    "isActive": true
  }
]
```

**Error responses**:

| Status | Code              | When                          |
|--------|-------------------|-------------------------------|
| 401    | `UNAUTHORIZED`    | Missing or invalid JWT        |

---

### `POST /api/v1/skills`

Create a new skill in the taxonomy.

**Auth**: Role `ADMIN` required

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:

```json
{
  "name":        "Kubernetes",
  "category":    "Infrastructure",
  "description": "Container orchestration platform"
}
```

| Field         | Type   | Required | Constraints              |
|---------------|--------|----------|--------------------------|
| `name`        | string | Yes      | 1–100 chars, unique      |
| `category`    | string | Yes      | 1–100 chars              |
| `description` | string | No       | max 500 chars            |

**Success response — `201 Created`**:

```json
{
  "id": "SKL-020",
  "name": "Kubernetes",
  "category": "Infrastructure",
  "description": "Container orchestration platform",
  "isActive": true
}
```

**Error responses**:

| Status | Code                | When                          |
|--------|---------------------|-------------------------------|
| 400    | `VALIDATION_ERROR`  | Missing required fields       |
| 401    | `UNAUTHORIZED`      | Missing or invalid JWT        |
| 403    | `FORBIDDEN`         | Not an ADMIN                  |
| 409    | `DUPLICATE_SKILL`   | Skill with same name exists   |

---

## 6. API Endpoints — User Skills

---

### `GET /api/v1/users/:id/skills`

Returns the skill list for a given user.

**Auth**: Own user (`actor.id == :id`) OR has `SKILL_ASSIGN` permission

**Path params**: `:id` — user ID (e.g. `"USR-003"`)

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "skillId":      "SKL-001",
    "level":        "EXPERT",
    "endorsements": 3
  },
  {
    "skillId":      "SKL-004",
    "level":        "INTERMEDIATE",
    "endorsements": 1
  }
]
```

Returns `[]` (empty array) if user has no skills assigned.

**Error responses**:

| Status | Code           | When                                         |
|--------|----------------|----------------------------------------------|
| 401    | `UNAUTHORIZED` | Missing or invalid JWT                       |
| 403    | `FORBIDDEN`    | Not own user and missing `SKILL_ASSIGN` perm |
| 404    | `USER_NOT_FOUND` | No user with that ID                       |

---

### `PATCH /api/v1/users/:id/skills`

**Full replacement** of the skill list for a user. The body is the new desired state — the backend diffs against current and applies inserts/updates/deletes accordingly.

**Auth**: `SKILL_ASSIGN` permission required

**Path params**: `:id` — user ID

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body** — array of `UserSkill`:

```json
[
  {
    "skillId": "SKL-001",
    "level":   "EXPERT"
  },
  {
    "skillId": "SKL-004",
    "level":   "INTERMEDIATE"
  },
  {
    "skillId": "SKL-007",
    "level":   "BEGINNER"
  }
]
```

| Field     | Type   | Required | Constraints                          |
|-----------|--------|----------|--------------------------------------|
| `skillId` | string | Yes      | Must exist in `skills` table         |
| `level`   | enum   | Yes      | `BEGINNER \| INTERMEDIATE \| EXPERT` |

> `endorsements` is not writable via this endpoint — it is managed separately.

**Success response — `200 OK`** — returns the new full skill list:

```json
[
  {
    "skillId":      "SKL-001",
    "level":        "EXPERT",
    "endorsements": 3
  },
  {
    "skillId":      "SKL-004",
    "level":        "INTERMEDIATE",
    "endorsements": 0
  },
  {
    "skillId":      "SKL-007",
    "level":        "BEGINNER",
    "endorsements": 0
  }
]
```

**Error responses**:

| Status | Code                | When                                   |
|--------|---------------------|----------------------------------------|
| 400    | `VALIDATION_ERROR`  | Invalid level value or bad skill ID format |
| 401    | `UNAUTHORIZED`      | Missing or invalid JWT                 |
| 403    | `FORBIDDEN`         | Missing `SKILL_ASSIGN` permission      |
| 404    | `USER_NOT_FOUND`    | No user with that ID                   |
| 422    | `INVALID_SKILL_ID`  | One or more `skillId` values don't exist in the taxonomy |

---

### `POST /api/v1/ai/users/suggest-skills/:id`

AI-powered skill suggestion based on the user's resolved ticket history. Analyses the categories, tags, and resolutions of tickets the user has worked on and suggests relevant skills they may possess.

**Auth**: `SKILL_ASSIGN` permission required

**Path params**: `:id` — user ID

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "skillId": "SKL-001",
    "level":   "EXPERT"
  },
  {
    "skillId": "SKL-009",
    "level":   "INTERMEDIATE"
  }
]
```

> Only returns skills not already assigned to the user. Frontend merges with existing skills.  
> Returns `[]` if ticket history is insufficient for inference.

**Error responses**:

| Status | Code             | When                                   |
|--------|------------------|----------------------------------------|
| 401    | `UNAUTHORIZED`   | Missing or invalid JWT                 |
| 403    | `FORBIDDEN`      | Missing `SKILL_ASSIGN` permission      |
| 404    | `USER_NOT_FOUND` | No user with that ID                   |

---

## 7. API Endpoints — User Workload

---

### `GET /api/v1/users/:id/workload`

Returns the workload snapshot for a single agent.

**Auth**: Own user (`actor.id == :id`) OR `WORKLOAD_VIEW` permission

**Path params**: `:id` — user ID

**Request body**: None

**Success response — `200 OK`**:

```json
{
  "userId":             "USR-003",
  "assignedTickets":    12,
  "maxCapacity":        20,
  "utilizationPct":     60,
  "availabilityStatus": "AVAILABLE"
}
```

**Error responses**:

| Status | Code             | When                                           |
|--------|------------------|------------------------------------------------|
| 401    | `UNAUTHORIZED`   | Missing or invalid JWT                         |
| 403    | `FORBIDDEN`      | Not own user and missing `WORKLOAD_VIEW` perm  |
| 404    | `USER_NOT_FOUND` | No user with that ID                           |

---

### `PATCH /api/v1/users/:id/workload`

Update a user's max capacity and/or availability status.

**Auth**:
- `WORKLOAD_VIEW` permission (LEAD / ADMIN) → can update both `maxCapacity` and `availabilityStatus`
- Own user (no special permission needed) → can update **only** `availabilityStatus`

**Path params**: `:id` — user ID

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body** (all fields optional, at least one required):

```json
{
  "maxCapacity":        25,
  "availabilityStatus": "BUSY"
}
```

| Field                | Type   | Required | Constraints                                          |
|----------------------|--------|----------|------------------------------------------------------|
| `maxCapacity`        | number | No       | Integer, min 1, max 200. Requires `WORKLOAD_VIEW`.   |
| `availabilityStatus` | enum   | No       | `AVAILABLE\|BUSY\|AWAY\|DO_NOT_DISTURB\|OFFLINE`     |

> Attempting to write `assignedTickets` or `utilizationPct` must return `400 READONLY_FIELD`.

**Success response — `200 OK`** — returns updated workload:

```json
{
  "userId":             "USR-003",
  "assignedTickets":    12,
  "maxCapacity":        25,
  "utilizationPct":     48,
  "availabilityStatus": "BUSY"
}
```

**Error responses**:

| Status | Code                 | When                                              |
|--------|----------------------|---------------------------------------------------|
| 400    | `VALIDATION_ERROR`   | Invalid enum value or out-of-range `maxCapacity`  |
| 400    | `READONLY_FIELD`     | Body contains `assignedTickets` or `utilizationPct` |
| 401    | `UNAUTHORIZED`       | Missing or invalid JWT                            |
| 403    | `FORBIDDEN`          | Non-owner trying to set `maxCapacity` without `WORKLOAD_VIEW` |
| 404    | `USER_NOT_FOUND`     | No user with that ID                              |

---

### `GET /api/v1/users/workload-summary`

Aggregated workload statistics across all active internal agents.

**Auth**: `WORKLOAD_VIEW` permission required

**Query parameters**: None

**Request body**: None

**Success response — `200 OK`**:

```json
{
  "totalAgents":     8,
  "availableAgents": 5,
  "busyAgents":      2,
  "awayAgents":      1,
  "offlineAgents":   0,
  "avgUtilization":  0.64,
  "overloadedAgents": 1
}
```

| Field              | Description                                        |
|--------------------|----------------------------------------------------|
| `totalAgents`      | Active internal agents (AGENT + LEAD + ADMIN)      |
| `availableAgents`  | Count with status `AVAILABLE`                      |
| `busyAgents`       | Count with status `BUSY`                           |
| `awayAgents`       | Count with status `AWAY`                           |
| `offlineAgents`    | Count with status `OFFLINE` or `DO_NOT_DISTURB`    |
| `avgUtilization`   | Mean of `utilizationPct / 100` across all agents   |
| `overloadedAgents` | Count where `utilizationPct >= 90`                 |

**Error responses**:

| Status | Code           | When                                      |
|--------|----------------|-------------------------------------------|
| 401    | `UNAUTHORIZED` | Missing or invalid JWT                    |
| 403    | `FORBIDDEN`    | Missing `WORKLOAD_VIEW` permission        |

---

## 8. API Endpoints — Permission Overrides

---

### `GET /api/v1/users/:id/permissions`

Returns all active permission overrides for a user.

**Auth**:
- Internal user requesting another internal user's overrides → `USER_PERMISSION_MANAGE` required
- `CLIENT_ADMIN` requesting a member of their org → `MEMBER_MANAGE` required
- Own user → allowed (so the portal can show the user their own effective permissions)

**Path params**: `:id` — user ID

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "id":            "OVR-001",
    "userId":        "USR-005",
    "permission":    "DELIVERY_VIEW",
    "type":          "GRANT",
    "grantedBy":     "USR-001",
    "grantedByRole": "ADMIN",
    "reason":        "Needs delivery board access for cross-team project",
    "createdAt":     "2026-01-15T10:00:00Z",
    "expiresAt":     null
  },
  {
    "id":            "OVR-002",
    "userId":        "USR-005",
    "permission":    "REPORT_VIEW",
    "type":          "REVOKE",
    "grantedBy":     "USR-001",
    "grantedByRole": "ADMIN",
    "reason":        "Sensitive financial reports — not needed for this role",
    "createdAt":     "2026-02-10T09:00:00Z",
    "expiresAt":     null
  }
]
```

Returns `[]` if no overrides exist.

**Error responses**:

| Status | Code                  | When                                               |
|--------|-----------------------|----------------------------------------------------|
| 401    | `UNAUTHORIZED`        | Missing or invalid JWT                             |
| 403    | `FORBIDDEN`           | Caller lacks required permission for this context  |
| 403    | `CROSS_ORG_ACCESS`    | CLIENT_ADMIN trying to read a different org's user |
| 404    | `USER_NOT_FOUND`      | No user with that ID                               |

---

### `PATCH /api/v1/users/:id/permissions`

Create or update a permission override (GRANT or REVOKE). Uses upsert — if an override already exists for this user + permission, it is updated in place.

**Auth**:
- Internal user modifying another internal user → `USER_PERMISSION_MANAGE`
- ADMIN/LEAD modifying a `CLIENT_*` user → `USER_PERMISSION_MANAGE`
- `CLIENT_ADMIN` modifying their org member → `MEMBER_MANAGE` (ceiling rules apply — see §3.4)

**Path params**: `:id` — user ID (the target whose permissions are being changed)

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:

```json
{
  "permission": "DELIVERY_VIEW",
  "type":       "GRANT",
  "reason":     "Needs delivery board access for cross-team project",
  "expiresAt":  null
}
```

| Field        | Type            | Required | Description                                    |
|--------------|-----------------|----------|------------------------------------------------|
| `permission` | Permission enum | Yes      | The permission to grant or revoke              |
| `type`       | `GRANT\|REVOKE` | Yes      | Direction of the override                      |
| `reason`     | string          | No       | Audit trail note, max 500 chars                |
| `expiresAt`  | ISO 8601 string | No       | Auto-expiry date. `null` = never expires       |

**Success response — `200 OK`** (updated) or **`201 Created`** (new override):

```json
{
  "id":            "OVR-001",
  "userId":        "USR-005",
  "permission":    "DELIVERY_VIEW",
  "type":          "GRANT",
  "grantedBy":     "USR-001",
  "grantedByRole": "ADMIN",
  "reason":        "Needs delivery board access for cross-team project",
  "createdAt":     "2026-01-15T10:00:00Z",
  "expiresAt":     null
}
```

**Error responses**:

| Status | Code                        | When                                                              |
|--------|-----------------------------|-------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR`          | Missing required field or invalid enum value                      |
| 401    | `UNAUTHORIZED`              | Missing or invalid JWT                                            |
| 403    | `FORBIDDEN`                 | Caller lacks required permission                                  |
| 403    | `INTERNAL_ONLY_PERMISSION`  | Attempting to grant an internal-only perm to a `CLIENT_*` user   |
| 403    | `PERMISSION_CEILING_EXCEEDED` | `CLIENT_ADMIN` trying to grant a perm they don't hold or that's not in `CLIENT_USER` defaults |
| 403    | `ADMIN_LOCKED_PERMISSION`   | `CLIENT_ADMIN` trying to remove an ADMIN/LEAD-granted override    |
| 403    | `CROSS_ORG_ACCESS`          | `CLIENT_ADMIN` targeting a user in a different org               |
| 404    | `USER_NOT_FOUND`            | No user with that ID                                              |

---

## 9. API Endpoints — Team Members (org-scoped)

These endpoints are used exclusively by the **customer portal**. All responses are automatically scoped to `actor.organizationId` — there is no way to access another organisation's members through these routes.

---

### `GET /api/v1/team/members`

Returns a paginated list of users within the actor's organisation.

**Auth**: `MEMBER_VIEW` permission

**Query parameters**:

| Param    | Type    | Required | Description                                            |
|----------|---------|----------|--------------------------------------------------------|
| `page`   | number  | No       | Page number, default `1`                               |
| `limit`  | number  | No       | Page size, default `20`, max `100`                     |
| `role`   | string  | No       | `CLIENT_USER` or `CLIENT_ADMIN`                        |
| `search` | string  | No       | Searches `displayName` and `email` (case-insensitive)  |

**Request body**: None

**Success response — `200 OK`**:

```json
{
  "data": [
    {
      "id":          "USR-101",
      "email":       "alice@acme.com",
      "displayName": "Alice Johnson",
      "firstName":   "Alice",
      "lastName":    "Johnson",
      "role":        "CLIENT_ADMIN",
      "isActive":    true,
      "avatarUrl":   null,
      "lastLoginAt": "2026-04-18T10:00:00Z",
      "organizationId":   "ORG-001",
      "organizationName": "Acme Corp",
      "permissions": [
        "TICKET_CREATE", "TICKET_VIEW_ORG", "TICKET_EDIT",
        "COMMENT_CREATE", "MEMBER_VIEW", "KB_VIEW"
      ],
      "permissionOverrides": [
        {
          "id":            "OVR-010",
          "userId":        "USR-101",
          "permission":    "REPORT_VIEW",
          "type":          "GRANT",
          "grantedBy":     "USR-001",
          "grantedByRole": "ADMIN",
          "reason":        "Quarterly reporting access",
          "createdAt":     "2026-03-01T09:00:00Z",
          "expiresAt":     null
        }
      ],
      "created_at":  "2025-01-10T08:00:00Z",
      "updated_at":  "2026-04-18T10:00:00Z"
    }
  ],
  "total":       4,
  "page":        1,
  "page_size":   20,
  "total_pages": 1
}
```

**Error responses**:

| Status | Code           | When                              |
|--------|----------------|-----------------------------------|
| 401    | `UNAUTHORIZED` | Missing or invalid JWT            |
| 403    | `FORBIDDEN`    | Missing `MEMBER_VIEW` permission  |

---

### `PATCH /api/v1/team/members/:id/role`

Change the role of a member within the same organisation.

**Auth**: `MEMBER_MANAGE` permission

**Path params**: `:id` — target user ID

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:

```json
{
  "role": "CLIENT_ADMIN"
}
```

| Field  | Type   | Required | Constraints                              |
|--------|--------|----------|------------------------------------------|
| `role` | enum   | Yes      | Must be `CLIENT_USER` or `CLIENT_ADMIN` only. Any other value → 422. |

**Side effect**: All existing `permission_overrides` for this user are **deleted** when role changes. The new role's default permissions apply clean.

**Success response — `200 OK`** — returns the updated user object:

```json
{
  "id":          "USR-102",
  "email":       "bob@acme.com",
  "displayName": "Bob Smith",
  "role":        "CLIENT_ADMIN",
  "isActive":    true,
  "permissions": [
    "TICKET_CREATE", "TICKET_VIEW_ORG", "TICKET_EDIT",
    "TICKET_STATUS_CHANGE", "TICKET_REOPEN", "COMMENT_CREATE",
    "ATTACHMENT_UPLOAD", "ATTACHMENT_DELETE", "MEMBER_INVITE",
    "MEMBER_MANAGE", "MEMBER_VIEW", "REPORT_VIEW", "REPORT_EXPORT",
    "KB_VIEW", "SLA_VIEW", "WORKSPACE_CONFIGURE", "BRANDING_CONFIGURE",
    "PROJECT_VIEW", "AI_DIGEST", "AI_KB_SUGGEST",
    "ROADMAP_VOTE", "ROADMAP_REQUEST"
  ],
  "permissionOverrides": [],
  "organizationId":   "ORG-001",
  "organizationName": "Acme Corp",
  "updated_at": "2026-04-19T11:00:00Z"
}
```

**Error responses**:

| Status | Code               | When                                                    |
|--------|--------------------|---------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Missing `role` field                                    |
| 401    | `UNAUTHORIZED`     | Missing or invalid JWT                                  |
| 403    | `FORBIDDEN`        | Missing `MEMBER_MANAGE` permission                      |
| 403    | `CROSS_ORG_ACCESS` | Target user is in a different organisation              |
| 422    | `INVALID_ROLE`     | Role is not `CLIENT_USER` or `CLIENT_ADMIN`             |

---

### `PATCH /api/v1/team/members/:id/permissions`

Toggle a single permission for a team member. Uses ceiling rules (§3.4).

If an override already exists for this user + permission → delete it (revert to role default).  
If no override exists → create a `GRANT` override.

**Auth**: `MEMBER_MANAGE` permission + ceiling rules

**Path params**: `:id` — target user ID

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:

```json
{
  "permission": "REPORT_VIEW"
}
```

| Field        | Type            | Required | Description                        |
|--------------|-----------------|----------|------------------------------------|
| `permission` | Permission enum | Yes      | The permission to toggle           |

**Success response — `200 OK`** — returns the updated user object (same shape as GET team/members but single user):

```json
{
  "id":          "USR-102",
  "email":       "bob@acme.com",
  "displayName": "Bob Smith",
  "role":        "CLIENT_USER",
  "isActive":    true,
  "permissions": [
    "TICKET_CREATE", "TICKET_VIEW_OWN", "TICKET_REOPEN",
    "COMMENT_CREATE", "ATTACHMENT_UPLOAD", "MEMBER_VIEW",
    "KB_VIEW", "SLA_VIEW", "AI_DIGEST", "AI_KB_SUGGEST",
    "PROJECT_VIEW", "ROADMAP_VOTE",
    "REPORT_VIEW"
  ],
  "permissionOverrides": [
    {
      "id":            "OVR-020",
      "userId":        "USR-102",
      "permission":    "REPORT_VIEW",
      "type":          "GRANT",
      "grantedBy":     "USR-101",
      "grantedByRole": "CLIENT_ADMIN",
      "reason":        null,
      "createdAt":     "2026-04-19T11:05:00Z",
      "expiresAt":     null
    }
  ],
  "organizationId":   "ORG-001",
  "organizationName": "Acme Corp",
  "updated_at": "2026-04-19T11:05:00Z"
}
```

**Error responses**:

| Status | Code                          | When                                                              |
|--------|-------------------------------|-------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR`            | Missing `permission` field                                        |
| 401    | `UNAUTHORIZED`                | Missing or invalid JWT                                            |
| 403    | `FORBIDDEN`                   | Missing `MEMBER_MANAGE` permission                                |
| 403    | `CROSS_ORG_ACCESS`            | Target is in a different org                                      |
| 403    | `INTERNAL_ONLY_PERMISSION`    | Permission is on the internal-only list                           |
| 403    | `PERMISSION_CEILING_EXCEEDED` | Actor doesn't hold this perm or perm not in `CLIENT_USER` defaults |
| 403    | `ADMIN_LOCKED_PERMISSION`     | The existing override was granted by an internal ADMIN/LEAD       |

---

### `DELETE /api/v1/team/members/:id`

Soft-deactivate a team member. Sets `isActive = false`. Does **not** hard-delete the user or remove them from the organisation.

**Auth**: `MEMBER_MANAGE` permission

**Path params**: `:id` — target user ID

**Request body**: None

**Success response — `200 OK`**:

```json
{
  "success": true,
  "message": "User USR-102 has been deactivated."
}
```

**Error responses**:

| Status | Code                | When                                        |
|--------|---------------------|---------------------------------------------|
| 401    | `UNAUTHORIZED`      | Missing or invalid JWT                      |
| 403    | `FORBIDDEN`         | Missing `MEMBER_MANAGE` permission          |
| 403    | `CROSS_ORG_ACCESS`  | Target is in a different organisation       |
| 403    | `CANNOT_SELF_DEACTIVATE` | `actor.id == target.id`              |
| 404    | `USER_NOT_FOUND`    | No user with that ID                        |
| 409    | `ALREADY_INACTIVE`  | User is already deactivated                 |

---

## 10. API Endpoints — Assignment Scoring Weights

---

### `GET /api/v1/users/scoring-weights`

Returns the current global assignment scoring weights.

**Auth**: `SCORING_CONFIGURE` permission (ADMIN role)

**Request body**: None

**Success response — `200 OK`**:

```json
{
  "wSkill":    0.50,
  "wWorkload": 0.35,
  "wAvail":    0.15,
  "updatedAt": "2026-04-01T12:00:00Z",
  "updatedBy": "USR-001"
}
```

**Error responses**:

| Status | Code           | When                                  |
|--------|----------------|---------------------------------------|
| 401    | `UNAUTHORIZED` | Missing or invalid JWT                |
| 403    | `FORBIDDEN`    | Missing `SCORING_CONFIGURE` permission |

---

### `PATCH /api/v1/users/scoring-weights`

Update the global assignment scoring weights.

**Auth**: `SCORING_CONFIGURE` permission (ADMIN role)

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:

```json
{
  "wSkill":    0.60,
  "wWorkload": 0.25,
  "wAvail":    0.15
}
```

| Field      | Type   | Required | Constraints                            |
|------------|--------|----------|----------------------------------------|
| `wSkill`   | number | Yes      | 0.0 – 1.0 (decimal fraction)           |
| `wWorkload`| number | Yes      | 0.0 – 1.0 (decimal fraction)           |
| `wAvail`   | number | Yes      | 0.0 – 1.0 (decimal fraction)           |

**Validation**: `wSkill + wWorkload + wAvail` must be `1.0` ± 0.001. Reject with `422` if not.

**Success response — `200 OK`**:

```json
{
  "wSkill":    0.60,
  "wWorkload": 0.25,
  "wAvail":    0.15,
  "updatedAt": "2026-04-19T14:30:00Z",
  "updatedBy": "USR-001"
}
```

**Error responses**:

| Status | Code                   | When                                              |
|--------|------------------------|---------------------------------------------------|
| 400    | `VALIDATION_ERROR`     | Missing field or non-numeric value                |
| 401    | `UNAUTHORIZED`         | Missing or invalid JWT                            |
| 403    | `FORBIDDEN`            | Missing `SCORING_CONFIGURE` permission            |
| 422    | `WEIGHTS_SUM_INVALID`  | `wSkill + wWorkload + wAvail` does not equal 1.0  |

---

## 11. API Endpoints — AI Assignment

---

### `GET /api/v1/ai/users/assign-suggest/:ticketId`

Returns the top N agent suggestions for assigning a ticket, scored using the formula in §4.

**Auth**: `TICKET_ASSIGN` permission

**Path params**: `:ticketId` — ticket ID (e.g. `"TKT-1042"`)

**Query parameters**:

| Param   | Type   | Required | Description                         |
|---------|--------|----------|-------------------------------------|
| `limit` | number | No       | Max suggestions to return, default `3`, max `10` |

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "agentId":           "USR-003",
    "agentName":         "John Doe",
    "avatarUrl":         null,
    "score":             0.87,
    "skillMatchScore":   0.92,
    "workloadScore":     0.80,
    "availabilityScore": 1.00,
    "reasoning":         "Expert in Python and Django. 60% utilised (12/20 tickets). Available."
  },
  {
    "agentId":           "USR-006",
    "agentName":         "Sarah Park",
    "avatarUrl":         "https://cdn.example.com/avatars/sarah.jpg",
    "score":             0.72,
    "skillMatchScore":   0.80,
    "workloadScore":     0.60,
    "availabilityScore": 1.00,
    "reasoning":         "Intermediate Python. 40% utilised. Available."
  },
  {
    "agentId":           "USR-004",
    "agentName":         "Mike Chen",
    "avatarUrl":         null,
    "score":             0.55,
    "skillMatchScore":   0.60,
    "workloadScore":     0.50,
    "availabilityScore": 0.50,
    "reasoning":         "Beginner Python. 50% utilised. Currently busy."
  }
]
```

Returns `[]` if no eligible agents exist (all OFFLINE / DO_NOT_DISTURB and no fallback).

**Error responses**:

| Status | Code              | When                                 |
|--------|-------------------|--------------------------------------|
| 401    | `UNAUTHORIZED`    | Missing or invalid JWT               |
| 403    | `FORBIDDEN`       | Missing `TICKET_ASSIGN` permission   |
| 404    | `TICKET_NOT_FOUND`| No ticket with that ID               |

---

### `GET /api/v1/ai/users/skill-gaps`

Returns skills where there are open tickets but insufficient skilled agents to handle them.

**Auth**: `SCORING_CONFIGURE` OR `LEAD` role

**Query parameters**:

| Param       | Type   | Required | Description                                                      |
|-------------|--------|----------|------------------------------------------------------------------|
| `threshold` | number | No       | Min number of skilled agents required before flagging a gap. Default `2`. |

**Request body**: None

**Success response — `200 OK`**:

```json
[
  {
    "skillId":         "SKL-009",
    "skillName":       "Salesforce",
    "openTickets":     7,
    "agentsWithSkill": 1
  },
  {
    "skillId":         "SKL-015",
    "skillName":       "German",
    "openTickets":     3,
    "agentsWithSkill": 0
  }
]
```

Returns `[]` if no gaps detected.

**Algorithm**:
1. For each active skill in the taxonomy:
   - Count open (unresolved) tickets whose tags or category maps to this skill.
   - Count active agents who have this skill (any proficiency level).
2. Return entries where `openTickets > 0 AND agentsWithSkill < threshold`.
3. Sort by `openTickets DESC`.

**Error responses**:

| Status | Code           | When                                                  |
|--------|----------------|-------------------------------------------------------|
| 401    | `UNAUTHORIZED` | Missing or invalid JWT                                |
| 403    | `FORBIDDEN`    | Missing `SCORING_CONFIGURE` permission and not `LEAD` |

---

## 12. API Endpoints — User Invite (extended)

### `POST /api/v1/users/invite`

Existing endpoint extended with new fields for internal staff onboarding.

**Auth**: `MEMBER_INVITE` permission

**Request headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body** (new fields highlighted):

```json
{
  "email":             "jane.smith@3sc.com",
  "firstName":         "Jane",
  "lastName":          "Smith",
  "role":              "AGENT",
  "internalSubRole":   "SUPPORT",
  "department":        "Engineering",
  "skillIds":          ["SKL-001", "SKL-004"]
}
```

| Field             | Type            | Required | Constraints                                                 |
|-------------------|-----------------|----------|-------------------------------------------------------------|
| `email`           | string          | Yes      | Valid email, unique in system                               |
| `firstName`       | string          | No       | max 100 chars                                               |
| `lastName`        | string          | No       | max 100 chars                                               |
| `role`            | UserRole enum   | Yes      | Any valid role                                              |
| `internalSubRole` | InternalSubRole | **New** No | Only valid when `role ∈ { AGENT, LEAD, ADMIN }`. 422 if set on `CLIENT_*`. |
| `department`      | string          | **New** No | max 100 chars                                              |
| `skillIds`        | string[]        | **New** No | Array of skill IDs to pre-assign. Requires `SKILL_ASSIGN`. IDs must exist. |

**Success response — `201 Created`**:

```json
{
  "id":              "USR-050",
  "email":           "jane.smith@3sc.com",
  "displayName":     "Jane Smith",
  "firstName":       "Jane",
  "lastName":        "Smith",
  "role":            "AGENT",
  "internalSubRole": "SUPPORT",
  "department":      "Engineering",
  "isActive":        true,
  "permissions": [
    "TICKET_VIEW_ALL", "TICKET_EDIT", "TICKET_STATUS_CHANGE",
    "COMMENT_CREATE", "COMMENT_INTERNAL", "ATTACHMENT_UPLOAD",
    "AI_SUGGEST", "AI_FEEDBACK", "AI_KB_SUGGEST",
    "KB_VIEW", "SLA_VIEW", "ESCALATION_VIEW", "MEMBER_VIEW",
    "PROJECT_VIEW", "AI_PROJECT_QA"
  ],
  "permissionOverrides": [],
  "skills": [
    { "skillId": "SKL-001", "level": "INTERMEDIATE", "endorsements": 0 },
    { "skillId": "SKL-004", "level": "INTERMEDIATE", "endorsements": 0 }
  ],
  "organizationId": null,
  "created_at": "2026-04-19T12:00:00Z",
  "updated_at": "2026-04-19T12:00:00Z"
}
```

**Error responses**:

| Status | Code                   | When                                                    |
|--------|------------------------|---------------------------------------------------------|
| 400    | `VALIDATION_ERROR`     | Missing `email` or `role`                               |
| 401    | `UNAUTHORIZED`         | Missing or invalid JWT                                  |
| 403    | `FORBIDDEN`            | Missing `MEMBER_INVITE` permission                      |
| 403    | `SKILL_ASSIGN_REQUIRED`| `skillIds` provided but actor lacks `SKILL_ASSIGN`      |
| 409    | `EMAIL_ALREADY_EXISTS` | Email is already registered                             |
| 422    | `INVALID_SUB_ROLE`     | `internalSubRole` set on a `CLIENT_*` role              |
| 422    | `INVALID_SKILL_ID`     | One or more `skillIds` don't exist in the taxonomy      |

---

## 13. API Endpoints — Password Reset

### `POST /api/v1/users/:id/reset-password`

Triggers an admin-initiated password reset for a target user. Sends a one-time reset link via email and invalidates all existing sessions.

**Auth**: `PASSWORD_RESET` permission (ADMIN role)

**Path params**: `:id` — target user ID

**Request body**: None (or optionally `{}`)

**Success response — `200 OK`**:

```json
{
  "success": true,
  "message": "Password reset email sent to alice@acme.com"
}
```

**Behaviour**:
1. Generate a one-time reset token (cryptographically random, 32+ bytes).
2. Store the SHA-256 hash of the token in a `password_reset_tokens` table with a 1-hour TTL.
3. Send reset email to `user.email` containing the reset link.
4. Invalidate all active sessions / JWTs for the target user (rotate `jti` / bump `token_version`).

**Error responses**:

| Status | Code               | When                                    |
|--------|--------------------|-----------------------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid JWT                  |
| 403    | `FORBIDDEN`        | Missing `PASSWORD_RESET` permission     |
| 403    | `CANNOT_RESET_SELF`| Actor targeting their own account (use standard reset flow) |
| 404    | `USER_NOT_FOUND`   | No user with that ID                    |
| 429    | `RATE_LIMITED`     | Reset already sent in the last 5 minutes for this user |

---

## 14. Extended User Object

The full `User` shape returned from `/api/v1/users/:id` and embedded in team/member list responses. All new fields are nullable and backward-compatible.

```json
{
  "id":              "USR-003",
  "email":           "john.doe@3sc.com",
  "displayName":     "John Doe",
  "firstName":       "John",
  "lastName":        "Doe",
  "role":            "AGENT",
  "internalSubRole": "SUPPORT",
  "department":      "Engineering",
  "timezone":        "Europe/London",
  "isActive":        true,
  "mfaEnabled":      false,
  "avatarUrl":       null,
  "organizationId":  null,
  "organizationName":null,
  "lastLoginAt":     "2026-04-18T10:00:00Z",

  "permissions": [
    "TICKET_VIEW_ALL",
    "TICKET_EDIT",
    "TICKET_STATUS_CHANGE",
    "COMMENT_CREATE",
    "COMMENT_INTERNAL",
    "ATTACHMENT_UPLOAD",
    "AI_SUGGEST",
    "AI_FEEDBACK",
    "AI_KB_SUGGEST",
    "KB_VIEW",
    "SLA_VIEW",
    "ESCALATION_VIEW",
    "MEMBER_VIEW",
    "PROJECT_VIEW",
    "AI_PROJECT_QA",
    "DELIVERY_VIEW"
  ],

  "permissionOverrides": [
    {
      "id":            "OVR-001",
      "userId":        "USR-003",
      "permission":    "DELIVERY_VIEW",
      "type":          "GRANT",
      "grantedBy":     "USR-001",
      "grantedByRole": "ADMIN",
      "reason":        "Cross-team project access",
      "createdAt":     "2026-01-15T10:00:00Z",
      "expiresAt":     null
    }
  ],

  "skills": [
    { "skillId": "SKL-001", "level": "EXPERT",        "endorsements": 3 },
    { "skillId": "SKL-004", "level": "INTERMEDIATE",  "endorsements": 1 },
    { "skillId": "SKL-007", "level": "INTERMEDIATE",  "endorsements": 0 }
  ],

  "workload": {
    "userId":             "USR-003",
    "assignedTickets":    12,
    "maxCapacity":        20,
    "utilizationPct":     60,
    "availabilityStatus": "AVAILABLE"
  },

  "created_at": "2025-01-10T08:00:00Z",
  "updated_at": "2026-04-18T10:00:00Z"
}
```

### Field-by-field notes

| Field                | Internal users  | CLIENT_* users    | Notes                                                  |
|----------------------|-----------------|-------------------|--------------------------------------------------------|
| `internalSubRole`    | nullable string | always `null`     |                                                        |
| `department`         | nullable string | nullable string   |                                                        |
| `timezone`           | nullable string | nullable string   | IANA tz name e.g. `"Europe/London"`                    |
| `mfaEnabled`         | boolean         | boolean           |                                                        |
| `permissions`        | included        | included          | **Effective** permissions after override application   |
| `permissionOverrides`| included        | included          | Raw override rows for UI display in permission modal   |
| `skills`             | included        | `null` / omitted  | Only populated for internal users                      |
| `workload`           | included        | `null` / omitted  | Only populated for internal users                      |

### Performance note — list endpoints

On paginated list endpoints (`GET /users`, `GET /team/members`), include `workload` **only** when the query param `?include=workload` is present, to avoid N+1 queries. Always include it on single-user `GET /users/:id`.

---

## 15. Standard Error Envelope

All error responses use this shape:

```json
{
  "error": {
    "code":    "PERMISSION_CEILING_EXCEEDED",
    "message": "You cannot grant a permission you do not hold yourself.",
    "details": {
      "permission": "REPORT_EXPORT"
    }
  }
}
```

| Field              | Type   | Description                                               |
|--------------------|--------|-----------------------------------------------------------|
| `error.code`       | string | Machine-readable error code (used by frontend to branch)  |
| `error.message`    | string | Human-readable explanation                                |
| `error.details`    | object | Optional extra context (e.g. which field failed, which perm) |

### Error code reference

| Code                          | HTTP | Meaning                                                   |
|-------------------------------|------|-----------------------------------------------------------|
| `UNAUTHORIZED`                | 401  | Missing, expired, or invalid JWT                          |
| `FORBIDDEN`                   | 403  | Authenticated but lacks required permission               |
| `INTERNAL_ONLY_PERMISSION`    | 403  | Trying to assign an internal-only perm to a CLIENT user   |
| `PERMISSION_CEILING_EXCEEDED` | 403  | CLIENT_ADMIN trying to grant perm above their ceiling     |
| `ADMIN_LOCKED_PERMISSION`     | 403  | CLIENT_ADMIN trying to remove an ADMIN-granted override   |
| `CROSS_ORG_ACCESS`            | 403  | Actor targeting a user in a different organisation        |
| `CANNOT_SELF_DEACTIVATE`      | 403  | Actor targeting their own account for deactivation        |
| `CANNOT_RESET_SELF`           | 403  | Actor targeting their own account for password reset      |
| `SKILL_ASSIGN_REQUIRED`       | 403  | `skillIds` provided but actor lacks `SKILL_ASSIGN`        |
| `USER_NOT_FOUND`              | 404  | No user with the given ID                                 |
| `TICKET_NOT_FOUND`            | 404  | No ticket with the given ID                               |
| `VALIDATION_ERROR`            | 400  | Missing required field or invalid format                  |
| `READONLY_FIELD`              | 400  | Attempted write to computed field                         |
| `INVALID_ROLE`                | 422  | Role value not allowed in this context                    |
| `INVALID_SUB_ROLE`            | 422  | `internalSubRole` set on a `CLIENT_*` role                |
| `INVALID_SKILL_ID`            | 422  | Skill ID doesn't exist in taxonomy                        |
| `WEIGHTS_SUM_INVALID`         | 422  | Scoring weights don't sum to 1.0                          |
| `DUPLICATE_SKILL`             | 409  | Skill name already exists                                 |
| `EMAIL_ALREADY_EXISTS`        | 409  | Email is already registered                               |
| `ALREADY_INACTIVE`            | 409  | Tried to deactivate an already-inactive user              |
| `RATE_LIMITED`                | 429  | Too many requests (e.g. password reset cooldown)          |

---

## 16. Database Migration

```sql
-- ── 1. Extend users table ────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN internal_sub_role   ENUM('DEVELOPER','DELIVERY','SUPPORT','TEAM_LEAD','ADMIN') NULL,
  ADD COLUMN department          VARCHAR(100) NULL,
  ADD COLUMN timezone            VARCHAR(64)  NULL DEFAULT 'UTC',
  ADD COLUMN mfa_enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN max_capacity        INT          NOT NULL DEFAULT 20,
  ADD COLUMN availability_status ENUM('AVAILABLE','BUSY','AWAY','DO_NOT_DISTURB','OFFLINE')
                                              NOT NULL DEFAULT 'AVAILABLE';

-- ── 2. Skills taxonomy ───────────────────────────────────────────────────────
CREATE TABLE skills (
  id          VARCHAR(16)   NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  category    VARCHAR(100)  NOT NULL,
  description TEXT          NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_name (name)
);

-- ── 3. User ↔ Skill join ─────────────────────────────────────────────────────
CREATE TABLE user_skills (
  user_id      VARCHAR(36)                                    NOT NULL,
  skill_id     VARCHAR(16)                                    NOT NULL,
  level        ENUM('BEGINNER','INTERMEDIATE','EXPERT')       NOT NULL DEFAULT 'INTERMEDIATE',
  endorsements INT                                            NOT NULL DEFAULT 0,
  updated_at   DATETIME                                       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_us_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- ── 4. Permission overrides ──────────────────────────────────────────────────
CREATE TABLE permission_overrides (
  id              VARCHAR(36)          NOT NULL DEFAULT (UUID()),
  user_id         VARCHAR(36)          NOT NULL,
  permission      VARCHAR(64)          NOT NULL,
  type            ENUM('GRANT','REVOKE') NOT NULL,
  granted_by      VARCHAR(36)          NOT NULL,
  granted_by_role VARCHAR(32)          NOT NULL,
  reason          TEXT                 NULL,
  created_at      DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME             NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_permission (user_id, permission),
  CONSTRAINT fk_po_user      FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_grantor   FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Index for expiry cleanup job
CREATE INDEX idx_po_expires_at ON permission_overrides (expires_at);

-- ── 5. Assignment scoring weights (single-row config) ────────────────────────
CREATE TABLE assignment_scoring_weights (
  id         INT           NOT NULL DEFAULT 1,
  w_skill    DECIMAL(5,4)  NOT NULL DEFAULT 0.5000,
  w_workload DECIMAL(5,4)  NOT NULL DEFAULT 0.3500,
  w_avail    DECIMAL(5,4)  NOT NULL DEFAULT 0.1500,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(36)   NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_weights_sum CHECK (ABS(w_skill + w_workload + w_avail - 1.0) < 0.001)
);

-- Seed default row
INSERT INTO assignment_scoring_weights (id, w_skill, w_workload, w_avail, updated_by)
VALUES (1, 0.5000, 0.3500, 0.1500, 'SYSTEM')
ON DUPLICATE KEY UPDATE id = id; -- no-op if already seeded

-- ── 6. Password reset tokens ─────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id      VARCHAR(36)  NOT NULL,
  token_hash   VARCHAR(64)  NOT NULL,  -- SHA-256 hex of the raw token
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME     NOT NULL,  -- created_at + 1 hour
  used_at      DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 17. Security Checklist

| # | Rule | Where enforced | Error returned |
|---|------|----------------|----------------|
| 1 | `CLIENT_*` users cannot have internal-only permissions | `PATCH /users/:id/permissions` + `PATCH /team/members/:id/permissions` | `403 INTERNAL_ONLY_PERMISSION` |
| 2 | CLIENT_ADMIN can only grant/revoke perms they hold AND that are in `CLIENT_USER` defaults | `PATCH /team/members/:id/permissions` | `403 PERMISSION_CEILING_EXCEEDED` |
| 3 | CLIENT_ADMIN cannot remove overrides granted by ADMIN/LEAD | `PATCH /team/members/:id/permissions` — check `grantedByRole` | `403 ADMIN_LOCKED_PERMISSION` |
| 4 | All `/team/members/*` routes scoped to actor's org | Every route — filter by `actor.organizationId` | `403 CROSS_ORG_ACCESS` |
| 5 | Cannot deactivate yourself | `DELETE /team/members/:id` — check `actor.id !== target.id` | `403 CANNOT_SELF_DEACTIVATE` |
| 6 | Role change in team portal restricted to CLIENT roles only | `PATCH /team/members/:id/role` | `422 INVALID_ROLE` |
| 7 | Role change resets all permission overrides | `PATCH /team/members/:id/role` — delete all rows in `permission_overrides` for target | — |
| 8 | Soft-delete only — no hard delete from customer portal | `DELETE /team/members/:id` — sets `isActive = false` only | — |
| 9 | `internalSubRole` cannot be set on CLIENT_* users | `POST /users/invite` + `PATCH /users/:id` | `422 INVALID_SUB_ROLE` |
| 10 | `skills` and `workload` only returned for internal users | All user read endpoints | — |
| 11 | Scoring weights must sum to 1.0 | `PATCH /users/scoring-weights` | `422 WEIGHTS_SUM_INVALID` |
| 12 | Password reset cannot target self | `POST /users/:id/reset-password` | `403 CANNOT_RESET_SELF` |
| 13 | Password reset invalidates all sessions for target | `POST /users/:id/reset-password` — bump `token_version` on user row | — |
| 14 | Expired permission overrides must be excluded from effective perms | All session creation / token refresh | — |
| 15 | `assignedTickets` and `utilizationPct` are read-only | `PATCH /users/:id/workload` | `400 READONLY_FIELD` |

---

## 18. Seed Data

Seed the following skills in all environments:

```sql
INSERT INTO skills (id, name, category, description) VALUES
  ('SKL-001', 'Python',              'Technical',     'Python programming language'),
  ('SKL-002', 'JavaScript',          'Technical',     'JavaScript / TypeScript'),
  ('SKL-003', 'React',               'Technical',     'React front-end framework'),
  ('SKL-004', 'Django',              'Technical',     'Django web framework'),
  ('SKL-005', 'AWS',                 'Infrastructure','Amazon Web Services'),
  ('SKL-006', 'Docker',              'Infrastructure','Containerisation with Docker'),
  ('SKL-007', 'SQL',                 'Technical',     'Relational databases / SQL'),
  ('SKL-008', 'REST API',            'Technical',     'RESTful API design and integration'),
  ('SKL-009', 'Salesforce',          'CRM',           'Salesforce CRM platform'),
  ('SKL-010', 'HubSpot',             'CRM',           'HubSpot CRM platform'),
  ('SKL-011', 'Project Management',  'Delivery',      'Project planning and delivery'),
  ('SKL-012', 'Agile/Scrum',         'Delivery',      'Agile methodologies and Scrum'),
  ('SKL-013', 'Technical Writing',   'Communication', 'Documentation and technical writing'),
  ('SKL-014', 'Customer Success',    'Communication', 'Customer relationship management'),
  ('SKL-015', 'German',              'Language',      'German language support'),
  ('SKL-016', 'French',              'Language',      'French language support'),
  ('SKL-017', 'Spanish',             'Language',      'Spanish language support'),
  ('SKL-018', 'Data Analysis',       'Analytics',     'Data analysis and reporting'),
  ('SKL-019', 'Security',            'Technical',     'Cybersecurity and compliance');
```

---

## 19. Frontend Integration Notes

- The frontend uses **RTK Query** (Redux Toolkit Query). Every endpoint in §5–§13 has a corresponding hook exported from `packages/api/src/index.ts`.
- Mock service handlers in `apps/internal-console/src/mocks/handler.ts` and `apps/customer-portal/src/mocks/handler.ts` demonstrate exact expected request/response shapes — use them as reference.
- `packages/permissions/src/index.ts` exports `ROLE_PERMISSIONS` and `INTERNAL_ONLY_PERMISSIONS`. Mirror these exactly in the backend — do not derive independently.
- The JWT session payload **must include** `"permissions": [...]` (effective permissions array). The frontend reads this once on login and uses it for all permission-gated rendering without additional API calls.
- The `PermissionChecker` class (`packages/permissions/src/index.ts`) is the frontend's single interface for checking permissions — it accepts the `permissions` array from the session and provides named helper methods (`canConfigureScoring()`, `canAssignSkills()`, etc.).
- When a permission override expires (`expiresAt < NOW()`), the next token refresh must recompute effective permissions. The frontend does not poll for expiry — it trusts the session until it naturally refreshes or re-authenticates.
