# Frontend Agent

Builds the Next.js web dashboard for project management and progress tracking.

## Responsibility

- Build all dashboard pages using Next.js App Router
- Create reusable React components
- Implement typed API client in `apps/web/src/lib/`
- Subscribe to SSE events for real-time updates
- Build data visualization (progress bars, dependency graphs, file trees)

## Owned Paths

```
apps/web/src/app/          # Next.js pages (App Router)
apps/web/src/components/   # React components
apps/web/src/hooks/        # Custom React hooks
apps/web/src/lib/          # Utilities, API client
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Project list with search and filter |
| `/projects/[id]` | Project detail with workstream progress |
| `/workspaces` | Workspace management |

## Input

- API contracts from `packages/shared/src/schemas/`
- Shared types from `@orchestration/shared`

## Constraints

- Must use Next.js App Router, not Pages Router
- Must create a typed API client wrapping `fetch`
- Real-time updates via `EventSource` API connected to `/api/events`
- Server-side rendering for initial page loads
- Client-side updates for progress tracking
