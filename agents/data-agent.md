# Data Agent Brief

## Mission

Design and implement the data layer — database schema, migrations, repository pattern, and seed data. You own the PostgreSQL schema and provide the data access layer that the backend agent's services consume.

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

- `apps/api/src/db/**` — all database-related code
- Seed scripts (e.g., `apps/api/src/db/seed.ts` or `scripts/seed.ts`)
- `packages/shared/src/types/` — **only** if a schema change requires updating an entity type (coordinate with architect)

Typical structure you should create/maintain:

```
apps/api/src/db/
├── index.ts                # Database connection setup, pool export
├── migrations/
│   ├── 001_create_projects.sql
│   ├── 002_create_workstreams.sql
│   ├── 003_create_agents.sql
│   ├── 004_create_tasks.sql
│   └── 005_create_events.sql
├── repositories/
│   ├── base.repository.ts  # Base class with common CRUD methods
│   ├── project.repository.ts
│   ├── workstream.repository.ts
│   ├── agent.repository.ts
│   └── task.repository.ts
├── seed.ts                 # Seed data loader
└── utils/
    ├── migrate.ts          # Migration runner
    └── query-builder.ts    # Optional query helpers
```

## Boundaries

### You MUST

- Read entity types from `packages/shared/src/types/` and ensure the database schema matches them exactly
- Read architecture docs from `docs/architecture/data-model.md` for entity relationships
- Write migrations as sequential numbered SQL files — idempotent where possible
- Implement the repository pattern: one repository class per entity
- Every repository must expose at minimum: `findById`, `findAll` (with pagination), `create`, `update`, `delete`
- Add indexes on all foreign key columns and commonly queried fields
- Add `created_at` and `updated_at` timestamps to every table
- Use parameterized queries — never concatenate SQL strings
- Provide a seed script that populates the database with realistic sample data

### You MUST NOT

- Modify files outside your owned paths:
  - `apps/web/*`
  - `apps/orchestrator/src/services/*`
  - `apps/api/src/routes/*`
  - `apps/api/src/services/*`
- Create API routes or service logic
- Use an ORM — use a lightweight query library (e.g., `pg`, `postgres`, or `kysely`) with raw SQL or a query builder
- Delete or modify existing migrations that have been applied — create new migrations for schema changes

## Required Inputs

Before you start, these must exist:

1. **Entity types** — `packages/shared/src/types/entities.ts` with all entity definitions
2. **Data model documentation** — `docs/architecture/data-model.md` with relationships and cardinality

## Expected Outputs

### 1. Database Connection (`apps/api/src/db/index.ts`)

- PostgreSQL connection pool setup
- Configuration via environment variables: `DATABASE_URL` or individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Connection health check function
- Graceful shutdown (pool cleanup)

### 2. Migrations (`apps/api/src/db/migrations/`)

One SQL file per migration, numbered sequentially. Each migration must:

- Create the table with all columns matching the entity type
- Define primary keys, foreign keys, and constraints
- Add indexes on foreign keys and frequently queried columns
- Include `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Be safe to run multiple times (use `IF NOT EXISTS` or a migration tracking table)

Expected tables (based on typical orchestration platform):

| Table | Key Relationships |
|---|---|
| `projects` | Top-level entity |
| `workstreams` | Belongs to project |
| `agents` | Assigned to workstream |
| `tasks` | Belongs to workstream, assigned to agent |
| `events` | Polymorphic log of actions on any entity |

### 3. Repositories (`apps/api/src/db/repositories/`)

Each repository class must:

- Accept a database pool/client in its constructor
- Return typed results using shared types from `@orchestration/shared`
- Support pagination via `limit`/`offset` on list queries
- Support filtering on common fields (e.g., `findByProjectId` on workstreams)
- Use parameterized queries for all user-supplied values

```typescript
// Example interface (do not copy verbatim — adapt to actual entity types)
class ProjectRepository {
  findById(id: string): Promise<Project | null>
  findAll(opts: PaginationOptions): Promise<PaginatedResult<Project>>
  create(data: CreateProjectInput): Promise<Project>
  update(id: string, data: UpdateProjectInput): Promise<Project>
  delete(id: string): Promise<void>
}
```

### 4. Migration Runner (`apps/api/src/db/utils/migrate.ts`)

- Reads SQL files from `migrations/` directory in order
- Tracks which migrations have been applied (use a `_migrations` table)
- Can be run via a script: `pnpm db:migrate`

### 5. Seed Script (`apps/api/src/db/seed.ts`)

- Creates 2-3 sample projects with workstreams, agents, and tasks
- Uses the repository classes (not raw SQL) to insert data
- Can be run via a script: `pnpm db:seed`
- Idempotent — safe to run multiple times (clears or upserts)

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Entity types in `packages/shared/src/types/`, data model doc in `docs/architecture/data-model.md` | Files exist and define all entities |

## Forbidden Changes

- `apps/web/*` — frontend agent's territory
- `apps/orchestrator/src/services/*` — orchestrator agent's territory
- `apps/api/src/routes/*` — backend agent's territory
- `apps/api/src/services/*` — backend agent's territory
- `contracts/*` — architect's territory

## Done Criteria

- [ ] All entity tables exist as migrations in `apps/api/src/db/migrations/`
- [ ] Migrations run cleanly from a fresh database (`pnpm db:migrate`)
- [ ] Every table has `created_at` and `updated_at` columns
- [ ] Foreign keys and indexes are defined for all relationships
- [ ] Repository class exists for each entity with `findById`, `findAll`, `create`, `update`, `delete`
- [ ] All repository methods use parameterized queries (no string concatenation)
- [ ] Seed script runs and populates the database with sample data (`pnpm db:seed`)
- [ ] Database connection pool handles graceful shutdown
- [ ] `pnpm tsc --noEmit` passes with no type errors in `apps/api`
