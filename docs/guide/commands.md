# Commands Reference

All commands are run from the repository root.

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services (API + Orchestrator + Web) via `scripts/dev.sh` |
| `pnpm --filter @orchestration/api dev` | Start only the API server |
| `pnpm --filter @orchestration/orchestrator dev` | Start only the orchestrator |
| `pnpm --filter @orchestration/web dev` | Start only the web dashboard |

## Build & Test

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking (`tsc --build`) |
| `pnpm lint` | Lint all code (Biome) |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format` | Format all code (Biome) |
| `pnpm format:check` | Check formatting without writing |

## Database

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:push` | Push schema directly to DB (no migration files) |
| `pnpm db:seed` | Seed development data |

::: tip Database Workflow
1. Edit `packages/db/src/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply it
:::

## Infrastructure

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL + Redis |
| `docker compose down` | Stop infrastructure |
| `docker compose ps` | Check service status |
| `docker compose logs -f postgres` | View PostgreSQL logs |

## Documentation

| Command | Description |
|---------|-------------|
| `pnpm docs:dev` | Start documentation dev server |
| `pnpm docs:build` | Build documentation for production |
| `pnpm docs:preview` | Preview built documentation |

## Cleanup

| Command | Description |
|---------|-------------|
| `pnpm clean` | Remove all `node_modules`, `.next`, and `dist` directories |
