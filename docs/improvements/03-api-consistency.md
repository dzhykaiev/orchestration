# 03 — Консистентність API

**Пріоритет:** P1
**Область:** API, Schemas
**Складність:** Low-Medium

## Проблема

API endpoints мають різну поведінку для однакових операцій:

### 1. Пагінація не уніфікована

| Endpoint | Default limit | Max limit |
|----------|--------------|-----------|
| Workspaces | 20 | 100 |
| Projects | 20 | 100 |
| Features | **100** | **200** |
| Artifacts | 50 | 100 |
| Escalations | 50 | 100 |
| Audit logs | 50 | 100 |
| Reviews | 50 | 100 |

### 2. Відсутні list endpoints

- Немає `GET /api/tasks` — можна лише children/tree конкретного таска
- Немає `GET /api/workstreams` — лише через project
- Немає `GET /api/escalations` — лише через project
- Немає `GET /api/reviews` — лише через task або workstream

### 3. Відсутні фільтри

- Projects: тільки `includeArchived`, немає `status`, `provider`, `workspaceId` (як query)
- Tasks: немає list endpoint взагалі
- Workstreams: немає `status` фільтра

### 4. Response format не уніфікований

Деякі list endpoints повертають `{ data, total }`, інші — просто масив.

## Що треба зробити

### Крок 1: Уніфікувати пагінацію

**Файли:**
- `apps/api/src/schemas/` — всі list query schemas

**Зміни:**
Створити shared pagination schema:
```typescript
// packages/shared/src/schemas/pagination.ts
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```
Всі list schemas розширюють цю базову. Features теж — max 100, default 20.

### Крок 2: Уніфікувати response format

**Файли:**
- `apps/api/src/routes/` — всі routes з list endpoints
- `packages/shared/src/types/` — додати PaginatedResponse type

**Зміни:**
Кожен list endpoint повертає:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
```

### Крок 3: Додати відсутні фільтри

**Файли:**
- `apps/api/src/schemas/project.ts` — ProjectListQuerySchema
- `apps/api/src/schemas/workstream.ts` — додати WorkstreamListQuerySchema
- `packages/db/src/repositories/` — відповідні репозиторії

**Зміни для Projects:**
```typescript
ProjectListQuerySchema = PaginationQuerySchema.extend({
  workspaceId: z.string().uuid().optional(),
  status: z.enum([...projectStatuses]).optional(),
  provider: z.enum(["claude", "opencode"]).optional(),
  includeArchived: z.coerce.boolean().default(false),
});
```

**Зміни для Workstreams:**
```typescript
WorkstreamListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum([...workstreamStatuses]).optional(),
});
```

### Крок 4: Додати відсутні list endpoints (опціонально)

Це не блокер, але корисно для адмін-панелі:
- `GET /api/tasks?projectId=&workstreamId=&status=` — список тасків з фільтрами
- `GET /api/escalations?status=` — глобальний список ескалацій

## Чеклист

- [ ] Shared: `PaginationQuerySchema` в packages/shared
- [ ] Shared: `PaginatedResponse<T>` type
- [ ] Schema: уніфікувати всі list query schemas (extend PaginationQuerySchema)
- [ ] Schema: Features max limit 100→100, default 100→20
- [ ] Routes: всі list endpoints повертають `{ data, total, limit, offset }`
- [ ] Schema: ProjectListQuerySchema — додати status, provider, workspaceId фільтри
- [ ] Repository: projectRepo.listProjects — підтримка нових фільтрів
- [ ] Тести: перевірити пагінацію і фільтри
