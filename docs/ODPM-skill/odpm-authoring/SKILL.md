---
name: odpm-authoring
description: Write, rewrite, or audit ODPM upstream documents with strict stage sequencing, writing TodoLists, user Check gates, and backflow rules. Use when Codex needs to create or review Orient, Design, or Plan documents, determine whether execution should flow back to upstream ODPM stages, or freeze scope, structure, tasks, gates, and completion criteria before M-phase execution.
---

# ODPM Authoring

Use this skill for `Orient`, `Design`, and `Plan` only.  
When the task is already in approved `M`-phase execution, use `$odpm-execution` instead.

## Quick Start

1. Confirm whether the request truly needs a new or revised `Orient`, `Design`, or `Plan`.
2. Read the full project context before drafting: task source, existing ODPM docs, related specs, contracts, process records, and relevant code.
3. Build a stage-specific writing TodoList before writing any正文.
4. Draft only the current stage and keep its responsibility boundary strict.
5. Run a regression check against upstream inputs before presenting the draft.
6. Prepare an explicit user Check summary before moving to the next stage.
7. Flow back upstream if assumptions break instead of forcing the next stage.

## Stage Order

Follow the sequence below without skipping:

1. `Orient`: clarify goals, constraints, completion criteria, scope, non-goals, and freeze points.
2. `Design`: translate approved `Orient` into an executable structure, interfaces, state model, phased route, and gates.
3. `Plan`: decompose approved `Design` into execution-ready `Phase -> Module -> Task` items with validation and write-back criteria.

Do not enter a later stage until the current stage has passed user Check.

## Hard Rules

- Read complete upstream inputs before drafting; do not rely on partial keyword search.
- Generate a writing TodoList for every `Orient`, `Design`, and `Plan` pass.
- Write explicit scope boundaries, non-goals, upstream basis, and adoption priority near the front of the document.
- Keep stage responsibilities clean:
  `Orient` does not replace implementation design.
  `Design` does not degrade into a task checklist.
  `Plan` does not reopen strategy debates.
- Write concrete freeze points, gates, completion definitions, and traceability.
- Perform explicit regression checks after drafting; do not write “checked” without coverage details.
- When large files must be edited in VS Code-like environments, write them in smaller patches to reduce editor corruption risk.

## Stage Expectations

### Orient

- Freeze the goal, constraints, success criteria, scope, and non-goals.
- State what later `Design` may elaborate and what it may not overturn.
- Require user confirmation on goal understanding, constraints, non-goals, and freeze points.

### Design

- Start only after approved `Orient`.
- Turn frozen intent into a realistic engineering route for the current project.
- Define structure, boundaries, interfaces, state, external dependencies, phased rollout, and acceptance gates.
- Research time-sensitive libraries, SDKs, protocols, or standards before relying on them.

### Plan

- Start only after approved `Design`.
- Decompose the route into execution-ready tasks with clear ownership, prerequisites, artifacts, completion markers, and validation methods.
- Reject vague lines such as “整理一下”, “优化一下”, or “处理兼容性”.
- Ensure every important `Orient` and `Design` constraint lands somewhere in the plan.

## User Check Requirements

Pause for user Check after each stage:

- After `Orient`: confirm goals, constraints, non-goals, and freeze points.
- After `Design`: confirm route, phase/module split, unacceptable directions, and readiness to enter `Plan`.
- After `Plan`: confirm phase coverage, task granularity, constraint traceability, and strictness of completion and validation rules.

## Reference

Read [references/authoring-spec.md](references/authoring-spec.md) when you need the full ODPM authoring standard, including:

- detailed section structures for `Orient`, `Design`, and `Plan`
- mandatory TodoList minima
- quality gates and regression checklists
- allowed vs disallowed task phrasing
- handoff conditions from `Plan` to `M`

Treat that reference as the detailed policy source for this skill.
