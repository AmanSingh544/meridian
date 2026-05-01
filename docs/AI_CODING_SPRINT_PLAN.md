# 3SC Backend — 7-Day AI-Coding Sprint Plan

**Context:** You have 1 week. You will use AI (Cursor, GitHub Copilot, ChatGPT, Claude) to generate 90% of the code. This plan tells you **exactly what to prompt** and in what order.

**Why this works:** NestJS is the most AI-friendly backend framework. It has rigid patterns (decorators, modules, DI) that AI has memorized from millions of GitHub repos. You don't write code — you write prompts.

---

## Pre-Requisites (15 minutes)

1. **Install globally:**
```bash
npm i -g @nestjs/cli
npm i -g prisma
```

2. **Create project:**
```bash
# Use the backend/ folder I already created for you
cd backend
npm install
```

3. **AI Tool Setup:**
- **Cursor** (recommended): Open the `backend/` folder in Cursor IDE
- **Copilot Chat**: Use `/new` for scaffolding
- **ChatGPT/Claude**: Use the prompts below in a chat window, paste output into files

---

## Day 1: Database + Auth (The Foundation)

### Step 1: Generate Prisma Client & Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 2: AI Prompt — Auth Module Complete

**Paste this into Cursor chat or ChatGPT:**

```
I have a NestJS project with Prisma. The User model has: id, tenant_id, email, password_hash, role (ADMIN/LEAD/AGENT/CLIENT_ADMIN/CLIENT_USER), first_name, last_name, avatar_url.

Generate a complete Auth module with:
1. AuthService with login(), register(), refreshToken()
2. AuthController with POST /auth/login, POST /auth/register, POST /auth/token/refresh, GET /auth/session
3. JwtStrategy that extracts { sub, email, role, tenantId } from JWT
4. JwtAuthGuard that can be used with @UseGuards() on any controller
5. A CurrentUser decorator that extracts the user from request
6. Password hashing with bcrypt
7. Response format must be: { data: { ... } } with snake_case fields

Use the existing PrismaService from src/shared/prisma/prisma.service.ts
```

**What you do:** Copy-paste the generated code into the `auth/` folder. Fix import paths if needed.

### Step 3: AI Prompt — Tenant Guard

```
Generate a NestJS Guard called TenantGuard that:
1. Reads tenant_id from query params or JWT payload
2. Validates the tenant exists in the database
3. Injects tenant_id into the request object
4. Returns 403 if tenant doesn't exist or user doesn't belong to tenant

The guard should be used alongside JwtAuthGuard.
```

**Add to `src/shared/guards/tenant.guard.ts`**

### Step 4: Test Auth

```bash
npm run start:dev
```

Test with curl:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","tenant_id":"..."}'
```

---

## Day 2: Core CRUD Modules (Tickets, Users, Comments)

### Pattern for EVERY module:

For each domain entity, use this exact prompt template. Just change the entity name.

### AI Prompt Template — CRUD Module

```
Generate a complete NestJS CRUD module for [ENTITY] with Prisma.

Prisma model fields: [PASTE MODEL FIELDS HERE]

Requirements:
1. [Entity]Controller with:
   - GET /[entities] — list with pagination (page, limit) and tenant_id filter
   - GET /[entities]/:id — get by id with tenant_id check
   - POST /[entities] — create
   - PATCH /[entities]/:id — update
   - DELETE /[entities]/:id — soft or hard delete
   
2. [Entity]Service with all CRUD methods
   - Every query MUST include tenant_id filter
   - Include related data where needed (use Prisma include)
   
3. Response envelope: { data: [...], meta: { page, limit, total, total_pages } }
4. Use JwtAuthGuard on all routes
5. Use snake_case in response objects

Use existing PrismaService from src/shared/prisma/prisma.service.ts
```

### Entities to generate (in order):

| Priority | Entity | Time |
|----------|--------|------|
| 1 | Tickets | 30 min |
| 2 | Users | 20 min |
| 3 | Comments | 20 min |
| 4 | Organizations | 15 min |
| 5 | Attachments (presigned URL flow) | 30 min |

**Pro tip:** After generating the first one (Tickets), tell AI:
```
Now generate the same pattern for Comments. Use the exact same structure as Tickets module.
```

### Attachment Presigned URL Prompt:

```
Generate an Attachments module with:
1. POST /attachments/presign — generates a presigned URL for Cloudflare R2 (S3-compatible)
2. POST /attachments/confirm — confirms upload and saves metadata to Prisma Attachment model
3. GET /attachments/:id/download — returns a presigned download URL

Use the AWS SDK S3Client with signatureVersion 'v4' for R2 compatibility.
Fields needed: id, tenant_id, ticket_id, comment_id, filename, mime_type, size_bytes, storage_key, uploaded_by, created_at
```

---

## Day 3: AI Gateway (The Money Maker)

Use the `backend/src/modules/ai/` files I already created as your starter.

### AI Prompt — Multi-Provider Router Enhancement

```
I have an AI service in NestJS that currently supports OpenAI. I need to add:

1. Anthropic Claude provider support (use @anthropic-ai/sdk)
2. Groq provider support (use groq-sdk)
3. A smart router that selects provider based on:
   - task_type: 'classify' | 'summarize' | 'reply' | 'route' | 'embed'
   - budget_tier: 'economy' | 'standard' | 'premium'
   - fallback chain: if primary fails, try next provider

4. Token usage tracking: log tokens_used, provider_name, cost_estimate to console
5. Circuit breaker: if a provider fails 3 times in 5 minutes, skip it for 10 minutes

The service should expose:
- classifyTicket(title, description, budgetTier)
- summarizeTicket(content, budgetTier)
- generateReply(ticketContent, context, tone, budgetTier)
- generateEmbedding(text)
- routeTicket(title, description, availableAgents, budgetTier)
- getProviderStatus() — returns all providers with availability and pricing
```

**What you get:** A robust AI gateway that routes between OpenAI, Anthropic, and Groq based on cost/quality needs.

### AI Prompt — Semantic Search Endpoint

```
Generate a Knowledge Base search endpoint:

1. POST /kb/search — accepts { query: string, tenant_id: string, semantic?: boolean }
2. If semantic=true: generate embedding using OpenAI, search pgvector with cosine similarity
3. If semantic=false: use PostgreSQL full-text search with tsvector
4. Return top 5 results with similarity score

Prisma schema has KbArticle with content_vector field (pgvector).
Use raw Prisma query for vector search.
```

---

## Day 4: Realtime + Notifications

### AI Prompt — WebSocket Gateway

```
Generate a NestJS WebSocket Gateway using @nestjs/websockets and Socket.io:

1. Namespace: /ws
2. On connection: validate JWT from handshake auth.token
3. join_tenant event: client joins room "tenant:{tenant_id}"
4. Server methods:
   - broadcastToTenant(tenantId, event, payload)
   - broadcastToUser(userId, event, payload)
   
5. Events to support:
   - ticket:created
   - ticket:updated
   - ticket:status_changed
   - comment:created
   - notification
   - sla:warning
   - sla:breach

6. Fallback HTTP polling endpoint: GET /realtime/poll?since=timestamp
   Returns events since that timestamp from Redis list

Use Redis adapter for multi-instance support (ioredis).
```

### AI Prompt — Notification Service

```
Generate a Notifications module:

1. NotificationService with:
   - createNotification(userId, tenantId, type, title, body, data)
   - markAsRead(notificationId)
   - markAllAsRead(userId, tenantId)
   - getUnreadCount(userId, tenantId)
   
2. NotificationController:
   - GET /notifications?tenant_id=...&page=&limit=
   - PATCH /notifications/:id/read
   - PATCH /notifications/read-all
   
3. Integrate with WebSocket gateway: emit 'notification' event to user on creation
4. Support notification types: ticket_assigned, comment_added, sla_warning, mention
```

---

## Day 5: SLA Engine + Business Logic

### AI Prompt — SLA Calculator

```
Generate an SLA engine in NestJS:

1. SlaCalculatorService:
   - calculateDeadline(createdAt, policy, timezone) → returns Date
   - isBusinessHour(date, businessHoursConfig) → boolean
   - timeRemaining(deadline) → minutes
   - isBreached(deadline) → boolean
   
2. Business hours config format:
   {
     monday: { start: "09:00", end: "17:00" },
     tuesday: { start: "09:00", end: "17:00" },
     ...
   }
   
3. SlaMonitorService (runs every 5 minutes via setInterval):
   - Find tickets where sla_deadline_at is within 30 minutes
   - Emit 'sla:warning' via WebSocket
   - Find tickets where sla_deadline_at has passed and status is not resolved/closed
   - Auto-escalate: create Escalation record, emit 'sla:breach', notify lead
   
4. On ticket status change:
   - If status → 'in_progress', set first_response_at if null
   - If status → 'resolved', check if SLA met
   - If status → 'pending', pause SLA timer (optional: store paused_at)
```

### AI Prompt — Ticket State Machine

```
Generate a pure TypeScript state machine for ticket statuses:

Allowed transitions:
- OPEN → IN_PROGRESS, PENDING, RESOLVED
- IN_PROGRESS → PENDING, RESOLVED, OPEN
- PENDING → IN_PROGRESS, OPEN
- RESOLVED → CLOSED, OPEN
- CLOSED → OPEN (reopen)
- Any → ESCALATED (admin only)

Function: canTransition(currentStatus, newStatus, userRole) → boolean
Return clear error messages for invalid transitions.
```

---

## Day 6: Analytics + Audit + Remaining Modules

### AI Prompt — Analytics Service

```
Generate an Analytics module with these endpoints:

1. GET /analytics/ticket-volume?tenant_id=...&start_date=&end_date=
   Returns daily ticket count array
   
2. GET /analytics/sla-compliance?tenant_id=...&period=30d
   Returns percentage + breached count
   
3. GET /analytics/agent-performance?tenant_id=...&agent_id=
   Returns resolved count, avg resolution time, satisfaction
   
4. GET /analytics/dashboard/kpis?tenant_id=...
   Returns: total_tickets, open_tickets, avg_resolution_time, sla_compliance_rate, active_agents

Use Prisma aggregate queries. Optimize with indexes.
```

### AI Prompt — Audit Logger

```
Generate an AuditLog system:

1. Prisma extension or middleware that automatically logs:
   - action: "created" | "updated" | "deleted"
   - resource_type: table name
   - resource_id: record id
   - changes: { old: {...}, new: {...} } for updates
   - user_id, ip_address, user_agent
   
2. AuditLogController:
   - GET /audit-logs?tenant_id=...&resource_type=&user_id=&page=&limit=
   - Export to CSV endpoint (optional)
   
3. The audit_logs table is append-only. Never update or delete from it.
```

### Remaining Modules (generate using Day 2 template):

- Delivery Board
- Onboarding
- Roadmap (with voting)
- Escalations
- Organizations

**Prompt for each:**
```
Generate a [Module] CRUD module using the same pattern as Tickets module.
Prisma model: [paste model]
Special requirements: [any unique logic]
```

---

## Day 7: Integration + Polish + Deploy

### Step 1: Connect Frontend to Backend

In your frontend (`apps/customer-portal/src/main.tsx` and `apps/internal-console/src/main.tsx`):

```typescript
// REMOVE THIS:
// import { worker } from './mocks/browser';
// worker.start();

// SET API URL in .env:
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000/ws
```

### Step 2: CORS Fix

If you get CORS errors, ensure your backend `.env` has:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Step 3: Railway Deploy

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Init project
railway init

# 4. Add PostgreSQL and Redis plugins
railway add --database postgres
railway add --database redis

# 5. Set environment variables
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway variables --set "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
railway variables --set "OPENAI_API_KEY=sk-..."

# 6. Deploy
railway up
```

### Step 4: Post-Deploy Database Setup

```bash
# SSH into Railway container or run locally against Railway DB
npx prisma migrate deploy
npx prisma db seed  # if you have seed data
```

### Step 5: Health Check

Test your deployed API:
```bash
curl https://your-app.railway.app/api/v1/health
```

---

## 🚀 Super-Effective AI Prompting Tips

### 1. The "Reference Existing Code" Pattern
Always tell AI about your existing files:
```
I already have PrismaService at src/shared/prisma/prisma.service.ts.
Use it for all database operations.
```

### 2. The "Same Pattern" Pattern
After generating the first module:
```
Generate the Comments module using the EXACT same pattern as the Tickets module.
Just change the entity name and fields.
```

### 3. The "Fix This Error" Pattern
When you get runtime errors, paste the error + relevant code:
```
I got this error: [paste error]
Here's the code: [paste code]
Fix it.
```

### 4. The "Add To Existing" Pattern
Instead of regenerating, tell AI to append:
```
Add a new method to AiService called predictTicketETA() that:
1. Takes ticket history and current workload
2. Returns estimated resolution time in hours
3. Uses the existing provider selection logic
```

### 5. The "Review My Code" Pattern
Before deploying, ask:
```
Review this NestJS module for:
1. Security issues (SQL injection, auth bypass)
2. Performance issues (N+1 queries)
3. Error handling (missing try/catch)
4. Type safety (any types)

Code: [paste full module]
```

---

## ⚡ Speed Hacks

| Task | Normal Time | AI Time |
|------|------------|---------|
| Scaffold CRUD module | 2 hours | 5 minutes |
| Write JWT auth | 3 hours | 10 minutes |
| Build AI gateway | 4 hours | 15 minutes |
| Create Prisma schema | 1 hour | Already done ✅ |
| Write API docs | 2 hours | 0 min (auto-generated by NestJS) |
| **Total backend** | **40+ hours** | **~10 hours** |

---

## 🎯 What I Already Built For You

Check the `backend/` folder. I created:
- ✅ Complete Prisma schema (all tables, enums, relations, indexes)
- ✅ Package.json with all dependencies
- ✅ NestJS project config (tsconfig, nest-cli)
- ✅ Main.ts with security middleware
- ✅ App module wiring
- ✅ Prisma service (global)
- ✅ Auth module (JWT strategy, guards, login/refresh)
- ✅ AI gateway (multi-provider router with OpenAI + extensible for Anthropic/Groq)
- ✅ Tickets module (full CRUD + transition)
- ✅ Users module (full CRUD with password hashing)
- ✅ Dockerfile + Railway config
- ✅ .env.example

**You start from Day 2 of this plan.** The foundation is done.

---

## 🆘 If You Get Stuck

| Problem | Solution |
|---------|----------|
| AI generates broken imports | Tell it "Use relative imports from '../../shared/prisma/prisma.service'" |
| Type errors | Paste the error into AI: "Fix these TypeScript errors" |
| Prisma migration fails | Run `npx prisma migrate reset` locally, or `npx prisma migrate resolve --rolled-back` |
| Railway deploy fails | Check `railway logs`, paste error into AI |
| CORS errors | Ensure `credentials: true` on both frontend (RTK Query) and backend (CORS) |
| JWT expired | Check `JWT_ACCESS_EXPIRATION` — default is 15m for security |

---

**Bottom line:** With the starter I built + these prompts, you will have a production backend in 7 days. Not a prototype — a real backend with auth, multi-tenancy, AI routing, real-time, and SLA monitoring. The AI does the typing. You do the thinking.
