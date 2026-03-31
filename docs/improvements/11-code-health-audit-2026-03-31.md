# 11. Code Health Audit (2026-03-31)

## Контекст

Під час технічного аудиту були запущені базові перевірки:

- `pnpm test` — проходить
- `pnpm typecheck` — падає
- `pnpm lint` — падає

Мета цього документа: зафіксувати знайдені дефекти, ризики та рефакторинги у форматі backlog-задачі.

## Підтверджені баги

### 1) `typecheck` падає через некоректні моки Fastify у тесті health

**Симптом**

- `pnpm typecheck` повертає `TS2345` у `apps/api/src/routes/__tests__/health.test.ts`.

**Джерело**

- `apps/api/src/routes/__tests__/health.test.ts:10`
- `apps/api/src/routes/__tests__/health.test.ts:16`

**Проблема**

У `app.decorate("db", { execute: ... })` і `app.decorate("redis", { ping: ... })` передаються об'єкти, що не відповідають очікуваним типам `app.db` та `app.redis` з plugin-декларацій.

**Що зробити**

- Винести збірку тестового app у typed helper з частковими mock-інстансами.
- Замінити `app.decorate` з сирими об'єктами на типобезпечний fixture, сумісний з `FastifyInstance["db"]` і `FastifyInstance["redis"]`.
- Прибрати `any` у цьому тесті.

### 2) `lint` падає на згенерованому `docs/.vitepress/cache`

**Симптом**

- `pnpm lint` аналізує `docs/.vitepress/cache/deps/*` і видає тисячі нерелевантних diagnostics.

**Джерело**

- `biome.json:30`
- `.gitignore:56`

**Проблема**

`docs/.vitepress/cache` ігнорується git-ом, але не ігнорується Biome. У результаті CI-шум перекриває реальні проблеми коду.

**Що зробити**

- Додати `docs/.vitepress/cache` та `docs/.vitepress/dist` у `files.ignore` в `biome.json`.
- Зафіксувати політику: lint має перевіряти лише source-файли, а не build/cache артефакти.

### 3) Ризик хибного `completed` для проєкту без воркстрімів

**Джерело**

- `apps/orchestrator/src/tracking/progress.ts:208`
- `apps/orchestrator/src/tracking/progress.ts:214`

**Проблема**

`allCompleted = workstreams.every(...)` на порожньому масиві дає `true`, тому проєкт може перейти в `completed`, навіть якщо воркстріми ще не створені або створення зірвалось.

**Що зробити**

- Додати guard: якщо `workstreams.length === 0`, не фіналізувати проєкт.
- Додати окремий тест на кейс "0 workstreams".

### 4) Неатомарний `feature kickoff` (ризик частково застосованої операції)

**Джерело**

- `apps/api/src/services/feature.service.ts:65`
- `apps/api/src/services/feature.service.ts:76`
- `apps/api/src/services/feature.service.ts:81`

**Проблема**

У `kickoff` послідовно виконуються:

1. створення project,
2. апдейт feature,
3. enqueue в planning queue.

Якщо enqueue падає після апдейту feature, система залишається в неконсистентному стані: feature вже `in_progress`, але планування не стартувало.

**Що зробити**

- Перевести операцію на транзакційний/ідемпотентний патерн (наприклад, outbox або explicit compensation).
- Додати retry-стратегію й інваріантний health-check для `feature.in_progress` без активного planning job.

## Рефакторинг і покращення

### 5) Уніфікувати резолвінг provider

Однакова логіка `project.provider || process.env.LLM_PROVIDER || "opencode"` повторюється у кількох місцях (`feature.service`, `project.service`, `progress.ts`).

**Що зробити**

- Винести в спільний utility `resolveProvider(projectProvider?: string): Provider`.
- Зменшити дублювання і ризик роз'їзду дефолтних значень.

### 6) Зменшити кількість `as ...Status` кастів

У critical-path логіці оркестратора багато кастів (`as ProjectStatus`, `as WorkstreamStatus`, `as FeatureStatus`), що приховують помилки даних на compile-time.

**Що зробити**

- Підняти stricter typing на межі repository/service.
- Нормалізувати DTO-типи так, щоб статуси були типізовані без примусових кастів.

### 7) Оновити конфіг тестового воркспейсу Vitest

Є deprecation warning для `vitest.config.ts`.

**Джерело**

- `vitest.workspace.ts:3`

**Що зробити**

- Перейти на `test.projects` у root vitest config.
- Прибрати deprecation до наступного major.

## Пріоритет та чекліст

### P0

- [x] Виправити `typecheck` у `health.test.ts` через типобезпечні mocks.
- [x] Виправити `lint`-конфіг (ігнор build/cache артефактів docs).

### P1

- [x] Додати guard для `checkProjectCompletion` на порожній список воркстрімів + тест.
- [x] Зробити `feature kickoff` стійким до partial failure (queue/DB консистентність).

### P2

- [x] Винести єдиний utility для резолву LLM provider.
- [x] Прибрати зайві status-касти через сильніші типи.
- [x] Мігрувати з `vitest.config.ts` на `test.projects`.

<!-- DONE by Codex at 2026-03-31 -->
<!-- DONE by Codex at 2026-03-31 (follow-up) -->
