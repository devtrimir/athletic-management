# Development Workflow

The non-negotiable process for shipping changes to this repo. Modeled on what mature Laravel/React shops do in 2026: **trunk-based development**, short-lived feature branches, conventional commits, PR review with CI gates, and a per-task Definition of Done.

> **Per-task execution protocol** (gates, approvals, journaling) lives in [TASK_LIFECYCLE.md](TASK_LIFECYCLE.md). This file covers the conventions; that file covers the order of operations.

---

## 1. Branching model — trunk-based

- `main` is **always deployable**. Protected: no direct pushes, no force-push, requires green CI + 1 review.
- Work happens on **short-lived feature branches** off `main`. Target lifetime: < 3 days. If it grows beyond that, split the task.
- Branch naming:
  ```
  <type>/<phase>-<task-id>-<kebab-slug>

  feat/p2-t03-members-crud-controller
  fix/p6-t11-krutidev-edge-case
  chore/p0-t02-ci-pipeline
  docs/adr-0004-meilisearch-vs-typesense
  ```
- `type` ∈ `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`.
- Rebase onto `main` before opening a PR; **no merge commits** on feature branches. Use `git pull --rebase` always.

## 2. Commits — Conventional Commits v1.0

Format:

```
<type>(<scope>): <subject>

<body — what & why, wrapped at 72 cols>

<footers>
Refs: P2-T03
Closes: #123
```

Examples:

```
feat(members): add member_code generator service

Generates UPP-{year}-{6-digit-seq} via a per-org/year sequence row,
serialized with a transactional advisory lock so concurrent inserts
cannot collide.

Refs: P2-T05
```

```
fix(import): handle Krutidev cells containing nukta-prefixed glyphs

Refs: P6-T11
```

Rules:
- Subject ≤ 72 chars, imperative mood ("add", not "added").
- One logical change per commit. Use `git add -p`.
- Reference the task id (`Refs: P<phase>-T<task>`) in the footer of every commit.
- Breaking changes use `feat!:` / `fix!:` and a `BREAKING CHANGE:` footer.

Enforced locally via a `commit-msg` Git hook (commitlint config in `package.json`). Enforced in CI by the `commitlint` workflow job.

## 3. Pull Requests

- **One task per PR.** Title = first line of the squash commit, also Conventional Commits format.
- Use the PR template at [`.github/pull_request_template.md`](../.github/pull_request_template.md). Required sections:
  - **What** (1–2 sentences)
  - **Why** (link the task id and any ADR)
  - **How to test** (manual steps + which automated tests cover it)
  - **Screenshots** (UI changes only)
  - **DoD checklist** (copy from §6 below)
- Open PRs as **Draft** until CI is green; mark Ready only when you'd want a human to look.
- Squash-merge to `main`. The squash subject must be Conventional Commits format.
- Delete the branch on merge.

### Review

- Minimum **one approving review** before merge (CODEOWNERS auto-assigns).
- Reviewers use [Conventional Comments](https://conventionalcomments.org/): `nit:`, `suggestion:`, `question:`, `issue:`, `praise:`, `thought:`.
- Author resolves all `issue:` and `suggestion:` comments before merge. `nit:` may be deferred with an explicit comment.

## 4. CI gates (GitHub Actions)

Every PR runs:

| Job | Tool | Blocks merge? |
|---|---|---|
| `php-test` | `php artisan test` (Pest 3) | yes |
| `php-lint` | `vendor/bin/pint --test` | yes |
| `php-static` | `vendor/bin/phpstan analyse` (Larastan level 6) | yes |
| `js-test` | `npm run test` (Vitest) | yes |
| `js-lint` | `npm run lint` (ESLint flat config) | yes |
| `js-type` | `npm run type-check` (`tsc --noEmit`) | yes |
| `js-build` | `npm run build` (Vite production) | yes |
| `e2e` | `npm run test:e2e` (Pest 3 Browser / Playwright) — only on PRs touching `resources/**` or affected routes | yes |
| `commitlint` | commit message format | yes |
| `migration-fresh` | `php artisan migrate:fresh --seed` against a throwaway MySQL service | yes |
| `coverage` | Pest coverage report → enforce ≥ 70% line coverage on changed PHP files | yes |
| `audit` | `npm audit --omit=dev` + `composer audit` | warns |
| `renovate` | dependency updates auto-PRs (separate scheduled workflow) | — |

CI must be **fully green** for merge.

## 5. Dependency management

- **Lockfiles committed.** `composer.lock` and `package-lock.json` (project uses npm per the existing `package-lock.json`; do not switch to pnpm without an ADR even though `pnpm-workspace.yaml` exists from a prior attempt).
- **Renovate Bot** opens grouped weekly PRs for minor/patch upgrades and immediate PRs for security advisories. Major upgrades require an ADR.
- Pinned versions live in [STACK.md](STACK.md) — update it whenever a major version moves.
- **No direct edits to `vendor/` or `node_modules/`.** Forks live in `/packages` with a path repository entry.

## 6. Definition of Done (per task)

A task is DONE only when **all** of these are true. Copy this checklist into every PR description.

```
- [ ] Code compiles / type-checks (PHP + TS)
- [ ] All affected migrations run cleanly: `php artisan migrate:fresh --seed`
- [ ] Rollback works: `php artisan migrate:rollback` on the new migrations
- [ ] New code has tests:
      - [ ] Feature test for every new HTTP endpoint (Pest)
      - [ ] Unit test for every new Service / Action (Pest)
      - [ ] Vitest test for non-trivial React components / hooks
      - [ ] Pest Browser happy-path for any new user-facing flow
- [ ] `php artisan test` passes locally
- [ ] `vendor/bin/pint --test` passes
- [ ] `vendor/bin/phpstan analyse` passes (level 6, no new baseline entries)
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] No hard-coded user-facing strings in JSX (i18n via `t()`) — applies from P9 forward; from P1 still preferred
- [ ] Authorization gate / policy added or updated for every new endpoint
- [ ] Audit log fires on create / update / delete (where applicable)
- [ ] Inertia shared props unchanged OR change documented in PR body
- [ ] API contract change? → versioned (`/api/v1` stays stable) OR ADR filed
- [ ] Docs updated: task ticked off in `docs/phases/PNN-*.md` AND `docs/TASKS.md`
- [ ] Phase file's `Routes added` / `Pages added` section updated
- [ ] ADR filed if a non-obvious architectural choice was made
- [ ] Screenshots attached for UI changes
- [ ] Self-reviewed the diff before requesting review
```

## 7. Local environment

- Boot infra: `docker compose -f infra/docker-compose.yml up -d`
- Boot app: `composer run dev` (concurrently runs `php artisan serve`, queue worker, Vite HMR)
- Tests: `php artisan test` / `npm run test`
- Reset DB: `php artisan migrate:fresh --seed`
- One-shot dev bootstrap: `make dev`
- One-shot demo data: `make demo`

## 8. Release & deploy

- `main` deploys automatically to the **staging** environment on every merge (GitHub Actions → deploy job).
- Production deploys are **tag-driven**: create an annotated tag `vMAJOR.MINOR.PATCH` from `main`; the `release` workflow ships it.
- Versioning follows **SemVer** at the application level: bump MINOR per phase completion, PATCH for bugfixes, MAJOR only for schema-breaking releases.
- Each tag has an auto-generated `CHANGELOG.md` entry from Conventional Commits (via `release-please` or `git-cliff`).
- Zero-downtime: `php artisan migrate --force` runs **before** the new code is live; migrations must be backwards-compatible within a MINOR release (no destructive column drops in the same release — drop in MINOR `n+1`).

## 9. Security & secrets

- No secrets in the repo. `.env` is git-ignored; `.env.example` is the spec.
- Secrets in CI live in GitHub Actions Secrets; production secrets in the deployment platform's secret manager.
- Dependabot / Renovate handles security advisories; act on `Critical` / `High` within 48 h.
- Run `composer audit` and `npm audit --omit=dev` weekly (CI cron).

## 10. Communication

- Use the task ID (`P2-T03`) in every commit, branch, PR title, and chat reference.
- "It works on my machine" is not a status. Either CI is green or it isn't.
- When blocked, comment on the task in `docs/phases/PNN-*.md` with `> blocked: <reason>` and tag a reviewer.
