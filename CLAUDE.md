# Orchestration Platform

AI-driven software orchestration platform. Користувач задає ціль — система розбиває її на workstreams, розподіляє між AI-агентами, і трекає прогрес до завершення.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.7
- **API**: Fastify 5 (port 3001) — REST, Zod validation
- **Frontend**: Next.js 15 + React 19 (port 3000)
- **DB**: PostgreSQL + Drizzle ORM (schema in `packages/db`)
- **Queue**: BullMQ + Redis — job orchestration, retries, priorities
- **AI**: Claude API — architect + implementation agents
- **Testing**: Vitest
- **Linting**: Biome

## Flow

1. POST `/api/projects` — створення проєкту з goal
2. Planning worker (BullMQ) — Claude architect agent розбиває на workstreams
3. Implementation workers — паралельне виконання агентами (backend, frontend, data, devops, qa)
4. Результати пишуться в DB + файлову систему, фронт полить API

## Commands

```bash
pnpm dev          # All services in dev mode
pnpm build        # Build all
pnpm test         # Vitest
pnpm typecheck    # tsc --build
pnpm lint         # Biome check
pnpm db:migrate   # Run migrations
pnpm db:generate  # Generate Drizzle migrations
pnpm db:push      # Push schema to DB
pnpm db:seed      # Seed data
```

## Conventions

- Shared types live in `packages/shared/src/types/`
- DB schema in `packages/db/src/schema.ts` — used by both api and orchestrator
- API contracts in `contracts/api/`, event contracts in `contracts/events/`
- Agent briefs (what each agent does) in `agents/`
- Architecture docs in `docs/`
- Imports between packages use `@orchestration/*` workspace aliases

<!-- AUTO_START -->
## Project Structure (auto-generated)

```
agents/
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
  types/
docs/
  contracts/
  decisions/
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
