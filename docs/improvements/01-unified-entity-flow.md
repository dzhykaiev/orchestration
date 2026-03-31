# 01 — Уніфікація флоу Workspace → Project → Feature

**Пріоритет:** P0
**Область:** API, Frontend, Shared Types
**Складність:** Medium

## Проблема

Зараз створення сутностей розкидане по різних флоу без єдиної логіки:

1. **Project створюється без workspace** — `workspaceId` опціональний, тому проєкти "висять у повітрі"
2. **Feature створюється без workspace** — `workspaceId` є в DB schema, але НЕ валідується в `CreateFeatureSchema` і НЕ передається через API
3. **Feature kickoff створює project без workspace** — навіть якщо фіча належить воркспейсу, проєкт створюється без `workspaceId`
4. **Два паралельних флоу** — можна створити project напряму АБО через feature kickoff, і ці флоу дають різний результат
5. **Немає єдиної "воронки"** — юзер не розуміє, чи йому створити workspace → feature → kickoff, чи одразу project

### Поточний стан

```
Флоу 1 (напряму):         POST /api/projects → project (без workspace)
Флоу 2 (через feature):   POST /api/features → POST /features/:id/kickoff → project (без workspace)
Флоу 3 (через workspace): POST /api/workspaces → ... → ??? (не зв'язано)
```

### Бажаний стан

```
                    ┌─────────────┐
                    │  WORKSPACE  │  ← контейнер для всього
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴────┐ ┌────┴─────┐
        │  FEATURES  │ │ AGENTS │ │ SETTINGS │
        │  (backlog) │ │ (defs) │ │          │
        └─────┬──────┘ └────────┘ └──────────┘
              │ kickoff
        ┌─────┴──────┐
        │  PROJECT   │  ← завжди в контексті workspace
        └─────┬──────┘
              │ plan
        ┌─────┴──────┐
        │ WORKSTREAMS │
        └─────┬──────┘
              │
        ┌─────┴──────┐
        │   TASKS    │
        └────────────┘
```

## Що треба зробити

### Крок 1: Зробити workspace обов'язковим для project

**Файли:**
- `apps/api/src/schemas/project.ts` — `CreateProjectSchema`
- `packages/shared/src/schemas/project.ts` — shared schema
- `packages/db/src/schema.ts` — таблиця `projects`
- `packages/db/src/repositories/projects.ts` — `createProject()`

**Зміни:**
- В `CreateProjectSchema`: зробити `workspaceId` **required** (z.string().uuid()), прибрати `.optional()`
- В DB schema: прибрати `.references(() => workspaces.id).notNull()` (додати NOT NULL якщо ще нема)
- В репозиторії: валідувати що workspace існує перед створенням
- Написати міграцію: якщо є проєкти без workspace — створити default workspace і прив'язати

### Крок 2: Додати workspaceId в feature creation

**Файли:**
- `apps/api/src/schemas/feature.ts` — `CreateFeatureSchema`
- `packages/shared/src/schemas/feature.ts` — shared schema
- `apps/api/src/routes/features.ts` — routes
- `apps/api/src/services/feature.service.ts` — service

**Зміни:**
- В `CreateFeatureSchema`: додати `workspaceId: z.string().uuid()` як required
- В route: валідувати що workspace існує
- Альтернатива: перенести feature creation під workspace — `POST /api/workspaces/:id/features`

### Крок 3: Feature kickoff повинен наслідувати workspace

**Файли:**
- `apps/api/src/services/feature.service.ts` — метод `kickoff()`

**Зміни:**
- При kickoff: створювати project з `workspaceId` від feature
- Якщо feature не має workspace — помилка 400

### Крок 4: Оновити frontend

**Файли:**
- `apps/web/src/app/projects/new/page.tsx` — форма створення project
- `apps/web/src/app/board/page.tsx` — Kanban board
- `apps/web/src/lib/api.ts` — API клієнт

**Зміни:**
- Форма створення project: обов'язковий вибір workspace (dropdown)
- Board: показувати фічі в контексті workspace (фільтр або табби)
- Kickoff: передавати workspaceId

### Крок 5: Прибрати "quick create" без workspace

**Файли:**
- `apps/api/src/routes/projects.ts`
- `apps/web/src/app/page.tsx` (home)

**Зміни:**
- Home page: якщо немає workspace — показати кнопку "Create Workspace" замість "New Project"
- API: 400 якщо workspaceId не передано

## Чеклист

- [ ] DB міграція: `workspaceId` NOT NULL в projects
- [ ] DB міграція: default workspace для orphan projects
- [ ] `CreateProjectSchema`: workspaceId required
- [ ] `CreateFeatureSchema`: workspaceId required
- [ ] Feature kickoff: наслідує workspaceId
- [x] Frontend: workspace selector в project creation form
- [x] Frontend: board фільтрація по workspace
- [ ] Тести: оновити існуючі тести projects і features
- [ ] Тести: новий тест — project creation без workspace = 400
- [ ] Тести: новий тест — feature kickoff наслідує workspace
