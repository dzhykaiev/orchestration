# 07 — Стійкість оркестратора

**Пріоритет:** P2
**Область:** Orchestrator
**Складність:** High

## Проблема

Оркестратор має декілька точок відмови без recovery:

### 1. Crash під час planning
Якщо planning worker впаде після створення workstreams але ДО enqueue implementation jobs:
- Project залишається в `planning` статусі
- Workstreams створені але ніхто їх не обробляє
- Немає механізму recovery

### 2. Lost jobs
BullMQ jobs можуть загубитися при Redis restart:
- Таск в статусі `queued` але job не існує
- Workstream в `in_progress` але жоден таск не виконується

### 3. Architect timeout
LLM може зависнути — немає timeout/circuit breaker:
- Planning job висить нескінченно
- Project застрягає в `planning`

### 4. Validation не впливає на flow
Навіть якщо validation fails — project все одно `completed`:
- Validation result зберігається на workstream але не перевіряється
- Немає retry або escalation при fail

### 5. Event persistence
SSE events через Redis pub/sub не персистяться:
- Якщо клієнт не підключений — event втрачено
- Немає replay/catch-up mechanism

## Що треба зробити

### Крок 1: Stale job detection

**Файл (новий):**
- `apps/orchestrator/src/workers/recovery.ts`

**Зміст:**
Periodic job (cron або BullMQ repeatable) що перевіряє:
- Projects в `planning` > 10 хвилин → перевірити чи є active planning job → якщо ні, retry
- Tasks в `queued` > 5 хвилин → перевірити чи є active implementation job → якщо ні, re-enqueue
- Tasks в `running` > 30 хвилин → mark as failed + retry якщо attempts < maxAttempts

### Крок 2: LLM timeout

**Файли:**
- `apps/orchestrator/src/llm/claude-provider.ts`
- `apps/orchestrator/src/llm/opencode-provider.ts`

**Зміни:**
- Додати configurable timeout (default 10 min для planning, 15 min для implementation)
- При timeout: kill process, return error
- Planning worker: retry з меншим scope (менше workstreams)

### Крок 3: Validation → flow integration

**Файли:**
- `apps/orchestrator/src/workers/validation.ts`
- `apps/orchestrator/src/tracking/progress.ts`

**Зміни:**
- Якщо validation FAIL:
  - Workstream status → `failed` (не completed)
  - Створити retry task з feedback від QA
  - Або ескалація якщо max retries exceeded
- Якщо validation PASS:
  - Тоді workstream вважається truly completed
  - Тоді unlock dependents

### Крок 4: Graceful project stop

**Файли:**
- `apps/api/src/services/project.service.ts` — `stop()`
- `apps/orchestrator/src/workers/implementation.ts`

**Зміни:**
- При stop: not just cancel DB records, but also remove pending BullMQ jobs
- Implementation worker: перевіряти project status перед початком execution → якщо cancelled, skip

## Чеклист

- [ ] Recovery worker: stale planning detection
- [ ] Recovery worker: orphaned queued tasks re-enqueue
- [ ] Recovery worker: stuck running tasks timeout
- [ ] LLM providers: configurable timeout
- [ ] LLM providers: process kill on timeout
- [ ] Validation: FAIL → workstream failed + retry/escalation
- [ ] Validation: тільки PASS unlock dependents
- [ ] Project stop: remove BullMQ jobs
- [ ] Implementation worker: check project status before execution
- [ ] Тести: recovery scenarios
