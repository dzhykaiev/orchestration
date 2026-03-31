# Database Schema

PostgreSQL database with Drizzle ORM. Schema defined in `packages/db/src/schema.ts` — single source of truth.

## Entity Relationship

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Workspaces │────<│   Projects   │────<│ Workstreams  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                           │                     │
                           │                ┌────┴─────┐
                           │                │          │
                    ┌──────┴──────┐   ┌─────┴────┐  ┌─┴──────────┐
                    │  Features   │   │  Tasks   │  │ Artifacts  │
                    └─────────────┘   └──────────┘  └────────────┘
                           │               │              │
                           └───────┬───────┘              │
                                   │                      │
                            ┌──────┴──────┐               │
                            │ Audit Logs  │───────────────┘
                            └─────────────┘

                    ┌──────────────────┐
                    │ Agent Definitions │  (standalone reference)
                    └──────────────────┘
```

## Enums

| Enum | Values |
|------|--------|
| `projectStatus` | `draft` · `planning` · `in_progress` · `completed` · `failed` · `cancelled` · `archived` |
| `workstreamStatus` | `pending` · `blocked` · `in_progress` · `completed` · `failed` |
| `taskStatus` | `queued` · `running` · `completed` · `failed` · `cancelled` |
| `agentRole` | `ceo` · `planner` · `architect` · `lead` · `backend` · `frontend` · `data` · `devops` · `qa` · `reviewer` |
| `agentTier` | `strategic` · `tactical` · `operational` |
| `validationStatus` | `pass` · `fail` · `error` |
| `featureStatus` | `backlog` · `todo` · `in_progress` · `done` · `rejected` |
| `featureType` | `feature` · `bug` · `improvement` · `task` |
| `artifactType` | `code_diff` · `test_result` · `document` · `architecture` · `config` · `log` · `review_report` |
| `auditAction` | `created` · `updated` · `status_changed` · `delegated` · `escalated` · `reviewed` · `completed` · `failed` |
| `actorType` | `user` · `agent` · `system` |
| `provider` | `claude` · `opencode` |

## Tables

### workspaces

Top-level organizational unit.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `name` | TEXT | Workspace name |
| `slug` | TEXT UNIQUE | URL-friendly slug |
| `description` | TEXT | Description |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### projects

A project represents a single orchestration goal.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `workspace_id` | UUID FK → workspaces | Parent workspace (nullable) |
| `name` | TEXT | Project name |
| `goal` | TEXT | User-provided goal |
| `status` | projectStatus | Current status |
| `mode` | TEXT | `greenfield` or `existing` |
| `llm_provider` | provider | `claude` or `opencode` |
| `repo_url` | TEXT | Repository URL (existing mode) |
| `project_dir` | TEXT | Output directory path |
| `cost_usd` | NUMERIC | Total cost in USD |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### workstreams

A parallel track of work within a project.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `project_id` | UUID FK → projects | Parent project |
| `name` | TEXT | Workstream name |
| `description` | TEXT | Scope and objective |
| `role` | agentRole | Assigned agent role |
| `status` | workstreamStatus | Current status |
| `validation_status` | validationStatus | QA result (nullable) |
| `order_index` | INTEGER | Execution priority |
| `dependencies` | JSONB | Dependent workstream names |
| `deliverables` | JSONB | Expected outputs |
| `owned_paths` | JSONB | Owned file paths |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### agent_tasks

A single unit of work assigned to an agent.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `workstream_id` | UUID FK → workstreams | Parent workstream |
| `project_id` | UUID FK → projects | Parent project |
| `role` | agentRole | Agent role |
| `title` | TEXT | Task title |
| `prompt` | TEXT | Full LLM prompt |
| `output` | TEXT | Raw agent output |
| `status` | taskStatus | Current status |
| `error` | TEXT | Error message if failed |
| `cost_usd` | NUMERIC | Execution cost |
| `attempt_count` | INTEGER | Current attempt number |
| `max_attempts` | INTEGER | Max retries (default: 3) |
| `files_modified` | JSONB | Modified file paths |
| `created_at` | TIMESTAMPTZ | Creation time |
| `started_at` | TIMESTAMPTZ | Execution start |
| `completed_at` | TIMESTAMPTZ | Completion time |

### features

Kanban-style feature tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `project_id` | UUID FK → projects | Parent project (nullable) |
| `title` | TEXT | Feature title |
| `description` | TEXT | Description |
| `type` | featureType | feature/bug/improvement/task |
| `status` | featureStatus | backlog/todo/in_progress/done/rejected |
| `priority` | INTEGER | Sort priority |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### artifacts

Generated outputs from agent work.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `project_id` | UUID FK → projects | Parent project |
| `workstream_id` | UUID FK → workstreams | Related workstream (nullable) |
| `task_id` | UUID FK → agent_tasks | Related task (nullable) |
| `type` | artifactType | Artifact type |
| `name` | TEXT | Artifact name |
| `content` | TEXT | Artifact content |
| `metadata` | JSONB | Additional data |
| `created_at` | TIMESTAMPTZ | Creation time |

### audit_logs

Complete audit trail of all system changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `project_id` | UUID FK → projects | Related project |
| `entity_type` | TEXT | project/workstream/task |
| `entity_id` | UUID | Reference to entity |
| `action` | auditAction | Action type |
| `actor_type` | actorType | user/agent/system |
| `actor_id` | TEXT | Actor identifier |
| `details` | JSONB | Action details |
| `created_at` | TIMESTAMPTZ | Log timestamp |

### agent_definitions

Reference table for agent role configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `role` | agentRole | Agent role |
| `tier` | agentTier | strategic/tactical/operational |
| `name` | TEXT | Display name |
| `description` | TEXT | Capabilities description |
| `capabilities` | JSONB | Structured capability list |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

## Repository Layer

All database access goes through repository functions in `packages/db/src/repositories/`:

| Repository | File | Operations |
|-----------|------|------------|
| Projects | `projects.ts` | CRUD, status updates, cost tracking |
| Workstreams | `workstreams.ts` | CRUD, dependency management, validation |
| Tasks | `tasks.ts` | CRUD, status transitions, retries |
| Features | `features.ts` | CRUD, status management |
| Workspaces | `workspaces.ts` | CRUD, slug-based lookup |
| Artifacts | `artifacts.ts` | Create, query by project/task |
| Audit Logs | `audit-logs.ts` | Create, query by project/entity |
| Agent Definitions | `agent-definitions.ts` | CRUD, role-based lookup |

Repositories are imported by both `apps/api` and `apps/orchestrator` via `@orchestration/db`.
