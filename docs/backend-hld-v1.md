# 3SC Platform — Backend High-Level Design (HLD)

**Version:** 1.0  
**Author:** Senior Backend Architect  
**Date:** 2026-04-20  
**Deployment Target:** Railway (Free Tier → Pro Tier)  
**Frontend Context:** React SPA monorepo (`customer-portal` + `internal-console`)  

---

## 1. Executive Summary

This document outlines a **monolithic-modular backend architecture** designed to support the 3SC platform's current feature set while enabling horizontal scaling when moving beyond Railway's free tier. The design prioritizes:

1. **Operational simplicity** (single deployable on Railway free tier)
2. **Domain-driven modularity** (NestJS modules map to bounded contexts)
3. **Cloud-native patterns** (12-factor app, stateless processes, config via env)
4. **Security-first** (RBAC + ABAC, audit trails, tenant isolation, zero-trust networking)

---

## 2. Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Single Deployable, Multiple Processes** | One NestJS app serves HTTP + WebSocket + background workers (BullMQ). On free tier, run in one container. On scale, split workers to separate services. |
| **Database-per-Tenant (Row-Level)** | Single PostgreSQL DB with `tenant_id` column on every table + RLS policies. Avoids ops complexity of DB-per-tenant. |
| **API-First** | REST for CRUD, WebSocket for realtime, BullMQ for async jobs. GraphQL is intentionally deferred until mobile needs arise. |
| **Event-Driven Internally** | NestJS EventEmitter for decoupled domain events (e.g., `TicketCreatedEvent` → SLA engine + Audit logger + Notification service + AI analyzer). |
| **CQRS Read/Write Split (Logical)** | Same DB, but separate query models optimized for reads (materialized views, denormalized analytics tables). Physical split to read-replicas on scale. |
| **Defense in Depth** | WAF (Cloudflare) → Rate Limit (Redis) → Auth (JWT + HttpOnly cookies) → RLS (Postgres) → Field-level encryption (sensitive PII). |

---

## 3. Technology Stack

### 3.1 Core Runtime

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Framework** | **NestJS 10+** (Node.js 20 LTS) | TypeScript alignment with frontend, built-in DI, guards/interceptors/filters, OpenAPI auto-gen, CQRS module, mature ecosystem. |
| **ORM** | **Prisma** | Type-safe queries, migration engine, excellent PostgreSQL support, connection pooling via `pgBouncer` compatible. |
| **Validation** | **Zod** + `zod-validation-error` | Schema-first DTO validation, shareable schemas between frontend/backend if needed. |
| **Config** | `@nestjs/config` + `joi` | 12-factor config validation, env-var driven. |

### 3.2 Data & Caching

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Primary DB** | **PostgreSQL 16** (Railway plugin) | Railway free tier includes PG. ACID compliance, JSONB for flexible metadata, `pgvector` for semantic search, RLS for tenant isolation. |
| **Cache / Session** | **Redis 7** (Railway plugin or Upstash) | Session store, BullMQ backing, rate limit counters, AI digest cache (5-10 min TTL), realtime presence. |
| **Search** | **PostgreSQL + pgvector** | Full-text search via `tsvector`/`tsquery`. Semantic search via `pgvector` (OpenAI embeddings). Eliminates Elasticsearch ops overhead on free tier. |
| **Object Storage** | **Cloudflare R2** (Free tier: 10GB/mo) | S3-compatible, zero egress fees (critical for file downloads), presigned URL support. Alternative: Supabase Storage. |

### 3.3 Async Processing

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Task Queue** | **BullMQ** (Redis-backed) | Delayed jobs, retries, job progress, rate-limited queues. SLA monitor, email sender, AI report generator = separate queues. |
| **Job Scheduler** | **BullMQ Pro** (or `bullmq` cron repeat) | Cron-like scheduling for SLA deadline checks, digest emails, data retention jobs. |

### 3.4 Realtime

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **WebSocket** | **Socket.io** (NestJS Gateway) | Fallback to HTTP long-polling (matches frontend's `/realtime/poll` fallback), room-based broadcasting per `tenant_id`, Redis adapter for multi-instance sync. |

### 3.5 AI / ML Integration

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **LLM Provider** | **OpenAI GPT-4o-mini** (primary) + **Anthropic Claude 3 Haiku** (fallback) | Cost-effective for high-volume ticket classification/summarization. GPT-4o for complex reasoning (routing, project health). |
| **Embeddings** | **OpenAI text-embedding-3-small** | 1536 dims, cheap, stored in `pgvector`. |
| **Orchestration** | **In-house service** (NestJS module) | Not LangChain — too heavy/abstraction-leaky. Simple service with retry logic, prompt templating, token budgeting. |

### 3.6 Observability & Security (Free Tier Friendly)

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Logging** | **Pino** (structured JSON) | Railway captures stdout logs. Structured logs for later parsing into Grafana/Loki. |
| **Metrics** | **Prometheus client** + **Grafana** (optional, self-hosted or free cloud) | NestJS `@willsoto/nestjs-prometheus` for basic request counts, queue depths, DB connection pool stats. |
| **APM** | **Sentry** (Free tier: 5k errors/mo) | Error tracking, performance monitoring. Essential for production. |
| **Rate Limiting** | `@nestjs/throttler` + Redis store | Per-IP and per-user tiered limits. 100 req/min for public, 1000 req/min for authenticated. |
| **Secrets** | Railway Variables + **Infisical** (free self-hosted) or Doppler | Env-based secret injection. Rotate DB credentials via Railway dashboard. |

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│  ┌─────────────────────┐    ┌─────────────────────┐                            │
│  │  Customer Portal    │    │  Internal Console   │                            │
│  │  (React + RTK Query)│    │  (React + RTK Query)│                            │
│  └──────────┬──────────┘    └──────────┬──────────┘                            │
│             │ HTTPS                     │                                       │
│             │ Cookie: session=xxx       │                                       │
└─────────────┼───────────────────────────┼───────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  Cloudflare (Free Plan)                                                  │    │
│  │  • DNS + Proxy                                                           │    │
│  │  • DDoS Protection                                                       │    │
│  │  • WAF Rules (SQLi, XSS blocking)                                        │    │
│  │  • Browser Integrity Check                                               │    │
│  │  • Cache static assets (if serving portal from same domain)              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY PLATFORM (Free Tier)                             │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                    NESTJS APPLICATION (Single Container)                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │   │
│  │  │  HTTP API    │ │  WS Gateway  │ │  BullMQ      │ │  Cron Worker │     │   │
│  │  │  (Express)   │ │  (Socket.io) │ │  Processor   │ │  (Repeatable)│     │   │
│  │  │  Port 3000   │ │  Port 3001   │ │  (Embedded)  │ │              │     │   │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘     │   │
│  │         │                │                │                │              │   │
│  │  ┌──────┴────────────────┴────────────────┴────────────────┴──────────┐   │   │
│  │  │                    SHARED KERNEL                                      │   │
│  │  │  Guards • Interceptors • Pipes • Filters • Exception Handling        │   │   │
│  │  │  Logging (Pino) • Metrics (Prometheus) • Tracing (Sentry)            │   │   │
│  │  └────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                               │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │   │
│  │  │ Auth Module │ │ User Module │ │ Ticket Mod  │ │ Org Module  │          │   │
│  │  │             │ │             │ │             │ │             │          │   │
│  │  │ • JWT/Ref   │ │ • CRUD      │ │ • CRUD      │ │ • CRUD      │          │   │
│  │  │ • Password  │ │ • Skills    │ │ • State Mach│ │ • Branding  │          │   │
│  │  │ • RBAC      │ │ • Workload  │ │ • Search    │ │ • Members   │          │   │
│  │  │ • Perm Over │ │ • Invite    │ │ • Attach.   │ │ • Settings  │          │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │   │
│  │  │ KB Module   │ │ SLA Engine  │ │ AI Service  │ │ Audit Log   │          │   │
│  │  │             │ │             │ │             │ │             │          │   │
│  │  │ • Semantic  │ │ • Deadline  │ │ • Classify  │ │ • Immutable │          │   │
│  │  │   Search    │ │   Calc      │ │ • Route     │ │ • Append-   │          │   │
│  │  │ • Vector DB │ │ • Escalate  │ │ • Summarize │ │   only      │          │   │
│  │  │ • Vote      │ │ • Breach    │ │ • Embed     │ │ • Export    │          │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │   │
│  │  │ Notif. Mod  │ │ Routing Mod │ │ Realtime    │ │ Analytics   │          │   │
│  │  │             │ │             │ │             │ │             │          │   │
│  │  │ • Email     │ │ • Rule Eval │ │ • Room Mgmt │ │ • Mat Views │          │   │
│  │  │ • In-app    │ │ • Auto-assign│ │ • Presence  │ │ • Rollups   │          │   │
│  │  │ • Digest    │ │             │ │ • Broadcast │ │ • Time-series│         │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  PostgreSQL 16   │  │  Redis 7         │  │  Cloudflare R2               │  │
│  │  (Railway Plugin)│  │  (Railway Plugin)│  │  (S3-compatible, 0 egress)   │  │
│  │  • RLS enabled   │  │  • Sessions      │  │  • Presigned uploads         │  │
│  │  • pgvector ext  │  │  • BullMQ        │  │  • Private downloads         │  │
│  │  • Full-text idx │  │  • Rate limits   │  │  • CDN-ready                 │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Deployment on Railway Free Tier

Railway free tier gives you **$5/month credit** (~500 compute hours). Strategy:

| Service | Railway Config | Notes |
|---------|---------------|-------|
| **NestJS App** | 1 service, 512MB RAM, shared CPU | Use `NODE_ENV=production`, enable compression, keep dependencies lean. |
| **PostgreSQL** | Railway PostgreSQL plugin | Free tier includes 1GB storage. Monitor usage. |
| **Redis** | Railway Redis plugin OR Upstash Redis (free 10k cmds/day) | Upstash is serverless Redis — better for sporadic traffic on free tier. |
| **Domain** | Railway provided `*.railway.app` or custom domain via Cloudflare | Use Cloudflare for SSL termination + security. |

**Resource optimization tricks for free tier:**
- Prisma connection limit: `connection_limit=5` (default 9 is too high for small PG)
- BullMQ: limit concurrent jobs to 2-3 per queue
- WebSocket: implement aggressive heartbeat (30s) + connection timeout to free memory
- PM2 cluster mode: **disabled** on free tier (saves memory). Single process.
- Use `swc` for NestJS builds (faster startup, lower memory)

---

## 5. Domain-Driven Design (DDD) — Module Boundaries

Each NestJS module is a **bounded context** with its own:
- Controller (HTTP routes)
- Service (business logic)
- Repository (Prisma queries)
- DTOs (Zod schemas)
- Events (domain events)
- Subscribers (event handlers)

```
src/
├── main.ts
├── app.module.ts
├── shared/                          # Shared Kernel
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── permissions.guard.ts     # Three-layer resolution
│   │   └── tenant.guard.ts          # Injects tenant_id into request
│   ├── interceptors/
│   │   ├── logging.interceptor.ts   # Pino structured logging
│   │   ├── transform.interceptor.ts # Snake_case response envelope
│   │   └── timeout.interceptor.ts   # 30s max request timeout
│   ├── pipes/
│   │   ├── zod-validation.pipe.ts
│   │   └── tenant-id.pipe.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts # Standardized error envelope
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── require-permission.decorator.ts
│   │   └── tenant-id.decorator.ts
│   ├── prisma/
│   │   ├── prisma.service.ts        # PrismaClient with $extends
│   │   ├── prisma.module.ts
│   │   └── extensions/
│   │       ├── tenant-extension.ts  # Auto-inject tenant_id into queries
│   │       └── audit-extension.ts   # Auto-log mutations
│   ├── redis/
│   │   └── redis.module.ts
│   ├── bullmq/
│   │   └── bullmq.module.ts
│   └── utils/
│       └── password.utils.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts      # Access token (15 min)
│   │   │   └── jwt-refresh.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh.dto.ts
│   │
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/
│   │
│   ├── organizations/
│   │   ├── organizations.controller.ts
│   │   ├── organizations.service.ts
│   │   └── organizations.module.ts
│   │
│   ├── tickets/                     # Core domain — most complex
│   │   ├── tickets.controller.ts
│   │   ├── tickets.service.ts
│   │   ├── tickets.module.ts
│   │   ├── ticket-state-machine.ts  # Pure function, testable
│   │   ├── events/
│   │   │   └── ticket-created.event.ts
│   │   └── subscribers/
│   │       ├── ticket-sla.subscriber.ts
│   │       ├── ticket-audit.subscriber.ts
│   │       └── ticket-notification.subscriber.ts
│   │
│   ├── comments/
│   ├── attachments/
│   ├── projects/
│   ├── knowledge-base/
│   │   ├── kb.controller.ts
│   │   ├── kb.service.ts
│   │   ├── kb-search.service.ts     # Hybrid: pgvector + full-text
│   │   └── kb.module.ts
│   │
│   ├── notifications/
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.module.ts
│   │   └── processors/
│   │       ├── email.processor.ts   # BullMQ worker
│   │       ├── digest.processor.ts
│   │       └── in-app.processor.ts
│   │
│   ├── sla/                         # SLA Engine
│   │   ├── sla.controller.ts
│   │   ├── sla.service.ts
│   │   ├── sla-calculator.service.ts # Business hours aware
│   │   ├── sla-monitor.processor.ts  # BullMQ cron: check deadlines every 5 min
│   │   └── sla.module.ts
│   │
│   ├── ai/                          # AI Orchestration Layer
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts
│   │   ├── ai.module.ts
│   │   ├── providers/
│   │   │   ├── openai.provider.ts
│   │   │   └── anthropic.provider.ts
│   │   ├── prompts/
│   │   │   ├── classify-ticket.prompt.ts
│   │   │   ├── summarize-ticket.prompt.ts
│   │   │   └── route-ticket.prompt.ts
│   │   └── embeddings/
│   │       └── embedding.service.ts
│   │
│   ├── routing/                     # Auto-assignment rules
│   ├── delivery/                    # Feature pipeline
│   ├── onboarding/
│   ├── roadmap/
│   ├── escalations/
│   ├── audit-logs/
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── materialized-views/      # SQL definitions for rollups
│   │
│   ├── realtime/
│   │   ├── realtime.gateway.ts      # Socket.io
│   │   ├── realtime.module.ts
│   │   └── realtime.service.ts      # Room management, broadcast
│   │
│   └── permissions/                 # Permission override system
│       ├── permissions.controller.ts
│       ├── permissions.service.ts
│       ├── permission-resolver.ts   # Role + Grant - Revoke
│       └── permissions.module.ts
```

---

## 6. Multi-Tenancy Strategy

### 6.1 Row-Level Security (RLS) — The Secure Default

Every table has a `tenant_id` column. Prisma extension auto-injects it:

```typescript
// prisma/extensions/tenant-extension.ts
prisma.$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, tenant_id: currentTenantId() };
        return query(args);
      },
      // ... all operations
    },
  },
});
```

**Plus PostgreSQL RLS policies as defense-in-depth:**

```sql
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tickets
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

Every Prisma transaction sets: `SET LOCAL app.current_tenant = '...'`

This means **even if application code has a bug and forgets tenant filtering, the database enforces isolation.**

### 6.2 Tenant Resolution

```
Request → TenantGuard → Extract tenant_id from:
  1. Query param (?tenant_id=xxx) — for WebSocket connections
  2. Custom header (X-Tenant-ID) — for API calls
  3. JWT claim (preferred) — embedded in access token
→ Validate user belongs to tenant
→ Inject into RequestContext (AsyncLocalStorage)
```

---

## 7. Authentication & Authorization

### 7.1 Cookie-Based Auth (Matches Frontend)

```
POST /user/login
  → Validate credentials
  → Generate access_token (JWT, 15 min, in-memory only)
  → Generate refresh_token (JWT, 7 days, HttpOnly cookie)
  → Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/token/refresh
  → Response body: { access_token, user: {...} }

Subsequent requests:
  → Authorization: Bearer <access_token>
  → On 401: POST /token/refresh (sends HttpOnly cookie automatically)
    → Returns new access_token
```

**Security measures:**
- Refresh token rotation: new refresh token on every use, old one blacklisted in Redis
- Token family detection: if stolen refresh token is reused, entire family revoked (prevents replay attacks)
- Rate limit: 5 login attempts per IP per 5 minutes (Redis-backed)

### 7.2 Permission System (Three-Layer Resolution)

```typescript
// permission-resolver.ts
resolve(user, action, resource): boolean {
  // Layer 1: Role-based default permissions
  const rolePerms = ROLE_PERMISSIONS[user.role];
  
  // Layer 2: Add explicit GRANT overrides
  const grants = await this.permissionOverrideRepo.getGrants(user.id, resource);
  
  // Layer 3: Subtract REVOKE overrides
  const revokes = await this.permissionOverrideRepo.getRevokes(user.id, resource);
  
  // Ceiling enforcement: CLIENT_ADMIN cannot exceed CLIENT_ADMIN ceiling
  // Internal-only permissions blocked for CLIENT_* roles regardless of override
  
  return (rolePerms.includes(action) || grants.includes(action)) 
    && !revokes.includes(action)
    && !isInternalOnly(action, user.role);
}
```

**Cached in Redis:** Permission resolution result cached per user per tenant (TTL: 5 minutes). Invalidated on permission change.

---

## 8. Data Layer Design

### 8.1 PostgreSQL Schema Highlights

```sql
-- Tenants table (every other table references this)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- e.g., "acme-corp"
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  plan TEXT DEFAULT 'free',   -- billing tier
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (multi-tenant, same table)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','LEAD','AGENT','CLIENT_ADMIN','CLIENT_USER')),
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Tickets (core entity)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  ticket_number SERIAL,  -- per-tenant sequential (trigger)
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  requester_id UUID REFERENCES users(id),
  assignee_id UUID REFERENCES users(id),
  sla_policy_id UUID,
  sla_deadline_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',  -- flexible AI insights, custom fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments (threaded, supports internal notes)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  author_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id),  -- threading
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments (metadata only, files in R2)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  comment_id UUID REFERENCES comments(id),
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_key TEXT NOT NULL,  -- R2 object key
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base with vector search
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  category_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_vector VECTOR(1536),  -- pgvector: OpenAI embedding
  helpful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_kb_fts ON kb_articles 
  USING gin(to_tsvector('english', title || ' ' || content));

-- Vector similarity index
CREATE INDEX idx_kb_vector ON kb_articles 
  USING ivfflat (content_vector vector_cosine_ops) WITH (lists = 100);

-- Audit Logs (append-only, partitioned by month eventually)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,        -- e.g., "ticket.updated"
  resource_type TEXT NOT NULL, -- "ticket"
  resource_id UUID,
  changes JSONB,               -- { old: {...}, new: {...} }
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permission Overrides
CREATE TABLE permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  permission TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GRANT', 'REVOKE')),
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, permission)
);

-- SLA Policies
CREATE TABLE sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  business_hours JSONB NOT NULL,  -- { monday: { start: '09:00', end: '17:00' }, ... }
  timezone TEXT DEFAULT 'UTC'
);
```

### 8.2 Prisma Schema Strategy

Use Prisma's **multi-file schema** (preview feature) to match modular structure:

```
prisma/
├── schema/
│   ├── main.prisma        # datasource, generator
│   ├── tenant.prisma
│   ├── user.prisma
│   ├── ticket.prisma
│   ├── kb.prisma
│   ├── audit.prisma
│   └── ...
```

This prevents merge conflicts and aligns with DDD modules.

---

## 9. API Design Patterns

### 9.1 Response Envelope (Matches Frontend)

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiError {
  statusCode: number;
  message: string;
  code: string;        // machine-readable: "TICKET_NOT_FOUND"
  details?: Record<string, string[]>;  // validation errors
}
```

### 9.2 Pagination

Cursor-based for real-time lists (tickets, comments), offset-based for analytics.

```typescript
// Ticket list
GET /api/v1/tickets?tenant_id=xxx&status=open&page=1&limit=25&sort=-created_at

// Cursor-based (better for real-time updates)
GET /api/v1/tickets?cursor=eyJpZCI6Inh4eCJ9&limit=25
```

### 9.3 File Upload Flow (Presigned URLs)

```
1. POST /api/v1/attachments/presign
   Body: { filename: "report.pdf", mimeType: "application/pdf", size: 2048000 }
   → Response: { uploadUrl: "https://r2.cloudflarestorage.com/...", attachmentId: "uuid" }

2. Client PUT file directly to uploadUrl (bypasses our server — no bandwidth cost)

3. Client POST /api/v1/attachments/confirm
   Body: { attachmentId: "uuid", ticketId: "xxx" }
   → Server marks as uploaded, returns public download URL
```

**Why presigned URLs?**
- No file streaming through app server (saves Railway compute + memory)
- Direct-to-R2 upload from browser
- Supports files up to R2 limit (no 25MB app server limit)

---

## 10. Realtime Architecture

### 10.1 WebSocket with Socket.io

```typescript
@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class RealtimeGateway {
  @SubscribeMessage('join_tenant')
  handleJoin(client: Socket, tenantId: string) {
    // Verify JWT from handshake auth
    // Verify user belongs to tenant
    client.join(`tenant:${tenantId}`);
  }
}

// Broadcasting from services
this.server.to(`tenant:${tenantId}`).emit('ticket:created', ticket);
```

### 10.2 Event Fanout via Redis Adapter

On free tier (single instance), Redis adapter is optional. But include it so scaling to multiple instances is zero-code:

```typescript
// main.ts
const redisAdapter = createAdapter(redisPub, redisSub);
app.useWebSocketAdapter(new IoAdapter(app));
```

### 10.3 Fallback HTTP Polling

Socket.io automatically falls back to long-polling. The frontend's `/api/v1/realtime/poll` endpoint is implemented as:

```typescript
@Get('realtime/poll')
async poll(@Query('since') since: string, @TenantId() tenantId: string) {
  // Redis streams or simple list: get events for tenant since timestamp
  const events = await this.realtimeService.getEvents(tenantId, new Date(since));
  return { events, nextPollAt: new Date(Date.now() + 5000) };
}
```

---

## 11. Async Processing with BullMQ

### 11.1 Queue Topology

| Queue | Job Types | Priority | Concurrency | Schedule |
|-------|-----------|----------|-------------|----------|
| `email` | Welcome, reset, notification, digest | Normal | 2 | On-demand |
| `sla-monitor` | Check deadlines, trigger escalations | High | 1 | Every 5 minutes (repeatable) |
| `ai-analysis` | Classify, summarize, embed, route | Low | 2 | On-demand |
| `audit-archive` | Compress old audit logs | Lowest | 1 | Daily at 2 AM |
| `report-generation` | Analytics PDF exports | Low | 1 | On-demand |

### 11.2 SLA Monitor Algorithm

```typescript
// sla-monitor.processor.ts — runs every 5 minutes
async process() {
  const now = new Date();
  
  // Find tickets approaching SLA breach
  const warnings = await prisma.ticket.findMany({
    where: {
      sla_deadline_at: { gt: now, lt: addMinutes(now, 30) },
      status: { notIn: ['resolved', 'closed'] }
    }
  });
  
  // Find breached tickets
  const breached = await prisma.ticket.findMany({
    where: {
      sla_deadline_at: { lt: now },
      status: { notIn: ['resolved', 'closed'] }
    }
  });
  
  for (const ticket of warnings) {
    this.realtime.emit(ticket.tenant_id, 'sla:warning', ticket);
    await this.notificationService.notifyEscalation(ticket);
  }
  
  for (const ticket of breached) {
    await this.escalationService.autoEscalate(ticket);
    this.realtime.emit(ticket.tenant_id, 'sla:breach', ticket);
  }
}
```

---

## 12. AI Integration Architecture

### 12.1 Design: Thin Orchestrator, Thick Prompts

Don't use LangChain. Build a simple, testable service:

```typescript
// ai/providers/openai.provider.ts
class OpenAIProvider {
  async complete(prompt: string, options: CompletionOptions): Promise<string> {
    // Retry with exponential backoff
    // Token usage tracking (log to DB for cost monitoring)
    // Circuit breaker pattern (fail to Anthropic after 3 errors)
  }
  
  async embed(text: string): Promise<number[]> {
    // text-embedding-3-small
  }
}

// ai/embedding.service.ts
class EmbeddingService {
  async indexKBArticle(article: KBArticle) {
    const vector = await this.openai.embed(article.title + ' ' + article.content);
    await prisma.kbArticles.update({
      where: { id: article.id },
      data: { content_vector: vector }
    });
  }
  
  async semanticSearch(query: string, tenantId: string, limit = 5) {
    const queryVector = await this.openai.embed(query);
    return prisma.$queryRaw`
      SELECT id, title, content, 
        1 - (content_vector <=> ${queryVector}::vector) as similarity
      FROM kb_articles
      WHERE tenant_id = ${tenantId}
      ORDER BY content_vector <=> ${queryVector}::vector
      LIMIT ${limit}
    `;
  }
}
```

### 12.2 Prompt Management

Store prompts as TypeScript template literals (version-controlled, type-safe):

```typescript
// ai/prompts/classify-ticket.prompt.ts
export const classifyTicketPrompt = (title: string, description: string) => `
You are a support ticket classifier. Analyze the ticket and respond with JSON:
{
  "category": "one of: bug, feature_request, billing, technical_support, account_issue",
  "priority": "one of: low, medium, high, urgent",
  "confidence": 0.0-1.0
}

Title: ${title}
Description: ${description}
`;
```

**Token budget per operation:**
- Classification: ~500 tokens (cheap, fast)
- Summarization: ~1000 tokens
- Reply suggestion: ~1500 tokens
- Project health analysis: ~3000 tokens (rare, batched)

---

## 13. Security Architecture

### 13.1 Layered Defenses

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Edge** | DDoS, WAF | Cloudflare (free plan) — rate limit 100 req/10s per IP |
| **Transport** | TLS 1.3 | Cloudflare → Railway (full strict SSL) |
| **Application** | Rate limiting | `@nestjs/throttler` + Redis. Tiered: IP=100/min, User=1000/min, Admin=2000/min |
| **Authentication** | JWT + HttpOnly cookies | 15-min access, 7-day refresh, token rotation, family detection |
| **Authorization** | RBAC + ABAC | Guards on every route, RLS in DB, permission caching |
| **Data** | Encryption at rest | Railway PG encrypted. R2 server-side encryption. |
| **Data** | Encryption in transit | TLS 1.3 everywhere |
| **Secrets** | Management | Railway env vars, no secrets in repo |
| **Headers** | Security headers | Helmet.js: HSTS, CSP, X-Frame-Options, Referrer-Policy |
| **Input** | Validation | Zod schemas on all inputs, Prisma parameterized queries (no SQL injection) |
| **Output** | Sanitization | DOMPurify for HTML content, auto-escape in Prisma/JSON |
| **Audit** | Immutable logs | Append-only audit_logs table, no UPDATE/DELETE allowed |

### 13.2 CORS Configuration

```typescript
// Strict CORS — only allow known origins
app.enableCors({
  origin: [
    'https://portal.3sc.io',
    'https://console.3sc.io',
    'http://localhost:3000',  // dev only
    'http://localhost:3001',
  ],
  credentials: true,  // Required for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
});
```

---

## 14. Scalability & Performance

### 14.1 Free Tier Optimizations

| Technique | Impact |
|-----------|--------|
| **Prisma connection limit = 5** | Prevents PG connection exhaustion |
| **BullMQ concurrency = 2 per queue** | Keeps memory < 400MB |
| **Socket.io perMessageDeflate = false** | Saves CPU on small payloads |
| **Compression (Brotli)** | Reduces JSON response size ~60% |
| **Redis caching** | Permission resolution, AI digest, dashboard KPIs (5-min TTL) |
| **Materialized views for analytics** | Pre-computed rollups, refresh every hour |
| **Presigned URLs for files** | Zero bandwidth through app server |

### 14.2 Scale-Up Path (When Leaving Free Tier)

| Bottleneck | Free Tier | Scale-Up |
|-----------|-----------|----------|
| **CPU/Memory** | 1 container, 512MB | Horizontal: 2-4 containers behind Railway load balancer |
| **Workers** | Embedded in app | Separate `worker` service (same repo, different start command) |
| **Database** | 1GB storage | Upgrade to Pro ($5/mo → $50/mo), add read replica |
| **Search** | pgvector + tsvector | Migrate to Elasticsearch/OpenSearch for sub-50ms search |
| **AI** | Synchronous API calls | Queue + worker pattern (already built), add caching layer |
| **Realtime** | Socket.io + Redis adapter | Dedicated `ws` service, or migrate to Ably/Pusher |
| **File Storage** | R2 free tier | R2 paid (still $0 egress — huge advantage over S3) |

### 14.3 Horizontal Scaling Architecture (Future)

```
                    ┌─────────────┐
                    │  Cloudflare │
                    │   (WAF/CDN) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ API Pod │  │ API Pod │  │ API Pod │   (NestJS HTTP)
        │   x3    │  │   x3    │  │   x3    │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                   ┌─────────────┐
                   │  Redis      │  (Sessions, BullMQ, Cache, WS adapter)
                   │  Cluster    │
                   └──────┬──────┘
                          ▼
                   ┌─────────────┐
                   │  PostgreSQL │  (Primary + Read Replica)
                   │  + pgvector │
                   └─────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        ┌─────────────┐        ┌─────────────┐
        │ Worker Pod  │        │ Worker Pod  │   (BullMQ processors)
        │   x2        │        │   x2        │
        └─────────────┘        └─────────────┘
```

---

## 15. Deployment & DevOps

### 15.1 Railway Configuration

**`railway.json` (in repo root):**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**`Procfile` (for future worker split):**

```
web: node dist/main.js
worker: node dist/worker.js
```

### 15.2 Environment Variables

```bash
# Railway Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://... (Railway injects)
DATABASE_CONNECTION_LIMIT=5

# Redis
REDIS_URL=redis://... (Railway injects)

# Auth
JWT_SECRET=<generate: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=3sc-attachments
R2_PUBLIC_URL=https://cdn.3sc.io

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@3sc.io

# Sentry
SENTRY_DSN=https://...
```

### 15.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run build
      - name: Deploy to Railway
        uses: railway/cli@v3
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 16. Database Migration Strategy

Use Prisma Migrate for version-controlled schema changes:

```bash
# Development
npx prisma migrate dev --name add_sla_policies

# Production (runs in CI/CD before deployment)
npx prisma migrate deploy
```

**Zero-downtime migration rules:**
1. Add new columns as nullable or with defaults
2. Create indexes concurrently (`CONCURRENTLY` — Prisma doesn't support this natively, run raw SQL in migration)
3. Backfill data in separate migration or job
4. Never drop columns in same deploy as code removal (two-phase deploy)

---

## 17. Testing Strategy

| Type | Tool | Scope |
|------|------|-------|
| **Unit** | Jest | Services, pure functions (state machine, permission resolver) |
| **Integration** | Jest + `testcontainers` | DB queries with real PostgreSQL in Docker |
| **E2E API** | Jest + Supertest | Full HTTP request/response cycle |
| **Contract** | Schemathesis or Optic | Validate API against OpenAPI spec |

**Critical paths to test:**
- Tenant isolation (user A cannot read tenant B's data)
- Permission resolution (all 3 layers + ceiling)
- SLA calculation (business hours, timezones, holidays)
- Auth flow (login, refresh, rotation, family revocation)
- File upload (presigned URL generation, confirmation)

---

## 18. Cost Analysis (Railway Free → Pro)

| Component | Free Tier | Estimated Pro (Start) | Notes |
|-----------|-----------|----------------------|-------|
| **Compute** | $5 credit (~500 hrs) | $20-40/mo | 1-2 containers, 1-2 vCPU, 1-2GB RAM |
| **PostgreSQL** | 1GB included | $15-30/mo | 10-50GB storage |
| **Redis** | Upstash free or Railway plugin | $10/mo | |
| **Cloudflare** | Free plan | Free plan | Probably sufficient forever |
| **R2 Storage** | 10GB/mo free | ~$0.015/GB | Egress is free (vs S3 $0.09/GB) |
| **OpenAI** | Pay per use | $50-200/mo | Depends on ticket volume |
| **Sentry** | 5k errors/mo | $26/mo | |
| **Resend** | 3k emails/day free | $20/mo | |
| **TOTAL** | **~$0-5** | **~$150-350/mo** | |

---

## 19. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Railway free tier sleeps** | Use UptimeRobot (free) to ping `/health` every 5 minutes to keep alive. Or upgrade to Pro. |
| **Database size exceeds 1GB** | Implement data retention: archive tickets > 2 years old to R2 (JSON). Compress audit logs monthly. |
| **Redis memory full** | Set explicit TTLs on all keys. Eviction policy: `allkeys-lru`. Monitor via `INFO memory`. |
| **OpenAI rate limits / costs** | Implement token budgets per tenant. Circuit breaker to fallback to rule-based classification. Cache embeddings. |
| **JWT secret compromise** | Use Railway secret rotation. Immediate deploy with new secret forces all re-login (acceptable for security). |
| **SQL injection** | Prisma ORM (parameterized queries) + RLS. Never raw SQL without parameterization. |
| **Data breach** | RLS policies. Field-level encryption for PII (email, phone). Audit logs immutable. GDPR deletion jobs. |

---

## 20. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] NestJS project setup with Prisma, Zod, Pino
- [ ] Railway project + PostgreSQL + Redis provisioned
- [ ] Auth module (login, refresh, logout, password reset)
- [ ] Tenant guard + RLS setup
- [ ] Health check endpoint
- [ ] CI/CD pipeline (GitHub Actions → Railway)

### Phase 2: Core Domain (Week 3-4)
- [ ] Users & Organizations CRUD
- [ ] Tickets CRUD + state machine
- [ ] Comments + attachments (presigned URLs)
- [ ] Basic RBAC (role-based only, no overrides yet)
- [ ] WebSocket gateway + Redis adapter

### Phase 3: Intelligence (Week 5-6)
- [ ] SLA engine + monitor job
- [ ] AI classification/summarization (OpenAI integration)
- [ ] Knowledge Base + semantic search (pgvector)
- [ ] Notifications (in-app + email)

### Phase 4: Advanced Features (Week 7-8)
- [ ] Permission override system (GRANT/REVOKE)
- [ ] Audit logging (immutable)
- [ ] Analytics materialized views
- [ ] Routing rules + auto-assignment
- [ ] Escalation queue

### Phase 5: Polish (Week 9-10)
- [ ] Performance testing (k6)
- [ ] Security audit (OWASP ZAP)
- [ ] Documentation (OpenAPI auto-generated)
- [ ] Monitoring dashboards (Grafana or Railway metrics)
- [ ] Remove frontend mocks, connect to real API

---

## 21. Conclusion

This architecture provides:

1. **Enterprise-grade patterns** (DDD, CQRS logical split, event-driven, RLS) without microservices overhead
2. **Railway free tier viability** through resource-conscious defaults and embedded workers
3. **Zero-friction scaling** when you upgrade — split workers, add read replicas, introduce Elasticsearch
4. **Security depth** at every layer from edge to database
5. **Type safety end-to-end** (TypeScript frontend ↔ TypeScript backend ↔ Prisma ORM)

The monolithic-modular approach is the pragmatic choice for a startup/small team: you ship faster, debug easier, and can still extract services later when you have the traffic to justify it.
