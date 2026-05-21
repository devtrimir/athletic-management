# Phase 0 — Project Bootstrap

> Source spec: [PHASED_REQUIREMENTS.md → PHASE 0](../../analysis/report/PHASED_REQUIREMENTS.md). Read it first.

**Goal:** stand up an empty but runnable Laravel + Inertia + React monolith with shared dev tooling.

**Exit criteria:** `make dev` boots app, `localhost:8000/hi` shows the starter-kit landing page, `/api/health` returns `{ "status": "ok" }`, CI is green.

---

## Tasks

### ~~P0-T01 — Local infra (docker-compose)~~ (skipped)

Dropped in favour of **Laravel Herd**, which already provides MySQL 8.4, Redis, Meilisearch, and Mailpit as managed local services. Use `herd services:start mysql redis meilisearch mailpit` instead of docker-compose. MinIO (S3-compatible storage) will be added later via Herd or a single `docker run` when file uploads land in P3.

**MySQL Herd config** to confirm in `~/Library/Application Support/Herd/config/mysql/my.cnf` (or via Herd UI):
- `character-set-server=utf8mb4`
- `collation-server=utf8mb4_0900_ai_ci`
- `innodb_ft_min_token_size=1`
- `ngram_token_size=2` (for the P2 FULLTEXT ngram parser)

Document env defaults (`DB_HOST=127.0.0.1`, `DB_PORT=3306`, `REDIS_HOST=127.0.0.1`, `MEILISEARCH_HOST=http://127.0.0.1:7700`) in `.env.example` — fold this into P0-T06.

---

### ~~P0-T02 — Scaffold app~~ (done before workflow)

Laravel 13 + Inertia 3 + React 19 starter kit is already installed and `php artisan boost:install` has been run. Fortify, Wayfinder, Pail, Pint, Pest are present.

**Small follow-ups to fold into the next config task (P0-T06):**
- `composer.json` requires `php: ^8.3` → bump to `^8.4` (matches [STACK.md](../STACK.md))
- Package name in `composer.json` is the starter-kit default (`laravel/react-starter-kit`) → rename to `upp/sports-management`
- Verify `.env` `DB_CONNECTION=mysql`, `mysql.collation=utf8mb4_0900_ai_ci` in `config/database.php`

---

### P0-T03 — Composer packages

Minimal day-zero footprint. Only **Horizon** (runtime) and **Larastan** (dev) are installed now — every other package is installed in the task that first needs it so the dependency tree never gets ahead of the code.

```bash
composer require laravel/horizon:^5
composer require --dev larastan/larastan:^3
php artisan horizon:install
```

**Deferred (installed later, with the task that needs them):**

| Package | When | Why |
|---|---|---|
| `spatie/laravel-query-builder` | P1 (reference-data list endpoints) | Filter/sort/include parsing for index pages |
| `maatwebsite/excel` | P3 (importer) | XLSX parsing |
| `laravel/scout` + `meilisearch/meilisearch-php` | P8 | Meilisearch swap-in |
| `barryvdh/laravel-dompdf` | P7 (reports) | PDF export with Devanagari fonts |
| `spatie/laravel-backup` | P10 | Production backups |
| `sentry/sentry-laravel` | P10 | Error tracking |

**Dropped:**

- `spatie/laravel-activitylog` — P1-T24 implements a small in-house `AuditLogger` writing to the `audit_logs` table via a global Eloquent observer. Avoids the dependency for a single observer's worth of code.

**Done when:** `composer install` clean; `vendor/bin/phpstan --version` works; Horizon dashboard reachable at `/horizon` (gated behind admin).

**Done when:** `composer install` clean; `vendor/bin/phpstan --version` works.

---

### P0-T04 — NPM packages

Forms are handled by **Inertia `useForm`** and ad-hoc requests by **Inertia `useHttp`** (v3). We deliberately do **not** install `react-hook-form`, `zod`, or `@tanstack/react-query` — Inertia owns data flow and validation echoes back from Laravel Form Requests.

```bash
npm i recharts@^3
```

Verify these are already present from the starter kit (bump if older):
`vite@^7`, `@vitejs/plugin-react@^5`, `laravel-vite-plugin@^3`, `tailwindcss@^4`, `@tailwindcss/vite@^4`, `typescript@^5.7`, `@inertiajs/react@^3`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `babel-plugin-react-compiler`.

Enable the React compiler in `vite.config.ts`:

```ts
react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } })
```

**Done when:** `npm run build` succeeds.

---

### P0-T05 — Self-host fonts

Place `.woff2` files under `resources/fonts/`:
- `NotoSansDevanagari-{Regular,Medium,SemiBold,Bold}.woff2`
- `Inter-{Regular,Medium,SemiBold,Bold}.woff2`

Declare in `resources/css/app.css`:

```css
@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-deva: "Noto Sans Devanagari", "Inter", system-ui, sans-serif;
}
```

Add `@font-face` blocks for each file.

**Done when:** DevTools shows fonts loading from `/build/assets/...`, no network calls to `fonts.googleapis.com`.

---

### ~~P0-T06~~ — Project config files ✅

Verify and complete:
- `.editorconfig` (LF, 4 spaces all files, 2 spaces YAML — matches existing code convention and `.prettierrc` `tabWidth: 4`)
- `.prettierrc` (already present — verify rules)
- `eslint.config.js` (ESLint v9 **flat** config; already present — verify)
- `phpstan.neon` (Larastan level 6, paths: `app`, `database`, `routes`, `tests`)
- `pint.json` (already present)
- `commitlint.config.js` (Conventional Commits)
- `composer.json`: bump `"php": "^8.3"` → `"^8.4"`, rename `"name"` from `laravel/react-starter-kit` to `upp/sports-management`
- `.env`: confirm `DB_CONNECTION=mysql`, `DB_PORT=3306`; `config/database.php` set `mysql.collation` to `utf8mb4_0900_ai_ci`

**Done when:** `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `npm run lint`, `npm run types:check` all pass on the empty scaffold.

---

### ~~P0-T07~~ — `/api/health` endpoint ✅

Add to `routes/api.php`:

```php
Route::get('/health', fn () => response()->json(['status' => 'ok']));
```

Add a Pest Feature test asserting 200 + JSON shape.

**Done when:** `curl localhost:8000/api/health` returns `{"status":"ok"}`.

---

### P0-T08 — GitHub Actions CI

Workflows under `.github/workflows/`:
- `ci.yml` — jobs from [WORKFLOW.md §4](../WORKFLOW.md): php-test, php-lint, php-static, js-test, js-lint, js-type, js-build, migration-fresh, coverage
- `commitlint.yml` — runs on PRs
- `audit.yml` — weekly cron + on push to main

MySQL + Redis as service containers. Cache Composer + npm.

**Done when:** PR shows all checks green.

---

### P0-T09 — Renovate

Add `renovate.json`:
- `extends`: `["config:recommended", ":semanticCommits"]`
- Group minor/patch into a single weekly PR
- Auto-merge dev dependencies after CI
- Pin GitHub Actions

**Done when:** Renovate opens its onboarding PR (after installation).

---

### P0-T10 — PR template + CODEOWNERS + commitlint

- `.github/pull_request_template.md` — copies the DoD checklist from [WORKFLOW.md §6](../WORKFLOW.md)
- `.github/CODEOWNERS` — assigns reviews
- `commitlint.config.js` + `.husky/commit-msg` hook

**Done when:** A test commit `wip` is rejected by the hook; a `feat(scope): subject` commit is accepted.

---

### ~~P0-T11 — Makefile + README~~ (removed)

Dropped. The starter kit's `composer run dev` (concurrently runs `php artisan serve`, queue worker, pail logger, `npm run dev`) and `composer test` / `composer ci:check` scripts cover the same surface. Root README "one-command start" instructions will be folded into the README during P0-T08 (CI docs) instead.

---

### ~~P0-T12 — `SetLocale` middleware stub~~ ✅

Session-based locale (no URL prefix). `SetLocale` middleware reads `session('locale', 'hi')`.
`POST /locale` (named `locale.update`) validates `hi|en`, writes to session, redirects back.
`locale` shared as lazy Inertia prop. React calls via `router.post(..., {}, { preserveState: true, preserveScroll: true })`.

**Done when:** POST hi/en updates session; POST fr → 422; default locale is `hi`. ✅

---

### P0-T13 — ADRs

- `docs/adr/0001-monolith-inertia-react.md` — why monolith over split API + Next.js
- `docs/adr/0002-excel-library-choice.md` — `maatwebsite/excel` vs `rap2hpoutre/fast-excel` (decide based on memory profile against the largest legacy workbook)

**Done when:** Both ADRs merged with `Status: Accepted`.

---

## Phase 0 routes / pages added

> Update this section in the same PR that adds the route/page.

| Route | Type | Page / Handler |
|---|---|---|
| `GET /api/health` | API | inline closure |
| `GET /` | web | redirect → `/hi` |
| `GET /{locale}/...` | web | starter-kit pages (locale-prefixed) |
