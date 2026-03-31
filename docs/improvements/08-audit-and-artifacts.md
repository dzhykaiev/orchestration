# 08 — Автоматичний аудит і артефакти

**Пріоритет:** P2
**Область:** Orchestrator, API
**Складність:** Medium

## Проблема

### Audit logs
1. **Audit logs не створюються автоматично** — тільки endpoints існують, але ніхто не пише в таблицю
2. **Немає audit middleware** — кожен сервіс повинен вручну писати audit log
3. **Metadata не структуровано** — JSONB без schema

### Artifacts
1. **Немає CREATE endpoint** — артефакти створюються тільки з оркестратора (якщо взагалі)
2. **Оркестратор НЕ створює артефакти** — implementation worker зберігає output на task, але не створює artifact record
3. **Architecture document** зберігається як `project.architecture` (text field) замість artifact
4. **Planning output** (workstream definitions) не зберігається як artifact

## Що треба зробити

### Крок 1: Audit middleware для API

**Файл (новий):**
- `apps/api/src/plugins/audit.ts`

**Зміст:**
Fastify hook `onResponse` що автоматично створює audit log для мутацій:
```typescript
// Псевдокод
app.addHook('onResponse', async (request, reply) => {
  if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
    await auditLogRepo.createAuditLog({
      projectId: extractProjectId(request),
      entityType: extractEntityType(request.url),
      entityId: extractEntityId(request),
      action: methodToAction(request.method), // POST→created, PATCH→updated, DELETE→deleted
      actorType: 'user',
      metadata: { statusCode: reply.statusCode }
    });
  }
});
```

### Крок 2: Audit events від оркестратора

**Файли:**
- `apps/orchestrator/src/workers/planning.ts`
- `apps/orchestrator/src/workers/implementation.ts`
- `apps/orchestrator/src/workers/validation.ts`

**Зміни:**
Після кожної значущої дії — створювати audit log:
- Planning completed → `{ action: "completed", entityType: "project", actorType: "agent", actorId: "architect" }`
- Task started → `{ action: "status_changed", entityType: "task", metadata: { from: "queued", to: "running" } }`
- Task completed/failed → відповідний audit record
- Validation result → `{ action: "reviewed", entityType: "workstream" }`

### Крок 3: Автоматичне створення артефактів

**Файли:**
- `apps/orchestrator/src/workers/planning.ts`
- `apps/orchestrator/src/workers/implementation.ts`
- `apps/orchestrator/src/workers/validation.ts`

**Зміни:**
Planning worker — створити артефакти:
- Architecture document → `{ type: "architecture", content: architectureText }`
- Workstream plan → `{ type: "document", name: "Planning Output", content: rawLLMOutput }`

Implementation worker — створити артефакти:
- Code changes → `{ type: "code_diff", content: diffOutput }` (якщо є файлові зміни)
- Task output → `{ type: "log", content: taskOutput }` (повний output агента)

Validation worker — створити артефакти:
- Review report → `{ type: "review_report", content: validationOutput }`

### Крок 4: Architecture як artifact замість text field

**Файли:**
- `apps/orchestrator/src/workers/planning.ts`
- `apps/api/src/routes/projects.ts` — detail endpoint

**Зміни:**
- Зберігати architecture і як `project.architecture` (для backwards compat) і як artifact
- В detail endpoint: architecture береться з project field (швидко) або з artifact (повна версія)

## Чеклист

- [ ] Plugin: audit middleware для API мутацій
- [ ] Orchestrator: audit logs при planning
- [ ] Orchestrator: audit logs при task start/complete/fail
- [ ] Orchestrator: audit logs при validation
- [ ] Orchestrator: artifact створення при planning (architecture + plan)
- [ ] Orchestrator: artifact створення при implementation (code_diff + log)
- [ ] Orchestrator: artifact створення при validation (review_report)
- [ ] Architecture: зберігати і як project field і як artifact
- [ ] Тести: audit logs створюються автоматично
- [ ] Тести: артефакти створюються під час orchestration flow
