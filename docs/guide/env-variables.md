# Environment Variables

Copy `.env.example` to `.env` in the project root. Default values work for local development.

```bash
cp .env.example .env
```

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/orchestration` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `LLM_PROVIDER` | `claude` | LLM provider: `claude` or `opencode` |
| `PORT` | `3001` | API server port |
| `WEB_PORT` | `3000` | Web dashboard port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |

## Infrastructure

### PostgreSQL

Runs via Docker Compose on port `5432`. Default credentials:
- User: `postgres`
- Password: `postgres`
- Database: `orchestration`

### Redis

Runs via Docker Compose on port `6379`. No authentication by default.

## LLM Configuration

The `LLM_PROVIDER` variable determines which LLM backend agents use:

- **`claude`** — Uses Claude CLI for LLM calls. Requires Claude CLI to be installed and authenticated.
- **`opencode`** — Uses OpenCode provider. Requires OpenCode to be configured.

The LLM provider abstraction is in `apps/orchestrator/src/llm/`. Each agent role can be mapped to a different provider if needed.
