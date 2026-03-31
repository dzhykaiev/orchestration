# Implementation Plan

This plan is divided into six phases. Each phase builds on the previous one and produces a testable increment. The phases are sequential at the macro level, but within each phase, work across packages can proceed in parallel following the workstream structure defined in `workstreams.md`.

## Phase 1: Foundation ✅ COMPLETED

**Goal:** Establish the monorepo structure, database schema, shared types, and basic API scaffolding. At the end of this phase, you can create a project via the API and see it in the database.

**Duration estimate:** 3-5 days

### Deliverables

1. **Monorepo configuration**
   - `pnpm-workspace.yaml` defining `apps/*` and `packages/*` workspaces
   - Root `tsconfig.base.json` with shared compiler options
   - `biome.json` with project-wide lint and format rules
   - Root `package.json` with workspace-level scripts (`dev`, `build`, `test`, `lint`)

2. **Docker Compose infrastructure**
   - `docker-compose.yml` with PostgreSQL 16 and Redis 7 services
   - Health checks for both services
   - Volume mounts for PostgreSQL data persistence
   - Port mappings: PostgreSQL on 5432, Redis on 6379

3. **Shared types package (`packages/shared`)**
   - Entity types: `Project`, `Workstream`, `AgentTask`, `Contract`
   - Enum types: `ProjectStatus`, `WorkstreamStatus`, `TaskStatus`, `AgentRole`
   - ID generation utility (UUIDs)
   - Package build configuration (tsup or unbundled)

4. **Database schema and migrations**
   - Migration tool setup (node-pg-migrate or Drizzle Kit)
   - Initial migration: `projects`, `workstreams`, `agent_tasks`, `contracts`, `agent_logs` tables
   - Seed script for development data
   - Database connection utility with pool configuration

5. **API server scaffolding (`apps/api`)**
   - Fastify application with TypeScript
   - Database connection plugin
   - Health check endpoint (`GET /health`)
   - Project CRUD endpoints (`POST /projects`, `GET /projects`, `GET /projects/:id`)
   - Request/response validation using shared types
   - Structured logging with pino

6. **Contracts directory**
   - `.env.example` with all required environment variables
   - API contract definitions for Phase 1 endpoints
   - Database schema contract (matches migrations)

### Exit Criteria

- `docker-compose up` starts PostgreSQL and Redis successfully.
- `pnpm install` resolves all workspace dependencies.
- `pnpm --filter apps/api dev` starts the API server.
- `POST /projects` creates a project and `GET /projects/:id` returns it.
- `pnpm test` runs and passes (at least for shared types and API route tests).
- `pnpm lint` passes with no errors.

---

## Phase 2: Orchestrator Core ✅ COMPLETED

**Goal:** Build the orchestrator's planning pipeline and task dispatching system. At the end of this phase, submitting a project goal triggers the architect agent, produces a plan, and creates workstreams and tasks in the database.

**Duration estimate:** 5-7 days

### Deliverables

1. **Orchestrator application scaffolding (`apps/orchestrator`)**
   - BullMQ worker setup with Redis connection
   - Queue definitions: `planning`, `implementation`, `validation`
   - Worker configuration with concurrency limits
   - Graceful shutdown handling

2. **Planning pipeline**
   - Architect agent prompt template
   - Claude API client (with retry, timeout, streaming support)
   - Plan parser: extract structured plan from Claude response (components, file structure, contracts, workstream breakdown)
   - Plan validator: check plan completeness and internal consistency
   - Plan persistence: save plan as JSONB on the project record

3. **Workstream and task creation**
   - Workstream creation from plan decomposition
   - Task creation with dependency ordering
   - Contract extraction from plan and persistence to `contracts` table

4. **Task dispatching**
   - Dispatch logic: enqueue implementation tasks respecting dependency order
   - Priority assignment based on workstream dependencies
   - Status update pipeline: task status changes update workstream and project status

5. **API integration**
   - `POST /projects/:id/plan` endpoint to trigger orchestration planning
   - `GET /projects/:id/workstreams` endpoint
   - `GET /workstreams/:id/tasks` endpoint
   - Job enqueue from API server to orchestrator via BullMQ

### Exit Criteria

- Submitting a project goal and calling `/projects/:id/plan` enqueues a planning job.
- The orchestrator picks up the job, calls Claude API, and produces a structured plan.
- Workstreams and tasks are created in the database with correct dependencies.
- Implementation tasks are enqueued in the correct order.
- All status transitions are tracked in the database.

---

## Phase 3: Agent Runtime ✅ COMPLETED

**Goal:** Build the implementation agent runtime that executes tasks by calling Claude API and writing files to disk. At the end of this phase, agents can generate code files for a project.

**Duration estimate:** 5-7 days

### Deliverables

1. **Implementation agent prompt templates**
   - Code generation prompt with plan context, contracts, and output format specification
   - File-per-response format: agent output includes file path and content for each generated file
   - Error context injection for retry prompts

2. **Agent runtime engine**
   - BullMQ worker for `implementation` queue
   - Prompt construction from task record, plan, and contracts
   - Claude API call with streaming (for progress tracking)
   - Response parser: extract file blocks from agent response
   - File writer: write extracted files to project output directory
   - Result persistence: save agent output metadata to task record

3. **Output validation**
   - BullMQ worker for `validation` queue
   - File existence checks
   - TypeScript syntax validation (using `ts.createSourceFile` for parse check, not full compilation)
   - JSON schema validation for configuration files
   - Contract conformance checks (exported types match expected interfaces)

4. **Retry mechanism**
   - Failed task detection and re-enqueue with incremented attempt count
   - Error context from previous attempt included in retry prompt
   - Maximum attempt enforcement
   - Dead letter handling for permanently failed tasks

5. **File system management**
   - Project output directory creation and structure
   - File path resolution and sanitization
   - Conflict detection (two tasks writing to the same file)
   - Output manifest: record of all files generated per task

### Exit Criteria

- An implementation task is picked up from the queue, generates code via Claude API, and writes files to the project output directory.
- The generated files are syntactically valid TypeScript (or JSON, YAML, as appropriate).
- Failed tasks are retried with error context.
- Validation tasks check file existence and basic syntax.
- The project output directory contains a coherent file structure after all agents complete.

---

## Phase 4: Web Dashboard ✅ COMPLETED

**Goal:** Build the Next.js web dashboard for project creation and progress monitoring. At the end of this phase, users can create projects and watch agents work through the browser.

**Duration estimate:** 4-6 days

### Deliverables

1. **Next.js application scaffolding (`apps/web`)**
   - Next.js App Router setup with TypeScript
   - Tailwind CSS for styling
   - API client utility for communicating with the Fastify API server
   - Layout with navigation

2. **Project creation**
   - Goal submission form with text area
   - Form validation
   - Submit handler that calls `POST /projects` and then `POST /projects/:id/plan`
   - Redirect to project detail page after creation

3. **Project list view**
   - List of all projects with status badges
   - Status filtering
   - Relative timestamps ("2 minutes ago")
   - Link to project detail page

4. **Project detail view**
   - Project metadata (goal, status, timestamps)
   - Plan summary (if available)
   - Workstream list with progress indicators
   - Overall progress bar

5. **Workstream and task views**
   - Workstream detail with task list
   - Task status indicators (queued, running, completed, failed)
   - Task detail: prompt sent, agent response, files generated, error messages
   - Expandable file tree showing generated output
   - Dependency graph visualization (dagre-based DAG)

6. **Real-time updates**
   - SSE subscription to `/api/events` for live events
   - Polling mechanism (10s interval while projects are active)
   - Status badge updates without full page reload
   - Auto-stop polling when project reaches terminal state

7. **Additional pages (beyond original scope)**
   - Feature board (`/board`) — Kanban-style feature tracking
   - Workspace management (`/workspaces`) — list and detail views
   - Artifact list and audit timeline components

### Exit Criteria

- User can create a project by typing a goal in the browser.
- Project list shows all projects with current status.
- Project detail page shows workstreams and tasks updating in near-real-time.
- Task detail shows the agent's generated files.
- The dashboard is functional and readable (not necessarily polished).

---

## Phase 5: Integration 🔶 MOSTLY COMPLETE

**Goal:** Wire everything together into a working end-to-end flow. Handle edge cases, failures, and error states gracefully. At the end of this phase, the system works reliably for the happy path and degrades gracefully for error paths.

**Duration estimate:** 4-6 days

> **Note:** E2E flow works. SSE events, status management, retry logic, and error handling are implemented. Outstanding: timeout handling for long-running tasks, comprehensive observability (correlation IDs, structured logging), and some data integrity checks.

### Deliverables

1. **End-to-end flow testing**
   - Submit a real goal through the web dashboard
   - Verify architect agent produces a coherent plan
   - Verify implementation agents produce valid code
   - Verify validation catches obvious errors
   - Verify the dashboard reflects all state changes

2. **Error handling**
   - Claude API errors (rate limits, timeouts, server errors): exponential backoff, clear error messages
   - Database connection errors: connection pool recovery, request queuing
   - Redis connection errors: graceful degradation, job re-enqueue on reconnection
   - File system errors: permission checks, disk space checks, path validation
   - Malformed agent output: structured error reporting, retry with corrective context

3. **Status management**
   - Ensure project status accurately reflects aggregate workstream/task status
   - Handle partial failures (some workstreams complete, others fail)
   - Implement project cancellation (stop queued tasks, let running tasks finish)
   - Add timeout handling for tasks that run too long

4. **Observability**
   - Structured logging across all components with correlation IDs (project ID, workstream ID, task ID)
   - Request logging in the API server
   - Job processing logging in the orchestrator
   - Claude API call logging (prompt tokens, completion tokens, latency)
   - Error aggregation and reporting

5. **Data integrity**
   - Verify no orphaned tasks (tasks without workstreams)
   - Verify no duplicate job processing (BullMQ idempotency)
   - Verify file writes are atomic (write to temp file, rename)
   - Add database constraints that application logic assumes

### Exit Criteria

- A project can be created, planned, implemented, validated, and completed via the web dashboard with no manual intervention.
- When an agent fails, the task is retried and the dashboard shows the retry.
- When a workstream is blocked by a dependency failure, the dashboard shows the blocked state.
- Logs tell a clear story of what happened during a project's lifecycle.
- No data integrity issues after running several projects.

---

## Phase 6: Polish 🔶 PARTIALLY COMPLETE

**Goal:** Improve developer experience, add observability, and document everything. At the end of this phase, the system is ready for demonstration and iteration.

**Duration estimate:** 3-4 days

> **Note:** `pnpm dev` script exists, Biome/Vitest configured, base documentation written. Outstanding: comprehensive test coverage, `.env.example`, production Dockerfiles, CI pipeline, setup scripts.

### Deliverables

1. **Developer experience**
   - `pnpm dev` starts all services with a single command (using concurrently or similar)
   - `pnpm reset` drops the database and re-runs migrations
   - `pnpm seed` populates development data
   - Hot reload for all applications during development
   - Clear error messages for common setup issues

2. **Test coverage**
   - Unit tests for shared types and utilities
   - Unit tests for orchestrator planning and dispatching logic (mocked Claude API)
   - Integration tests for API endpoints
   - Integration tests for the full orchestration flow (with a mock Claude API that returns predefined responses)
   - Test fixtures for common project types

3. **Documentation**
   - README.md with quick start instructions
   - API documentation (auto-generated from Fastify schemas or manually maintained)
   - Architecture documentation (this file and related docs)
   - Agent prompt documentation (what each agent receives and what it is expected to produce)

4. **Configuration**
   - Centralized configuration management (environment variables with validation)
   - Configurable agent parameters (model, temperature, max tokens)
   - Configurable retry policies
   - Configurable output directory

5. **Cleanup**
   - Remove dead code and unused dependencies
   - Consistent error handling patterns across all components
   - Consistent logging patterns across all components
   - Final lint and format pass

### Exit Criteria

- A new developer can clone the repo, run three commands, and have the system running.
- Tests pass and cover the critical paths.
- Documentation is accurate and complete.
- The codebase is clean, consistent, and ready for the next iteration.
