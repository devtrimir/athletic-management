# P<phase>-T<task> — <Short Title>

> Copy this file to `docs/phases/journal/P<phase>-T<task>.md` at the start of every task.
> Follow [docs/TASK_LIFECYCLE.md](../../TASK_LIFECYCLE.md). Append-only: never delete old sections, never rewrite history.

- **Task ID:** P<phase>-T<task>
- **Phase file:** [`docs/phases/P0N-*.md`](../P0N-*.md)
- **Branch:** `<type>/p<phase>-t<task>-<slug>`
- **Started:** YYYY-MM-DD
- **Status:** planning | implementing | summary | awaiting-approval | revising | approved | merged

---

## Plan (Gate 1)

### Scope
<1–3 sentences. Quote the task line from TASKS.md.>

### Boost MCP research (mandatory)
Queries run via the `laravel-boost` MCP server before planning. Record query → 1-line finding. Flag anything that contradicts existing docs.

- `search-docs` packages=[…] queries=[…] → <finding>
- `database-schema` table=`…` → <finding>
- `database-query` `…` → <finding>
- `get-absolute-url` → <url if needed>
- Skills consulted: <list of SKILL.md files read>

**Doc drift found:** <None | list with file + line + what needs to change. Fold the fix into this task or open a new task ID.>

### Files to touch
- `path/to/file.php` — what changes
- `path/to/file.tsx` — what changes

### Schema / endpoints / pages
- Migration: `database/migrations/YYYY_MM_DD_HHMMSS_<name>.php` — what it does
- Endpoint: `<METHOD> <path>` — purpose
- Page: `resources/js/Pages/<Path>.tsx` — purpose

### Risk + mitigation
- **Risk:** <e.g., breaks existing search contract>
  **Mitigation:** <e.g., contract test against golden fixture>

### Test plan
- Pest Feature: <list scenarios>
- Pest Unit: <list scenarios>
- Pest Browser: <list scenarios if user-facing>
- Vitest: <if non-trivial React>

> **WAIT for user approval before starting Gate 2.**

---

## Summary (Gate 3) — fill after implementation

### What changed
- `path/to/file.php` — <what + why if non-obvious>
- ...

### Decisions
- **<Decision>:** <why this option, what was rejected>
- ...

### Tests added
- `tests/Feature/<X>Test.php` — covers <scenario>
- ...

### Deferred / follow-ups
- <None | bullet list with task IDs if new tasks were created>

### Definition of Done
- [ ] Code compiles / type-checks
- [ ] `php artisan migrate:fresh --seed` clean on a **scratch database** (never against the dev/live DB — `createdb <scratch>`, run with `DB_DATABASE=<scratch>`, then drop it)
- [ ] `php artisan migrate:rollback` clean on new migrations — also verified on the scratch database, never by rolling back the dev/live DB
- [ ] Feature test per new endpoint
- [ ] Unit test per new Service/Action
- [ ] Vitest test per non-trivial component
- [ ] Pest Browser happy-path (if user-facing)
- [ ] `php artisan test` passes
- [ ] `vendor/bin/pint --test` passes
- [ ] `vendor/bin/phpstan analyse` passes
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] Authorization gate / Policy added or updated
- [ ] Audit log fires (if applicable)
- [ ] No new hard-coded user-facing strings (from P9 onward)
- [ ] Translation audit done: every key touched by the task exists and is translated for the active locale(s) — no raw keys shown in the UI
- [ ] Phase file route/page table updated
- [ ] ADR filed if non-obvious decision made
- [ ] Screenshots attached (UI changes)

> **WAIT for user approval before opening PR.**

---

## Revisions (Gate 4) — append one block per round of feedback

<!--
## Revision 1 — YYYY-MM-DD
**Requested by user:** "<exact request or paraphrase>"
**What changed:** <files + what>
**Why:** <rationale>
**Tests updated:** <yes/no, what>
-->

---

## Approval (Gate 5)

<!--
## Approved — YYYY-MM-DD by <user-handle>
**PR:** #<number> — <link>
**Squash commit:** `<type>(<scope>): <subject>`
**Merged:** YYYY-MM-DD
-->
