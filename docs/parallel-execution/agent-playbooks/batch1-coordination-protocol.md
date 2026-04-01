# Batch 1 Coordination Protocol

This protocol defines how B1/C1/D1 collaborate without cross-stream merge thrash.

## Core Rules

1. Respect path ownership from `docs/ownership/module-owners.md`.
2. Do not modify foreign-owned files to "help" another stream.
3. If contract changes are needed, update docs first (or in same PR) and flag consumers.
4. Keep PR scope narrow: one domain change per PR.

## Required PR Sections

Each PR description must include:
1. **Owned paths touched**
2. **Contracts touched** (`events`, `queues`, `state transitions`, or `none`)
3. **Behavior change summary** (`none` allowed)
4. **Validation commands + result**
5. **Downstream actions for other streams**

## Stream Interactions

- D1 -> B1/C1:
  - If helper signatures in `packages/shared` change, D1 posts migration note.
- B1 -> C1:
  - No direct dependency expected.
- C1 -> B1:
  - No direct dependency expected.

Assumption: queues remain `planning`, `implementation`, `validation` with stable names.

## Conflict Avoidance

1. Rebase frequently onto latest mainline before requesting review.
2. Avoid shared utility refactors during feature-scoped PRs.
3. For accidental overlap, carve overlap into a tiny prep PR, merge it first, then rebase streams.

## Integration Order

1. Merge D1 first if shared helper API changed.
2. Merge B1 and C1 when each passes its own gates.
3. Run post-merge smoke validation once all three are merged.

## Done Criteria (Batch-Level)

1. All stream PRs merged with passing checks.
2. No unresolved blocker notes in PR descriptions.
3. Contract docs reflect final behavior.
4. Cross-stream smoke scenario passes end-to-end.

