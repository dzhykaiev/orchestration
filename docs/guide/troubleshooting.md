# Troubleshooting

## Common Issues

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3001
```

Kill the process using the port:

```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Database Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Ensure PostgreSQL is running:

```bash
docker compose ps
docker compose up -d postgres
docker compose exec postgres pg_isready -U postgres
```

### Redis Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Shared Package Not Found

```
Cannot find module '@orchestration/shared'
```

Build the shared packages first:

```bash
pnpm --filter @orchestration/shared build
```

### Migration Errors

```
Error: relation "projects" already exists
```

Check migration state:

```bash
pnpm --filter @orchestration/db run studio
```

Or reset the database:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### TypeScript Build Errors

```bash
# Full clean rebuild
pnpm clean
pnpm install
pnpm --filter @orchestration/shared build
pnpm build
```

### BullMQ Stalled Jobs

If jobs appear stuck:

```bash
# Check Redis for queue state
docker compose exec redis redis-cli
> KEYS bull:*
> LRANGE bull:planning:waiting 0 -1
```

Restart the orchestrator to reprocess stalled jobs.

## Logs

### API Logs

API server uses Pino for structured JSON logging:

```bash
pnpm --filter @orchestration/api dev 2>&1 | pnpm pino-pretty
```

### Development Logs

When running `pnpm dev`, all logs are interleaved. Each service is prefixed:

```
[api]          2026-03-31 10:00:00 Server listening on port 3001
[orchestrator] 2026-03-31 10:00:00 Workers started
[web]          2026-03-31 10:00:00 Ready on http://localhost:3000
```

## Reset Everything

Nuclear option — reset all state:

```bash
# Stop everything
docker compose down -v

# Clean builds
pnpm clean

# Reinstall
pnpm install

# Rebuild
pnpm --filter @orchestration/shared build

# Start fresh
docker compose up -d
pnpm db:migrate
pnpm dev
```
