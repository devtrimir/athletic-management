# Copilot Instructions — Sports Member Management System

> Auto-loaded on every Copilot conversation in this repo. Read once, follow always.
> This file complements [`AGENTS.md`](../AGENTS.md) (Laravel Boost guidelines) — do not duplicate that content here.

## What this project is

A Laravel 13 + Inertia 3 + React 19 monolith that replaces legacy Hindi/Krutidev Excel workbooks used by the UP Police Sports Unit to manage athletes, coaches, teams, tournaments, and medals.

Domain context, ERD, and Hindi terminology live under [`analysis/report/`](../analysis/report/) — **read [`MIGRATION_ANALYSIS.md`](../analysis/report/MIGRATION_ANALYSIS.md) and [`PHASED_REQUIREMENTS.md`](../analysis/report/PHASED_REQUIREMENTS.md) before answering any domain question.**

## Stack at a glance

PHP 8.4 · Laravel 13 · Inertia 3 · React 19 (TS strict, React Compiler) · Vite 7 · Tailwind v4 (CSS-first `@theme`) · shadcn/ui · MySQL 8.4 (utf8mb4, FULLTEXT + ngram parser) · Redis 8 + Horizon 5 · Meilisearch v1.13 (P8+) · Pest 3 · ESLint 9 flat config · Pint.

Pinned versions: [`docs/STACK.md`](../docs/STACK.md). Do **not** introduce a new dependency without updating that file and filing an ADR for majors.

## Where to look for context (in this order)

1. [`docs/README.md`](../docs/README.md) — docs index
2. [`docs/TASK_LIFECYCLE.md`](../docs/TASK_LIFECYCLE.md) — **per-task protocol; follow it on every task without exception**
3. [`docs/WORKFLOW.md`](../docs/WORKFLOW.md) — branching, commits, PRs, CI, Definition of Done
4. [`docs/TASKS.md`](../docs/TASKS.md) — master backlog (every `P<phase>-T<task>` lives here)
5. [`docs/phases/P0N-*.md`](../docs/phases/) — per-phase task plans with build-order DAGs
6. [`docs/phases/journal/P<phase>-T<task>.md`](../docs/phases/journal/) — **load ONLY the journal for the current task**, never the whole folder
7. [`docs/adr/`](../docs/adr/) — accepted architectural decisions (do not contradict these silently)
8. [`analysis/report/PHASED_REQUIREMENTS.md`](../analysis/report/PHASED_REQUIREMENTS.md) — Global Conventions + per-phase spec (authoritative)
9. [`AGENTS.md`](../AGENTS.md) — Laravel Boost rules (auto-loaded)

If the user asks for "the next task", "what's next", or starts coding without a task ref: open `docs/TASKS.md`, find the lowest-numbered unchecked task in the current phase, and confirm before starting.

## How to use Laravel Boost MCP

The `laravel-boost` MCP server is configured in [`.vscode/mcp.json`](../.vscode/mcp.json). Always prefer Boost tools over manual alternatives:

- `search-docs` (with a `packages` array when known) **before** writing any Laravel/Inertia/Pest/Tailwind code — gives version-specific docs for the exact packages installed here.
- `database-schema` before writing a migration or model.
- `database-query` for read-only DB inspection — never write raw SQL in `tinker` for that.
- `get-absolute-url` whenever you need a project URL (Herd-served at `https://athletic-management.test`).
- `browser-logs` to read recent browser errors when debugging the SPA.
- `tinker` only for behavior not covered by tests, always with single-quoted commands.

Skills under [`.github/skills/`](skills/) auto-activate per their descriptions (fortify, inertia-react, laravel-best-practices, pest-testing, tailwindcss, wayfinder). **Trust the activation triggers — don't re-explain them.**

## Non-negotiable rules (do these without being told)

- **Query Laravel Boost MCP before planning every task.** `search-docs` (multi-topic queries, scoped with `packages` when known) is mandatory — never write Laravel/Inertia/Pest/Tailwind/Wayfinder/Fortify code from memory. `database-schema` before migrations/models, `database-query` before query/index decisions, `get-absolute-url` for any URL. Log the queries + findings in the journal's **Boost MCP research** section. If a Boost finding contradicts a project doc (TASKS.md, phase file, ADR, PHASED_REQUIREMENTS.md, AGENTS.md, copilot-instructions.md, or a SKILL.md), **flag it in the plan and update the doc in the same task** — do not let docs and reality drift apart silently.
- **Follow the 6 gates in [`docs/TASK_LIFECYCLE.md`](../docs/TASK_LIFECYCLE.md) on every task** — Plan → Branch+Implement → Summary → Revise → Approval+PR → Next. Never skip gates. Never start the next task without explicit user "next".
- **One task = one branch = one PR = one journal file.** Branch name `<type>/p<phase>-t<task>-<slug>`. Conventional Commits with `Refs: P<phase>-T<task>` footer. Journal at `docs/phases/journal/P<phase>-T<task>.md` (copy from `_TEMPLATE.md`).
- **Stop at Gate 1** after presenting the plan — wait for user approval before coding.
- **Stop at Gate 3** after presenting the summary — wait for user approval before opening a PR.
- **Revisions are append-only.** Add a `## Revision N` block to the journal; never rewrite earlier sections.
- **Sizing:** if a task exceeds ~400 LOC diff, > 6 files, or > 2 migrations — stop and split it in the phase file before coding.
- **Definition of Done:** the checklist in [`docs/WORKFLOW.md §6`](../docs/WORKFLOW.md). Run it before declaring anything done; tick boxes in the phase file in the same commit.
- **Tests are mandatory.** Every endpoint → Pest Feature test. Every Service/Action → Pest Unit test. Every user-facing flow → Pest Browser. Non-trivial React → Vitest. Coverage gate ≥ 70%.
- **Authorization is mandatory.** Every Inertia route + API endpoint goes through a Policy or `permission:` middleware. RBAC is in-house (see ADR-0003 — **never** suggest `spatie/laravel-permission`).
- **Multi-tenancy:** every domain model uses `BelongsToOrganization` global scope. Escape-hatch only in queued reindex jobs.
- **Locale:** stored in session (from `users.locale`, default `hi`); **no URL prefix**.
- **Translations are mandatory on every user-facing string — zero exceptions.** Every label, heading, placeholder, button text, badge text, empty-state message, table header, nav item title, group label, section heading, tooltip, dialog title, confirmation message, and error text in JSX/TSX must be wrapped with `t()` from `useTranslation()` (`resources/js/hooks/use-translation.ts`). Never hardcode an English string in a component. This rule applies to **all** components: pages, layouts, sidebars, headers, nav menus, modals — not just form pages.
  - Add the English key + Hindi value to `resources/lang/hi.json` for every new string before the PR is raised.
  - Nav item arrays and other data structures defined as module-level constants **cannot** call hooks — move them inside the component function so `t()` is accessible.
  - **Before finishing any task**, grep the changed TSX/JSX files for hardcoded English UI strings: `grep -n '"[A-Z][a-z]' resources/js/...` — fix every hit.
  - This applies from the **first commit** of a feature — never as a retrofit.
  - `en.json` stays `{}`; the key itself is the English fallback.
- **Migrations:** every `up()` has a working `down()`. CI runs `migrate:fresh --seed` then `migrate:rollback` on every PR.
- **API contract stability:** `/api/v1` shapes are frozen. Search endpoints keep their contract across the P2 → P8 Meilisearch swap.
- **PHP style:** after editing any PHP file, run `vendor/bin/pint --dirty --format agent` before finishing.
- **No documentation files created unless explicitly requested.** Code changes do not need a markdown writeup.

## Things to avoid

- `spatie/laravel-permission`, `laravel/sanctum` for the SPA, axios (use Inertia + fetch).
- Controller-level validation (always Form Requests).
- Hard-coding role names in policies (always check permission codes).
- Writing markdown to "document" a change — code + tests + ticking the phase checklist is the documentation.
- Re-explaining the stack, workflow, or domain in chat responses — link the doc instead.

## Token efficiency rules

The whole point of the journal system is keeping context small per task.

- **Load only the current task's journal**, not the `journal/` folder. Past journals are for humans + audit.
- **Load only the active phase file**, not all of `docs/phases/`.
- **Load only the relevant section of `PHASED_REQUIREMENTS.md`** (it's long — use search/anchors).
- Prefer `search-docs` (Boost MCP) over reading whole package docs.
- Prefer `database-schema` over re-reading every migration.
- When a user says "continue" mid-task, re-open the **current journal first** (it has the plan + revisions) — that's the cheapest restore of context.

## Conversation style for this repo

The user is the project owner and a developer. Be terse. Skip stack/workflow recaps — they're in these docs. When proposing code, jump to the diff. When unsure which task is in scope, ask "which task ID?" not "what should I build?".
