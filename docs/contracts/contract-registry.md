# Contract Registry

Single index of contract sources of truth and operational docs.

## Canonical Code Contracts

1. API DTO and domain types
- `packages/shared/src/types/*`
- `packages/shared/src/schemas/*`

2. Event contracts
- Code: `packages/shared/src/types/events.ts`
- Runtime transport: `apps/orchestrator/src/events/emitter.ts`, `apps/api/src/routes/events.ts`
- Operational doc: `docs/contracts/events.md`

3. Queue contracts
- Code payload interfaces:
  - `apps/orchestrator/src/application/planning/ports.ts`
  - `apps/orchestrator/src/application/implementation/ports.ts`
  - `apps/orchestrator/src/application/validation/ports.ts`
- Runtime wiring: `apps/orchestrator/src/application/runtime/create-orchestrator-runtime.ts`
- Operational doc: `docs/contracts/queues.md`

4. State machines
- `packages/shared/src/state-machine.ts`

5. Database contracts
- `packages/db/src/schema.ts`
- `packages/db/drizzle/*`

## Governance

- Contract-first rule: update canonical contract files before adapting adapters/use-cases.
- Any breaking contract change requires:
  1. migration note,
  2. compatibility plan,
  3. tests updated in same PR.

## Ownership

- Primary owner: Architecture/Contracts stream (Agent A)
- Secondary owners: API, Orchestrator, Shared/State owners for their boundaries

See:
- `docs/ownership/module-owners.md`
- `.github/CODEOWNERS`
