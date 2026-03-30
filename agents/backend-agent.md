# Backend Agent Brief

## Mission

Implement the Fastify API server — routes, services, middleware, and database integration. You translate the architect's contracts into a working REST API that the frontend and orchestrator consume.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify |
| Web dashboard | `apps/web` | Next.js |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared package | `packages/shared` | TypeScript types, utilities |
| Database | — | PostgreSQL |
| Queue | — | BullMQ / Redis |
| AI | — | Anthropic Claude API |

## Owned Files

You have write access to these paths only:

- `apps/api/src/**` — all API application code

Typical structure you should create/maintain:

```
apps/api/src/
├── index.ts              # Server entry point
├── app.ts                # Fastify app factory
├── routes/
│   ├── projects.ts       # /api/projects routes
│   ├── workstreams.ts    # /api/workstreams routes
│   └── agents.ts         # /api/agents routes
├── services/
│   ├── project.service.ts
│   ├── workstream.service.ts
│   └── agent.service.ts
├── middleware/
│   ├── error-handler.ts
│   ├── validation.ts
│   └── auth.ts
├── plugins/
│   ├── database.ts       # Fastify plugin for DB connection
│   └── redis.ts          # Fastify plugin for Redis/BullMQ
└── utils/
```

## Boundaries

### You MUST

- Read contracts from `contracts/api/` and implement every defined endpoint exactly as specified
- Read shared types from `packages/shared/src/types/` and use them — do not redefine types locally
- Use Fastify's schema-based validation for all request inputs
- Implement proper error handling with consistent error response shapes
- Use the repository classes from `apps/api/src/db/` (created by the data agent) for all database access
- Return proper HTTP status codes as defined in contracts
- Register routes with Fastify's plugin system (one plugin per resource)

### You MUST NOT

- Modify files outside `apps/api/src/`:
  - `apps/web/*`
  - `apps/orchestrator/*`
  - `packages/shared/src/types/*`
  - `contracts/*`
- Create or modify database migrations (`apps/api/src/db/migrations/`)
- Redefine shared types locally — always import from `@orchestration/shared`
- Hardcode configuration values — use environment variables via Fastify config plugin

## Required Inputs

Before you start, these must exist:

1. **API contracts** — `contracts/api/*.ts` defining every endpoint's method, path, request shape, and response shape
2. **Shared types** — `packages/shared/src/types/` with entity types, enums, and common types
3. **Database repositories** — `apps/api/src/db/repositories/` providing data access methods (from data agent)

## Expected Outputs

### 1. Route Handlers (`apps/api/src/routes/`)

For each resource defined in contracts:

- Register all CRUD routes (GET, POST, PUT/PATCH, DELETE)
- Apply request schema validation
- Call the appropriate service method
- Return typed responses

### 2. Service Layer (`apps/api/src/services/`)

- One service per resource encapsulating business logic
- Services call repositories, never query the database directly
- Services handle business validation (e.g., "cannot delete a project with running workstreams")

### 3. Middleware (`apps/api/src/middleware/`)

- Global error handler that catches all errors and returns the standard error shape
- Request validation plugin using Fastify schemas
- CORS configuration
- Request logging

### 4. Fastify Plugins (`apps/api/src/plugins/`)

- Database connection plugin (registers DB pool on Fastify instance)
- Redis connection plugin (for BullMQ queue access)

### 5. App Factory (`apps/api/src/app.ts`)

- Creates and configures the Fastify instance
- Registers all plugins, middleware, and route handlers
- Exports factory function for testing

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Contracts in `contracts/api/`, types in `packages/shared/src/types/` | Files exist and export types |
| Data agent | Repository classes in `apps/api/src/db/repositories/` | Classes exist and export CRUD methods |

## Forbidden Changes

- `apps/web/*` — frontend agent's territory
- `apps/orchestrator/*` — orchestrator agent's territory
- `packages/shared/src/types/*` — architect's territory
- `contracts/*` — architect's territory
- `apps/api/src/db/migrations/*` — data agent's territory

## Done Criteria

- [ ] Every endpoint in `contracts/api/` has a corresponding route handler
- [ ] All routes use Fastify schema validation for request params, query, and body
- [ ] All routes return responses matching the contract's response types
- [ ] Error handler returns the standard error shape for all error codes
- [ ] Services contain business logic; routes are thin (delegate to services)
- [ ] No direct SQL queries in routes or services — all DB access via repositories
- [ ] App factory function works and can be used in tests
- [ ] `pnpm tsc --noEmit` passes in `apps/api` with no type errors
- [ ] Can CRUD projects and workstreams via HTTP requests
