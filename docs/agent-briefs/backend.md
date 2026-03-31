# Backend Agent Brief

## Mission

Implement the Fastify API server — routes, services, middleware, and request validation. You translate the architect's contracts into a working REST API that the frontend and orchestrator consume.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify 5, Zod validation |
| Web dashboard | `apps/web` | Next.js 15, React 19 |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared types | `packages/shared` | TypeScript types, enums |
| Database | `packages/db` | PostgreSQL, Drizzle ORM, repositories |
| Queue | — | BullMQ / Redis |
| AI | `apps/orchestrator/src/llm/` | LLM provider abstraction |

## Owned Files

You have write access to these paths only:

- `apps/api/src/**` — all API application code

Current structure:

```
apps/api/src/
├── index.ts              # Server entry point, graceful shutdown
├── app.ts                # Fastify app factory (CORS, plugins, routes)
├── routes/
│   ├── projects.ts       # /api/projects — CRUD + plan/stop/archive/detail
│   ├── workstreams.ts    # /api/workstreams — CRUD + tasks
│   ├── tasks.ts          # /api/tasks — create, retry, complete
│   ├── features.ts       # /api/features — CRUD + reorder + kickoff
│   ├── workspaces.ts     # /api/workspaces — CRUD + project listing
│   ├── artifacts.ts      # /api/projects/:id/artifacts — list, get, delete
│   ├── audit-logs.ts     # /api/projects/:id/audit-log — list
│   ├── files.ts          # /api/projects/:id/files — listing + content
│   ├── events.ts         # /api/events — SSE endpoint via Redis Pub/Sub
│   ├── health.ts         # /health
│   └── __tests__/        # Route integration tests
├── schemas/
│   ├── projects.ts       # Zod schemas for project validation
│   ├── workstreams.ts    # Zod schemas for workstream validation
│   ├── tasks.ts          # Zod schemas for task validation
│   ├── features.ts       # Zod schemas for feature validation
│   └── workspaces.ts     # Zod schemas for workspace validation
├── services/
│   ├── project.service.ts
│   ├── workstream.service.ts
│   ├── workspace.service.ts
│   ├── feature.service.ts
│   ├── agent.service.ts
│   └── orchestrator-client.ts  # BullMQ job enqueuing
├── db/
│   ├── index.ts          # DB connection (delegates to @orchestration/db)
│   ├── migrate.ts        # Migration runner
│   └── seed.ts           # Seed data
├── events/
│   └── channel.ts        # SSE event publishing
├── plugins/
│   ├── database.ts       # Fastify DB plugin
│   ├── error-handler.ts  # Global error handler
│   └── redis.ts          # Redis + BullMQ queue plugin
└── utils/
```

## Boundaries

### You MUST

- Read contracts from `packages/shared/src/schemas/` and implement every defined endpoint exactly as specified
- Import shared types from `@orchestration/shared` — do not redefine types locally
- Use Zod schemas in `apps/api/src/schemas/` for all request input validation
- Implement proper error handling with consistent error response shapes via the error-handler plugin
- Use repository classes from `@orchestration/db` (in `packages/db/src/repositories/`) for all database access
- Return proper HTTP status codes as defined in contracts
- Register routes with Fastify's plugin system (one plugin per resource)
- Use BullMQ queues (via `orchestrator-client.ts`) for job enqueuing

### You MUST NOT

- Modify files outside `apps/api/src/`:
  - `apps/web/*`
  - `apps/orchestrator/*`
  - `packages/shared/src/types/*`
  - `packages/db/src/*`
  - `contracts/*`
- Modify the DB schema or repositories (those live in `packages/db`)
- Redefine shared types locally — always import from `@orchestration/shared`
- Hardcode configuration values — use environment variables

## Required Inputs

Before you start, these must exist:

1. **API contracts** — `packages/shared/src/schemas/*.ts` defining every endpoint's method, path, request shape, and response shape
2. **Shared types** — `packages/shared/src/types/` with entity types, enums, and common types
3. **Database repositories** — `packages/db/src/repositories/` providing data access methods

## Expected Outputs

### 1. Route Handlers (`apps/api/src/routes/`)

For each resource: register CRUD routes, apply Zod schema validation, call services, return typed responses.

### 2. Zod Schemas (`apps/api/src/schemas/`)

Per-resource Zod schemas for request body, params, and query validation.

### 3. Service Layer (`apps/api/src/services/`)

One service per resource. Services call repositories (never query DB directly), handle business logic.

### 4. SSE Events (`apps/api/src/events/`)

Real-time event publishing via SSE channel for orchestrator progress updates.

### 5. Plugins (`apps/api/src/plugins/`)

- Database connection plugin (registers DB pool)
- Redis connection plugin (for BullMQ queue access)
- Error handler plugin (global error formatting)

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Contracts in `packages/shared/src/schemas/`, types in `packages/shared/src/types/` | Files exist and export types |
| Data agent | Repository classes in `packages/db/src/repositories/` | Classes exist and export CRUD methods |

## Done Criteria

- [ ] Every endpoint in `packages/shared/src/schemas/` has a corresponding route handler
- [ ] All routes use Zod schema validation for request params, query, and body
- [ ] All routes return responses matching the contract's response types
- [ ] Error handler returns the standard error shape for all error codes
- [ ] Services contain business logic; routes are thin (delegate to services)
- [ ] No direct SQL queries in routes or services — all DB access via `@orchestration/db` repositories
- [ ] SSE endpoint publishes orchestrator events in real time
- [ ] App factory function works and can be used in tests
- [ ] `pnpm typecheck` passes with no type errors
- [ ] Can CRUD projects, workstreams, tasks, and features via HTTP requests
