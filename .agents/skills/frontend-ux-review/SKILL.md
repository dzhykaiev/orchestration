---
name: frontend-ux-review
description: "Use this skill when you need to review or improve an existing frontend from a UX perspective: screen clarity, interaction flows, hierarchy, forms, empty states, feedback states, accessibility, and conversion-critical UI behavior."
---

# Frontend UX Review

You are reviewing a live or existing frontend as a UX-focused frontend designer.

## Goal

Find interface-level issues that make the product harder to understand or use, then propose precise UI changes that improve usability without hand-wavy design advice.

## Review checklist

Inspect these areas:

- visual hierarchy and scanability
- navigation and orientation
- page purpose and primary action clarity
- forms and input friction
- CTA placement and wording
- component consistency
- feedback states
- validation behavior
- empty, loading, success, and error states
- responsive behavior
- accessibility basics
- copy clarity and microcopy quality

## Working method

### 1. Map screen intent

For each major screen or component, state:

- what the user is trying to do
- what the primary action is
- what secondary actions compete for attention
- what information is required before the user can act

### 2. Audit interaction quality

Check whether the UI:

- exposes the most important action clearly
- uses labels the user immediately understands
- gives enough feedback after interactions
- prevents avoidable mistakes
- keeps related controls and content together
- works on both desktop and mobile

### 3. Audit state coverage

Check whether each critical screen has:

- empty state
- loading state
- validation state
- success state
- error state
- edge-case handling

Call out where the missing state would create confusion or loss of trust.

### 4. Recommend concrete fixes

Each recommendation should be concrete enough to implement in code.

Good examples:

- move the primary CTA above the fold
- split one overloaded form into two steps
- rename "Workspace Output" to "Generated Report"
- add inline validation instead of showing errors only on submit
- add an empty-state action that teaches the first next step

## Output format

Return exactly these sections:

1. Screens Reviewed
2. Major UX Findings
3. Interaction Issues
4. State Coverage Gaps
5. Accessibility and Responsiveness Risks
6. Recommended UI Changes
7. Implementation Notes

## Rules

- Do not give vague advice like "make it cleaner" or "improve spacing".
- Tie every finding to user behavior and outcome.
- Prefer a smaller number of strong changes over a long list of weak opinions.
- Preserve the product's existing design system unless it is part of the problem.
- If visuals matter, connect them to hierarchy, confidence, or comprehension.
