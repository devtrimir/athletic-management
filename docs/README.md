# Project Docs — Sports Member Management System

This folder is the source of truth for **how we build**. Domain / data analysis lives in [`/analysis/report`](../analysis/report/).

## Map

| Doc | Purpose |
|---|---|
| [TASK_LIFECYCLE.md](TASK_LIFECYCLE.md) | The 6-gate per-task protocol (Plan → Implement → Summary → Revise → Approval+PR → Next). **Read this before starting any task.** |
| [WORKFLOW.md](WORKFLOW.md) | Branching, commits, PRs, CI, code review, release, Definition of Done. The senior-dev process every contributor (human or AI) must follow. |
| [TASKS.md](TASKS.md) | Master backlog. Every phase from `PHASED_REQUIREMENTS.md` decomposed into atomic, reviewable tasks with IDs. |
| [phases/](phases/) | One file per phase (`PNN-<slug>.md`) with the per-task plan, acceptance, and a checklist the agent ticks off as it works. |
| [phases/journal/](phases/journal/) | One file per task: plan + summary + revisions + approval. Append-only history. |
| [adr/](adr/) | Architecture Decision Records. One file per non-obvious choice. Append-only. |
| [STACK.md](STACK.md) | Pinned package versions and upgrade notes. Single place to check "what version are we on". |

## How a contributor uses these docs

1. Pick the **next unchecked task** from [TASKS.md](TASKS.md) (or the per-phase file).
2. Open [TASK_LIFECYCLE.md](TASK_LIFECYCLE.md) and follow the 6 gates in order.
3. Re-read the relevant phase file under [phases/](phases/) and Global Conventions in [`PHASED_REQUIREMENTS.md`](../analysis/report/PHASED_REQUIREMENTS.md).
4. Copy [phases/journal/_TEMPLATE.md](phases/journal/_TEMPLATE.md) to `phases/journal/P<phase>-T<task>.md` and fill the **Plan** section.
5. Get plan approval → branch → implement following [WORKFLOW.md](WORKFLOW.md) → write summary → get approval → open PR → merge.
6. Tick the box in the phase file and in TASKS.md when the PR merges (same commit).
7. File an ADR for any non-obvious decision.

## How an AI coding agent uses these docs

Same as above, plus:

- **Never start a new task without explicit user `"next"`.** Approval gate at every transition.
- **Load only the current task's journal**, never the whole `journal/` folder — that's how we keep token usage bounded.
- If a task feels too big (> ~400 LOC diff, > 2 migrations, or touches > 6 files), **stop and split it** into sub-tasks in the phase file before coding.
- Always run the full Definition of Done checklist before declaring a task done.
