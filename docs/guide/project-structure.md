# Project Structure

TypeScript monorepo managed by pnpm workspaces. Five packages, three apps.

## Directory Layout

```
orchestration/
├── apps/
│   ├── api/                    # Fastify REST API server
│   │   └── src/
│   │       ├── routes/         # Route handlers (projects, tasks, workstreams, etc.)
│   │       ├── schemas/        # Zod validation schemas
│   │       ├── services/       # Business logic layer
│   │       ├── plugins/        # Fastify plugins (db, redis, errors, sse)
│   │       └── events/         # SSE event channel
│   │
│   ├── orchestrator/           # BullMQ worker process
│   │   └── src/
│   │       ├── workers/        # Queue handlers (planning, implementation, validation)
│   │       ├── llm/            # LLM provider abstraction (Claude CLI, OpenCode)
│   │       ├── prompts/        # Prompt templates and parsers
│   │       ├── artifacts/      # Artifact tracking & persistence
│   │       ├── hierarchy/      # Task hierarchy & delegation
│   │       ├── tracking/       # Progress tracking
│   │       ├── output/         # File writers & response parsers
│   │       └── events/         # Event emission & pub/sub
│   │
│   └── web/                    # Next.js dashboard
│       └── src/
│           ├── app/            # App Router pages
│           │   ├── projects/   # Project views
│           │   └── workspaces/ # Workspace management
│           ├── components/     # React components
│           ├── hooks/          # Custom hooks (data fetching, SSE)
│           └── lib/            # Utilities, API client
│
├── packages/
│   ├── db/                     # Database layer
│   │   ├── src/
│   │   │   ├── schema.ts       # Drizzle ORM schema (source of truth)
│   │   │   ├── repositories/   # Repository pattern implementations
│   │   │   └── client.ts       # Database connection
│   │   └── drizzle/            # Migration files
│   │
│   └── shared/                 # Shared types & utilities
│       └── src/
│           ├── types/          # Entity types, enums, events
│           └── schemas/        # Zod validation schemas
│
├── docs/                       # Documentation (VitePress)
│   ├── .vitepress/             # VitePress config
│   ├── guide/                  # Getting started, setup
│   ├── api/                    # API reference
│   ├── agents/                 # Agent documentation
│   └── design/                 # Architecture decisions
│
├── scripts/                    # Development scripts
│   ├── dev.sh                  # Start all services
│   ├── update-project-docs.sh  # Auto-update docs
│   └── pre-commit              # Git hook
│
├── docker-compose.yml          # PostgreSQL + Redis
├── biome.json                  # Linter/formatter config
├── vitest.workspace.ts         # Test workspace config
└── pnpm-workspace.yaml         # Workspace definition
```

## Packages

| Package | Alias | Description |
|---------|-------|-------------|
| `apps/api` | `@orchestration/api` | Fastify REST API (port 3001) |
| `apps/orchestrator` | `@orchestration/orchestrator` | BullMQ workers + agent runtime |
| `apps/web` | `@orchestration/web` | Next.js dashboard (port 3000) |
| `packages/db` | `@orchestration/db` | PostgreSQL schema, repos, migrations |
| `packages/shared` | `@orchestration/shared` | Shared types, schemas, utilities |

## Dependency Graph

```
apps/api ─────────────┬──→ packages/db
                      └──→ packages/shared

apps/orchestrator ────┬──→ packages/db
                      └──→ packages/shared

apps/web ─────────────────→ packages/shared

packages/db ──────────────→ packages/shared
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema.ts` | Database schema — single source of truth |
| `packages/shared/src/types/` | All entity types and enums |
| `apps/api/src/app.ts` | API server entry point |
| `apps/orchestrator/src/index.ts` | Orchestrator entry point |
| `apps/web/src/app/layout.tsx` | Dashboard root layout |
| `docker-compose.yml` | Infrastructure definition |
| `.env.example` | Environment template |
