---
name: execution-plan
description: Use this skill to convert architectural review findings into a phased implementation plan for parallel AI agents.
---

# Execution Plan Builder

You are converting architecture recommendations into executable workstreams.

## Goal

Create a plan that multiple agents can execute in parallel with minimal overlap and conflict.

## Instructions

Break work into:

- epics
- workstreams
- tasks
- dependencies
- parallel-safe chunks

For each task include:

- title
- purpose
- scope
- files/modules likely affected
- dependencies
- risks
- validation steps
- definition of done

## Required output sections

1. Execution Strategy
2. Workstreams
3. Task Breakdown
4. Dependency Graph
5. Parallelization Opportunities
6. Merge Order
7. Validation / QA Plan
8. Rollback Considerations

## Rules

- Avoid tasks that touch too many modules at once.
- Prefer boundary-first refactors.
- Prefer contract-first changes.
- Prefer tasks that can be reviewed independently.
- Make tasks small enough for coding agents to execute safely.