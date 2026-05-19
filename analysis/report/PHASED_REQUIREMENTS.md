# Phased Build Requirements — Sports Member Management System
**Architecture:** **Monolith.** Single Laravel 13 application serves the UI via **Inertia.js 3 + React 19 (TypeScript)** compiled by **Vite 7**. One repo, one deploy, one auth session.
**Stack:** PHP 8.4 · Laravel 13 · Inertia.js 3.x · React 19 (TypeScript 5.7) · Vite 7 · Tailwind CSS v4 + shadcn/ui · PostgreSQL 17 · Meilisearch v1.13 · Redis 8 (Horizon 5) · S3-compatible storage.
**Audience:** an AI coding agent (or a developer) building the system phase-by-phase. Each phase is self-contained: clear scope, deliverables, acceptance criteria, and explicit dependencies on earlier phases.
**Source-of-truth for domain:** [MIGRATION_ANALYSIS.md](MIGRATION_ANALYSIS.md), [erd.mmd](erd.mmd), [hindi_entity_dictionary.csv](hindi_entity_dictionary.csv).

> **Why monolith (not split API + Next.js):** simpler deploy and ops, shared session auth (no CORS / Sanctum-SPA dance), one codebase to test, server-driven routing and validation with React UX via Inertia. A public REST API can be extracted later (Phase 11 F11) without changing the data model.

---

## Global Conventions (apply to every phase)

### Repository layout (single Laravel project)
```
/                      Laravel application root (composer.json, artisan, package.json)
  app/                 Domain code (Models, Services, Actions, Http/Controllers, Http/Requests, Http/Resources, Jobs, Policies, Observers)
  routes/web.php       Inertia routes (all UI)
  routes/api.php       JSON-only endpoints under /api/v1 (search autocomplete, polling, bulk ops, future public API)
  resources/js/        React + Inertia frontend (TypeScript)
    Pages/             Inertia page components (mirrors route tree)
    Components/        Shared UI (shadcn/ui based)
    Layouts/           App shell, auth shell
    Hooks/ Lib/ Types/
    i18n/              t() helper
  resources/css/       Tailwind entry
  resources/lang/      Laravel lang files: hi/, en/, plus hi.json / en.json for UI strings
  database/migrations  /seeders /factories
  tests/               Pest (Feature, Unit, Browser)
/analysis              Existing legacy-Excel analysis artifacts (read-only)
/docs                  Phase requirements + ADRs
/infra                 docker-compose, deployment manifests
```

### Backend conventions (Laravel)
- PHP 8.4, Laravel 13. Auth = **session-based** via the official **Laravel React Starter Kit** (Inertia 3 + React 19 + TypeScript + shadcn/ui). **No Sanctum tokens for the SPA.** Tokens are added only in Phase 11 (public API).
- Inertia controller actions return `Inertia::render('Page/Name', $props)`. JSON-only endpoints (search, polling, bulk operations) live under `routes/api.php` with prefix `/api/v1` and return API Resource JSON.
- Form Requests for every write endpoint (both Inertia and API). No controller-level validation.
- Business logic in `app/Services` (multi-step orchestration) or `app/Actions` (single-purpose invokables). Controllers are thin.
- Queues: Redis 8 driver via **Laravel Horizon 5**. Long-running jobs (imports, search indexing, exports) MUST be queued.
- Database: PostgreSQL 17. Migrations only; no `db:seed` for production data (seeders cover reference data + dev fixtures only).
- Every table has `id` (bigint), `created_at`, `updated_at`, and `organization_id` where applicable.
- Soft-deletes on `members`, `coaches`, `teams`, `tournaments` (history-sensitive entities).
- All timestamps stored in UTC; rendered in IST in the UI.
- Multilingual columns: `name_hi` (NOT NULL) + `name_en` (NULLABLE). Same pattern for any user-facing label.
- Tests: **Pest 3** (PHPUnit 11 under the hood). Every endpoint has a feature test; every Service/Action has a unit test. Minimum 70% line coverage.
- Authorization: **first-party RBAC** built on Laravel's native `Gate` + Policies (see Phase 1 schema for `roles` / `permissions` / `role_permission` / `user_role` tables and the `App\Auth\Rbac` service). No third-party permission package. Every Inertia route and API endpoint is gated.

### Frontend conventions (Inertia + React)
- TypeScript 5.7 strict mode. React 19 (uses the new compiler — `babel-plugin-react-compiler` enabled in Vite config). Vite 7 bundler (`@vitejs/plugin-react` + `laravel-vite-plugin` v2).
- UI kit: shadcn/ui (Tailwind v4 / Radix-based) components copied into `resources/js/Components/ui/` + **Tailwind CSS v4** (CSS-first config via `@theme` in `resources/css/app.css`; `@tailwindcss/vite` plugin — no `tailwind.config.js`). Hindi font: `Noto Sans Devanagari` (self-hosted). English: `Inter` (self-hosted).
- Page components live in `resources/js/Pages/` and are rendered by `Inertia::render('Members/Index', …)`. The Laravel server is the source of truth for routing and data — no client-side router beyond Inertia.
- Data flow: initial props come from Inertia 3; `useForm()` (Inertia) handles form submissions; **TanStack Query v5** is used only for incremental/async data (autocomplete, polling) hitting `/api/v1/...` JSON endpoints. Inertia 3 deferred/polling props are used for slow widgets where appropriate.
- Forms: Inertia `useForm` + **Zod v4** schemas (parsed client-side as a UX guard) mirroring server Form Requests. Server is authoritative.
- i18n: Inertia shared props `locale` and `translations` (loaded server-side from `resources/lang/{locale}.json`). A `t(key, params)` helper lives in `resources/js/i18n/`. Locales: `hi` (default), `en`. **No hard-coded strings in JSX.**
- Routing: `/{locale}/...` URL prefix via a `SetLocale` middleware that reads `users.locale`; guest routes default to `/hi`. Locale-aware date/number formatting via `Intl.*` with the `locale` prop.
- Tests: **Vitest 2** + **React Testing Library** for component units; **Pest 3 Browser** (Playwright under the hood) for E2E happy-paths.

### API conventions (the JSON-only endpoints under /api/v1)
- Pagination: `?page=1&per_page=25`. Response wrapper: `{ data, meta: { current_page, last_page, total }, links }`.
- Errors: RFC 7807 problem+json (`{ type, title, status, detail, errors: {...} }`). Inertia responses use Laravel's standard 422 validation flash; API endpoints use problem+json.
- Versioning: `/api/v1`. Bump on breaking changes.
- Filtering / sorting: `spatie/laravel-query-builder` (`?filter[field]=value`, `?sort=-created_at`).
- Search endpoints: `/api/v1/search/members?q=...&filters[sport]=...` (Postgres `pg_trgm` in Phase 2, swapped to Meilisearch in Phase 8 with the **same contract**).

### Definition of Done (per phase)
A phase is DONE when ALL of:
1. Migrations run cleanly on a fresh DB and `migrate:rollback` works.
2. Seeders produce a usable dev environment in one command.
3. Backend tests pass (`php artisan test` / `pest`).
4. `npm run build` succeeds (Vite production build) and `npm run lint` passes (ESLint + Prettier).
5. Pest Browser happy-path for any new feature passes.
6. `/docs/phases/PNN-…md` lists Inertia routes, API endpoints, and pages added.
7. Manual acceptance against the phase's "Acceptance Criteria" section.

### Out of scope for MVP (Phases 1–10)
Deferred items live in **Phase 11+** (future enhancements): tournament bracketing, attendance, fitness/medical, public profiles, kit issuance UI, sports fund ledger, multi-org switching UI, mobile app, notifications, public REST API.

---

# PHASE 0 — Project Bootstrap

**Goal:** stand up an empty but runnable Laravel + Inertia + React monolith with shared dev tooling.

### Scope
- `infra/docker-compose.yml`: services `postgres:17`, `redis:8`, `getmeili/meilisearch:v1.13`, `mailpit`, `minio`.
- PHP + Laravel installer: install via `php.new` (`/bin/bash -c "$(curl -fsSL https://php.new/install/mac/8.4)"`) which provisions PHP 8.4, Composer, and the `laravel` CLI. (Alternative: Laravel Herd.)
- Create the application using the official Laravel 13 installer wizard: `laravel new .` — when prompted, select **Pest** as the testing framework, **PostgreSQL** as the database, and the **React** starter kit (which scaffolds Inertia 3 + React 19 + TypeScript + shadcn/ui + Tailwind v4 + Pest 3 + built-in auth/registration/password-reset/email-verification + light/dark mode + GitHub Actions CI). Choose **built-in Laravel authentication** (not WorkOS AuthKit).
- Breeze is no longer used — it was superseded by the official starter kits in Laravel 11+ and is not offered for Laravel 13.
- Run the app in dev with the bundled Composer script: `composer run dev` (concurrently boots `php artisan serve`, the queue worker, and the Vite dev server).
- Additional Composer packages: `spatie/laravel-query-builder:^6`, `laravel/horizon:^5`, `laravel/scout:^10`, `meilisearch/meilisearch-php:^1.13`, `barryvdh/laravel-dompdf:^3`, `maatwebsite/excel:^3.1` (or `rap2hpoutre/fast-excel:^5` — ADR), `spatie/laravel-backup:^9`, `sentry/sentry-laravel:^4`, `spatie/laravel-activitylog:^4`, `larastan/larastan:^3` (dev), `laravel/pint:^1` (dev), `pestphp/pest:^3` (dev), `laravel/boost:^1` (dev, optional — gives the AI coding agent Laravel 13-specific context and tools; install via `php artisan boost:install`).
- **No third-party permission package** (e.g., `spatie/laravel-permission`). RBAC is implemented in-house in Phase 1 to keep the authorization model fully under our control, scoped per-organization, and free of upstream coupling.
- Additional NPM packages (most are already brought in by the React starter kit — add only what is missing): `@tanstack/react-query@^5`, `react-hook-form@^7`, `zod@^4`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `recharts@^3`, `babel-plugin-react-compiler` (React 19 compiler).
- Verify versions shipped by the starter kit: `vite@^7`, `@vitejs/plugin-react@^5`, `laravel-vite-plugin@^2`, `tailwindcss@^4`, `@tailwindcss/vite@^4`, `typescript@^5.7`, `@inertiajs/react@^3`.
- Self-host fonts: `Noto Sans Devanagari` and `Inter` under `resources/fonts/`, declared in the Tailwind v4 `@theme` block in `resources/css/app.css`.
- Config files: `.env.example`, `.editorconfig`, `.prettierrc`, `phpstan.neon`, `pint.json`, `eslint.config.js` (ESLint v9 flat config).
- CI: GitHub Actions workflows (the React starter kit ships baseline workflows) extended to run `pest`, `pint --test`, `phpstan analyse`, `npm run lint`, `npm run build`.
- `Makefile` with targets `make dev`, `make test`, `make fresh` (DB reset + seed), `make demo`.
- Root README with one-command local startup.

### Deliverables
- Repo bootstrapped to the layout described in Global Conventions.
- `docker compose -f infra/docker-compose.yml up -d` brings up DB + Redis + Meilisearch + MinIO + Mailpit.
- `composer run dev` boots `php artisan serve`, queue worker, and Vite (HMR); visiting `http://localhost:8000/hi` shows the React Starter Kit welcome/login page inside the app shell.
- `GET /api/health` returns `{ status: "ok" }`.
- CI is green on the initial commit.

### Acceptance Criteria
- A reviewer clones the repo, runs `make dev`, opens `localhost:8000/hi` and sees the Inertia-rendered landing/login page; `/api/health` returns 200 JSON.
- A trivial `WelcomeTest` Pest test passes; a trivial Vitest component test passes.

### Dependencies
None.

---

# PHASE 1 — Foundation: Multi-Tenancy, Auth, RBAC, Reference Data

**Goal:** every later phase depends on having `organizations`, `users`, roles, and seeded reference tables in place.

### Scope

**Schema (migrations):**
- `organizations` (id, name, code UK, created_at, updated_at).
- `users` (Laravel default + `organization_id` FK + `locale` ENUM('hi','en') default 'hi').
- `roles` (id, organization_id FK, code, name_hi, name_en, is_system bool default false, description, created_at, updated_at). Unique `(organization_id, code)`. `is_system=true` rows (e.g., `admin`) are not editable / not deletable via the UI.
- `permissions` (id, code UK, group, name_hi, name_en, description). Global catalog — NOT scoped per org. Codes follow `resource.action` (e.g., `members.view`, `members.create`, `members.update`, `members.delete`, `members.restore`, `imports.apply`, `reports.export`, `settings.manage`, `audit.view`).
- `role_permission` (role_id FK, permission_id FK, PK(role_id, permission_id)).
- `user_role` (user_id FK, role_id FK, organization_id FK, assigned_by FK users, assigned_at, PK(user_id, role_id, organization_id)). A user may hold multiple roles within one org.
- Authorization is enforced through Laravel's native `Gate` / Policies wired to a small in-house `App\Auth\Rbac` service:
  - `Rbac::userHasPermission(User $u, string $code, ?int $orgId = null): bool` — returns true if the user holds any role in that org granting the permission.
  - `Rbac::userRoles(User $u, int $orgId): Collection` and `Rbac::userPermissions(User $u, int $orgId): Collection` — both cached per-request and warm-cached in Redis (key invalidated on role/permission/user_role write).
  - A `HasRoles` trait on the `User` model exposes `hasRole('code')`, `hasAnyRole([...])`, `can('permission.code')` (delegates to Gate), and `assignRole($role, $org)` / `revokeRole(...)` helpers.
  - `AuthServiceProvider::boot()` registers `Gate::before` so users holding the `admin` system role short-circuit to `true`, and registers one `Gate::define()` per permission code (auto-discovered from the `permissions` table at boot, cached via `php artisan permission:cache`).
  - Two route middlewares: `role:admin|data_entry` (any-of) and `permission:members.update` (any-of via pipe). Both throw `403` with a localized message.
  - Policies (`MemberPolicy`, `CoachPolicy`, `TeamPolicy`, `TournamentPolicy`, `ImportPolicy`, `ReportPolicy`, `SettingsPolicy`) call `$user->can('permission.code')` rather than hard-coding role names — roles can be re-mapped without code changes.
  - Inertia shared prop `auth.permissions: string[]` exposes the resolved permission codes to React so UI affordances (buttons/menu items) can be hidden client-side; the server remains the source of truth.
- Seed roles (per org, `is_system=true` for `admin`):
  - `admin` — all permissions.
  - `data_entry` — `*.view`, `*.create`, `*.update` on members/coaches/teams/tournaments/imports; no `*.delete`, no `settings.manage`, no `audit.view`.
  - `viewer` — only `*.view` permissions.
- Console command `php artisan rbac:sync` reads a declarative `config/rbac.php` (catalog of permission codes + default role → permission grants) and upserts the `permissions` and `role_permission` tables idempotently. Run automatically on deploy.
- `districts` (id, name_hi, name_en, state, code).
- `sessions` (id, organization_id, name UK per org, start_year, end_year, is_current bool).
- `sports` (id, organization_id, name_hi, name_en, category ENUM, slug UK per org).
- `units` (id, organization_id, name_hi, name_en, unit_type ENUM('PAC','GRP','DISTRICT','HQ','OTHER'), commandant nullable, district_id FK nullable).
- `tournament_tiers` (id, code UK ENUM('INTERNATIONAL','NATIONAL','AIPSC','STATE','ZONAL','OTHER'), label_hi, label_en, weight smallint).
- `audit_logs` (id, user_id, organization_id, entity, entity_id, action, diff jsonb, at).

**Seeders:**
- One default organization: `UP Police Sports Unit` (code `UPP`).
- All 75 UP districts (Hindi + English names).
- Tournament tiers (5 standard rows).
- Sports: seed the ~30 disciplines observed in legacy data (वुशू, ताइक्वाण्डो, हॉकी, कबड्डी, कुश्ती, एथलेटिक्स, बैडमिंटन, टेबल टेनिस, बॉक्सिंग, जूडो, योगा, क्रॉस कंट्री, बास्केटबॉल, वॉलीबॉल, फुटबॉल, शूटिंग, आर्चरी, जिम्नास्टिक्स, वाटर स्पोर्ट्स/रोइंग, वेटलिफ्टिंग, हैंडबॉल, स्क्वैश, साइक्लिंग, स्विमिंग, खो-खो, …).
- Sessions: `2019-20` … `2026-27`. Mark `2026-27` as `is_current`.
- Admin user (env-driven email/password) with `admin` role.

**Backend (Inertia + API):**
- Auth via the Laravel React Starter Kit (scaffolded in P0): `GET/POST /{locale}/login`, `POST /{locale}/logout`, `GET /{locale}/forgot-password` (Inertia 3 pages, session auth).
- Inertia shared props (`HandleInertiaRequests`): `auth.user` (with `roles`, `organization`), `locale`, `translations`, `flash`.
- `SetLocale` middleware: resolves locale from URL prefix → `users.locale` → default `hi`.
- `EnsureOrganizationScope` middleware: every Eloquent query auto-scoped via a global scope `BelongsToOrganization`.
- Inertia CRUD routes for `sessions`, `sports`, `units`, `districts`, `tournament_tiers` under `/{locale}/settings/...`. Gated by `admin` Policy.
- JSON API mirrors under `/api/v1/...` for `tournament-tiers`, `sports`, `units`, `districts` (autocomplete sources used by later phases).
- All list endpoints support pagination, filtering, sorting via `spatie/laravel-query-builder`.
- `App\Services\AuditLogger` (built on `spatie/laravel-activitylog`) records diffs on every create/update/delete via Model observers.

**Frontend (Inertia pages):**
- `Pages/Auth/Login.tsx`, `Pages/Auth/ForgotPassword.tsx` (provided by the Laravel React Starter Kit, restyled).
- `Layouts/AppLayout.tsx`: sidebar nav with placeholders for Members / Teams / Tournaments / Imports / Reports / Settings; top-bar locale switcher; user menu.
- `Pages/Settings/Sessions/{Index,Create,Edit}.tsx`; same shape for Sports / Units / Districts / TournamentTiers.
- Locale switcher PATCHes `users.locale` then redirects to the matching `/{locale}` URL.

### Deliverables
Working login, role-protected reference-data CRUD, audit log writing.

### Acceptance Criteria
- Admin can log in, switch locale, CRUD sessions/sports/units/districts.
- Data-entry user can READ reference data, cannot WRITE.
- Viewer cannot access settings.
- Audit log entries appear in DB on every change.
- All seed sessions visible; `is_current` flagged correctly.
- 75 districts and 30 sports seeded with both Hindi and English names.

### Dependencies
Phase 0.

---

# PHASE 2 — Members Module (Core Entity)

**Goal:** the headline entity. CRUD + fast search + status history + name aliases + the profile page that justifies the whole project.

### Scope

**Schema:**
- `members` (id, organization_id, member_code UK NOT NULL, pno UK NULLABLE, full_name_hi NOT NULL, full_name_en, full_name_normalized, father_name_hi, rank, gender ENUM('M','F','O'), dob, joining_date, mobile, home_district_id FK, current_unit_id FK, player_category ENUM('GD','SKILLED'), player_level ENUM('ZONAL','NATIONAL','INTERNATIONAL','AIPSC'), current_status ENUM('ACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED') default 'ACTIVE', source_refs jsonb, deleted_at).
- `name_aliases` (id, member_id FK, alias_hi, alias_normalized, source ENUM('krutidev','spelling_variant','rank_prefixed','legacy','manual')).
- `member_status_history` (id, member_id FK, status ENUM same as above, effective_on, reason_hi, recorded_by FK users).
- Postgres function `normalize_devanagari(text)` (NFC, strip ZWJ/ZWNJ, lowercase ASCII, collapse whitespace, strip rank prefixes `आ.`, `मु.आ.`, `पी.सी.`, `दलनायक`, `म.आ.`).
- Auto-fill `full_name_normalized` and `alias_normalized` via trigger on insert/update.
- Indexes: B-tree on `pno`, `member_code`, `mobile`; GIN `pg_trgm` on `full_name_normalized`, `alias_normalized`.

**Member code generator (Service):**
- Pattern: `UPP-{joining_year || current_year}-{6-digit-seq}`. Sequence per `(organization_id, year)`.

**Routes:**

*Inertia (web)* under `/{locale}/members`:
- `GET /{locale}/members` → `Members/Index` (paginated table, filter panel, debounced search box).
- `GET /{locale}/members/create` → `Members/Create`.
- `POST /{locale}/members` → store.
- `GET /{locale}/members/{member}` → `Members/Show` (profile shell with tabs: Overview, Status History, Aliases, plus Teams / Participations / Achievements stubs filled in later phases).
- `GET /{locale}/members/{member}/edit` → `Members/Edit`.
- `PATCH /{locale}/members/{member}` → update.
- `DELETE /{locale}/members/{member}` → soft delete (admin only).
- `POST /{locale}/members/{member}/status` → change status, writes `member_status_history`.
- `POST /{locale}/members/{member}/aliases`, `DELETE /{locale}/members/{member}/aliases/{alias}`.

Filters supported on the index: `pno`, `mobile`, `unit_id`, `home_district_id`, `sport_id` (placeholder until Phase 4), `player_category`, `player_level`, `current_status`, `q`.

*JSON API* under `/api/v1`:
- `GET /api/v1/search/members?q=...` — Postgres `pg_trgm` similarity search across `full_name_normalized` + `aliases.alias_normalized` + `pno`; returns top 50. Used by autocomplete pickers (coach link, team roster, participation entry). **Same contract preserved when Meilisearch is swapped in at Phase 8.**
- `GET /api/v1/members/{member}/profile` — aggregated JSON for future widgets and exports.

**Frontend (Inertia pages):**
- `Pages/Members/Index.tsx` — paginated table + filter panel + debounced search box (TanStack Query → `/api/v1/search/members`).
- `Pages/Members/Create.tsx`, `Pages/Members/Edit.tsx` — Inertia `useForm` with Zod schema mirroring the Form Request.
- `Pages/Members/Show.tsx` — tabbed profile (`Overview`, `StatusHistory`, `Aliases`, + later-phase placeholders).
- `Components/StatusChangeModal.tsx` with effective date + reason.
- `Components/AliasInlineForm.tsx`.

### Deliverables
Member CRUD + search + profile shell + status history + aliases.

### Acceptance Criteria
- Create a member without PNO → `member_code` auto-generated, displayed.
- Create a member with PNO → uniqueness enforced.
- Search "खिलाडी" (typo) finds members whose normalized name is "खिलाडी"/"खिलाड़ी" within 300 ms on a dataset of 10k seeded members.
- Status change writes both `members.current_status` and a `member_status_history` row.
- Adding alias "fl)kUr lsB" (Krutidev) under member "सिद्धान्त सेठ" allows searching by either form.
- Soft-delete hides member from list but `GET /members/{id}` still returns when caller has admin role + `?with_trashed=1`.

### Dependencies
Phase 1.

---

# PHASE 3 — Coaches Module

**Goal:** manage coaches as first-class entities; allow linking to a member record when the coach is also a serving constable.

### Scope

**Schema:**
- `coaches` (id, organization_id, member_id FK NULLABLE, full_name_hi, full_name_en, pno NULLABLE, mobile, nis_certified bool, deleted_at).
- Unique index `(organization_id, pno)` where pno IS NOT NULL.

**Routes:**
- Inertia CRUD under `/{locale}/coaches` (`Index/Create/Show/Edit`). When `member_id` is set, the response embeds the linked member summary.
- Filter: `?filter[has_member]=true|false`.
- JSON API: `GET /api/v1/search/coaches?q=...` for autocomplete (used in Phase 4).

**Frontend (Inertia pages):**
- `Pages/Coaches/Index.tsx` — list + filters.
- `Pages/Coaches/Create.tsx`, `Pages/Coaches/Edit.tsx` — option to "Link existing member" via a `MemberPicker` component hitting `/api/v1/search/members`.
- `Pages/Coaches/Show.tsx` — profile mirroring member shell, with placeholder Teams tab.

### Acceptance Criteria
- Coach linked to a member shows that member's PNO + name in coach detail.
- Editing a linked coach's name does NOT change the member's name (independent records).

### Dependencies
Phase 2.

---

# PHASE 4 — Teams, Team-Members, Coach-Assignments

**Goal:** model the per-session team rosters that the legacy `GD KHILADI` / `KUSHAL KHILADI` sheets represent.

### Scope

**Schema:**
- `teams` (id, organization_id, sport_id FK, session_id FK, unit_id FK, name_hi, in_charge_hi, deleted_at). Unique `(organization_id, sport_id, session_id, unit_id, name_hi)`.
- `team_members` (id, team_id FK, member_id FK, session_id FK, role ENUM('PLAYER','CAPTAIN','RESERVE') default 'PLAYER', joined_on, left_on NULLABLE). Unique `(team_id, member_id)`.
- `coach_assignments` (id, team_id FK, coach_id FK, session_id FK, role ENUM('HEAD','ASSISTANT')). Unique `(team_id, coach_id, role)`.

**Routes:**

*Inertia* under `/{locale}/teams`:
- `GET /{locale}/teams` → `Teams/Index` (filtered by session, default = current; embedded counts `players_count`, `coaches_count`).
- `GET /{locale}/teams/create`, `POST /{locale}/teams`, `GET /{locale}/teams/{team}`, `PATCH /{locale}/teams/{team}`, soft `DELETE`.
- `POST /{locale}/teams/{team}/members` (bulk add by member IDs), `DELETE /{locale}/teams/{team}/members/{member}`.
- `POST /{locale}/teams/{team}/coaches`, `DELETE /{locale}/teams/{team}/coaches/{coach}`.

*JSON API*:
- `GET /api/v1/members/{member}/teams` — historical team membership across sessions (drives the member profile "Teams" tab).
- `GET /api/v1/coaches/{coach}/teams` — historical assignments.

**Frontend (Inertia pages):**
- `Pages/Teams/Index.tsx`, `Pages/Teams/Create.tsx`, `Pages/Teams/Show.tsx` (three sections: details, roster with player picker, coaches with coach picker).
- Members `Show.tsx` "Teams" tab now populated.
- Coaches `Show.tsx` "Teams" tab now populated.

### Acceptance Criteria
- A member added to Team A (session 2024-25) and Team B (session 2025-26) shows both in profile, grouped by session.
- Trying to add the same member to the same team twice returns 422.
- Deleting a team is soft; restored team shows correct roster.

### Dependencies
Phases 2, 3.

---

# PHASE 5 — Tournaments, Events, Participations, Achievements

**Goal:** record the medal/achievement data that today lives in `international` / `national` / `all india police` / `other` sheets.

### Scope

**Schema:**
- `tournaments` (id, organization_id, session_id FK, tier_id FK, sport_id FK NULLABLE, name_hi, venue, date_from NULLABLE, date_to NULLABLE, raw_date_text, deleted_at). Indexed on (session_id, tier_id).
- `events` (id, tournament_id FK, sport_id FK, name_hi, discipline, weight_category NULLABLE, gender_class ENUM('M','F','MIXED','OPEN')).
- `participations` (id, event_id FK, member_id FK, team_id FK NULLABLE, session_id FK, position NULLABLE smallint). Unique `(event_id, member_id)`.
- `achievements` (id, participation_id FK, medal_type ENUM('GOLD','SILVER','BRONZE','MERIT'), position smallint, remarks).
- Composite index `achievements(medal_type)`; `participations(session_id, member_id)`.

**Routes:**

*Inertia* under `/{locale}/tournaments`:
- CRUD `Index/Create/Show/Edit`. `Show` has an Events sub-tab.
- `POST /{locale}/tournaments/{tournament}/events` — create event.
- `GET /{locale}/tournaments/{tournament}/events/{event}` → `Events/Show` with a multi-row participants grid (member picker + position + medal). Submission writes participations + optional achievements atomically.
- `GET /{locale}/reports/medals` (interim home for the medals report until Phase 7 reports gallery).

*JSON API*:
- `GET /api/v1/members/{member}/participations` — chronological, grouped by session.
- `GET /api/v1/members/{member}/achievements` — medals summary + list.
- `GET /api/v1/reports/medals?session_id=&sport_id=&tier_id=` — pivot by tier × medal_type (consumed by Phase 7).

**Frontend (Inertia pages):**
- `Pages/Tournaments/{Index,Create,Show}.tsx`.
- `Pages/Events/Show.tsx` — participants grid with inline medal selector.
- Member profile `Show.tsx` "Participations" + "Achievements" tabs populated.

### Acceptance Criteria
- Recording a GOLD for member X in event E creates 1 `participation` + 1 `achievement`.
- Trying to record the same (event, member) twice → 422.
- Member profile shows session-grouped medal count badges (e.g., 2024-25: 🥇2 🥈1).
- `/reports/medals` returns correct counts validated against a fixture.

### Dependencies
Phase 4 (for `team_id` on participations) and Phase 2.

---

# PHASE 6 — Excel Import Pipeline (the migration engine)

**Goal:** ingest the three legacy workbooks AND support ongoing single-sheet uploads. The single highest-risk phase per the analysis.

### Scope

**Schema:**
- `imports` (id, organization_id, uploaded_by FK users, filename, sha256, sheet_count, status ENUM('UPLOADED','PARSING','READY_FOR_REVIEW','APPLYING','COMPLETED','FAILED'), mapping_template jsonb, error_log text, uploaded_at).
- `import_rows` (id, import_id FK, workbook, sheet, row_index, raw_cells jsonb, resolved jsonb, member_id FK NULLABLE, status ENUM('NEW','MATCHED','AMBIGUOUS','APPLIED','REJECTED'), notes).

**Backend services:**
1. `KrutidevConverter` — port the documented Krutidev 010 → Unicode Devanagari mapping. **Per-cell** detection (heuristic: cell contains ≥3 ASCII chars in the Krutidev punctuation set `[ ; ' " ] ` and zero Devanagari → convert). Unit tests with ≥50 reference pairs.
2. `SheetClassifier` — given workbook + sheet, returns one of: `ROSTER_KUSHAL`, `ROSTER_GD`, `COACH_LIST`, `EXITS`, `ACHIEVEMENT_INTL`, `ACHIEVEMENT_NATIONAL`, `ACHIEVEMENT_AIPSC`, `ACHIEVEMENT_OTHER`, `AGGREGATE_IGNORE`, `UNKNOWN_NEEDS_MAPPING`.
3. `SectionScanner` — stateful row walker that emits sections: (banner_text, header_row, data_rows[]). Handles the recurring team-banner pattern in `GD KHILADI` / `KUSHAL KHILADI`.
4. `RowParsers` — one per sheet class. Output staging records (no DB writes yet).
5. `DateParser` — accepts `dd.mm.yyyy`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd-mm-yyyy ls dd-mm-yyyy` (Krutidev "ls" = "से"/from), year-only; returns `{date_from, date_to, raw}`.
6. `CellExtractors`:
   - `extractPno(text)` — regex `PNO[-\s]?(\d{9})` or bare 9-digit numeric.
   - `splitRankName(text)` — returns `{rank, name}` for combined `पद व नाम`.
   - `splitMultiPerson(text)` — splits on `]`, `,`, `;`, `\n`; returns array.
7. `IdentityResolver` — given `{pno?, name?, sport?, session?}` returns one of `{matched_member_id}`, `{candidates: [...]}`, `{none}`. Uses `pg_trgm` similarity ≥ 0.75 threshold.
8. `ImportApplier` — atomic per-row apply: creates/updates `members`, `name_aliases`, `member_status_history`, `teams`, `team_members`, `coach_assignments`, `tournaments`, `events`, `participations`, `achievements`. Idempotent on (event_id, member_id) and (team_id, member_id).

**Workflow (Inertia routes + queued jobs + JSON polling):**
1. `POST /{locale}/imports` (multipart upload) → stores file in S3 (MinIO locally) → status `UPLOADED` → dispatches `ParseImportJob`.
2. `ParseImportJob` runs extractor (re-use `analysis/scripts/extract_workbooks.py` logic ported to PHP via `maatwebsite/excel`, OR shell out to the existing Python script — accept either, document choice in an ADR), classifies sheets, runs row parsers, writes `import_rows`. Status → `READY_FOR_REVIEW`.
3. `GET /{locale}/imports/{import}` (Inertia) → summary + counts by status.
4. `GET /{locale}/imports/{import}/rows?status=AMBIGUOUS&page=...` (Inertia partial reload via `router.reload({ only: ['rows'] })`).
5. `PATCH /{locale}/imports/{import}/rows/{row}` → user resolves: pick a candidate, edit `resolved` JSON, or REJECT.
6. `POST /{locale}/imports/{import}/apply` → dispatches `ApplyImportJob` → applies all `MATCHED` rows atomically per row → status `COMPLETED`.
7. `POST /{locale}/imports/{import}/rollback` (admin, time-windowed 24 h) → reverses via stored compensating actions.
8. *JSON API* for live progress polling: `GET /api/v1/imports/{import}/progress` returns `{status, rows: {new, matched, ambiguous, applied, rejected}, percent}` — consumed by TanStack Query on the import page (3-second interval).

**Frontend (Inertia pages):**
- `Pages/Imports/Index.tsx` — list of imports + statuses + progress badges.
- `Pages/Imports/Create.tsx` — upload wizard: file → sheet detection preview (shows classifier output) → optional mapping override → submit.
- `Pages/Imports/Show.tsx` — tabs:
  - Summary (counts by status, charts).
  - Review queue (table of AMBIGUOUS rows; inline candidate picker calling `/api/v1/search/members`).
  - Diff preview (what will change in DB per row).
  - "Apply" button (admin only) with confirmation modal.
- "Default session" + "default tier" selector required before Apply.
- Live progress bar driven by `/api/v1/imports/{import}/progress`.

### Acceptance Criteria
- Upload `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx` → review queue shows ≥95% of GD/KUSHAL rows as MATCHED (by PNO).
- Upload `2019 se 2025 (1).xlsx` → `international` sheet rows parsed correctly (Krutidev → Unicode validated on 10 random rows), most rows AMBIGUOUS due to missing PNO; reviewer can resolve.
- Re-uploading the same file (same sha256) is blocked at step 1 with a clear error.
- Re-running `Apply` on the same import is idempotent (no duplicate participations).
- Aggregate sheets (`SANKHYATMAK`, `PLAYERS LEVEL`) are auto-classified `AGGREGATE_IGNORE` and not imported.
- Rollback within 24h reverses inserts and reverts updates.

### Dependencies
Phases 2, 3, 4, 5.

---

# PHASE 7 — Reports & Exports

**Goal:** replace the Excel reports staff currently produce by hand.

### Scope

**Reports (each with `?session_id=&sport_id=&unit_id=&tier_id=` filters):**
1. Medal tally by session × tier × sport.
2. Medal tally by member (top-N).
3. Team roster (per team, per session).
4. Resignation/dismissal log (per date range, by status).
5. Unit-wise athlete headcount (replaces `SANKHYATMAK`).
6. Player-level summary (replaces `PLAYERS LEVEL`).
7. New joiners per session.
8. Achievement history per member.

**Routes:**
- Inertia: `GET /{locale}/reports` → `Reports/Index` (gallery); `GET /{locale}/reports/{key}` → `Reports/Show` (filter panel + table + Recharts chart + export buttons).
- Export downloads: `GET /{locale}/reports/{key}/export?format=xlsx|pdf` returns a binary response (queued via `ExportReportJob` for large reports; small ones return inline). Use `maatwebsite/excel` for XLSX, `barryvdh/laravel-dompdf` for PDF. Templates include the bundled Noto Sans Devanagari font.
- JSON API: `GET /api/v1/reports/{key}` returns the same JSON the Inertia page uses (kept for future public API consumers).

**Frontend (Inertia pages):**
- `Pages/Reports/Index.tsx` — gallery cards.
- `Pages/Reports/Show.tsx` — filter panel + responsive table + Recharts chart + "Export Excel" / "Export PDF" buttons (Inertia `<Link>` with `method="get"` triggering a file download).

### Acceptance Criteria
- PDF export contains correctly rendered Devanagari (visual check).
- XLSX export opens in Microsoft Excel with all Hindi text intact.
- Numbers in unit-wise headcount report match a SQL-counted ground truth on the dev seed.

### Dependencies
Phases 2–5.

---

# PHASE 8 — Search Backend Upgrade (Meilisearch)

**Goal:** replace Phase-2 Postgres-only search with Meilisearch v1.13 for sub-100 ms typo-tolerant Hindi search at scale.

### Scope
- `members` index in Meilisearch (via `laravel/scout` v10 + `meilisearch/meilisearch-php` v1.13): doc shape `{ id, member_code, pno, full_name_hi, full_name_en, name_aliases:[], sport_tags:[], unit_name, district_name, current_status, player_level, medal_count, session_tags:[] }`.
- `tournaments` index: `{ id, name_hi, venue, session, tier, sport }`.
- Configure Meilisearch synonyms for Hindi (e.g., `खिलाडी ↔ खिलाड़ी`), typo tolerance.
- Sync strategy: Eloquent model observers dispatch `SyncToSearchJob` on create/update/delete (queued via Horizon).
- One-off `php artisan search:reindex` command.
- The existing `/api/v1/search/members` and a new `/api/v1/search/tournaments` swap implementations; **request and response shapes are unchanged** so all Inertia pages and pickers built in Phases 2–6 keep working without modification.

### Acceptance Criteria
- Searching `खिलाडी` (without nukta) finds 1000 members with `खिलाड़ी` within 100 ms.
- Typo `kabbaddi` finds `कबड्डी` members (via English alias + transliteration).
- Reindex command processes 10k members in < 60 s.

### Dependencies
Phase 2 (members exist), Phase 6 (data volume realistic).

---

# PHASE 9 — Bilingual UI Polish + Localization Coverage

**Goal:** every visible string in two languages; locale-aware formatting.

### Scope
- Audit all UI strings → `resources/lang/hi.json`, `resources/lang/en.json` (Laravel JSON lang files). The chosen locale's bundle is emitted as the Inertia shared prop `translations` and consumed in React via the `t(key, params)` helper. **No literal English/Hindi in JSX.**
- Backend validation/error messages: complete `resources/lang/hi/validation.php` and `lang/en/validation.php`. Form Request error bags returned in the active locale.
- Date display: `dd MMM yyyy` (Hindi: देवनागरी numerals optional toggle, default Arabic numerals).
- Number formatting via `Intl.NumberFormat(locale)`.
- Sidebar / menu / page titles bilingual; PDF / XLSX exports honor caller locale (locale read from URL prefix during the queued export job).
- ESLint rule (custom or `eslint-plugin-react-intl`-style) fails on string literals inside JSX `>...<`.

### Acceptance Criteria
- Toggling language in the header (which PATCHes `users.locale` and redirects to the matching `/{locale}` URL) instantly switches every label on every screen.
- Validation errors from backend appear in the chosen language.
- Lint rule fails on any hard-coded user-facing string; CI rejects such PRs.

### Dependencies
Phases 1–7 UI complete.

---

# PHASE 10 — Audit Logs UI, Backup, Hardening, Demo Polish

**Goal:** make the MVP demo-ready and production-safe.

### Scope
- `/{locale}/audit-logs` Inertia screen (admin): filter by user, entity, date range; diff viewer.
- Daily DB + S3 backup via `spatie/laravel-backup` to S3.
- Rate limiting (Laravel `ThrottleRequests`) on auth and search endpoints.
- Security headers via a single `SecurityHeaders` middleware (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- Sentry integration: `sentry/sentry-laravel` v4 on the backend, `@sentry/react` v9 initialized in `resources/js/app.tsx`.
- Health checks: `/api/health` returns 200 only when DB, Redis, Meilisearch, and S3 are all reachable.
- Empty-state designs for every list screen.
- Demo seeder: realistic 500 members, 50 coaches, 30 teams, 20 tournaments, 200 participations.
- README "Run a demo" section with one-command bootstrap (`make demo`).

### Acceptance Criteria
- Sentry receives a captured exception on a forced 500.
- `/api/health` returns 200 only when all dependencies healthy.
- Demo seeder produces a believable, screenshot-worthy state.

### Dependencies
All previous.

---

# PHASE 11+ — Future Enhancements (post-MVP backlog)

Track each as a separate mini-phase when prioritized; same structure (scope / deliverables / acceptance / dependencies).

| Key | Title | Notes |
|---|---|---|
| F1 | Kit issuance & inventory | New `kit_issuances`, `kit_items`, `kit_stock` tables; per-session distributions. |
| F2 | Sports fund (खेल विकास कोष) ledger | Funds in/out, athlete grants, double-entry. |
| F3 | Tournament bracketing & fixtures | Knockout/round-robin generators per event. |
| F4 | Attendance & fitness tracking | Per-session attendance, fitness benchmark records. |
| F5 | Medical records + document uploads | `documents` table, S3 storage, OCR optional. |
| F6 | Public athlete profile pages | Public read-only `/p/{member_code}`; SEO. |
| F7 | Multi-org tenancy UI | Org switcher, per-org admin, cross-org search. |
| F8 | Mobile app (React Native or PWA) | Field data entry at venues, offline-first. |
| F9 | Notifications (SMS/WhatsApp/email) | Selection notices, schedule alerts. |
| F10 | Analytics dashboards | Medal trends, unit performance, attrition. |
| F11 | Public REST API + API tokens | For federations / partner integrations. |
| F12 | Krutidev-original audit view | Optional toggle showing the original legacy string per imported record. |

---

## Phase Dependency Graph
```
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7
                                                   │
                            P8 ◄──────────────────┘
                            P9 ◄── (after P1..P7 UI)
                           P10 ◄── (after all)
                           P11+ ◄── (post-MVP)
```

## Recommended order for an AI agent
1. **P0 → P1 → P2** in strict sequence (foundation is hard to retrofit).
2. **P3 + P4** can be one combined sprint (coaches schema is small; teams need coach FK).
3. **P5** as a focused sprint (tournaments/events/participations/achievements together — they share validation).
4. **P6** is the largest single phase; budget it as TWO sprints internally (parser + applier; review UI + apply UI).
5. **P7 → P8 → P9 → P10** sequentially.
6. **P11+** as the customer prioritizes.

## How an AI agent should consume this document
For each phase:
1. Read the phase's Scope, Deliverables, Acceptance Criteria, Dependencies.
2. Re-read Global Conventions before writing code.
3. Reference [MIGRATION_ANALYSIS.md](MIGRATION_ANALYSIS.md) §7 (Data Quality Audit) and [hindi_entity_dictionary.csv](hindi_entity_dictionary.csv) for any import work.
4. Build in this order: **migrations + seeders → factories → models + Policies → Form Requests → Services / Actions → Controllers → API Resources → Inertia Pages + Components → Pest Feature tests → Vitest component tests → Pest Browser E2E**.
5. Verify the Definition of Done checklist before declaring the phase complete.
6. Record any architectural decisions in `/docs/adr/NNNN-title.md`.
