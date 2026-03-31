# 05 — Нормалізація залежностей воркстрімів

**Пріоритет:** P1
**Область:** Orchestrator, DB, Shared
**Складність:** Medium

## Проблема

Workstream dependencies зберігаються як `JSONB array of strings`, де значення можуть бути **або UUID, або ім'я воркстріму**. Це створює проблеми:

1. **Двозначність** — код в `tracking/progress.ts` будує `nameToId` map і перевіряє обидва варіанти:
   ```typescript
   const depId = nameToId.get(dep) ?? dep; // спочатку як name, потім як id
   ```
2. **Ненадійність** — якщо два воркстріми мають однакове ім'я, name-based resolution зламається
3. **Architect prompt генерує імена** — LLM повертає JSON з `dependencies: ["Backend API"]`, це потім зберігається as-is
4. **Circular dependency detection** працює на name level перед створенням в DB — після insert в DB dependencies стають id-based, але якщо architect дав names, вони залишаються names
5. **Frontend DependencyGraph** отримує dependencies і не знає чи це id чи name

### Поточний флоу

```
LLM Output → parseWorkstreams() → { dependencies: ["Backend API", "Database Schema"] }
                                           ↓
                          createWorkstream() → зберігає as-is в JSONB
                                           ↓
                    checkWorkstreamCompletion() → nameToId fallback
```

## Що треба зробити

### Крок 1: Нормалізація при створенні workstreams (planning worker)

**Файли:**
- `apps/orchestrator/src/workers/planning.ts` — після парсингу workstreams
- `apps/orchestrator/src/prompts/architect.ts` — парсер

**Зміни:**
В planning worker, ПІСЛЯ створення всіх workstreams в DB:
1. Побудувати map `name → id` з створених workstreams
2. Для кожного workstream: замінити name-based dependencies на UUID-based
3. Зберегти оновлені dependencies через `workstreamRepo.updateWorkstream()`

```typescript
// Псевдокод
const nameToId = new Map(createdWorkstreams.map(ws => [ws.name, ws.id]));
for (const ws of createdWorkstreams) {
  const normalizedDeps = ws.dependencies.map(dep => nameToId.get(dep) ?? dep);
  await workstreamRepo.updateWorkstream(ws.id, { dependencies: normalizedDeps });
}
```

### Крок 2: Валідація dependencies при створенні

**Файли:**
- `packages/db/src/repositories/workstreams.ts` — `createWorkstream()`
- `apps/api/src/services/workstream.service.ts`

**Зміни:**
- При створенні через API: валідувати що всі dependencies — це UUID існуючих workstreams того ж project
- В репозиторії: optional validation flag (оркестратор може пропустити, бо нормалізує потім)

### Крок 3: Оновити progress tracking

**Файли:**
- `apps/orchestrator/src/tracking/progress.ts`

**Зміни:**
- Прибрати `nameToId` fallback — dependencies завжди UUID
- Спростити код: `const depCompleted = completedIds.has(dep)`
- Додати warning log якщо dependency не є UUID (для backwards compat)

### Крок 4: Оновити DependencyGraph на фронті

**Файли:**
- `apps/web/src/components/DependencyGraph.tsx`

**Зміни:**
- Dependencies — завжди UUID → edges будуються напряму з `ws.dependencies.map(depId => ({ source: depId, target: ws.id }))`
- Прибрати fallback на name matching якщо є

## Чеклист

- [x] Planning worker: нормалізація dependencies name→UUID після створення workstreams
- [x] Circular dependency detection: працює з нормалізованими UUID
- [ ] API validation: dependencies при створенні — тільки UUID існуючих workstreams
- [x] Progress tracking: прибрати nameToId fallback, тільки UUID
- [x] Frontend: DependencyGraph працює тільки з UUID edges
- [ ] Тести: нормалізація залежностей в planning worker
- [ ] Тести: невалідні dependencies → помилка
