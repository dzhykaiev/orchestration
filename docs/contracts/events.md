# Event Contract

## Scope

Source of truth for event shape is TypeScript union:
- `packages/shared/src/types/events.ts`

This document is an operational contract index for agents and reviewers.

## Transport

- Redis pub/sub channel: `orchestration:events`
- Publisher: `apps/orchestrator/src/events/emitter.ts`
- Consumer for UI streaming: `apps/api/src/routes/events.ts` (SSE endpoint)

## Event Envelope (Current)

Current runtime envelope is unversioned:

```ts
{ type: string; payload: Record<string, unknown> }
```

Assumption: existing consumers rely only on `type` and `payload` fields.

## Event Types (Current)

- Workspace: `workspace.created`, `workspace.updated`, `workspace.deleted`
- Project: `project.created`, `project.planning_started`, `project.planning_completed`, `project.failed`
- Workstream: `workstream.started`, `workstream.completed`, `workstream.failed`
- Task: `task.queued`, `task.started`, `task.completed`, `task.failed`, `task.delegated`, `task.subtree_completed`
- Escalation: `escalation.created`, `escalation.resolved`, `escalation.dismissed`
- Review: `review.created`, `review.rework_requested`

## Payload Contract Notes

- Typed payload definitions are in `packages/shared/src/types/events.ts`.
- API SSE route currently filters by `projectId` when present in payload.
- Not all event payloads include `projectId` (`task.started`, `task.failed`, etc.).

## Versioning Policy (Target, Incremental)

Before broad refactors, introduce backward-compatible envelope:

```ts
{ type: string; version: 1; payload: Record<string, unknown>; meta?: { correlationId?: string } }
```

Rules:
1. Add-only payload changes in same version.
2. Breaking payload change requires `version` bump and consumer compatibility window.
3. Every new UI-critical event should include `projectId`.

## Change Checklist

1. Update `packages/shared/src/types/events.ts`.
2. Update this doc.
3. Validate emitter usage in orchestrator dependencies/use-cases.
4. Validate SSE consumer behavior in API.
5. Add/update tests for any new event type.
