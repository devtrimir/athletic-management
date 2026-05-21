# Task Lifecycle

Strict per-task protocol. Every task in [TASKS.md](TASKS.md) follows these gates **in order**. No skipping, no batching, no starting the next task before approval.

The goals:
- **Traceability** — every change has a "what" and "why" stored next to the code.
- **Reviewability** — one task = one branch = one PR = one journal file.
- **Token efficiency** — Copilot only loads the *current* task's journal, not the whole repo history. Old journals stay on disk for humans + audits but are not auto-read.

---

## Files involved per task

| File | Created when | Purpose |
|---|---|---|
| `docs/phases/journal/P<phase>-T<task>.md` | task starts | Plan → progress → summary → revisions → approval log |
| Git branch `<type>/p<phase>-t<task>-<slug>` | task starts | All commits live here |
| GitHub PR | after approval gate | Code review + merge |

The journal template is at [phases/journal/_TEMPLATE.md](phases/journal/_TEMPLATE.md). Copy it on every new task.

---

## Gates (in order)

### Gate 1 — Plan
1. Copilot opens [TASKS.md](TASKS.md), finds the lowest unchecked task in the active phase, and **states the task ID** to the user.
2. Copilot reads the matching phase file (`docs/phases/P0N-*.md`) for the task's detailed notes.
3. **Boost MCP research (mandatory — before writing the plan).** For every task, query the `laravel-boost` MCP server for version-pinned guidance. The goal is zero stale or out-of-version advice. At minimum:
   - `search-docs` with topic-based queries covering every package the task touches (e.g. `["migrations", "foreign keys", "indexes"]`, `["form request validation"]`, `["inertia useForm", "inertia v3 deferred props"]`, `["pest browser", "pest dataset"]`, `["tailwind v4 theme"]`). Pass a `packages` array when known.
   - `database-schema` before any migration or model change.
   - `database-query` (read-only) before any query/index decision that depends on existing data shape.
   - `get-absolute-url` whenever a URL is needed.
   - `tinker` only when behavior isn't easily covered by a test.
   - Skills auto-activate by description (`pest-testing`, `inertia-react-development`, `laravel-best-practices`, `tailwindcss-development`, `wayfinder-development`, `fortify-development`) — read the relevant SKILL.md before planning.
4. Record the Boost queries used + key findings in the journal's **Boost research** section (see template). If a finding contradicts an existing doc (TASKS.md, phase file, ADR, PHASED_REQUIREMENTS.md, copilot-instructions.md, AGENTS.md, or a SKILL.md), **flag it in the plan and propose the doc update in the same task** — never silently follow newer guidance while old docs lie.
5. Copilot creates `docs/phases/journal/P<phase>-T<task>.md` from the template and fills the **Plan** section:
   - Scope (1–3 sentences)
   - Files to touch
   - Migrations / new endpoints / new pages
   - Risk + mitigation
   - Test plan
   - Boost research log + any doc-drift to fix
6. **STOP and present the plan to the user.** Do not write code yet. Wait for "go" / "approved" / "proceed".

### Gate 2 — Branch + Implement
After user approves the plan:
1. Create branch: `git checkout -b <type>/p<phase>-t<task>-<slug>` (the user runs this; Copilot suggests the exact command).
2. Implement following [WORKFLOW.md](WORKFLOW.md) conventions and the relevant skills (auto-activate by description — Pest, Inertia-React, Laravel best-practices, Tailwind, Wayfinder, Fortify).
3. **Latest conventions only:**
   - PHP 8.4 constructor property promotion, readonly, enums, match, `declare(strict_types=1)`.
   - Laravel 13 idioms — Form Requests, Policies, invokable Actions, queued jobs via Horizon, attribute casts on models, `Schema::table` with `change()`.
   - Inertia 3 — `useForm`, `useHttp`, deferred props where useful, layout props via `setLayoutProps`.
   - React 19 + TS strict — no `any`, no `React.FC`, server components NOT applicable (Inertia is SPA). React compiler is on; do not memoize manually unless profiler proves a hotspot.
   - Tailwind v4 — `@theme` tokens, no `tailwind.config.js`.
   - ESLint 9 flat config + Prettier — run on save.
4. Conventional Commits per logical change, **every commit footer:** `Refs: P<phase>-T<task>`.
5. Run [Definition of Done §6 in WORKFLOW.md](WORKFLOW.md) checklist locally.
6. After editing PHP files: `vendor/bin/pint --dirty --format agent`.

### Gate 3 — Summary
1. Update the journal's **Summary** section:
   - What changed (bullet list of files + what each does)
   - **Why** each non-obvious decision was made
   - Tests added
   - Anything deferred / follow-ups
   - DoD checklist with boxes ticked
2. Commit the journal in the same branch (`docs: journal P<phase>-T<task> summary`).
3. **STOP and present the summary to the user.** Do not open a PR yet.

### Gate 4 — Revisions (loop until approved)
If the user asks for changes:
1. Make the changes on the same branch.
2. Append a new entry to the journal's **Revisions** section:
   ```
   ## Revision N — YYYY-MM-DD
   **Requested by user:** <quote / paraphrase>
   **What changed:** <files + what>
   **Why:** <rationale>
   ```
3. Re-run DoD locally.
4. Present the updated summary. Repeat until the user approves.

### Gate 5 — Approval + PR
Only after the user explicitly says "approved" / "ship it" / "create PR":
1. Tick the task box in [TASKS.md](TASKS.md) and in the phase file (`docs/phases/P0N-*.md`) — same commit, message: `chore: mark P<phase>-T<task> done`.
2. Append an **Approved** entry to the journal:
   ```
   ## Approved — YYYY-MM-DD by <user>
   ```
3. Push the branch.
4. Open a PR with title = squash-commit subject (Conventional Commits) and body = the journal's **Summary** + DoD checklist (copy-pasted) + link to the journal file.
5. Wait for CI green + 1 review (per [WORKFLOW.md §3](WORKFLOW.md)).
6. Squash-merge. Delete the branch.

### Gate 6 — Next task
Only after PR is merged:
1. Copilot reads [TASKS.md](TASKS.md) again, finds the next unchecked task, and **goes back to Gate 1**.
2. **Never start the next task without explicit "next" from the user** — the user may want to take a break, reprioritize, or batch reviews.

---

## What Copilot loads per task (token budget)

Auto-loaded every conversation (small, ~few KB):
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [AGENTS.md](../AGENTS.md)

Loaded on demand for the current task only:
- The current task's journal file
- The matching phase file
- The specific source files being edited

**Not loaded** unless explicitly relevant:
- Other tasks' journals (they're history; only re-read if a related task references them)
- The full `analysis/` corpus (only `PHASED_REQUIREMENTS.md` + the section in scope)
- ADRs (only the ones the current task touches)

This is why the journal is **per-task, not cumulative**: it bounds the context window even after 100+ tasks shipped.

---

## Anti-patterns (don't do these)

- Starting a new task in the same branch as a previous one.
- Opening a PR before Gate 3 summary + user approval.
- Editing a journal entry retroactively to hide a revision — **append, never rewrite**.
- Marking the task box ticked before approval.
- Writing code in the chat instead of the actual files (always apply via tools).
- Skipping Pint / lint / tests because "it's a small change".
- Loading old journals "for context" — they're for humans / audit. Use the phase file + current journal.
