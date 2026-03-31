# Local Development Setup

Detailed setup guide with common issues and solutions.

## Step-by-Step

### 1. Install Dependencies

```bash
pnpm install
```

::: info pnpm Version
This project requires pnpm 9.15+. Install or update:
```bash
npm install -g pnpm@latest
```
:::

### 2. Start Infrastructure

```bash
docker compose up -d
```

Wait for services to be healthy:

```bash
# Check PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Check Redis
docker compose exec redis redis-cli ping
```

### 3. Environment

```bash
cp .env.example .env
```

### 4. Build Shared Packages

```bash
pnpm --filter @orchestration/shared build
```

This must complete before starting any app.

### 5. Database Setup

```bash
# Run migrations
pnpm db:migrate

# Optionally seed data
pnpm db:seed
```

### 6. Start Development

```bash
pnpm dev
```

Or start services individually:

```bash
# Terminal 1
pnpm --filter @orchestration/api dev

# Terminal 2
pnpm --filter @orchestration/orchestrator dev

# Terminal 3
pnpm --filter @orchestration/web dev
```

### 7. Verify

```bash
# API health check
curl http://localhost:3001/api/health

# Dashboard
open http://localhost:3000
```

## Database Management

### Schema Changes

```bash
# 1. Edit packages/db/src/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Apply migration
pnpm db:migrate
```

### Quick Push (No Migration)

For rapid iteration during development:

```bash
pnpm db:push
```

::: warning
`db:push` doesn't create migration files. Use `db:generate` + `db:migrate` for changes you want to track.
:::

### Drizzle Studio

```bash
pnpm --filter @orchestration/db run studio
```

Opens a GUI to browse and edit database tables.

## Dev Script Details

`pnpm dev` runs `scripts/dev.sh`, which:

1. Kills any existing processes on ports 3000 and 3001
2. Starts Docker Compose services
3. Waits for PostgreSQL and Redis to be ready
4. Launches API, Orchestrator, and Web in parallel
5. Tails logs from all services
6. Cleans up on exit (Ctrl+C)
