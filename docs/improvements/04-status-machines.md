# 04 — Строгі state machines для всіх сутностей

**Пріоритет:** P1
**Область:** API, Services, Shared
**Складність:** Medium

## Проблема

Зараз статуси можна змінювати довільно через PATCH endpoints:

1. **Project**: `UpdateProjectSchema` дозволяє встановити будь-який статус — можна перевести `completed` назад у `draft`
2. **Feature**: можна поставити будь-який статус без валідації переходу
3. **Workstream**: аналогічно, немає перевірки допустимих переходів
4. **Task**: має атомарні переходи в репозиторії (`markTaskStarted` перевіряє що status=queued), але API endpoint `POST /tasks/:id/complete` не перевіряє поточний статус

### Ризики

- Юзер або баг може зламати проєкт, повернувши статус назад
- Оркестратор може некоректно працювати з "воскреслим" проєктом
- Немає аудит-трейлу хто і чому змінив статус

## Бажані state machines

### Project
```
draft → planning → in_progress → completed → archived
                               → failed    → archived
                → cancelled
         → cancelled
```
Заборонені переходи: completed→draft, failed→in_progress, archived→будь-що

### Feature
```
backlog → todo → in_progress → done
                              → rejected
              → rejected
        → rejected
```
`in_progress` встановлюється автоматично при kickoff.
`done` встановлюється автоматично при project completion.

### Workstream
```
pending → blocked → in_progress → completed
        → in_progress            → failed
```
`blocked` ↔ `in_progress` — можуть перемикатися при зміні залежностей.

### Task
```
queued → running → completed
                 → failed → queued (retry)
       → cancelled
```

## Що треба зробити

### Крок 1: Створити модуль state machine

**Файл (новий):**
- `packages/shared/src/state-machines/index.ts`

**Зміст:**
```typescript
type TransitionMap = Record<string, string[]>;

export const PROJECT_TRANSITIONS: TransitionMap = {
  draft: ["planning", "cancelled"],
  planning: ["in_progress", "cancelled", "failed"],
  in_progress: ["completed", "failed", "cancelled"],
  completed: ["archived"],
  failed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function canTransition(map: TransitionMap, from: string, to: string): boolean {
  return map[from]?.includes(to) ?? false;
}
```

Аналогічно для Feature, Workstream, Task.

### Крок 2: Валідувати переходи в services

**Файли:**
- `apps/api/src/services/project.service.ts`
- `apps/api/src/services/feature.service.ts`
- `apps/api/src/services/workstream.service.ts`
- `apps/api/src/services/agent.service.ts`

**Зміни:**
- Перед зміною статусу: `canTransition(MAP, current, newStatus)` → якщо false — 409 Conflict
- Використовувати `projectRepo.transitionStatus()` (вже є атомарний CAS) замість `updateProject()`
- Error message: `Cannot transition project from "${current}" to "${newStatus}"`

### Крок 3: Прибрати status з PATCH schemas

**Файли:**
- `apps/api/src/schemas/project.ts` — `UpdateProjectSchema`
- `apps/api/src/schemas/feature.ts` — `UpdateFeatureSchema`
- `apps/api/src/schemas/workstream.ts` — `UpdateWorkstreamSchema`

**Зміни:**
- Видалити `status` з update schemas
- Статус змінюється ТІЛЬКИ через dedicated endpoints:
  - Project: `POST /plan`, `POST /stop`, `POST /archive`
  - Feature: `POST /kickoff`, `PATCH /status` (новий endpoint з валідацією)
  - Workstream: тільки через оркестратор або dedicated endpoint
  - Task: `POST /complete`, `POST /retry`

### Крок 4: Audit log при зміні статусу

**Файли:**
- `apps/api/src/services/` — всі сервіси
- `packages/db/src/repositories/audit-logs.ts`

**Зміни:**
- Кожна зміна статусу → запис в audit log з `action: "status_changed"` і metadata `{ from, to, reason }`
- Для project: вже є `emitTyped` — додати audit log запис поруч

## Чеклист

- [x] Shared: модуль state machines з transition maps для всіх сутностей
- [x] Shared: `canTransition()` utility function
- [x] Service: project status changes через transition validation
- [x] Service: feature status changes через transition validation
- [x] Service: workstream status changes через transition validation
- [x] Schema: прибрати `status` з UpdateProjectSchema
- [x] Schema: прибрати `status` з UpdateFeatureSchema
- [x] Schema: прибрати `status` з UpdateWorkstreamSchema
- [ ] Route: dedicated status transition endpoints де потрібно
- [x] Audit: запис кожної зміни статусу
- [ ] Тести: валідні переходи працюють
- [ ] Тести: невалідні переходи повертають 409
