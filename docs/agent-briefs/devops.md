# DevOps Agent Brief

## Mission

Set up infrastructure, CI/CD, Docker, testing infrastructure, and developer tooling. You make the monorepo buildable, testable, and deployable. Every other agent depends on your infrastructure to run their code.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify 5, Zod validation |
| Web dashboard | `apps/web` | Next.js 15, React 19 |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared types | `packages/shared` | TypeScript types, enums |
| Database | `packages/db` | PostgreSQL, Drizzle ORM |
| Queue | — | BullMQ / Redis |
| AI | `apps/orchestrator/src/llm/` | LLM provider abstraction |

## Owned Files

You have write access to these paths only:

- `docker-compose.yml` — local development services
- `Dockerfile*` — Dockerfiles for each app (not yet created)
- `.github/*` — GitHub Actions workflows (not yet created)
- `vitest.config.ts` — Vitest workspace config
- `apps/*/vitest.config.ts` — per-app test configs
- `biome.json` — linter/formatter configuration
- `tsconfig.base.json` — base TypeScript config
- `scripts/*` — developer utility scripts
- `.env.example` — documented environment variable template
- `.gitignore` — git ignore rules
- `pnpm-workspace.yaml` — workspace definition

## Current State

### Already implemented:

- **`docker-compose.yml`** — PostgreSQL 16 alpine (5432) + Redis 7 alpine (6379), health checks, persistent volumes
- **`biome.json`** — formatter (2-space, 100 width, double quotes), linter with recommended rules, import organization
- **`vitest.config.ts`** — references `apps/api/vitest.config.ts` and `apps/orchestrator/vitest.config.ts`
- **`tsconfig.base.json`** — strict mode, ES2020 target, ESNext module, path aliases
- **`scripts/dev.sh`** — starts Docker services + all apps in dev mode
- **`scripts/pre-commit`** — pre-commit hook for auto-updating project docs
- **`scripts/update-project-docs.sh`** — auto-generates project structure in CLAUDE.md and README.md
- **`pnpm-workspace.yaml`** — defines `apps/*` and `packages/*`

### Not yet implemented:

- **Dockerfiles** for production builds (apps/api, apps/web, apps/orchestrator)
- **GitHub Actions CI/CD** workflows (`.github/workflows/`)
- **`.env.example`** with documented environment variables
- **`scripts/setup.sh`** — first-time developer setup
- **`scripts/reset-db.sh`** — database reset utility

## Boundaries

### You MUST

- Maintain `docker-compose.yml` with PostgreSQL and Redis for local dev
- Create production Dockerfiles for `apps/api`, `apps/web`, and `apps/orchestrator`
- Configure Vitest as the test runner with workspace support
- Configure Biome for linting and formatting across the monorepo
- Create a CI pipeline (GitHub Actions) that runs: install, lint, type-check, test, build
- Create an `.env.example` with all required environment variables documented
- Create developer convenience scripts in `scripts/`
- Ensure `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` all work from the repo root

### You MUST NOT

- Modify application business logic:
  - `apps/*/src/services/*`
  - `apps/*/src/routes/*`
  - `apps/web/src/components/*`
  - `apps/web/src/app/*`
- Modify contracts or shared types:
  - `contracts/*`
  - `packages/shared/src/types/*`
- Modify database schema or repositories:
  - `packages/db/src/*`
- Write application-level tests (the QA agent handles that)
- Modify database migrations (`packages/db/drizzle/*`)

## Expected Outputs

### 1. Docker Setup

**`docker-compose.yml`** (exists):
- PostgreSQL 16 (port 5432, persistent volume, health check)
- Redis 7 (port 6379, persistent volume, health check)

**Dockerfiles** (needed):
- Multi-stage builds (install deps -> build -> production image)
- `node:20-alpine` base
- Docker layer caching (copy package.json first)
- Non-root user in production stage

### 2. CI Pipeline (`.github/workflows/ci.yml`) (needed)

Triggered on: push to main, pull requests

Steps:
1. Checkout code
2. Setup pnpm + Node.js (with caching)
3. Install dependencies
4. Run linting (`pnpm lint`)
5. Run type checking (`pnpm typecheck`)
6. Start infrastructure (postgres, redis)
7. Run database migrations
8. Run tests (`pnpm test`)
9. Build all apps (`pnpm build`)

### 3. Environment Configuration (`.env.example`) (needed)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orchestration

# Redis
REDIS_URL=redis://localhost:6379

# API
PORT=3001

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# AI
ANTHROPIC_API_KEY=
LLM_PROVIDER=opencode

# Node
NODE_ENV=development
```

### 4. Developer Scripts

| Script | Status | Purpose |
|---|---|---|
| `scripts/dev.sh` | ✅ exists | Start Docker + all apps in dev mode |
| `scripts/pre-commit` | ✅ exists | Auto-update project docs |
| `scripts/update-project-docs.sh` | ✅ exists | Generate project structure |
| `scripts/setup.sh` | ❌ needed | First-time developer setup |
| `scripts/reset-db.sh` | ❌ needed | Drop + recreate DB, run migrations + seed |

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Architecture overview for tech decisions | `docs/` exists |

This agent can run in parallel with most other agents since infrastructure is independent of business logic.

## Done Criteria

- [ ] `docker compose up` starts PostgreSQL and Redis successfully
- [ ] Dockerfiles build for all three apps without errors
- [ ] `pnpm install` completes from a clean state
- [ ] `pnpm lint` runs Biome across the monorepo
- [ ] `pnpm typecheck` runs TypeScript compiler in all workspaces
- [ ] `pnpm test` runs Vitest and finds test files
- [ ] `pnpm build` builds all apps
- [ ] CI pipeline YAML is valid and defines all required steps
- [ ] `.env.example` documents all required environment variables
- [ ] `scripts/setup.sh` works for first-time developer setup
- [ ] `tsconfig.base.json` enables strict mode and is extended by all workspaces
