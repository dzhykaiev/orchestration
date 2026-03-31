# Architecture

## System Diagram

```
                          +------------------+
                          |   Web Dashboard  |
                          |   (Next.js)      |
                          |   apps/web       |
                          +--------+---------+
                                   |
                                   | HTTP (REST)
                                   |
                          +--------v---------+
                          |   API Server     |
                          |   (Fastify)      |
                          |   apps/api       |
                          +--------+---------+
                                   |
                      +------------+------------+
                      |                         |
               +------v------+          +-------v--------+
               |  PostgreSQL |          |  Redis         |
               |  (data)     |          |  (queues)      |
               +------+------+          +-------+--------+
                      |                         |
                      +------------+------------+
                                   |
                          +--------v---------+
                          |  Orchestrator    |
                          |  (BullMQ worker) |
                          |  apps/orchestrator|
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |              |              |
              +-----v----+  +-----v----+  +-----v----+
              | Agent 1  |  | Agent 2  |  | Agent 3  |
              | (worker) |  | (worker) |  | (worker) |
              +-----+----+  +-----+----+  +-----+----+
                    |              |              |
                    v              v              v
              +-----------+  +-----------+  +-----------+
              | Claude    |  | Claude    |  | Claude    |
              | API       |  | API       |  | API       |
              +-----------+  +-----------+  +-----------+
                    |              |              |
                    v              v              v
              +----------------------------------------+
              |          File System (output)          |
              +----------------------------------------+
```

## Components

### API Server (`apps/api`)

The API server is a Fastify application that exposes REST endpoints for all platform operations. It is the only entry point for external clients (the web dashboard, CLI tools, or direct HTTP calls).

**Responsibilities:**
- CRUD operations for projects, workstreams, tasks, features, workspaces, artifacts, and audit logs
- Input validation using Zod schemas
- Enqueueing orchestration jobs into BullMQ
- Serving task status and progress data
- Streaming progress updates via Server-Sent Events (SSE) with Redis Pub/Sub

**Key design choices:**
- Stateless. All state lives in PostgreSQL and Redis.
- Schema-validated requests and responses. Every route has typed Zod schemas for input validation.
- No business logic. The API server is a thin layer over the database and job queue. Orchestration logic lives in the orchestrator.

### Web Dashboard (`apps/web`)

A Next.js application providing the user interface for the platform.

**Responsibilities:**
- Project creation form (goal submission)
- Project list and detail views with search, filter, and sort
- Workstream progress visualization with dependency graph
- Task detail view (agent output, logs, files generated)
- Feature board (Kanban-style)
- Workspace management
- Artifact viewer and audit timeline
- Real-time progress updates (SSE + polling)

**Key design choices:**
- Server-side rendering for initial page loads, client-side updates for progress tracking.
- Communicates exclusively through the API server. Never accesses PostgreSQL or Redis directly.
- Minimal state management. The API is the source of truth.

### Orchestrator (`apps/orchestrator`)

The core brain of the system. Runs as a BullMQ worker process that consumes jobs from Redis queues and coordinates the full lifecycle of a project.

**Responsibilities:**
- **Planning pipeline.** Receives a project goal, invokes the architect agent (Claude API), and produces a structured plan: components, file structure, data models, API contracts.
- **Workstream creation.** Decomposes the plan into parallel workstreams, each with scoped tasks.
- **Task dispatching.** Enqueues implementation tasks into the appropriate BullMQ queues with priorities and dependencies.
- **Agent runtime.** Manages the execution of agent tasks: constructing prompts, calling Claude API, parsing responses, writing files to disk.
- **Progress tracking.** Updates task and workstream status in PostgreSQL as agents complete work.
- **Validation.** Checks agent output against contracts (file existence, schema compliance, basic syntax checks).
- **Error handling.** Retries failed tasks with corrective context, marks workstreams as blocked when dependencies fail.

**Key design choices:**
- Single process with multiple BullMQ workers for different queue types.
- Agents are not separate services --- they are functions executed within the orchestrator process. An "agent" is a prompt template + Claude API call + output handler.
- Idempotent task execution. Re-running a task produces the same result (or a corrected one). No side effects beyond file writes and database updates.

### Shared Package (`packages/shared`)

TypeScript package containing types, interfaces, and utilities shared across all applications.

**Contents:**
- Entity types: `Project`, `Workstream`, `AgentTask`, `Feature`, `Workspace`, `Artifact`, `AuditLog`, `AgentDefinition`
- Enum definitions: task statuses, agent roles, workstream states, feature statuses, artifact types, audit actions
- Zod validation schemas (per-entity: create/update inputs, query params)
- Event type definitions (`OrchestratorEvent` union, `EVENTS_CHANNEL`)
- Environment contract (`EnvContract`)
- LLM provider interface

### Database Package (`packages/db`)

Contains the PostgreSQL schema (Drizzle ORM), connection client, and repository layer.

**Contents:**
- Schema definition (`src/schema.ts`) — single source of truth for all tables, enums, relations, and indexes
- Repository classes (`src/repositories/`) — one per entity: projects, workstreams, tasks, features, workspaces, artifacts, audit-logs
- Database client (`src/client.ts`) — postgres.js driver with Drizzle ORM wrapper
- Migrations (`drizzle/`) — generated by Drizzle Kit

Repositories are imported by both `apps/api` and `apps/orchestrator` via `@orchestration/db`.

## Data Flow

### Goal Submission to Completion

```
1. User submits goal via Web Dashboard
   POST /api/projects { goal: "Build a bookmark manager API" }

2. API Server creates project record in PostgreSQL
   Status: draft

3. User triggers planning via POST /api/projects/:id/plan
   API enqueues planning job → Queue: "planning" → { projectId }

4. Orchestrator picks up planning job
   - Constructs architect prompt with goal + constraints
   - Calls LLM provider (Claude CLI or OpenCode)
   - Parses structured plan from response
   - Creates workstream records in PostgreSQL
   - Enqueues implementation tasks for workstreams without dependencies
   Status: draft → planning → in_progress

5. Orchestrator workers pick up implementation tasks (parallel, up to 3)
   For each task:
   - Constructs implementation prompt with plan context + agent brief
   - Snapshots files before execution
   - Calls LLM provider
   - Diffs to detect modified files
   - Tracks agent costs
   - Updates task status in PostgreSQL
   Status per task: queued → running → completed | failed

6. On workstream completion, orchestrator enqueues validation job
   Queue: "validation" → { workstreamId }

7. Orchestrator validates workstream output
   - QA agent checks deliverables
   - Parses VERDICT (PASS/FAIL) from QA output
   - Updates workstream validationStatus
   Workstream status: in_progress → completed | failed

8. When all workstreams complete:
   Project status: completed (or failed if any critical workstream failed)
```

## Database Schema Overview

Schema is defined in `packages/db/src/schema.ts` using Drizzle ORM.

### Enums

| Enum | Values |
|------|--------|
| `projectStatus` | draft, planning, in_progress, completed, failed, cancelled, archived |
| `workstreamStatus` | pending, blocked, in_progress, completed, failed |
| `taskStatus` | queued, running, completed, failed, cancelled |
| `agentRole` | ceo, planner, architect, lead, backend, frontend, data, devops, qa, reviewer |
| `agentTier` | strategic, tactical, operational |
| `validationStatus` | pass, fail, error |
| `featureStatus` | backlog, todo, in_progress, done, rejected |
| `featureType` | feature, bug, improvement, task |
| `artifactType` | code_diff, test_result, document, architecture, config, log, review_report |
| `auditAction` | created, updated, status_changed, delegated, escalated, reviewed, completed, failed |
| `actorType` | user, agent, system |
| `provider` | claude, opencode |

### `workspaces`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique workspace identifier                |
| name         | TEXT         | Workspace name                             |
| slug         | TEXT (unique) | URL-friendly identifier                   |
| description  | TEXT         | Workspace description                      |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

### `projects`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique project identifier                  |
| workspace_id | UUID (FK)    | Reference to parent workspace (nullable)   |
| name         | TEXT         | Project name                               |
| goal         | TEXT         | User-provided goal description             |
| status       | ENUM         | draft, planning, in_progress, completed, failed, cancelled, archived |
| mode         | TEXT         | greenfield or existing                     |
| llm_provider | ENUM         | claude or opencode                         |
| repo_url     | TEXT         | Repository URL (for existing mode)         |
| project_dir  | TEXT         | File system path for generated code        |
| cost_usd     | NUMERIC      | Total project cost in USD                  |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

### `workstreams`

| Column            | Type         | Description                                |
|-------------------|--------------|--------------------------------------------|
| id                | UUID (PK)    | Unique workstream identifier               |
| project_id        | UUID (FK)    | Reference to parent project                |
| name              | TEXT         | Human-readable workstream name             |
| description       | TEXT         | Scope and objective                        |
| role              | ENUM         | Agent role assigned to this workstream     |
| status            | ENUM         | pending, blocked, in_progress, completed, failed |
| validation_status | ENUM         | pass, fail, error (nullable)               |
| order_index       | INTEGER      | Execution priority                         |
| dependencies      | JSONB        | Array of dependent workstream names        |
| deliverables      | JSONB        | Expected output descriptions               |
| owned_paths       | JSONB        | File paths this workstream owns            |
| created_at        | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at        | TIMESTAMPTZ  | Last update timestamp                      |

### `agent_tasks`

| Column          | Type         | Description                              |
|-----------------|--------------|------------------------------------------|
| id              | UUID (PK)    | Unique task identifier                   |
| workstream_id   | UUID (FK)    | Reference to parent workstream           |
| project_id      | UUID (FK)    | Reference to parent project              |
| role            | ENUM         | Agent role (ceo, architect, backend, etc.) |
| title           | TEXT         | Human-readable task title                |
| prompt          | TEXT         | Full prompt sent to LLM                  |
| output          | TEXT         | Agent raw output                         |
| status          | ENUM         | queued, running, completed, failed, cancelled |
| error           | TEXT         | Error message if failed                  |
| cost_usd        | NUMERIC      | Task execution cost                      |
| attempt_count   | INTEGER      | Number of execution attempts             |
| max_attempts    | INTEGER      | Maximum retry limit (default: 3)         |
| files_modified  | JSONB        | List of files modified by the agent      |
| created_at      | TIMESTAMPTZ  | Creation timestamp                       |
| started_at      | TIMESTAMPTZ  | Execution start timestamp                |
| completed_at    | TIMESTAMPTZ  | Completion timestamp                     |

### `features`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique feature identifier                  |
| project_id   | UUID (FK)    | Reference to parent project (nullable)     |
| title        | TEXT         | Feature title                              |
| description  | TEXT         | Feature description                        |
| type         | ENUM         | feature, bug, improvement, task            |
| status       | ENUM         | backlog, todo, in_progress, done, rejected |
| priority     | INTEGER      | Sort priority                              |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

### `artifacts`

| Column        | Type         | Description                               |
|---------------|--------------|-------------------------------------------|
| id            | UUID (PK)    | Unique artifact identifier                |
| project_id    | UUID (FK)    | Reference to parent project               |
| workstream_id | UUID (FK)    | Reference to workstream (nullable)        |
| task_id       | UUID (FK)    | Reference to task (nullable)              |
| type          | ENUM         | code_diff, test_result, document, etc.    |
| name          | TEXT         | Artifact name                             |
| content       | TEXT         | Artifact content                          |
| metadata      | JSONB        | Additional structured data                |
| created_at    | TIMESTAMPTZ  | Creation timestamp                        |

### `audit_logs`

| Column      | Type         | Description                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID (PK)    | Unique log entry identifier                |
| project_id  | UUID (FK)    | Reference to project                       |
| entity_type | TEXT         | Entity type (project, workstream, task)    |
| entity_id   | UUID         | Reference to the entity                    |
| action      | ENUM         | created, updated, status_changed, etc.     |
| actor_type  | ENUM         | user, agent, system                        |
| actor_id    | TEXT         | ID of the actor                            |
| details     | JSONB        | Action details and context                 |
| created_at  | TIMESTAMPTZ  | Log timestamp                              |

### `agent_definitions`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique definition identifier               |
| role         | ENUM         | Agent role                                 |
| tier         | ENUM         | strategic, tactical, operational           |
| name         | TEXT         | Human-readable agent name                  |
| description  | TEXT         | Agent capabilities description             |
| capabilities | JSONB        | Structured capability list                 |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

## Queue Architecture

The system uses three BullMQ queues, each with a dedicated purpose and worker configuration.

### `planning` Queue

- **Purpose:** Architect agent jobs. One job per project.
- **Concurrency:** 1 (sequential planning --- only one project plans at a time).
- **Priority:** Highest. Planning must complete before any implementation begins.
- **Retry policy:** 2 retries with exponential backoff (5s, 30s).
- **Job data:** `{ projectId: string, goal: string, constraints?: string[] }`

### `implementation` Queue

- **Purpose:** Implementation agent jobs. Multiple jobs per workstream.
- **Concurrency:** 3 (matches the number of implementation agents).
- **Priority:** Based on workstream dependency order. Foundation tasks run first.
- **Retry policy:** 3 retries with exponential backoff (10s, 60s, 300s). Each retry includes the error context from the previous attempt.
- **Job data:** `{ taskId: string, workstreamId: string, prompt: string, context: object, outputPath: string }`

### `validation` Queue

- **Purpose:** Output validation jobs. One per completed workstream.
- **Concurrency:** 2 (QA agent validates workstream deliverables).
- **Priority:** Normal.
- **Retry policy:** 1 retry. Validation failures usually indicate an agent output problem, not a transient error.
- **Job data:** `{ workstreamId: string, projectId: string }`

### Queue Flow

```
[planning] ──completed──> [implementation] ──completed──> [validation]
                               │                              │
                               │ (parallel, up to 3)          │ (parallel, up to 2)
                               │                              │
                          task.completed ──────────> workstream.updated
                                                         │
                                                    project.updated
```

## Key Architectural Principles

### Contract-First Design

Every boundary in the system is defined by an explicit contract before any implementation begins. API routes have typed request/response schemas. BullMQ jobs have typed payloads. Database tables have migration scripts. Agents receive contracts as part of their prompt context so they produce output that conforms to the expected structure.

This means workstreams can proceed in parallel with confidence. If two agents both need to produce code that interacts at an interface boundary, the contract is the single source of truth for what that interface looks like.

### Agent Isolation

Each agent task is self-contained. An agent receives everything it needs in its prompt context: the relevant portion of the plan, the contracts it must conform to, and the file paths it should write to. Agents do not communicate with each other. They do not read each other's output during execution. Coordination happens through the orchestrator and the contracts.

This isolation makes the system predictable and debuggable. If an agent produces bad output, you can inspect its prompt, its context, and its response in isolation.

### Idempotent Tasks

Every task can be re-executed safely. Running a task again overwrites the previous output files and updates the database record. There are no append-only side effects that accumulate across retries.

This is critical for the retry mechanism. When a task fails and is retried, the orchestrator adds the error context from the previous attempt to the prompt, but the execution is otherwise identical in structure.

### Separation of Coordination and Execution

The orchestrator coordinates. Agents execute. The orchestrator decides what to do, in what order, and with what context. Agents receive a prompt and produce output. This separation means the orchestration logic can be tested without calling the Claude API, and agent behavior can be evaluated independently of the orchestration flow.
