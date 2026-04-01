# Orchestration Platform

AI-driven software orchestration platform. Користувач задає ціль — система розбиває її на workstreams, розподіляє між AI-агентами, і трекає прогрес до завершення.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.7
- **API**: Fastify 5 (port 3001) — REST, Zod validation
- **Frontend**: Next.js 15 + React 19 (port 3000)
- **DB**: PostgreSQL + Drizzle ORM (schema in `packages/db/src/schema.ts`)
- **Repositories**: Centralized in `packages/db/src/repositories/` — used by both api and orchestrator
- **Queue**: BullMQ + Redis — job orchestration, retries, priorities (3 workers: planning, implementation, validation)
- **AI**: LLM provider abstraction (`apps/orchestrator/src/llm/`) — Claude CLI + OpenCode providers, per-role mapping
- **Events**: SSE (Server-Sent Events) via `GET /api/events` for real-time UI updates
- **Testing**: Vitest (`vitest.config.ts` with `test.projects`)
- **Linting**: Biome

## Flow

1. POST `/api/projects` — створення проєкту з goal
2. POST `/api/projects/:id/plan` — запуск планування через BullMQ
3. Planning worker (concurrency: 1) — architect agent аналізує goal, створює workstreams з залежностями
4. Implementation workers (concurrency: 3) — паралельне виконання агентами (backend, frontend, data, devops) з file tracking
5. Validation workers (concurrency: 2) — QA agent перевіряє deliverables, виносить PASS/FAIL verdict
6. SSE events пушаться на кожному кроці → фронт полить `/api/events`

## Commands

```bash
pnpm dev          # All services in dev mode (via scripts/dev.sh)
pnpm build        # Build all
pnpm test         # Vitest
pnpm typecheck    # tsc --build
pnpm lint         # Biome check
pnpm format       # Biome format
pnpm db:migrate   # Run Drizzle migrations
pnpm db:generate  # Generate Drizzle migrations from schema
pnpm db:push      # Push schema to DB (no migration files)
pnpm db:seed      # Seed data
```

## Conventions

- Shared types live in `packages/shared/src/types/` (project, workstream, agent-task, feature, events, llm-provider)
- DB schema in `packages/db/src/schema.ts` — single source of truth for tables, enums, relations
- DB repositories in `packages/db/src/repositories/` — used by both `apps/api` and `apps/orchestrator`
- Active contracts in `packages/shared/src/{types,schemas,state-machine.ts}` and DB contract in `packages/db/src/schema.ts`
- `contracts/api` and `contracts/events` are currently placeholders
- Zod validation schemas in `apps/api/src/schemas/` — per-resource request validation
- Agent briefs (what each agent does) in `docs/agent-briefs/`
- LLM prompts and parsers in `apps/orchestrator/src/prompts/`
- Architecture docs in `docs/`
- Imports between packages use `@orchestration/*` workspace aliases
- Agent roles: `ceo | planner | architect | lead | backend | frontend | data | devops | qa | reviewer`
- Project statuses: `draft | planning | in_progress | completed | failed | cancelled | archived`

<!-- AUTO_START -->
## Project Structure (auto-generated)

```
.agents/
  skills/
    adr-writer/
    execution-plan/
    frontend-design/
    frontend-ux-review/
    product-design-review/
    project-architect-review/
    ux-improvement-plan/
.opencode/
  plans/
.pnpm-store/
  v3/
apps/
  api/
    src/
  orchestrator/
    projects/
    src/
  web/
    src/
contracts/
  api/
  events/
docs/
  .vitepress/
    cache/
  agent-briefs/
  agents/
  api/
  architecture/
  contracts/
  decisions/
  design/
  guide/
  improvements/
  ownership/
  parallel-execution/
    agent-playbooks/
  plans/
  runbooks/
logs/
packages/
  db/
    drizzle/
    src/
  shared/
    src/
scripts/
```

## Packages

- **apps/api** (`@orchestration/api`)
- **apps/orchestrator** (`@orchestration/orchestrator`)
- **apps/web** (`@orchestration/web`)
- **packages/db** (`@orchestration/db`)
- **packages/shared** (`@orchestration/shared`)

<!-- AUTO_END -->
