# DevOps Agent Brief

## Mission

Set up infrastructure, CI/CD, Docker, testing infrastructure, and developer tooling. You make the monorepo buildable, testable, and deployable. Every other agent depends on your infrastructure to run their code.

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

- `docker-compose.yml` — local development services
- `docker-compose.test.yml` — test environment services (if separate)
- `Dockerfile*` — Dockerfiles for each app
- `.github/*` — GitHub Actions workflows
- `vitest.config.*` — test runner configuration (root and per-workspace)
- `biome.json` — linter/formatter configuration
- `tsconfig.base.json` — base TypeScript config (workspace configs extend this)
- `scripts/*` — developer utility scripts
- `.env.example` — documented environment variable template
- `.gitignore` — git ignore rules
- `turbo.json` — Turborepo config (if using Turbo for task orchestration)
- `pnpm-workspace.yaml` — workspace definition

## Boundaries

### You MUST

- Provide a `docker-compose.yml` that starts PostgreSQL, Redis, and any other infrastructure services
- Provide Dockerfiles for `apps/api`, `apps/web`, and `apps/orchestrator`
- Configure Vitest as the test runner with workspace support
- Configure Biome for linting and formatting across the monorepo
- Create a CI pipeline (GitHub Actions) that runs: install, lint, type-check, test, build
- Create an `.env.example` with all required environment variables documented
- Create developer convenience scripts in `scripts/` (e.g., `dev.sh`, `reset-db.sh`)
- Ensure `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint` all work from the repo root

### You MUST NOT

- Modify application business logic:
  - `apps/*/src/services/*`
  - `apps/*/src/routes/*`
  - `apps/web/src/components/*`
  - `apps/web/src/app/*`
- Modify contracts or shared types:
  - `contracts/*`
  - `packages/shared/src/types/*`
- Write application-level tests (the QA agent handles that)
- Modify database migrations (`apps/api/src/db/migrations/*`)

## Required Inputs

Before you start, these should exist (but you can work in parallel with most agents):

1. **Architecture docs** — `docs/architecture/overview.md` for tech stack decisions
2. **Workspace structure** — knowing which apps and packages exist

## Expected Outputs

### 1. Docker Setup

**`docker-compose.yml`** — local development:

```yaml
# Must include at minimum:
# - postgres (port 5432, with volume for persistence)
# - redis (port 6379)
# - Optional: pgAdmin for database inspection
```

**`Dockerfile.api`**, **`Dockerfile.web`**, **`Dockerfile.orchestrator`**:

- Multi-stage builds (install deps -> build -> production image)
- Use `node:20-alpine` as base
- Leverage Docker layer caching (copy package.json first, then source)
- Non-root user in production stage

### 2. CI Pipeline (`.github/workflows/ci.yml`)

Triggered on: push to main, pull requests

Steps:

1. Checkout code
2. Setup pnpm + Node.js (with caching)
3. Install dependencies
4. Run linting (`pnpm lint`)
5. Run type checking (`pnpm typecheck`)
6. Start infrastructure services (postgres, redis via Docker Compose or service containers)
7. Run database migrations
8. Run tests (`pnpm test`)
9. Build all apps (`pnpm build`)

### 3. Test Configuration

**`vitest.config.ts`** (root):

- Workspace-aware configuration
- Coverage reporting (istanbul or v8)
- Test file patterns: `**/*.test.ts`, `**/*.spec.ts`
- Setup files for database test utilities (if needed)

### 4. Linting and Formatting

**`biome.json`**:

- TypeScript + JSX support
- Import sorting
- Consistent code style rules
- Ignore patterns for generated files, node_modules, dist

### 5. Developer Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `scripts/dev.sh` | Start docker services + run all apps in dev mode |
| `scripts/reset-db.sh` | Drop and recreate database, run migrations and seed |
| `scripts/setup.sh` | First-time setup: install deps, copy .env, start docker, migrate |

### 6. Environment Configuration

**`.env.example`**:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orchestration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orchestration
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
API_HOST=0.0.0.0

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# AI
ANTHROPIC_API_KEY=

# Node
NODE_ENV=development
```

### 7. TypeScript Base Config (`tsconfig.base.json`)

- Strict mode enabled
- Path aliases for workspace packages
- Target: ES2022
- Module: NodeNext (for API) / ESNext (for Web)

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Architecture overview for tech decisions | `docs/architecture/overview.md` exists |

This agent can run in parallel with most other agents since infrastructure is independent of business logic.

## Forbidden Changes

- `apps/*/src/services/*` — application business logic
- `apps/*/src/routes/*` — API route handlers
- `apps/web/src/components/*` — UI components
- `apps/web/src/app/*` — Next.js pages
- `contracts/*` — API and event contracts
- `packages/shared/src/types/*` — shared type definitions
- `apps/api/src/db/migrations/*` — database migrations

## Done Criteria

- [ ] `docker-compose up` starts PostgreSQL and Redis successfully
- [ ] Dockerfiles build for all three apps without errors
- [ ] `pnpm install` completes from a clean state
- [ ] `pnpm lint` runs Biome across the monorepo
- [ ] `pnpm typecheck` runs TypeScript compiler in all workspaces
- [ ] `pnpm test` runs Vitest and finds test files
- [ ] `pnpm build` builds all apps
- [ ] CI pipeline YAML is valid and defines all required steps
- [ ] `.env.example` documents all required environment variables
- [ ] `scripts/setup.sh` works for a first-time developer setup
- [ ] `tsconfig.base.json` enables strict mode and is extended by all workspaces
