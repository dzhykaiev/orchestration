# 02 — Прив'язка фіч до воркспейсів та єдиний backlog

**Пріоритет:** P0
**Область:** API, DB, Frontend
**Складність:** Medium

## Проблема

Features існують як глобальні сутності без чіткої прив'язки до workspace. Це створює плутанину:

1. **Feature list глобальний** — `GET /api/features` повертає ВСІ фічі, без фільтрації по workspace
2. **Board не має контексту** — Kanban показує все підряд, немає scope
3. **Feature → Project зв'язок однонаправлений** — фіча знає про project через `orchestrationProjectId`, але project не знає про фічу
4. **Немає ендпоінту** `GET /api/workspaces/:id/features` — хоча для agents такий є

### Поточний стан routes

```
GET  /api/features           → всі фічі (глобальний список)
POST /api/features           → створити фічу (workspaceId не валідується)
GET  /api/workspaces/:id/agents  → агенти workspace (є!)
GET  /api/workspaces/:id/projects → проєкти workspace (є!)
GET  /api/workspaces/:id/features → НЕ ІСНУЄ
```

## Що треба зробити

### Крок 1: Додати workspace-scoped feature endpoints

**Файли:**
- `apps/api/src/routes/workspaces.ts` — додати features sub-routes
- `apps/api/src/routes/features.ts` — оновити існуючі
- `packages/db/src/repositories/features.ts` — додати `listByWorkspace()`

**Зміни:**
- Додати `GET /api/workspaces/:id/features` — список фіч воркспейсу
- Додати `POST /api/workspaces/:id/features` — створити фічу в контексті воркспейсу
- В репозиторії: `listFeatures(opts)` — додати фільтр `workspaceId`
- Існуючий `GET /api/features` — залишити для зворотної сумісності, але додати query param `?workspaceId=`

### Крок 2: Двонаправлений зв'язок Feature ↔ Project

**Файли:**
- `packages/db/src/repositories/features.ts`
- `packages/db/src/repositories/projects.ts`
- `apps/api/src/routes/projects.ts`

**Зміни:**
- В проєкт додати метод `getLinkedFeature(projectId)` — знайти фічу по `orchestrationProjectId`
- В `GET /api/projects/:id/detail` — включити linked feature в response
- При зміні статусу project (completed/failed) — оновити статус feature:
  - project completed → feature done
  - project failed → feature повертається в todo

### Крок 3: Оновити Board frontend

**Файли:**
- `apps/web/src/app/board/page.tsx`
- `apps/web/src/lib/api.ts`

**Зміни:**
- Додати workspace selector зверху board
- Завантажувати фічі через `GET /api/workspaces/:id/features`
- Зберігати вибраний workspace в URL query param або localStorage
- Показувати linked project status на feature card

## Чеклист

- [ ] Repository: `listFeaturesByWorkspace(workspaceId, opts)` метод
- [ ] Route: `GET /api/workspaces/:id/features`
- [ ] Route: `POST /api/workspaces/:id/features`
- [ ] Route: `GET /api/features?workspaceId=` query param filter
- [ ] Repository: `getFeatureByProjectId(projectId)` метод
- [ ] Project detail endpoint: включити linked feature
- [ ] Sync: project completion → feature status update
- [ ] Frontend: workspace selector на board
- [ ] Frontend: feature card показує project status
- [ ] Тести: workspace-scoped feature CRUD
- [ ] Тести: feature ↔ project sync
