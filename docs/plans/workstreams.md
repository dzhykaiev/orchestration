# Workstreams

The project is organized into five parallel workstreams. Each workstream has a clear owner (in terms of directory scope), explicit interfaces with other workstreams, and a stability contract that defines what other workstreams can depend on.

Workstreams run in parallel. Within a workstream, tasks run sequentially. Coordination between workstreams happens exclusively through contracts defined in `contracts/` and shared types in `packages/shared`.

```
        WS-1: Data Layer
             |
             v (schema + repository interfaces)
        WS-2: API Server  <----->  WS-3: Orchestrator Engine
             |                          |
             v (API endpoints)          v (status data)
        WS-4: Web Dashboard
             |
        WS-5: DevOps & Quality (cross-cutting)
```

---

## WS-1: Data Layer ✅ COMPLETED

### Objective

Establish the persistent data foundation: database schema, migrations, connection management, and the repository pattern that all other workstreams use to interact with data.

### Scope

- PostgreSQL schema design via Drizzle ORM
- Database connection pool configuration
- Repository modules (one per entity: projects, workstreams, tasks, features, workspaces, artifacts, audit-logs)
- Seed data for development and testing

### Deliverables

| Deliverable | Path | Status |
|---|---|---|
| Schema (Drizzle ORM) | `packages/db/src/schema.ts` | ✅ 9 tables, 12 enums |
| Database client | `packages/db/src/client.ts` | ✅ postgres.js + Drizzle |
| Project repository | `packages/db/src/repositories/projects.ts` | ✅ |
| Workstream repository | `packages/db/src/repositories/workstreams.ts` | ✅ |
| Task repository | `packages/db/src/repositories/tasks.ts` | ✅ |
| Feature repository | `packages/db/src/repositories/features.ts` | ✅ |
| Workspace repository | `packages/db/src/repositories/workspaces.ts` | ✅ |
| Artifact repository | `packages/db/src/repositories/artifacts.ts` | ✅ |
| Audit log repository | `packages/db/src/repositories/audit-logs.ts` | ✅ |
| Migrations | `packages/db/drizzle/` | ✅ Drizzle Kit |
| Seed script | `apps/api/src/db/seed.ts` | ✅ |

### Owned Folders

- `packages/db/src/`
- `packages/db/drizzle/`

### Dependencies

- None. This is the foundation workstream with no upstream dependencies.

### Interfaces Provided

- **Repository functions**: Typed async functions for all CRUD operations. Other workstreams import these and call them.
- **Database client**: A configured `Pool` instance that other workstreams use (or, more accurately, the applications import and inject).
- **Migration CLI**: A script to run migrations up/down for development and testing.

### Definition of Done

- All tables from the schema design exist and can be created from scratch via migrations.
- Every repository function has at least one integration test that runs against a real PostgreSQL instance.
- Seed script populates a realistic development dataset.
- Repository functions handle errors gracefully (no unhandled promise rejections, meaningful error messages).

### Stability Contract

The following are stable and can be depended on by other workstreams:

- **Entity types** (`Project`, `Workstream`, `AgentTask`, `Feature`, `Workspace`, `Artifact`, `AuditLog`): field names, types, and required/optional status will not change without coordinated updates.
- **Repository function signatures**: the parameters and return types of repository functions will not change without notice.
- **Table names and column names**: these are fixed after the initial migration. New columns may be added but existing columns will not be renamed or removed.

---

## WS-2: API Server ✅ COMPLETED

### Objective

Build the REST API that serves as the external interface for the platform. The API server is a thin layer: it validates requests, calls repository functions, enqueues jobs, and returns responses.

### Scope

- Fastify application setup with plugins
- REST endpoint implementation for all entities
- Request and response validation using JSON Schema derived from shared types
- Job enqueueing integration with BullMQ
- Server-Sent Events (SSE) for progress streaming
- Error handling middleware
- Health check and readiness endpoints

### Deliverables

| Deliverable | Path | Description |
|---|---|---|
| Fastify app | `apps/api/src/app.ts` | Application factory with plugin registration |
| Server entry | `apps/api/src/server.ts` | Server startup and shutdown |
| Project routes | `apps/api/src/routes/projects.ts` | ✅ CRUD + plan/stop/archive/detail |
| Workstream routes | `apps/api/src/routes/workstreams.ts` | ✅ CRUD + tasks listing |
| Task routes | `apps/api/src/routes/tasks.ts` | ✅ Create, retry, complete |
| Feature routes | `apps/api/src/routes/features.ts` | ✅ CRUD + reorder + kickoff |
| Workspace routes | `apps/api/src/routes/workspaces.ts` | ✅ CRUD + project listing |
| Artifact routes | `apps/api/src/routes/artifacts.ts` | ✅ List by project, get, delete |
| Audit log routes | `apps/api/src/routes/audit-logs.ts` | ✅ List by project |
| File routes | `apps/api/src/routes/files.ts` | ✅ File listing + content |
| Health routes | `apps/api/src/routes/health.ts` | ✅ Health check |
| SSE events | `apps/api/src/routes/events.ts` | ✅ SSE via Redis Pub/Sub |
| DB plugin | `apps/api/src/plugins/database.ts` | ✅ |
| Redis plugin | `apps/api/src/plugins/redis.ts` | ✅ BullMQ + Pub/Sub |
| Error handler | `apps/api/src/plugins/error-handler.ts` | ✅ |
| Route tests | `apps/api/src/routes/__tests__/` | ✅ Partial |

### Owned Folders

- `apps/api/`

### Dependencies

- **WS-1 (Data Layer)**: Repository functions for all database operations.
- **WS-3 (Orchestrator)**: Queue names and job payload shapes for enqueueing.

### Interfaces Provided

- **REST API**: The full set of HTTP endpoints consumed by the web dashboard and any external clients.
- **SSE stream**: A streaming endpoint for real-time progress updates.
- **OpenAPI-compatible route definitions**: Fastify's schema definitions serve as the API contract.

### Definition of Done

- All endpoints listed above are implemented, validated, and return correct responses.
- Error responses follow a consistent format: `{ error: string, statusCode: number, details?: object }`.
- Every route has at least one happy-path and one error-path integration test.
- The API server starts cleanly, connects to PostgreSQL and Redis, and shuts down gracefully.
- Request and response schemas match the shared type definitions.

### Stability Contract

The following are stable:

- **Endpoint URLs and HTTP methods**: will not change without versioning.
- **Response shapes**: field names and types in JSON responses will not change. New fields may be added but existing fields will not be removed or renamed.
- **Error format**: the error response structure is fixed.

---

## WS-3: Orchestrator Engine ✅ COMPLETED

### Objective

Build the core orchestration logic: the planning pipeline, task dispatching, agent runtime, and progress tracking. This is the most complex workstream and the heart of the system.

### Scope

- BullMQ worker setup for all three queues (planning, implementation, validation)
- Architect agent: prompt construction, Claude API call, plan parsing
- Implementation agent: prompt construction, Claude API call, file extraction and writing
- Validation agent: output checking against contracts
- Task dispatching with dependency resolution
- Progress tracking and status management
- Retry logic with error context propagation
- Claude API client with streaming, retry, and rate limit handling

### Deliverables

| Deliverable | Path | Description |
|---|---|---|
| Orchestrator entry | `apps/orchestrator/src/index.ts` | Worker startup and shutdown |
| Queue setup | `apps/orchestrator/src/queues/setup.ts` | Queue and worker definitions |
| Planning worker | `apps/orchestrator/src/workers/planning.ts` | Architect agent execution |
| Implementation worker | `apps/orchestrator/src/workers/implementation.ts` | Implementation agent execution |
| Validation worker | `apps/orchestrator/src/workers/validation.ts` | Output validation execution |
| Architect agent | `apps/orchestrator/src/agents/architect.ts` | Plan generation logic |
| Implementer agent | `apps/orchestrator/src/agents/implementer.ts` | Code generation logic |
| Prompt templates | `apps/orchestrator/src/agents/prompts/` | Prompt templates for each agent type |
| Claude API client | `apps/orchestrator/src/llm/claude.ts` | API client with streaming and retry |
| Plan parser | `apps/orchestrator/src/planning/parser.ts` | Extract structured plan from LLM output |
| Task dispatcher | `apps/orchestrator/src/planning/dispatcher.ts` | Enqueue tasks respecting dependencies |
| File writer | `apps/orchestrator/src/output/writer.ts` | Write agent output to disk |
| Response parser | `apps/orchestrator/src/output/response-parser.ts` | Extract files from agent response |
| Progress tracker | `apps/orchestrator/src/tracking/progress.ts` | Status aggregation and updates |
| Orchestrator tests | `apps/orchestrator/src/__tests__/` | Unit and integration tests |

### Owned Folders

- `apps/orchestrator/`

### Dependencies

- **WS-1 (Data Layer)**: Repository functions for persisting plans, tasks, and status updates.
- **WS-2 (API Server)**: Indirectly, through shared queue definitions. The API server enqueues the initial planning job; the orchestrator consumes it.

### Interfaces Provided

- **Queue consumers**: The orchestrator consumes jobs from `planning`, `implementation`, and `validation` queues.
- **Status updates**: The orchestrator writes status changes to the database, which the API server reads and serves.
- **File output**: The orchestrator writes generated files to the project output directory.

### Definition of Done

- A planning job produces a structured plan with workstreams, tasks, and contracts.
- Implementation tasks generate code files that are written to disk.
- Validation tasks check generated files and report results.
- Failed tasks are retried with error context from the previous attempt.
- Progress is tracked accurately: task status, workstream status, and project status are consistent.
- The orchestrator handles Claude API errors gracefully (rate limits, timeouts, malformed responses).
- Unit tests cover planning, dispatching, and parsing logic with mocked Claude API responses.
- At least one integration test demonstrates the full planning-to-implementation flow with a real Claude API call.

### Stability Contract

The following are stable:

- **Queue names**: `planning`, `implementation`, `validation` will not change.
- **Job payload shapes**: the TypeScript interfaces for job data will not change without coordinated updates.
- **File output structure**: the project output directory layout is fixed after initial design.

---

## WS-4: Web Dashboard ✅ COMPLETED

### Objective

Build the Next.js web application that provides the user interface for creating projects, monitoring progress, and inspecting agent output.

### Scope

- Next.js application with App Router
- Project creation flow
- Project list and detail pages
- Workstream and task visualization
- Real-time progress updates
- Basic responsive layout with Tailwind CSS

### Deliverables

| Deliverable | Path | Description |
|---|---|---|
| Next.js app | `apps/web/` | Application root |
| Layout | `apps/web/src/app/layout.tsx` | Root layout with navigation |
| Home page | `apps/web/src/app/page.tsx` | Project list / landing page |
| New project page | `apps/web/src/app/projects/new/page.tsx` | Goal submission form |
| Project detail page | `apps/web/src/app/projects/[id]/page.tsx` | Project overview with workstreams |
| Workstream detail | `apps/web/src/app/projects/[id]/workstreams/[wsId]/page.tsx` | Task list and progress |
| Task detail | `apps/web/src/app/projects/[id]/tasks/[taskId]/page.tsx` | Agent output and logs |
| API client | `apps/web/src/lib/api.ts` | HTTP client for API server |
| Project components | `apps/web/src/components/projects/` | Project-related UI components |
| Workstream components | `apps/web/src/components/workstreams/` | Progress bars, status badges |
| Task components | `apps/web/src/components/tasks/` | Task cards, file trees |
| Shared components | `apps/web/src/components/ui/` | Buttons, cards, badges, layout primitives |
| Polling hook | `apps/web/src/hooks/usePolling.ts` | Auto-refresh hook for active projects |

### Owned Folders

- `apps/web/`

### Dependencies

- **WS-2 (API Server)**: All data comes from the REST API. The dashboard has no direct database access.

### Interfaces Provided

- **User interface**: The web dashboard is the primary user-facing interface. It consumes the API and presents the data.

### Definition of Done

- A user can create a project by entering a goal in a form.
- The project list page shows all projects with status indicators.
- The project detail page shows workstreams with progress bars that update automatically.
- The task detail page shows agent output (generated files) and error messages.
- The dashboard is usable in a modern browser (Chrome, Firefox, Safari).
- Pages load without JavaScript errors in the console.

### Stability Contract

The web dashboard is a leaf node --- no other workstream depends on it. There is no stability contract for the dashboard's internal components.

---

## WS-5: DevOps and Quality 🔶 PARTIALLY COMPLETE

### Objective

Establish the infrastructure, tooling, and quality guardrails that support all other workstreams. This workstream is cross-cutting: it provides the foundation that other workstreams build on and the checks that keep the codebase healthy.

> **Note:** Docker Compose, Biome, Vitest, TypeScript configs, and dev scripts are done. Missing: production Dockerfiles, GitHub Actions CI, `.env.example`, setup/reset scripts.

### Scope

- Docker Compose configuration for development infrastructure
- Biome configuration for linting and formatting
- Vitest configuration for testing
- TypeScript configuration for the monorepo
- Environment variable management
- Development scripts and utilities
- CI configuration (local script, no cloud CI for MVP)

### Deliverables

| Deliverable | Path | Description |
|---|---|---|
| Docker Compose | `docker-compose.yml` | PostgreSQL and Redis services |
| Root tsconfig | `tsconfig.base.json` | Shared TypeScript compiler options |
| Biome config | `biome.json` | Lint and format rules |
| Root package.json | `package.json` | Workspace scripts |
| Workspace config | `pnpm-workspace.yaml` | Workspace definitions |
| Env example | `.env.example` | All required environment variables |
| Vitest workspace | `vitest.config.ts` | Monorepo test configuration |
| Dev script | `scripts/dev.sh` | Start all services for development |
| Reset script | `scripts/reset-db.sh` | Drop and recreate database |
| Check script | `scripts/check.sh` | Run lint, format check, type check, and tests |
| Dockerfile (api) | `apps/api/Dockerfile` | API server container (future use) |
| Dockerfile (orchestrator) | `apps/orchestrator/Dockerfile` | Orchestrator container (future use) |
| Dockerfile (web) | `apps/web/Dockerfile` | Web dashboard container (future use) |

### Owned Folders

- Root configuration files
- `scripts/`
- Dockerfiles in each `apps/` directory

### Dependencies

- None. This workstream provides infrastructure to all other workstreams.

### Interfaces Provided

- **Docker Compose services**: PostgreSQL and Redis available at well-known ports.
- **Development scripts**: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`.
- **Configuration**: Biome, TypeScript, and Vitest configurations that all packages inherit.
- **Environment contract**: `.env.example` defining all required variables.

### Definition of Done

- `docker-compose up -d` starts PostgreSQL and Redis with health checks passing.
- `pnpm install` completes without errors.
- `pnpm build` compiles all TypeScript packages.
- `pnpm lint` runs Biome on all packages with no errors.
- `pnpm test` runs Vitest across all packages.
- `.env.example` documents every environment variable with descriptions and example values.
- A developer can go from `git clone` to running system in under 5 minutes following the runbook.

### Stability Contract

The following are stable:

- **Docker Compose service names and ports**: `postgres:5432`, `redis:6379`.
- **Workspace script names**: `dev`, `build`, `test`, `lint`.
- **Environment variable names**: documented in `.env.example`, will not be renamed without migration instructions.
- **TypeScript compiler options**: `tsconfig.base.json` options are fixed. Packages extend but do not override without justification.
