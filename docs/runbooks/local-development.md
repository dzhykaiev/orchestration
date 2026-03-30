# Local Development Runbook

Step-by-step instructions for setting up and running the orchestration platform on your local machine.

## Prerequisites

Before you begin, ensure the following are installed:

| Tool | Minimum Version | Check Command | Install |
|---|---|---|---|
| Node.js | 20.0.0 | `node --version` | [nodejs.org](https://nodejs.org/) or `nvm install 20` |
| pnpm | 9.0.0 | `pnpm --version` | `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker | 24.0.0 | `docker --version` | [docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20.0 | `docker compose version` | Included with Docker Desktop |

Optional but recommended:

| Tool | Purpose | Install |
|---|---|---|
| `jq` | JSON formatting for API responses | `brew install jq` (macOS) |
| `httpie` or `curl` | Manual API testing | `brew install httpie` |

## 1. Clone and Install

```bash
git clone <repository-url> orchestration
cd orchestration
```

Install all workspace dependencies:

```bash
pnpm install
```

This installs dependencies for all packages: `apps/api`, `apps/web`, `apps/orchestrator`, and `packages/shared`. pnpm links workspace packages automatically.

Verify the install succeeded:

```bash
pnpm ls --depth 0
```

## 2. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

Verify both services are running and healthy:

```bash
docker compose ps
```

Expected output:

```
NAME                STATUS              PORTS
orchestration-postgres-1   Up (healthy)   0.0.0.0:5432->5432/tcp
orchestration-redis-1      Up (healthy)   0.0.0.0:6379->6379/tcp
```

If a service shows as `unhealthy` or `restarting`, check logs:

```bash
docker compose logs postgres
docker compose logs redis
```

## 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the required values:

```bash
# Required: set your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# These defaults should work with docker-compose:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orchestration
REDIS_URL=redis://localhost:6379
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The database URL, Redis URL, and ports should match the Docker Compose configuration. If you changed ports in `docker-compose.yml`, update them here accordingly.

## 4. Run Database Migrations

Build the shared package first (migrations depend on it):

```bash
pnpm --filter @orchestration/shared build
```

Run migrations to create the database schema:

```bash
pnpm --filter @orchestration/shared migrate
```

Verify the tables were created:

```bash
docker compose exec postgres psql -U postgres -d orchestration -c '\dt'
```

Expected output should list: `projects`, `workstreams`, `agent_tasks`, `contracts`, `agent_logs`.

Optionally, seed development data:

```bash
pnpm --filter @orchestration/shared seed
```

## 5. Build Shared Packages

The applications depend on the shared package being built:

```bash
pnpm --filter @orchestration/shared build
```

If you are actively developing shared types, run the shared package in watch mode in a separate terminal:

```bash
pnpm --filter @orchestration/shared dev
```

## 6. Start Development Servers

Start all applications. Open three terminal windows (or use a terminal multiplexer like tmux):

**Terminal 1 --- API Server:**

```bash
pnpm --filter @orchestration/api dev
```

The API server starts on `http://localhost:3001`. Verify:

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

**Terminal 2 --- Orchestrator:**

```bash
pnpm --filter @orchestration/orchestrator dev
```

The orchestrator connects to Redis and starts listening for jobs. You should see log output indicating the workers are ready.

**Terminal 3 --- Web Dashboard:**

```bash
pnpm --filter @orchestration/web dev
```

The web dashboard starts on `http://localhost:3000`. Open it in your browser.

Alternatively, if a root `dev` script is configured:

```bash
pnpm dev
```

This starts all three applications concurrently.

## 7. Verify the Setup

Run a quick smoke test to make sure everything is connected:

**Create a project via the API:**

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"goal": "Build a hello world REST API"}' | jq
```

Expected: a JSON response with `id`, `goal`, `status: "CREATED"`.

**Check it in the dashboard:**

Open `http://localhost:3000` in your browser. You should see the project in the list.

**Start orchestration:**

```bash
curl -X POST http://localhost:3001/api/projects/<project-id>/start | jq
```

Check the orchestrator terminal for log output showing the planning job being processed.

## 8. Run Tests

Run all tests across the monorepo:

```bash
pnpm test
```

Run tests for a specific package:

```bash
pnpm --filter @orchestration/api test
pnpm --filter @orchestration/orchestrator test
pnpm --filter @orchestration/shared test
```

Run tests in watch mode during development:

```bash
pnpm --filter @orchestration/api test -- --watch
```

## 9. Linting and Formatting

Check for lint and format issues:

```bash
pnpm lint
```

Auto-fix issues:

```bash
pnpm lint --fix
```

Biome handles both linting and formatting. There is no separate format command.

## 10. Useful Commands Reference

| Command | Description |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start all applications in dev mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint and format check |
| `docker compose up -d` | Start infrastructure |
| `docker compose down` | Stop infrastructure |
| `docker compose down -v` | Stop infrastructure and delete data |
| `pnpm --filter @orchestration/shared migrate` | Run database migrations |
| `pnpm --filter @orchestration/shared seed` | Seed development data |

## Common Issues and Solutions

### Port already in use

**Symptom:** `Error: listen EADDRINUSE :::3001` or similar.

**Fix:** Another process is using the port. Find and kill it:

```bash
lsof -i :3001
kill <PID>
```

Or change the port in `.env`.

### PostgreSQL connection refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Fix:** PostgreSQL is not running or not ready yet.

```bash
docker compose ps        # Check if the container is running
docker compose logs postgres  # Check for errors
docker compose restart postgres
```

If using Apple Silicon and getting architecture-related errors, ensure Docker Desktop is updated to the latest version.

### Redis connection refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Fix:** Same as PostgreSQL --- check the Redis container:

```bash
docker compose ps
docker compose logs redis
docker compose restart redis
```

### Shared package types not found

**Symptom:** `Cannot find module '@orchestration/shared'` or type errors referencing shared types.

**Fix:** The shared package needs to be built before other packages can use it:

```bash
pnpm --filter @orchestration/shared build
```

If you changed shared types, rebuild:

```bash
pnpm --filter @orchestration/shared build
```

Or run it in watch mode: `pnpm --filter @orchestration/shared dev`

### Migration fails with "database does not exist"

**Symptom:** `error: database "orchestration" does not exist`

**Fix:** The database needs to be created first. If using the default Docker Compose setup, the database should be created automatically via the `POSTGRES_DB` environment variable. If it was not:

```bash
docker compose exec postgres createdb -U postgres orchestration
```

Then re-run migrations.

### Claude API key invalid or missing

**Symptom:** `401 Unauthorized` or `ANTHROPIC_API_KEY is not set` errors from the orchestrator.

**Fix:** Ensure your `.env` file has a valid `ANTHROPIC_API_KEY`. The key should start with `sk-ant-`. Get one from [console.anthropic.com](https://console.anthropic.com/).

### Docker Compose volumes taking too much space

**Symptom:** Disk space warnings.

**Fix:** Remove unused volumes and containers:

```bash
docker compose down -v   # Removes volumes (deletes database data!)
docker system prune      # Clean up unused Docker resources
```

### Tests fail with database errors

**Symptom:** Integration tests fail because they cannot connect to the database.

**Fix:** Tests expect PostgreSQL to be running. Start infrastructure first:

```bash
docker compose up -d
```

Some tests may require a separate test database. Check if the test configuration expects a `DATABASE_URL` with a different database name (e.g., `orchestration_test`):

```bash
docker compose exec postgres createdb -U postgres orchestration_test
```

### Hot reload not working

**Symptom:** Code changes are not reflected without restarting the server.

**Fix:** Ensure you are running the `dev` command (not `start` or `build`). The dev command uses `tsx watch` or similar for hot reloading. If changes to `packages/shared` are not reflected, ensure the shared package is running in watch mode in a separate terminal.
