# Queue Contract

## Scope

Queue names, producers, consumers, and payload contracts used by API and orchestrator.

## Queues (Current)

1. `planning`
- Producers:
  - `apps/api/src/application/projects/project-use-cases.ts` (`plan`)
  - `apps/api/src/application/features/feature-use-cases.ts` (`plan`)
- Consumer:
  - `apps/orchestrator/src/workers/planning.ts`
- Payload type source:
  - `apps/orchestrator/src/application/planning/ports.ts` -> `PlanningJobData`

2. `implementation`
- Producers:
  - `apps/api/src/application/tasks/agent-use-cases.ts` (`implement`)
  - `apps/orchestrator/src/application/planning/planning-use-cases.ts`
  - `apps/orchestrator/src/application/progress/progress-use-cases.ts`
  - `apps/orchestrator/src/application/delegation/delegation-use-cases.ts`
  - `apps/orchestrator/src/application/escalation/escalation-use-cases.ts`
  - `apps/orchestrator/src/application/recovery/recovery-use-cases.ts`
- Consumer:
  - `apps/orchestrator/src/workers/implementation.ts`
- Payload type source:
  - `apps/orchestrator/src/application/implementation/ports.ts` -> `ImplementationJobData`

3. `validation`
- Producers:
  - `apps/orchestrator/src/application/progress/progress-use-cases.ts` (`validate`)
- Consumer:
  - `apps/orchestrator/src/workers/validation.ts`
- Payload type source:
  - `apps/orchestrator/src/application/validation/ports.ts` -> `ValidationJobData`

## Runtime Defaults

Configured in `apps/orchestrator/src/application/runtime/create-orchestrator-runtime.ts`:
- `planning`: attempts=3, exponential backoff 5s, concurrency=1
- `implementation`: attempts=1, concurrency=3
- `validation`: attempts=3, exponential backoff 5s, concurrency=2
- completed/failed jobs retained by age (24h)

## Contract Risks

- Job `name` values (`plan`, `implement`, `validate`) are string literals and not centralized.
- Payload typing is strong in orchestrator ports, but producer sites can still pass loose records.
- Retry semantics are split between BullMQ options and DB task attempts.

## Incremental Hardening

1. Centralize queue constants and job names in `packages/shared`.
2. Export payload schemas (Zod) in `packages/shared/src/schemas` and validate at producer boundaries.
3. Add compatibility policy for queue payload evolution.

## Change Checklist

1. Update producer + consumer for the queue.
2. Update this file.
3. Update contract registry (`docs/contracts/contract-registry.md`).
4. Add/adjust tests around payload parsing and worker handler behavior.
