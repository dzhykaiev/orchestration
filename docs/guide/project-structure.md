# Project Structure

Актуальна структура монорепо (без застарілих шляхів).

## Top-level

```text
orchestration/
├── apps/
│   ├── api/
│   ├── orchestrator/
│   └── web/
├── packages/
│   ├── db/
│   └── shared/
├── docs/
├── contracts/            # наразі placeholder (не активне source-of-truth)
├── scripts/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Apps

### `apps/api`

Fastify API.

- `src/routes/*` — HTTP endpoints
- `src/services/*` — application/service logic
- `src/plugins/*` — Fastify plugins (db, redis, audit, error handler)
- `src/schemas/*` — re-export Zod schemas from `@orchestration/shared`
- `src/db/*` — migration/seed runners

### `apps/orchestrator`

BullMQ orchestration runtime.

- `src/workers/*` — planning/implementation/validation/recovery workers
- `src/tracking/*` — status progression and completion logic
- `src/llm/*` — provider adapters (`claude`, `opencode`) + circuit breaker
- `src/prompts/*` — role prompts/parsers
- `src/events/*` — event bus and event persistence
- `src/delegation/*`, `src/escalation/*`, `src/locking/*` — execution controls

### `apps/web`

Next.js dashboard.

- `src/app/*` — App Router pages
- `src/components/*` — UI/components
- `src/hooks/*` — polling/SSE/theme/toast hooks
- `src/lib/*` — API client and utilities

## Packages

### `packages/shared`

Shared contracts and rules:

- `src/types/*` — domain/event/provider types
- `src/schemas/*` — Zod DTO schemas
- `src/state-machine.ts` — allowed lifecycle transitions

### `packages/db`

Data layer:

- `src/schema.ts` — Drizzle schema (DB source-of-truth)
- `src/repositories/*` — repository APIs for API + orchestrator
- `drizzle/*` — SQL migrations and metadata snapshots

## Dependency Graph

```text
apps/api -----------> packages/db ---------> packages/shared
apps/orchestrator --> packages/db ---------> packages/shared
apps/web ----------------------------------> packages/shared
```

## Notes for Agent Work

1. Для контрактів орієнтуйтесь на `packages/shared` і `packages/db`, не на `contracts/`.
2. Для виконання задач розбивайте змінний scope по app/package межах, щоб уникати конфліктів.
3. Не змішуйте runtime-зміни з doc-рефактором в одному PR/ітерації.
