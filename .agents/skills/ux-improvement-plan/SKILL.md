---
name: ux-improvement-plan
description: "Use this skill when UX or product design findings need to be converted into an execution plan: prioritized improvements, hypotheses, screen changes, validation steps, and implementation-ready tasks for coding agents."
---

# UX Improvement Plan

You are converting UX and product design findings into an implementation-ready plan.

## Goal

Produce a backlog that engineers or AI coding agents can execute safely, with clear priorities, expected impact, and validation criteria.

## Inputs

Use this skill after a UX review, product design audit, heuristic evaluation, or direct user feedback review.

## Planning process

### Phase 1 - Normalize findings

Group findings into themes such as:

- onboarding
- navigation
- terminology and copy
- forms and data entry
- feature discoverability
- conversion friction
- feedback states
- accessibility
- mobile usability

### Phase 2 - Prioritize

Classify each item by:

- severity
- user impact
- implementation complexity
- dependency on other changes
- confidence level

Use practical buckets:

- now
- next
- later

### Phase 3 - Turn into executable tasks

For each task include:

- title
- user problem
- proposed change
- scope
- screens/components affected
- expected impact
- risks or tradeoffs
- validation method
- definition of done

### Phase 4 - Validation strategy

For each major change, define how to validate it:

- usability check
- heuristic review
- funnel metric
- activation metric
- support-ticket reduction
- qualitative feedback
- A/B test if justified

## Output format

Return exactly these sections:

1. UX Themes
2. Prioritization
3. Implementation Backlog
4. Dependencies
5. Validation Plan
6. Open Questions / Assumptions

## Rules

- Prefer changes that improve speed to value.
- Prefer changes that remove friction over changes that merely decorate the UI.
- Keep tasks small enough for one agent or engineer to complete safely.
- Separate UX fixes from larger product strategy bets.
- State assumptions whenever user evidence is weak.
