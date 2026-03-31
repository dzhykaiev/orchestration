# 09 — UX покращення фронтенду

**Пріоритет:** P2
**Область:** Frontend
**Складність:** Medium

## Проблема

### 1. Onboarding flow відсутній
- Новий юзер бачить порожній dashboard
- Немає guidance "створіть workspace → додайте фічі → kickoff"
- Кнопка "New Project" веде на форму без контексту

### 2. Navigation між entities слабка
- З project detail не можна перейти на workspace
- З board не видно до якого workspace належать фічі
- Breadcrumbs відсутні

### 3. Real-time feedback неповний
- SSE підключений, але не всі стани оновлюються в реальному часі
- При planning — немає progress indication (тільки status badge)
- При implementation — немає live log streaming

### 4. Error handling на UI
- API помилки показуються як toast, але без деталей
- 409 Conflict (concurrent update) не обробляється спеціально
- Validation errors від API не показуються per-field

### 5. Board не зв'язаний з projects
- Feature kickoff створює project, але board не оновлюється автоматично
- Немає лінку з feature card на project detail
- Статус project не відображається на feature card

## Що треба зробити

### Крок 1: Empty states і onboarding

**Файли:**
- `apps/web/src/app/page.tsx` — home
- `apps/web/src/app/board/page.tsx` — board

**Зміни:**
- Home page empty state: "Create your first workspace to get started" → button → workspace creation
- Board empty state: "Add features to your workspace backlog" → button → feature creation
- Project list empty: "No projects yet. Create features and kick them off, or create a project directly"

### Крок 2: Breadcrumbs і navigation

**Файл (новий):**
- `apps/web/src/components/Breadcrumbs.tsx`

**Зміни:**
- Project detail: `Workspaces > {workspace name} > {project name}`
- Board: `Workspaces > {workspace name} > Board`
- Agents: `Workspaces > {workspace name} > Agents`
- Кожен сегмент — клікабельний лінк

### Крок 3: Feature ↔ Project linking в UI

**Файли:**
- `apps/web/src/app/board/page.tsx`
- `apps/web/src/components/FeatureCard.tsx`

**Зміни:**
- Feature card: якщо є `orchestrationProjectId` — показати badge з project status і лінк на project
- Feature card: при hover — показати project progress (% workstreams done)
- Project detail: якщо project створений з feature — показати лінк "Created from feature: {title}"

### Крок 4: Planning progress indicator

**Файли:**
- `apps/web/src/app/projects/[id]/page.tsx`

**Зміни:**
- При status=planning: показати animated indicator "Architect is analyzing your goal..."
- При SSE event `project.planning_completed`: автоматично refresh сторінки
- Показати архітектуру як перший результат (expandable)

### Крок 5: Кращий error handling

**Файли:**
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/Toast.tsx`

**Зміни:**
- API client: parse error response body для детальних повідомлень
- 409 Conflict: "This item was updated by someone else. Please refresh."
- 400 Validation: показати конкретні поля з помилками
- Toast: додати "Details" expandable section для довгих error messages

## Чеклист

- [x] Empty states: home, board, project list
- [x] Component: Breadcrumbs
- [x] Layout: breadcrumbs на всіх сторінках
- [x] Feature card: project status badge і лінк
- [x] Project detail: лінк на source feature
- [x] Planning: animated progress indicator
- [x] SSE: auto-refresh при planning completed
- [ ] API client: detailed error parsing
- [ ] Toast: 409 Conflict handling
- [ ] Toast: validation error per-field display
