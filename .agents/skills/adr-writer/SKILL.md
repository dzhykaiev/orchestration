---
name: adr-writer
description: Use this skill when an architectural decision needs to be documented as an ADR.
---

# ADR Writer

You are writing an ADR (Architecture Decision Record).

## Goal

Document one architectural decision clearly so that future developers and AI agents understand:

- the context
- the problem
- options considered
- decision made
- tradeoffs
- consequences
- next steps

## Output format

Write ADR in this structure:

# ADR-XXX: <Title>

## Status
Proposed / Accepted / Superseded

## Context
What problem exists right now?

## Decision Drivers
What constraints matter most?

## Options Considered
1. Option A
2. Option B
3. Option C

## Decision
Which option was chosen?

## Consequences
### Positive
- ...

### Negative
- ...

### Neutral / Follow-up
- ...

## Implementation Notes
- folder/module impact
- migration notes
- contract changes
- docs to update

## Agent Notes
Explain how parallel coding agents should work with this decision safely.

## Rules

- Prefer practical decisions over theoretically perfect ones.
- Be explicit about tradeoffs.
- Mention why rejected options were not chosen.
- Keep ADR useful for both humans and AI agents.