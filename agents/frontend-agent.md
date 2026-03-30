# Frontend Agent Brief

## Mission

Build the Next.js web dashboard for project management and progress tracking. You create the UI that users interact with to manage orchestration projects, view workstreams, and monitor agent progress in real time.

## System Context

This is a TypeScript monorepo managed with pnpm workspaces:

| Component | Path | Tech |
|---|---|---|
| API server | `apps/api` | Fastify |
| Web dashboard | `apps/web` | Next.js |
| Orchestrator service | `apps/orchestrator` | BullMQ workers |
| Shared package | `packages/shared` | TypeScript types, utilities |
| Database | — | PostgreSQL |
| Queue | — | BullMQ / Redis |
| AI | — | Anthropic Claude API |

## Owned Files

You have write access to these paths only:

- `apps/web/src/**` — all frontend application code

Typical structure you should create/maintain:

```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx            # Dashboard / project list
│   ├── projects/
│   │   ├── page.tsx        # Project list
│   │   ├── new/page.tsx    # Create project form
│   │   └── [id]/
│   │       ├── page.tsx    # Project detail
│   │       └── workstreams/
│   │           └── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                 # Reusable primitives (Button, Card, Input, etc.)
│   ├── projects/           # Project-specific components
│   ├── workstreams/        # Workstream visualization components
│   └── layout/             # Shell, Sidebar, Header
├── hooks/
│   ├── use-projects.ts
│   ├── use-workstreams.ts
│   └── use-realtime.ts     # SSE/WebSocket hook for live updates
├── lib/
│   ├── api-client.ts       # Typed fetch wrapper for the API
│   └── utils.ts
└── types/
    └── index.ts            # Re-exports from @orchestration/shared (if needed)
```

## Boundaries

### You MUST

- Read contracts from `contracts/api/` to know the exact API shape you are calling
- Read shared types from `packages/shared/src/types/` and use them for all data structures
- Use the Next.js App Router (not Pages Router)
- Build a typed API client in `apps/web/src/lib/api-client.ts` that matches the contracts
- Handle loading, error, and empty states for every data-fetching view
- Make the layout responsive (works on desktop and tablet at minimum)
- Use React Server Components where possible; use `"use client"` only when needed

### You MUST NOT

- Modify files outside `apps/web/src/`:
  - `apps/api/*`
  - `apps/orchestrator/*`
  - `packages/shared/src/types/*`
  - `contracts/*`
- Implement backend logic or API routes in Next.js (all data comes from the Fastify API)
- Duplicate type definitions that exist in `@orchestration/shared`
- Use `any` types — leverage the shared types for full type safety

## Required Inputs

Before you start, these must exist:

1. **API contracts** — `contracts/api/*.ts` so you know endpoint URLs, methods, and response shapes
2. **Shared types** — `packages/shared/src/types/` for entity types, enums, and common types
3. **Running API** — the backend agent's API must be available (or you must mock it during development)

## Expected Outputs

### 1. Pages (`apps/web/src/app/`)

| Route | Purpose |
|---|---|
| `/` | Dashboard — overview of all projects with status summary |
| `/projects` | Project list with search/filter |
| `/projects/new` | Create project form |
| `/projects/[id]` | Project detail — shows workstreams, progress, agent status |
| `/projects/[id]/workstreams` | Detailed workstream view with dependency graph |

### 2. Components (`apps/web/src/components/`)

- **UI primitives**: Button, Card, Input, Badge, Skeleton, Modal, Toast
- **Project components**: ProjectCard, ProjectForm, ProjectStatusBadge
- **Workstream components**: WorkstreamList, WorkstreamCard, ProgressBar, DependencyGraph
- **Layout components**: AppShell, Sidebar, Header, BreadcrumbNav

### 3. Data Hooks (`apps/web/src/hooks/`)

- `use-projects.ts` — fetch, create, update, delete projects
- `use-workstreams.ts` — fetch workstreams for a project
- `use-realtime.ts` — subscribe to SSE/WebSocket for live progress updates

### 4. API Client (`apps/web/src/lib/api-client.ts`)

- Typed fetch wrapper with methods for every API endpoint
- Handles base URL configuration via environment variable (`NEXT_PUBLIC_API_URL`)
- Includes error parsing that matches the standard error response shape
- Returns typed responses matching the contracts

## Dependencies

| Agent | What you need from them | Status check |
|---|---|---|
| Architect | Contracts in `contracts/api/`, types in `packages/shared/src/types/` | Files exist and export types |
| Backend agent | Running API at configured URL | API responds to `GET /health` |

## Forbidden Changes

- `apps/api/*` — backend agent's territory
- `apps/orchestrator/*` — orchestrator agent's territory
- `packages/shared/src/types/*` — architect's territory
- `contracts/*` — architect's territory

## Done Criteria

- [ ] Dashboard page renders and shows project list
- [ ] Can create a new project via the form and see it in the list
- [ ] Project detail page shows workstreams with progress indicators
- [ ] Real-time updates reflect in the UI without manual refresh
- [ ] All pages handle loading, error, and empty states
- [ ] Layout is responsive (desktop + tablet)
- [ ] API client is fully typed and matches contracts
- [ ] No TypeScript errors (`pnpm tsc --noEmit` in `apps/web`)
- [ ] No use of `any` type
