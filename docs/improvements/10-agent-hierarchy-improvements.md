# 10 — Покращення ієрархії агентів

**Пріоритет:** P2
**Область:** Orchestrator, DB, API
**Складність:** High

## Проблема

### 1. Agent definitions не використовуються в orchestration
- Workspace має agent definitions з custom system prompts і capabilities
- Але orchestrator ігнорує їх — використовує hardcoded `AGENT_BRIEFS` з `prompts/briefs.ts`
- `assignedAgent` на workstream — просто text, не FK на agent definition

### 2. Escalation flow неповний
- Handler детектує `ESCALATE: reason` в output агента
- Створює escalation record
- Але НЕ створює новий task для parent tier
- Ескалація "висить" — потрібне ручне resolve через API

### 3. Delegation не структуроване
- Task tree (parentTaskId, rootTaskId, depth) існує в schema
- Але ніхто не створює child tasks автоматично
- Lead agent повинен делегувати specialist agents, але це не реалізовано

### 4. Review flow не інтегрований
- Reviews table є, repository є, read endpoints є
- Але ніхто не створює reviews
- Reviewer agent role існує, але не викликається автоматично

## Що треба зробити

### Крок 1: Використовувати workspace agent definitions

**Файли:**
- `apps/orchestrator/src/prompts/implementation.ts` — `buildSystemPrompt()`
- `apps/orchestrator/src/workers/implementation.ts`
- `packages/db/src/repositories/agent-definitions.ts`

**Зміни:**
- Implementation worker: перед побудовою prompt — спробувати знайти agent definition для workspace + role
- Якщо є definition: використати `definition.systemPrompt` замість hardcoded brief
- Якщо немає: fallback на `AGENT_BRIEFS[role]`
- Передавати `definition.capabilities` в контексті prompt

### Крок 2: Автоматична ескалація

**Файли:**
- `apps/orchestrator/src/escalation/handler.ts`
- `apps/orchestrator/src/workers/implementation.ts`

**Зміни:**
При детекції ESCALATE:
1. Створити escalation record (вже є)
2. Визначити parent tier через `getParentTier(currentTier)`
3. Створити новий task:
   - `role` = роль parent tier (або lead якщо specialist ескалює)
   - `parentTaskId` = поточний task
   - `prompt` = "Escalation from {role}: {reason}\n\nOriginal task: {prompt}\n\nAgent output: {output}"
4. Enqueue новий task
5. Emit event `escalation.created`

### Крок 3: Lead delegation

**Файл (новий або розширення):**
- `apps/orchestrator/src/workers/delegation.ts`

**Зміст:**
Коли lead agent завершує task, парсити output на delegation instructions:
```
DELEGATE: backend — Implement the REST endpoints for user management
DELEGATE: frontend — Create the user profile page component
```

Для кожного DELEGATE:
1. Створити child task з відповідним role
2. `parentTaskId` = lead task id
3. Enqueue implementation job
4. Lead task залишається в `running` поки всі child tasks не completed

### Крок 4: Автоматичний review

**Файли:**
- `apps/orchestrator/src/tracking/progress.ts` — після workstream completion
- `apps/orchestrator/src/workers/review.ts` (новий)

**Зміст:**
Після completion кожного workstream (перед або замість validation):
1. Створити review task з role=reviewer
2. Reviewer аналізує: deliverables, modified files, task outputs
3. Парсити verdict: APPROVED / CHANGES_REQUESTED / REJECTED
4. Створити review record в DB
5. Якщо CHANGES_REQUESTED:
   - Створити retry tasks з feedback від reviewer
   - Workstream повертається в in_progress
6. Якщо APPROVED:
   - Workstream truly completed
   - Proceed з validation (якщо enabled)

## Чеклист

- [ ] Implementation worker: lookup workspace agent definition для system prompt
- [ ] Fallback: якщо нема definition → hardcoded AGENT_BRIEFS
- [ ] Escalation: автоматичне створення parent-tier task
- [ ] Escalation: правильний prompt з context від failed task
- [ ] Delegation: парсинг DELEGATE pattern з lead output
- [ ] Delegation: створення child tasks з правильним parentTaskId
- [ ] Delegation: lead task чекає completion всіх child tasks
- [ ] Review: автоматичний reviewer task після workstream completion
- [ ] Review: парсинг verdict і створення review record
- [ ] Review: CHANGES_REQUESTED → retry з feedback
- [ ] Review: APPROVED → proceed до validation/completion
- [ ] Тести: escalation flow end-to-end
- [ ] Тести: delegation flow end-to-end
- [ ] Тести: review flow end-to-end
