# 06 — Коректний трекінг вартості

**Пріоритет:** P2
**Область:** DB, API, Orchestrator
**Складність:** Low

## Проблема

1. **totalCostUsd ініціалізується як "0" (string)** — в `projectRepo.createProject()` значення `"0"` передається як string для numeric column. Drizzle це обробляє, але семантично некоректно
2. **Агрегація через SQL SUM** — `updateTotalCost()` робить `SELECT SUM(cost_usd)` по всіх тасках, але `costUsd` може бути null (не всі провайдери повертають cost)
3. **Немає cost breakdown** — тільки total, немає розбивки по workstream або agent role
4. **Frontend не показує cost** — поле є в data, але немає UI
5. **Precision loss** — schema `costUsd` це `numeric` (Drizzle) = pg `DECIMAL`, але API приймає `z.number()` (float) → potential precision issues

## Що треба зробити

### Крок 1: Виправити ініціалізацію

**Файли:**
- `packages/db/src/repositories/projects.ts` — `createProject()`

**Зміни:**
- `totalCostUsd: "0"` → `totalCostUsd: "0.000000"` або просто прибрати (default в schema)

### Крок 2: Безпечна агрегація

**Файли:**
- `packages/db/src/repositories/projects.ts` — `updateTotalCost()`

**Зміни:**
- `COALESCE(SUM(cost_usd), 0)` замість `SUM(cost_usd)` для обробки null
- Перевірити що вже є (може бути ок)

### Крок 3: Cost breakdown endpoint

**Файли:**
- `packages/db/src/repositories/projects.ts` — новий метод
- `apps/api/src/routes/projects.ts` — новий endpoint

**Зміни:**
Додати `GET /api/projects/:id/costs`:
```typescript
{
  total: number,
  byWorkstream: { workstreamId: string, name: string, cost: number }[],
  byRole: { role: string, cost: number }[],
  taskCount: number
}
```

### Крок 4: Frontend cost display

**Файли:**
- `apps/web/src/app/projects/[id]/page.tsx`

**Зміни:**
- Показати total cost в project header (якщо > 0)
- Показати cost per workstream в workstream card
- Показати cost per task в task card (вже є поле, перевірити відображення)

## Чеклист

- [x] Repository: виправити ініціалізацію totalCostUsd
- [x] Repository: COALESCE в SUM агрегації
- [x] Repository: метод getCostBreakdown(projectId)
- [x] Route: `GET /api/projects/:id/costs`
- [x] Frontend: cost в project header
- [x] Frontend: cost в workstream cards
- [ ] Тести: cost aggregation з null values
