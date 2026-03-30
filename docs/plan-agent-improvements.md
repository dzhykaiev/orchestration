# Plan: Оновлення агентів та додавання reviewer

> Статус: заплановано, не імплементовано

## Context

Поточні agent briefs занадто тонкі (1-3 речення) — агенти не отримують достатньо guidance для генерації якісного коду. Також відсутній будь-який етап ревʼю після генерації — немає quality gate між implementation та завершенням workstream.

## Зміни

### 1. Додати роль `reviewer`

Новий агент, який запускається як фінальний workstream з залежностями на всі інші. Перевіряє:
- Крос-воркстрім інтеграцію (імпорти, типи, контракти)
- Відповідність архітектурі
- Стандарти коду
- Виводить виправлені файли через `<file>` теги або `<review-result>APPROVED</review-result>`

**Файли для типу:**
- `contracts/types/agent-task.ts` — додати `"reviewer"` до `AgentRole`
- `packages/shared/src/types/agent-task.ts` — те саме
- `packages/db/src/schema.ts` — додати `"reviewer"` до `agentRoleEnum`

### 2. Збагатити briefs усіх агентів (`briefs.ts`)

Додати `SHARED_STANDARDS` — спільні правила для всіх агентів:
- TypeScript strict (no `any`, explicit return types)
- Імпорти (named imports, `.js` extensions для ESM)
- Обробка помилок (typed errors, не ковтати exceptions)
- Іменування (kebab-case файли, PascalCase компоненти, camelCase функції)
- Повна імплементація, без TODO/placeholder

Розширити кожен brief:
- **architect** — стратегія декомпозиції, contract-first, включати reviewer workstream
- **backend** — паттерни Fastify (route registration, plugins, typed request/reply), Zod, Pino, формат помилок
- **frontend** — Next.js App Router конвенції (`"use client"`, RSC, server actions, file structure)
- **data** — Drizzle паттерни (naming: snake_case DB / camelCase TS), індекси, barrel exports
- **devops** — Dockerfile (multi-stage, non-root), docker-compose, `.env.example`, scripts
- **qa** — Vitest (describe/it, co-location, mocking, coverage), Fastify testing з light-my-request
- **reviewer** — чеклист ревʼю, формат виводу, обмеження (не рефакторити стиль)

### 3. Оновити architect prompt (`architect.ts`)

- Додати `reviewer` до Available Agent Roles
- Правило: завжди включати фінальний reviewer workstream
- Guidance по порядку: data → backend → frontend → devops/qa → reviewer

### 4. Reviewer workflow в implementation worker

В `implementation.ts` для `role === "reviewer"`:
- Завантажити всі згенеровані файли з `output/{projectId}/`
- Включити їх у контекст промпту
- Парсити відповідь: якщо `APPROVED` — завершити без змін файлів

### 5. Покращити OUTPUT_FORMAT_INSTRUCTION

- Завжди повний вміст файлу, не дифи
- Project-relative paths
- Не виводити файли за межами ownedPaths (крім reviewer)

## Файли для зміни

| Файл | Що змінюється |
|---|---|
| `contracts/types/agent-task.ts` | `+ "reviewer"` до AgentRole |
| `packages/shared/src/types/agent-task.ts` | `+ "reviewer"` до AgentRole |
| `packages/db/src/schema.ts` | `+ "reviewer"` до agentRoleEnum |
| `apps/orchestrator/src/prompts/briefs.ts` | Збагачені briefs + SHARED_STANDARDS + reviewer brief |
| `apps/orchestrator/src/prompts/architect.ts` | Reviewer роль + decomposition guidance |
| `apps/orchestrator/src/prompts/implementation.ts` | Reviewer context loading |
| `apps/orchestrator/src/workers/implementation.ts` | Reviewer-specific logic |

## Порядок виконання

1. Типи + схема (3 файли) — додати `reviewer`
2. `briefs.ts` — збагачені briefs + OUTPUT_FORMAT
3. `architect.ts` — оновлений промпт
4. `implementation.ts` + `implementation worker` — reviewer workflow

## Верифікація

- `pnpm tsc --noEmit` у кожному app/package — перевірити типи
- Перевірити що `AGENT_BRIEFS` має entry для всіх ролей (TypeScript Record перевірить)
- Перевірити що agentRoleEnum в схемі відповідає AgentRole типу
