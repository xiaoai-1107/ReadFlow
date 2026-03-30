---
name: odpm-execution
description: Execute approved ODPM M-phase tasks with strict task selection, execution packages, execution TodoLists, validation evidence, write-back discipline, and upstream backflow rules. Use when Codex needs to implement a task from an approved Orient/Design/Plan set, decide whether a task is blocked, determine whether execution must return to upstream ODPM stages, or mark task completion under ODPM process control.
---

# ODPM Execution

Use this skill only for approved `M`-phase execution.  
If `Orient`, `Design`, or `Plan` is missing, weak, or unapproved, stop and switch back to `$odpm-authoring`.

## Preconditions

Enter `M` only when all of the following are true:

1. A formal `Orient` exists.
2. A formal `Design` exists.
3. A formal `Plan` exists.
4. Those upstream documents have passed user Check.
5. Project supplements, contracts, and domain-specific rules can be located.

If any prerequisite fails, do not force execution. Flow back upstream explicitly.

## Standard Execution Loop

Repeat this loop one task at a time:

1. Select one explicit `Task`.
2. Read the surrounding `Phase` and `Module` context.
3. Re-check relevant `Orient`, `Design`, contracts, specs, and process records.
4. Build an execution package for the task.
5. Build an execution TodoList before changing code or documents.
6. Implement only the allowed task scope.
7. Validate against the `Plan` completion criteria.
8. Write back outcomes, evidence, risks, blockers, and affected artifacts.
9. Mark the task complete only if artifact, validation, and write-back are all done.

## Hard Rules

- Do not execute directly from a task title or task ID alone.
- Do not batch unrelated tasks into one fuzzy change.
- Do not skip execution TodoLists.
- Do not replace `Plan` requirements with a “minimum runnable” interpretation.
- Do not check off work without validation evidence.
- Do not leave write-back for later.
- Do not silently redefine scope when the plan is weak; flow back instead.

## Execution Package

Prepare an execution package before implementation. It should include:

1. current task ID
2. current `Phase / Module`
3. module goal and pass criteria
4. relevant `Orient` freeze points
5. relevant `Design` route or section
6. referenced specs, contracts, and process records
7. prerequisites and dependencies
8. affected files, scripts, tests, and documents
9. completion marker
10. validation method
11. write-back destination

## Execution TodoList

Every task-level execution TodoList should cover at least:

1. reading basis
2. impact scan
3. implementation steps
4. validation steps
5. write-back steps
6. closeout rule for `done` vs `BLOCKED`

Keep the TodoList task-specific. Do not add vague lines like “顺手优化” or “有空再补文档”.

## Validation and Checkoff

Treat a task as complete only when:

1. the required artifact exists
2. validation evidence exists and matches the `Plan`
3. required write-back is complete
4. no obvious gap remains that would break module pass criteria

Acceptable validation evidence can include command output, test results, manual verification notes, structure checks, or document updates, as long as it matches the plan.

## Backflow Rules

Flow back instead of forcing execution when:

- the task conflicts with `Orient`
- the path cannot be derived cleanly from `Design`
- the `Plan` task is too coarse to execute safely
- upstream assumptions no longer match reality
- continuing would cause structural rework

Record what failed, which upstream source conflicts, and whether the issue belongs to `Orient`, `Design`, or `Plan`.

## Reference

Read [references/execution-rules.md](references/execution-rules.md) when you need the full ODPM `M`-phase standard, including:

- required reading order before execution
- single-task loop discipline
- execution package structure
- execution TodoList minima
- validation, write-back, and checkoff rules
- backflow and batch-execution constraints

Treat that reference as the detailed policy source for this skill.
