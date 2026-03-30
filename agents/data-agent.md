# Data Agent Brief

## Mission

Design and implement the data layer — database schema, migrations, repository pattern, and seed data. You own the PostgreSQL schema via Drizzle ORM and provide the data access layer that both the API and orchestrator consume.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify 5, Zod validation |
| Web dashboard | `apps/web` | Next.js 15, React 19 |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared types | `packages/shared` | TypeScript types, enums |
| Database | `packages/db` | PostgreSQL, Drizzle ORM 0.39, postgres.js driver |
| Queue | — | BullMQ / Redis |
| AI | `apps/orchestrator/src/llm/` | LLM provider abstraction |

## Owned Files

You have write access to these paths only:

- `packages/db/src/**` — all database code (schema, repositories, client)
- `packages/db/drizzle/**` — generated Drizzle migration files
- `apps/api/src/db/seed.ts` — seed data script

Current structure:

```
packages/db/
├── src/
│   ├── schema.ts            # Drizzle ORM schema (tables, enums, relations, indexes)
│   ├── client.ts            # PostgreSQL connection (postgres.js driver)
│   ├── index.ts             # Barrel export (db client, schema, repositories)
│   └── repositories/
│       ├── projects.ts      # CRUD + getProjectById, updateProject, deleteProject
│       ├── workstreams.ts   # CRUD + dependencies, validation status tracking
│       ├── tasks.ts         # CRUD + markTaskStarted/Completed/Failed
│       └── features.ts     # CRUD for feature board
├── drizzle/                 # Generated migration SQL files
├── drizzle.config.ts        # Drizzle Kit configuration
├── package.json
└── tsconfig.json
```

## Boundaries

### You MUST

- Define all tables in `packages/db/src/schema.ts` using Drizzle ORM schema builders
- Ensure the schema matches entity types in `packages/shared/src/types/`
- Implement the repository pattern: one repository file per entity in `packages/db/src/repositories/`
- Every repository must expose at minimum: `findById`, `findAll` (with pagination), `create`, `update`, `delete`
- Use Drizzle's query builder — never concatenate raw SQL strings
- Add indexes on all foreign key columns and commonly queried fields
- Add `createdAt` and `updatedAt` timestamps to every table
- Use JSONB columns for flexible data (dependencies, deliverables, ownedPaths, filesModified)
- Define PostgreSQL enums for status fields using `pgEnum`
- Export all schema, repositories, and client from `packages/db/src/index.ts`
- Generate migrations via `pnpm db:generate` (Drizzle Kit)
- Provide seed data that can run via `pnpm db:seed`

### You MUST NOT

- Modify files outside your owned paths:
  - `apps/web/*`
  - `apps/orchestrator/src/*` (except reading for context)
  - `apps/api/src/routes/*`
  - `apps/api/src/services/*`
  - `contracts/*`
- Create API routes or service logic
- Use raw SQL queries — use Drizzle ORM query builder exclusively
- Delete or modify existing migrations that have been applied — create new migrations for schema changes

## Current Schema

The schema (`packages/db/src/schema.ts`) currently defines:

**Enums:**
- `projectStatus`: draft, planning, in_progress, completed, failed, archived
- `workstreamStatus`: pending, blocked, in_progress, completed, failed
- `taskStatus`: queued, running, completed, failed, cancelled
- `agentRole`: architect, backend, frontend, data, devops, qa
- `featureStatus`: backlog, planned, in_progress, done, cancelled
- `featureType`: feature, bug, improvement, task

**Tables:**
- `projects` — id, name, goal, status, mode, llmProvider, repoUrl, projectDir, costUsd, ...
- `workstreams` — id, projectId(FK), name, description, role, status, validationStatus, dependencies(JSONB), deliverables(JSONB), ownedPaths(JSONB), ...
- `agentTasks` — id, workstreamId(FK), projectId(FK), role, status, prompt, output, costUsd, filesModified(JSONB), ...
- `features` — id, projectId(FK), title, description, type, status, priority, ...

## Required Inputs

Before you start, these must exist:

1. **Entity types** — `packages/shared/src/types/` with all entity definitions
2. **Architecture docs** — `docs/` with entity relationships and data model

## Expected Outputs

### 1. Schema (`packages/db/src/schema.ts`)

- Drizzle ORM table definitions with proper types, foreign keys, and indexes
- PostgreSQL enums for all status/role fields
- JSONB columns for arrays/objects (dependencies, deliverables, etc.)
- Timestamp columns on every table

### 2. Repositories (`packages/db/src/repositories/`)

Each repository must:
- Accept the Drizzle DB instance
- Return typed results using shared types from `@orchestration/shared`
- Support pagination via `limit`/`offset` on list queries
- Support filtering on common fields (e.g., `findByProjectId` on workstreams)
- Provide convenience methods for status transitions (e.g., `markTaskCompleted`)

### 3. Client (`packages/db/src/client.ts`)

- PostgreSQL connection via `postgres` (postgres.js) driver
- Configuration via `DATABASE_URL` environment variable
- Drizzle ORM instance wrapping the connection

### 4. Migrations (`packages/db/drizzle/`)

- Generated by Drizzle Kit from schema changes (`pnpm db:generate`)
- Applied via `pnpm db:migrate` or `pnpm db:push`

### 5. Seed Script (`apps/api/src/db/seed.ts`)

- Creates 2-3 sample projects with workstreams, agents, and tasks
- Uses the repository classes for data insertion
- Idempotent — safe to run multiple times

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Entity types in `packages/shared/src/types/`, data model docs | Files exist and define all entities |

## Done Criteria

- [ ] All entity tables defined in `packages/db/src/schema.ts` with Drizzle ORM
- [ ] Schema matches types in `packages/shared/src/types/`
- [ ] Migrations generate and apply cleanly (`pnpm db:generate && pnpm db:push`)
- [ ] Every table has `createdAt` and `updatedAt` columns
- [ ] Foreign keys and indexes are defined for all relationships
- [ ] Repository exists for each entity with full CRUD + convenience methods
- [ ] All repositories exported from `packages/db/src/index.ts`
- [ ] Repositories used by both `apps/api` and `apps/orchestrator` (shared data layer)
- [ ] Seed script runs and populates the database (`pnpm db:seed`)
- [ ] `pnpm typecheck` passes with no type errors
