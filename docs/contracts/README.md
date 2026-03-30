# Contracts

This project follows a contract-first design. Every boundary between components, services, agents, and data stores is defined by an explicit contract before implementation begins. Contracts are the single source of truth for inter-component communication.

## Why Contract-First?

In a system where multiple agents work in parallel on different parts of a codebase, contracts solve the coordination problem. Without contracts, Agent A might produce an API endpoint that returns `{ id, name, status }` while Agent B writes a client that expects `{ id, title, state }`. The integration fails, and debugging requires understanding both agents' outputs.

With contracts, both agents receive the same contract definition as part of their prompt context. Agent A implements the server side of the contract. Agent B implements the client side. When both conform to the contract, they integrate correctly.

Contracts also enable parallel development by humans. Each workstream can proceed independently as long as it respects the contracts at its boundaries.

## Contract Types

### API Contracts

**Location:** `contracts/api/`

TypeScript type definitions for every REST API endpoint. Each contract specifies the HTTP method, URL path, request parameters (path, query, body), and response shape.

```
contracts/api/
  projects.ts      # Project CRUD endpoints
  workstreams.ts   # Workstream endpoints
  tasks.ts         # Task endpoints
  contracts.ts     # Contract endpoints
  health.ts        # Health check endpoints
```

Each file exports typed route definitions. Example structure:

```typescript
// contracts/api/projects.ts
export interface CreateProjectRequest {
  goal: string;
}

export interface CreateProjectResponse {
  id: string;
  goal: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface GetProjectResponse {
  id: string;
  goal: string;
  status: ProjectStatus;
  plan: ProjectPlan | null;
  outputPath: string;
  workstreams: WorkstreamSummary[];
  createdAt: string;
  updatedAt: string;
}
```

The API server uses these types to validate requests and type responses. The web dashboard uses them to type API client functions. The orchestrator uses them when it needs to read project data via the API.

### Shared Entity Types

**Location:** `packages/shared/src/types/`

Core entity types used across the entire system. These are not HTTP-specific --- they represent the domain model.

```
packages/shared/src/types/
  project.ts       # Project entity and related types
  workstream.ts    # Workstream entity and related types
  task.ts          # AgentTask entity and related types
  contract.ts      # Contract entity and related types
  agent.ts         # Agent configuration and role types
  plan.ts          # Structured plan output types
  enums.ts         # Status enums, role enums
  index.ts         # Re-exports
```

Key entities:

| Entity | Description | Key Fields |
|---|---|---|
| `Project` | A user-submitted goal with its execution state | id, goal, status, plan, outputPath |
| `Workstream` | A parallel track of work within a project | id, projectId, name, status, orderIndex |
| `AgentTask` | A single unit of work assigned to an agent | id, workstreamId, agentRole, status, result, dependsOn |
| `Contract` | A contract definition attached to a project | id, projectId, type, name, definition |
| `AgentConfig` | Configuration for an agent instance | role, model, temperature, maxTokens |
| `ProjectPlan` | Structured output from the architect agent | components, fileStructure, contracts, workstreams |

### Event Contracts

**Location:** `contracts/events/`

TypeScript type definitions for every BullMQ job type. Each event contract specifies the queue name, job name, and payload shape.

```
contracts/events/
  planning.ts        # Planning queue job payloads
  implementation.ts  # Implementation queue job payloads
  validation.ts      # Validation queue job payloads
  index.ts           # Re-exports
```

Defined events:

| Event | Queue | Payload |
|---|---|---|
| `planning.start` | planning | `{ projectId: string, goal: string }` |
| `planning.completed` | (internal) | `{ projectId: string, plan: ProjectPlan }` |
| `implementation.execute` | implementation | `{ taskId: string, workstreamId: string, prompt: string, context: TaskContext, outputPath: string }` |
| `implementation.completed` | (internal) | `{ taskId: string, files: GeneratedFile[], metadata: object }` |
| `implementation.failed` | (internal) | `{ taskId: string, error: string, attempt: number }` |
| `validation.check` | validation | `{ taskId: string, expectedFiles: string[], contracts: ContractDefinition[] }` |
| `validation.completed` | (internal) | `{ taskId: string, valid: boolean, issues: ValidationIssue[] }` |
| `workstream.updated` | (internal) | `{ workstreamId: string, status: WorkstreamStatus }` |
| `project.updated` | (internal) | `{ projectId: string, status: ProjectStatus }` |

Events marked as `(internal)` are not BullMQ jobs --- they are status transitions handled within the orchestrator. They are documented here because they represent important state changes that other components observe through the database.

### Environment Contract

**Location:** `.env.example`

Defines every environment variable the system requires, with descriptions and example values.

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orchestration
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.2

# API Server
API_PORT=3001
API_HOST=0.0.0.0
API_LOG_LEVEL=info

# Web Dashboard
NEXT_PUBLIC_API_URL=http://localhost:3001

# Orchestrator
ORCHESTRATOR_CONCURRENCY_PLANNING=1
ORCHESTRATOR_CONCURRENCY_IMPLEMENTATION=3
ORCHESTRATOR_CONCURRENCY_VALIDATION=5
ORCHESTRATOR_OUTPUT_DIR=./output

# General
NODE_ENV=development
LOG_LEVEL=info
```

### Database Contract

**Location:** `packages/shared/migrations/`

SQL migration files that define the database schema. The migration files are the contract --- the actual table definitions, column types, constraints, and indexes.

Migration naming convention: `NNN_description.sql` (e.g., `001_initial_schema.sql`).

The schema contract includes:

- Table names and column definitions (types, nullability, defaults)
- Primary keys and foreign keys
- Indexes for common query patterns
- Check constraints for enum-like columns
- Unique constraints where applicable

Other workstreams depend on the schema being stable. Column additions are non-breaking. Column renames, type changes, and removals are breaking changes that require coordinated migration.

## Contract Lifecycle

1. **Definition.** Contracts are defined during the planning phase (by the architect agent) or manually before implementation begins.
2. **Review.** Contracts are checked for internal consistency and completeness.
3. **Freeze.** Once implementation begins, contracts are frozen. Changes require explicit coordination across affected workstreams.
4. **Implementation.** Each workstream implements its side of the relevant contracts.
5. **Validation.** The validation phase checks that implementations conform to contracts.

## Adding a New Contract

1. Define the TypeScript type in the appropriate `contracts/` subdirectory.
2. Export it from the subdirectory's `index.ts`.
3. If it affects shared types, update `packages/shared/src/types/` as well.
4. Notify affected workstreams (in practice, update the relevant workstream task descriptions).
5. Add validation logic if the contract can be machine-checked.

## Contract Versioning

For MVP, contracts are not versioned beyond git history. If a contract changes, the git diff shows what changed and when. Formal contract versioning (with compatibility checks and migration paths) is a post-MVP concern.

The `contracts` database table has a `version` integer column for project-specific contracts generated by the architect agent. This version is incremented when the orchestrator amends a contract during execution (e.g., when a validation failure reveals a contract bug).
