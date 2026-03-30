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
- CRUD operations for projects, workstreams, tasks, and contracts
- Input validation using JSON Schema (Fastify's native validation)
- Enqueueing orchestration jobs into BullMQ
- Serving task status and progress data
- Streaming progress updates via Server-Sent Events (SSE)

**Key design choices:**
- Stateless. All state lives in PostgreSQL and Redis.
- Schema-validated requests and responses. Every route has typed input/output schemas derived from the shared contracts package.
- No business logic. The API server is a thin layer over the database and job queue. Orchestration logic lives in the orchestrator.

### Web Dashboard (`apps/web`)

A Next.js application providing the user interface for the platform.

**Responsibilities:**
- Project creation form (goal submission)
- Project list and detail views
- Workstream progress visualization
- Task detail view (agent output, logs, files generated)
- Real-time progress updates (polling or SSE)

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
- Entity types: `Project`, `Workstream`, `AgentTask`, `Contract`, `AgentConfig`
- Enum definitions: task statuses, agent roles, workstream states
- Validation schemas (Zod or JSON Schema)
- Utility functions: ID generation, timestamp formatting, path resolution
- Contract type definitions used by both API server and orchestrator

### Contracts (`contracts/`)

The contract-first design means that all boundaries --- between services, between agents, between database and application --- are defined by explicit contracts before implementation begins.

**Contents:**
- API route contracts (request/response shapes for every endpoint)
- Event contracts (payload shapes for every BullMQ job type)
- Database schema contracts (table definitions, migration scripts)
- Environment variable contracts (`.env.example` with all required variables)
- File output contracts (expected directory structure for generated projects)

## Data Flow

### Goal Submission to Completion

```
1. User submits goal via Web Dashboard
   POST /api/projects { goal: "Build a bookmark manager API" }

2. API Server creates project record in PostgreSQL
   Status: CREATED

3. API Server enqueues planning job
   Queue: "planning" → { projectId, goal }

4. Orchestrator picks up planning job
   - Constructs architect prompt with goal + constraints
   - Calls Claude API
   - Parses structured plan from response
   - Creates workstream records in PostgreSQL
   - Creates task records for each workstream
   Status: PLANNING → PLANNED

5. Orchestrator enqueues implementation tasks
   Queue: "implementation" → { taskId, workstreamId, prompt, context }
   (One job per task, respecting dependency order within workstreams)

6. Orchestrator workers pick up implementation tasks (parallel)
   For each task:
   - Constructs implementation prompt with plan context + contracts
   - Calls Claude API
   - Parses code/files from response
   - Writes files to project output directory
   - Updates task status in PostgreSQL
   Status per task: QUEUED → RUNNING → COMPLETED | FAILED

7. Orchestrator enqueues validation jobs for completed tasks
   Queue: "validation" → { taskId, expectedOutputs }

8. Orchestrator validates output
   - Checks files exist
   - Runs basic syntax/parse checks
   - Validates against contracts
   Status per task: VALIDATING → VALIDATED | VALIDATION_FAILED

9. When all tasks in a workstream complete:
   Workstream status: COMPLETED

10. When all workstreams complete:
    Project status: COMPLETED
```

## Database Schema Overview

### `projects`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique project identifier                  |
| goal         | TEXT         | User-provided goal description             |
| status       | ENUM         | CREATED, PLANNING, PLANNED, IN_PROGRESS, COMPLETED, FAILED |
| plan         | JSONB        | Structured plan output from architect agent|
| output_path  | TEXT         | File system path for generated code        |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

### `workstreams`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique workstream identifier               |
| project_id   | UUID (FK)    | Reference to parent project                |
| name         | TEXT         | Human-readable workstream name             |
| description  | TEXT         | Scope and objective                        |
| status       | ENUM         | PENDING, IN_PROGRESS, COMPLETED, BLOCKED, FAILED |
| order_index  | INTEGER      | Execution priority                         |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |
| updated_at   | TIMESTAMPTZ  | Last update timestamp                      |

### `agent_tasks`

| Column         | Type         | Description                              |
|----------------|--------------|------------------------------------------|
| id             | UUID (PK)    | Unique task identifier                   |
| workstream_id  | UUID (FK)    | Reference to parent workstream           |
| agent_role     | ENUM         | ARCHITECT, IMPLEMENTER, VALIDATOR        |
| title          | TEXT         | Human-readable task title                |
| prompt         | TEXT         | Full prompt sent to Claude API           |
| status         | ENUM         | QUEUED, RUNNING, COMPLETED, FAILED, VALIDATING, VALIDATED |
| result         | JSONB        | Agent output (files, metadata, errors)   |
| attempt_count  | INTEGER      | Number of execution attempts             |
| max_attempts   | INTEGER      | Maximum retry limit (default: 3)         |
| depends_on     | UUID[]       | Task IDs that must complete first        |
| created_at     | TIMESTAMPTZ  | Creation timestamp                       |
| started_at     | TIMESTAMPTZ  | Execution start timestamp                |
| completed_at   | TIMESTAMPTZ  | Completion timestamp                     |

### `contracts`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique contract identifier                 |
| project_id   | UUID (FK)    | Reference to parent project                |
| type         | ENUM         | API, EVENT, SCHEMA, FILE_STRUCTURE         |
| name         | TEXT         | Contract name                              |
| definition   | JSONB        | Full contract definition                   |
| version      | INTEGER      | Contract version (incremented on change)   |
| created_at   | TIMESTAMPTZ  | Creation timestamp                         |

### `agent_logs`

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| id           | UUID (PK)    | Unique log entry identifier                |
| task_id      | UUID (FK)    | Reference to agent task                    |
| level        | ENUM         | DEBUG, INFO, WARN, ERROR                   |
| message      | TEXT         | Log message                                |
| metadata     | JSONB        | Additional structured data                 |
| created_at   | TIMESTAMPTZ  | Log timestamp                              |

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

- **Purpose:** Output validation jobs. One per completed implementation task.
- **Concurrency:** 5 (validation is lightweight, can run more in parallel).
- **Priority:** Normal.
- **Retry policy:** 1 retry. Validation failures usually indicate an agent output problem, not a transient error.
- **Job data:** `{ taskId: string, expectedFiles: string[], contracts: object[] }`

### Queue Flow

```
[planning] ──completed──> [implementation] ──completed──> [validation]
                               │                              │
                               │ (parallel, up to 3)          │ (parallel, up to 5)
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
