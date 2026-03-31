# Getting Started

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 20.0.0 | `node --version` |
| pnpm | >= 9.15 | `pnpm --version` |
| Docker | >= 24.0 | `docker --version` |
| Docker Compose | >= 2.0 | `docker compose version` |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/dzhykaiev/orchestration.git
cd orchestration
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (credentials: `postgres:postgres`)
- **Redis 7** on port `6379`

Verify both are running:

```bash
docker compose ps
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Default values work for local development. See [Environment Variables](/guide/env-variables) for details.

### 4. Build Shared Packages

```bash
pnpm --filter @orchestration/shared build
```

::: warning Important
Shared packages must be built before starting any app, as they are imported via workspace aliases.
:::

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

### 6. Start Development

```bash
pnpm dev
```

This starts all three services:

| Service | URL | Description |
|---------|-----|-------------|
| Web Dashboard | [http://localhost:3000](http://localhost:3000) | Next.js frontend |
| API Server | [http://localhost:3001](http://localhost:3001) | Fastify REST API |
| Orchestrator | — (background worker) | BullMQ worker process |

### 7. Verify

```bash
# API health check
curl http://localhost:3001/api/health

# Open dashboard
open http://localhost:3000
```

## First Project

1. Open the dashboard at `http://localhost:3000`
2. Click "New Project"
3. Enter a goal: _"Build a REST API for a todo list with PostgreSQL storage"_
4. Click "Start Planning"
5. Watch the architect agent produce a system design
6. Agents will begin implementing in parallel
7. Check the dashboard for real-time progress

## Next Steps

- [Project Structure](/guide/project-structure) — understand the monorepo layout
- [Commands Reference](/guide/commands) — all available scripts
- [Architecture](/architecture) — system design deep dive
