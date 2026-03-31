# Frontend Agent Brief

## Mission

Build the Next.js web dashboard for project management and progress tracking. You create the UI that users interact with to manage orchestration projects, view workstreams, and monitor agent progress in real time.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify 5, Zod validation |
| Web dashboard | `apps/web` | Next.js 15, React 19 |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared types | `packages/shared` | TypeScript types, enums |
| Database | `packages/db` | PostgreSQL, Drizzle ORM |
| Queue | — | BullMQ / Redis |
| AI | `apps/orchestrator/src/llm/` | LLM provider abstraction |

## Owned Files

You have write access to these paths only:

- `apps/web/src/**` — all frontend application code

Current structure:

```
apps/web/src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout, theme script, header, navigation
│   ├── page.tsx                  # Dashboard — project list with search/filter/sort + activity feed
│   ├── globals.css               # CSS variables, dark mode theming
│   ├── error.tsx                 # Error boundary
│   ├── loading.tsx               # Loading state
│   ├── not-found.tsx             # 404 page
│   ├── projects/
│   │   ├── new/page.tsx          # Create project form
│   │   └── [id]/page.tsx         # Project detail (workstreams, tasks, files)
│   ├── workspaces/
│   │   ├── page.tsx              # Workspace list
│   │   └── [id]/page.tsx         # Workspace detail with projects
│   └── board/
│       └── page.tsx              # Feature board (Kanban-style)
├── components/
│   ├── ActivityFeed.tsx          # Task/workstream activity timeline
│   ├── ArtifactList.tsx          # Project artifact viewer
│   ├── AuditTimeline.tsx         # Audit log timeline view
│   ├── DependencyGraph.tsx       # Dagre-based workstream dependency visualization
│   ├── FileTree.tsx              # File explorer tree view
│   ├── FileViewer.tsx            # File content viewer
│   ├── board/                    # Feature board components
│   └── ui/                       # Reusable UI primitives
│       ├── StatusBadge.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── ThemeToggle.tsx
│       ├── Skeleton.tsx
│       └── ... (13+ components)
├── hooks/                        # React hooks for API calls
├── lib/                          # Utilities, API client
└── types/
```

## Boundaries

### You MUST

- Read contracts from `packages/shared/src/schemas/` to know the exact API shape you are calling
- Read shared types from `packages/shared/src/types/` and use them for all data structures
- Use the Next.js App Router (not Pages Router)
- Build a typed API client in `apps/web/src/lib/` that matches the contracts
- Handle loading, error, and empty states for every data-fetching view
- Make the layout responsive (works on desktop and tablet at minimum)
- Use React Server Components where possible; use `"use client"` only when needed
- Subscribe to SSE events (`GET /api/events`) for real-time progress updates
- Support dark/light theme via CSS variables in `globals.css`

### You MUST NOT

- Modify files outside `apps/web/src/`:
  - `apps/api/*`
  - `apps/orchestrator/*`
  - `packages/shared/src/types/*`
  - `packages/db/*`
  - `contracts/*`
- Implement backend logic or API routes in Next.js (all data comes from the Fastify API)
- Duplicate type definitions that exist in `@orchestration/shared`
- Use `any` types — leverage the shared types for full type safety

## Required Inputs

Before you start, these must exist:

1. **API contracts** — `packages/shared/src/schemas/*.ts` so you know endpoint URLs, methods, and response shapes
2. **Shared types** — `packages/shared/src/types/` for entity types, enums, and common types
3. **Running API** — the backend agent's API must be available (or you must mock it during development)

## Expected Outputs

### 1. Pages (`apps/web/src/app/`)

| Route | Purpose |
|---|---|
| `/` | Dashboard — project list with search/filter/sort + activity feed sidebar |
| `/projects/new` | Create project form (goal, name, mode, LLM provider) |
| `/projects/[id]` | Project detail — workstreams, tasks, files, activity feed |
| `/workspaces` | Workspace list |
| `/workspaces/[id]` | Workspace detail with project listing |
| `/board` | Feature board — Kanban-style feature tracking |

### 2. Components (`apps/web/src/components/`)

- **UI primitives**: StatusBadge, Modal, Toast, ThemeToggle, Skeleton, etc.
- **Visualization**: DependencyGraph (dagre-based workstream DAG), FileTree, FileViewer
- **Activity**: ActivityFeed (task/workstream progress timeline)
- **Board**: Feature board Kanban components

### 3. Real-time Updates

- SSE subscription to `GET /api/events` for live project/workstream/task events
- UI auto-updates on `project.*`, `workstream.*`, `task.*` events without page reload

### 4. API Client (`apps/web/src/lib/`)

- Typed fetch wrapper with methods for every API endpoint
- Handles base URL configuration via `NEXT_PUBLIC_API_URL` environment variable
- Error parsing matching the standard error response shape

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Contracts in `packages/shared/src/schemas/`, types in `packages/shared/src/types/` | Files exist and export types |
| Backend agent | Running API at configured URL | API responds to `GET /health` |

## Key Libraries

- `@xyflow/react` — for DependencyGraph interactive visualization
- `@dagrejs/dagre` — for DAG layout computation

## Done Criteria

- [ ] Dashboard page renders and shows project list with status badges
- [ ] Can create a new project via the form and see it in the list
- [ ] Project detail page shows workstreams, tasks, file tree, and activity feed
- [ ] DependencyGraph visualizes workstream dependencies as interactive DAG
- [ ] Feature board page with Kanban columns
- [ ] Real-time SSE updates reflect in the UI without manual refresh
- [ ] All pages handle loading, error, and empty states
- [ ] Dark/light theme toggle works
- [ ] Layout is responsive (desktop + tablet)
- [ ] API client is fully typed and matches contracts
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No use of `any` type
