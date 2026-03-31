# DevOps Agent

Sets up infrastructure, CI/CD, Docker, and development tooling.

## Responsibility

- Docker Compose configuration for local development
- Development scripts (start, build, test)
- Linting and formatting configuration (Biome)
- Test framework configuration (Vitest)
- TypeScript configuration (tsconfig)
- Environment variable management

## Owned Paths

```
docker-compose.yml         # Infrastructure
biome.json                 # Linter/formatter
vitest.workspace.ts        # Test config
tsconfig.base.json         # TypeScript base config
scripts/                   # Development scripts
.env.example               # Environment template
```

## Current Status

| Component | Status |
|-----------|--------|
| Docker Compose (PostgreSQL + Redis) | ✅ Done |
| Development scripts | ✅ Done |
| Biome configuration | ✅ Done |
| Vitest workspace | ✅ Done |
| TypeScript configs | ✅ Done |
| `.env.example` | ✅ Done |
| Production Dockerfiles | ❌ Not started |
| GitHub Actions CI | ❌ Not started |

## Constraints

- Docker Compose must be self-contained — `docker compose up` starts everything
- All configs must work with the pnpm workspace structure
- Scripts must handle graceful shutdown
- `.env.example` must document every required variable
