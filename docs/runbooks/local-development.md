# Local Development Runbook

Оновлено під фактичний стан репозиторію.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- Встановлені CLI, якщо плануєте запуск агентів:
  - `claude` (для `LLM_PROVIDER=claude`)
  - `opencode` (для `LLM_PROVIDER=opencode`)

## 1. Install

```bash
pnpm install
```

## 2. Start infrastructure

```bash
docker compose up -d
docker compose ps
```

Очікування: `postgres` і `redis` у статусі `healthy`.

## 3. Configure environment

```bash
cp .env.example .env
```

Мінімально перевірте:

- `DATABASE_URL`
- `REDIS_URL`
- `LLM_PROVIDER`
- `PORT`
- `WEB_PORT`

Опціонально:

- `PROJECTS_DIR`
- `ROLE_PROVIDER_MAP`
- `SELF_REPO_PATH`

## 4. Run migrations (and optional seed)

```bash
pnpm db:migrate
pnpm db:seed
```

## 5. Start services

Найпростіше:

```bash
pnpm dev
```

Це запускає:
- API (`apps/api`) на `http://localhost:3001`
- Orchestrator (`apps/orchestrator`)
- Web (`apps/web`) на `http://localhost:3000`

Альтернатива (по окремих терміналах):

```bash
pnpm --filter @orchestration/api dev
pnpm --filter @orchestration/orchestrator dev
pnpm --filter @orchestration/web dev
```

## 6. Smoke checks

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/ready
```

Створення workspace:

```bash
curl -X POST http://localhost:3001/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name":"Local Workspace","slug":"local"}'
```

Після цього можна створювати project через UI (`/projects/new`) або API.

## 7. Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 8. Common issues

1. `connect ECONNREFUSED` до Postgres/Redis:
- перевірте `docker compose ps` і `docker compose logs postgres redis`.

2. LLM таски не стартують:
- перевірте, що встановлений і авторизований відповідний CLI (`claude` або `opencode`).

3. Пустий SSE у UI:
- перевірте `GET /api/events` та чи оркестратор публікує події.

4. Не видно згенерованих файлів:
- переконайтесь, що `PROJECTS_DIR` однаковий для API і orchestrator.
