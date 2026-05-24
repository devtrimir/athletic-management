# Master Backlog

Every phase from [PHASED_REQUIREMENTS.md](../analysis/report/PHASED_REQUIREMENTS.md) decomposed into **atomic, reviewable tasks**. One task ≈ one PR.

**Task ID format:** `P<phase>-T<seq>`. Always reference this ID in branches, commits, and PRs (see [WORKFLOW.md](WORKFLOW.md)).

**Sizing rules** — if any of these is true, **split the task**:
- Diff likely > 400 LOC
- Touches > 6 files outside of generated/migration code
- More than 2 new migrations
- Bundles backend + frontend + tests for a non-trivial feature (split into BE / FE / tests)

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Project Bootstrap

See [phases/P00-bootstrap.md](phases/P00-bootstrap.md) for the full breakdown.

- [x] ~~**P0-T01** Provision local infra~~ — **skipped**: using **Laravel Herd** for MySQL 8.4 + Redis + Meilisearch + Mailpit locally (no docker-compose needed)
- [x] ~~**P0-T02** Install PHP 8.4 + Laravel installer~~ — **done before workflow**: starter kit installed, Fortify + Wayfinder + Boost wired (small follow-up: bump `composer.json` `php: ^8.3 → ^8.4`, rename package from `laravel/react-starter-kit`)
- [x] **P0-T03** Install **Horizon** (`laravel/horizon:^5`) + **Larastan** (`larastan/larastan:^3` dev); run `horizon:install`. Other packages installed when first needed: Spatie Query Builder → P1, `maatwebsite/excel` → P3, Scout + Meilisearch PHP → P8, DomPDF → P7, `spatie/laravel-backup` + Sentry → P10. **Dropped:** Activitylog (P1-T24 uses an in-house observer on `audit_logs` instead).
- [x] **P0-T04** Add remaining NPM packages (`recharts`; verify pre-installed: `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `babel-plugin-react-compiler`) — forms use Inertia `useForm`, ad-hoc requests use Inertia `useHttp` (no react-hook-form / zod / TanStack Query). Note: `vite@^8` installed (not ^7).
- [x] **P0-T05** Self-host fonts (Noto Sans Devanagari, Inter) under `resources/fonts/`; wire into Tailwind v4 `@theme`
- [x] **P0-T06** Project config files (`.editorconfig`, `.prettierrc`, `eslint.config.js` flat, `phpstan.neon` (Larastan level 6), `pint.json` already present — verify). Also: bump `composer.json` `php: ^8.3 → ^8.4`; rename package; confirm `.env` `DB_CONNECTION=mysql` + `mysql.collation=utf8mb4_0900_ai_ci`.
- [x] **P0-T07** `GET /api/health` endpoint + smoke test
- [x] ~~**P0-T08** GitHub Actions CI (php-test, php-lint via Pint, php-static via Larastan, js-test, js-lint, js-type, js-build, migration-fresh, coverage)~~ — **skipped**: deferred to DevOps phase; not blocking feature work
- [x] ~~**P0-T09** Renovate config (`renovate.json`) — grouped weekly, immediate security~~ — **skipped**: deferred to DevOps phase
- [x] ~~**P0-T10** PR template + CODEOWNERS + commitlint config~~ — **skipped**: deferred to DevOps phase
- [ ] ~~**P0-T11** `Makefile`~~ — **removed**: existing `composer run dev` / `composer test` / `composer ci:check` cover this
- [x] **P0-T12** Inertia `SetLocale` middleware stub (session-based locale, no URL prefix, default `hi`)
- [x] **P0-T13** ADR-0001 (monolith vs split), ADR-0002 (Excel library choice)

---

## Phase 1 — Foundation: Multi-Tenancy, Auth, RBAC, Reference Data

See [phases/P01-foundation.md](phases/P01-foundation.md) for the full breakdown.

### Schema
- [x] **P1-T01** Migration: `organizations`
- [x] **P1-T02** Migration: extend `users` (`organization_id`, `locale`)
- [x] **P1-T03** Migration: `roles`, `permissions`, `role_permission`, `user_role`
- [x] **P1-T04** Migration: `districts`
- [x] **P1-T05** Migration: `sessions` (academic/sports sessions, **not** Laravel sessions)
- [x] **P1-T06** Migration: `sports`
- [x] **P1-T07** Migration: `units`
- [x] **P1-T08** Migration: `tournament_tiers`
- [x] **P1-T09** Migration: `audit_logs`

### RBAC engine (in-house)
- [x] **P1-T10** `App\Auth\Rbac` service (`userHasPermission`, `userRoles`, `userPermissions`) with Redis cache + invalidation hooks
- [x] **P1-T11** `HasRoles` trait on `User` (`hasRole`, `hasAnyRole`, `assignRole`, `revokeRole`)
- [x] **P1-T12** `AuthServiceProvider::boot` — `Gate::before` for `admin`, auto-`Gate::define` per permission code
- [x] **P1-T13** Route middlewares: `role:` (any-of) and `permission:` (any-of)
- [x] **P1-T14** `config/rbac.php` declarative catalog + `php artisan rbac:sync` command
- [x] **P1-T15** Per-resource Policy stubs (MemberPolicy, CoachPolicy, TeamPolicy, TournamentPolicy, ImportPolicy, ReportPolicy, SettingsPolicy)

### Multi-tenancy + locale
- [x] **P1-T16** `BelongsToOrganization` global scope + `EnsureOrganizationScope` middleware
- [x] **P1-T17** `SetLocale` middleware (session → `users.locale` → default `hi`)
- [x] **P1-T18** `HandleInertiaRequests` shared props: `auth.user`, `auth.permissions`, `locale`, `translations`, `flash`

### Seeders
- [x] **P1-T19** Seeder: default org `UPP` + admin user
- [x] **P1-T20** Seeder: 75 UP districts (hi + en)
- [x] **P1-T21** Seeder: 5 tournament tiers
- [x] **P1-T22** Seeder: ~30 sports
- [x] **P1-T23** Seeder: sessions `2019-20` … `2026-27`, current = `2026-27`

### Audit
- [x] **P1-T24** `App\Services\AuditLogger` (in-house) on top of the P1-T09 `audit_logs` table; global Eloquent observer writes `created/updated/deleted` diffs for whitelisted models

### Reference-data CRUD (BE + FE per resource)
- [x] **P1-T25** Sessions: Form Requests + Controller + Policy + Inertia pages (Index/Create/Edit)
- [x] **P1-T26** Sports: same
- [x] **P1-T27** Units: same
- [x] **P1-T28** Districts: same
- [x] **P1-T29** TournamentTiers: same
- [x] **P1-T30** JSON `/api/v1` read endpoints for `tournament-tiers`, `sports`, `units`, `districts` (autocomplete sources)

### Frontend shell
- [x] **P1-T31** `Layouts/AppLayout.tsx` (sidebar nav + topbar + user menu)
- [x] **P1-T32** Locale switcher (PATCH `users.locale` → updates session locale, no URL redirect)
- [x] **P1-T33** Auth pages restyle (Login, ForgotPassword) to match the app shell

### Tests
- [x] **P1-T34** Pest: RBAC matrix (admin / data_entry / viewer × every gated route)
- [x] **P1-T35** Pest: org-scope leakage tests (user from org A cannot read org B data)
- [x] **P1-T36** Pest: audit log fires on every reference-data write
- [x] ~~**P1-T37** Vitest: AppLayout + locale switcher behavior~~ — **moved** to Phase FT (manual testing for frontend; Vitest batch deferred)

---

## Phase 2 — Members Module

See [phases/P02-members.md](phases/P02-members.md) for the full breakdown.

### Schema + helpers
- [x] **P2-T01** Migration: `members` (all columns, soft-delete, indexes)
- [x] **P2-T02** Migration: `name_aliases`
- [x] **P2-T03** Migration: `member_status_history`
- [x] **P2-T04** MySQL stored function `normalize_devanagari(text)` + generated column / trigger to fill `*_normalized`
- [x] **P2-T05** FULLTEXT indexes (`WITH PARSER ngram`) on `full_name_normalized`, `alias_normalized`

### Services
- [x] **P2-T06** `MemberCodeGenerator` service (per-org/year sequence, advisory-locked)
- [x] **P2-T07** Factory + seeded 10k member fixture for perf tests

### Backend (Inertia + API)
- [x] **P2-T08** `MemberPolicy` rules wired to permissions
- [x] **P2-T09** Form Requests: `StoreMemberRequest`, `UpdateMemberRequest`, `ChangeStatusRequest`, `StoreAliasRequest`
- [x] **P2-T10** `MemberController` Inertia actions (index, create, store, show, edit, update, destroy)
- [x] **P2-T11** `MemberStatusController` (POST status change → writes history)
- [x] **P2-T12** `MemberAliasController` (POST / DELETE aliases)
- [x] **P2-T13** API: `GET /api/v1/search/members` (MySQL FULLTEXT ngram + PNO exact, top-50, < 300 ms on 10k)
- [x] **P2-T14** Member model `statusHistory()`/`aliases()` HasMany + `MemberResource` Inertia props + `MemberController::show()` deferred props (contradicts separate API — see ADR-0001)

### Frontend
- [x] **P2-T15** `Pages/Members/Index.tsx` (paginated table + filter panel)
- [x] **P2-T16** `Components/MemberPicker.tsx` (debounced search via Inertia `useHttp`; reused in P3/P4/P5/P6)
- [x] **P2-T17** `Pages/Members/Create.tsx` (Inertia `useForm` + Zod mirror)
- [x] **P2-T18** `Pages/Members/Edit.tsx`
- [x] **P2-T19** `Pages/Members/Show.tsx` shell with tabs (Overview, StatusHistory, Aliases; Teams/Participations/Achievements stubs)
- [x] **P2-T20** `Components/StatusChangeModal.tsx`
- [x] **P2-T21** `Components/AliasInlineForm.tsx`

### Tests
- [x] **P2-T22** Pest Feature: CRUD happy + 422 + 403 matrices
- [x] **P2-T23** Pest Feature: search returns matches across normalization (typo + Krutidev alias)
- [x] **P2-T24** Pest Unit: `MemberCodeGenerator` (uniqueness under concurrency)
- [x] ~~**P2-T25** Pest Browser: full member create → show → edit → status change → soft-delete flow~~ — **skipped**: manual browser testing instead
- [x] ~~**P2-T26** Vitest: `MemberPicker`, `StatusChangeModal`~~ — **moved** to Phase FT

---

## Phase 3 — Coaches Module

- [x] **P3-T01** Migration: `coaches` (incl. nullable `member_id` FK, unique `(org, pno)` where pno not null)
- [x] **P3-T02** Factory + seeder fixtures
- [x] **P3-T03** `CoachPolicy`
- [x] **P3-T04** Form Requests + `CoachController` (Inertia CRUD)
- [x] **P3-T05** API: `GET /api/v1/search/coaches`
- [x] **P3-T06** `Pages/Coaches/Index.tsx`
- [x] **P3-T07** `Pages/Coaches/Create.tsx` + `Edit.tsx` (with `MemberPicker` for optional link)
- [x] **P3-T08** `Pages/Coaches/Show.tsx` (profile shell, Teams tab stubbed)
- [x] **P3-T09** Pest Feature: CRUD + linked-vs-standalone behavior
- [x] **P3-T10** Pest Feature: editing linked coach's name does not mutate the member

---

## Phase 4 — Teams, Team-Members, Coach-Assignments

### Schema
- [x] **P4-T01** Migration: `teams` + unique composite + soft-delete
- [x] **P4-T02** Migration: `team_members` + unique `(team_id, member_id)`
- [x] **P4-T03** Migration: `coach_assignments` + unique `(team_id, coach_id, role)`

### Backend
- [x] **P4-T04** `TeamPolicy`
- [x] **P4-T05** Form Requests + `TeamController` (Inertia CRUD with embedded counts)
- [x] **P4-T06** `TeamMemberController` (bulk add by IDs, remove)
- [x] **P4-T07** `TeamCoachController` (add / remove)
- [x] **P4-T08** API: `GET /api/v1/members/{member}/teams`, `GET /api/v1/coaches/{coach}/teams`

### Frontend
- [x] **P4-T09** `Pages/Teams/Index.tsx` (default-current-session filter)
- [x] **P4-T10** `Pages/Teams/Create.tsx`
- [x] **P4-T11** `Pages/Teams/Show.tsx` (details + roster + coaches sections)
- [x] **P4-T12** Wire Members `Show` Teams tab + Coaches `Show` Teams tab

### Tests
- [x] **P4-T13** Pest Feature: duplicate-add returns 422
- [x] **P4-T14** Pest Feature: cross-session membership shows correctly grouped in profile
- [x] ~~**P4-T15** Pest Browser: build a team end-to-end~~ — **skipped**: manual browser testing instead

---

## Phase 5 — Tournaments, Events, Participations, Achievements

### Schema
- [x] **P5-T01** Migration: `tournaments` (+ soft-delete, indexes)
- [x] **P5-T02** Migration: `events`
- [x] **P5-T03** Migration: `participations` + unique `(event_id, member_id)`
- [x] **P5-T04** Migration: `achievements` + composite index

### Backend
- [x] **P5-T05** `TournamentPolicy`
- [x] **P5-T06** Form Requests + `TournamentController` (Inertia CRUD)
- [x] **P5-T07** `EventController` (create event)
- [x] **P5-T08** `EventParticipantController` (transactional bulk write of participations + optional achievements)
- [x] **P5-T09** API: members participations + achievements endpoints
- [x] **P5-T10** API: `GET /api/v1/reports/medals` (tier × medal_type pivot)

### Frontend
- [x] **P5-T11** `Pages/Tournaments/Index.tsx`, `Create.tsx`, `Show.tsx` (Events sub-tab)
- [x] **P5-T12** `Pages/Events/Show.tsx` participants grid (inline medal selector)
- [x] **P5-T13** Wire Member `Show` Participations + Achievements tabs
- [ ] **P5-T14** Interim `Pages/Reports/Medals.tsx`

### Tests
- [ ] **P5-T15** Pest Feature: duplicate (event, member) → 422; idempotent bulk
- [ ] **P5-T16** Pest Feature: medals pivot matches fixture ground truth
- [ ] **P5-T17** Pest Browser: record a medal end-to-end

---

## Phase 6 — Excel Import Pipeline (split into 6 sub-sprints)

This is the largest single phase — broken into 6 logical sub-sprints.

### Sub-sprint 6A — Schema + storage
- [ ] **P6-T01** Migration: `imports`
- [ ] **P6-T02** Migration: `import_rows`
- [ ] **P6-T03** S3 (MinIO) upload action + signed URL helper

### Sub-sprint 6B — Parser core (services, no DB writes)
- [ ] **P6-T04** `KrutidevConverter` + ≥50 reference-pair unit tests (ADR-0005: per-cell detection heuristic)
- [ ] **P6-T05** `DateParser` (all documented formats incl. Krutidev "ls" = "से")
- [ ] **P6-T06** `CellExtractors`: `extractPno`, `splitRankName`, `splitMultiPerson` (+ unit tests)
- [ ] **P6-T07** `SheetClassifier` (returns one of 10 classes; tests against real `analysis/raw_*` samples)
- [ ] **P6-T08** `SectionScanner` (stateful banner + header + data rows walker)
- [ ] **P6-T09** `RowParsers` per sheet class (output staging records)

### Sub-sprint 6C — Identity resolution
- [ ] **P6-T10** `IdentityResolver` (PNO exact → name FULLTEXT ngram score ≥ threshold + Levenshtein tie-break → ambiguous candidates)
- [ ] **P6-T11** Resolver unit tests against curated fixtures (must include known Krutidev edge cases)

### Sub-sprint 6D — Applier (DB writes, idempotent)
- [ ] **P6-T12** `ImportApplier` core (transactional per-row, idempotency keys for participations + team_members)
- [ ] **P6-T13** Compensating-action log for rollback
- [ ] **P6-T14** `ApplyImportJob` (Horizon-queued)
- [ ] **P6-T15** `RollbackImportAction` (24 h time-window, admin-gated)

### Sub-sprint 6E — Workflow (HTTP + jobs)
- [ ] **P6-T16** `POST /imports` upload + `ParseImportJob` dispatch (sha256 dedupe)
- [ ] **P6-T17** `ImportRowController` (PATCH to resolve / reject)
- [ ] **P6-T18** `POST /imports/{id}/apply` and `POST /imports/{id}/rollback` (Policy-gated)
- [ ] **P6-T19** API: `GET /api/v1/imports/{id}/progress` (live counts for polling)

### Sub-sprint 6F — Review UI
- [ ] **P6-T20** `Pages/Imports/Index.tsx`
- [ ] **P6-T21** `Pages/Imports/Create.tsx` (upload wizard + sheet-detection preview + mapping override)
- [ ] **P6-T22** `Pages/Imports/Show.tsx` — Summary tab (counts + Recharts)
- [ ] **P6-T23** `Pages/Imports/Show.tsx` — Review queue tab (ambiguous rows + inline `MemberPicker`)
- [ ] **P6-T24** `Pages/Imports/Show.tsx` — Diff preview tab
- [ ] **P6-T25** Live progress bar (Inertia polling, 3 s interval)
- [ ] **P6-T26** Pest Browser: upload → review → apply → verify happy path against the `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx` fixture
- [ ] **P6-T27** Pest Feature: re-upload (same sha256) blocked; re-apply idempotent

---

## Phase 7 — Reports & Exports

- [ ] **P7-T01** `ReportPolicy` + shared filter trait (`session_id`, `sport_id`, `unit_id`, `tier_id`)
- [ ] **P7-T02** Service: MedalTallyReport (session × tier × sport)
- [ ] **P7-T03** Service: MedalsByMemberReport (top-N)
- [ ] **P7-T04** Service: TeamRosterReport
- [ ] **P7-T05** Service: ResignationDismissalLogReport
- [ ] **P7-T06** Service: UnitHeadcountReport (replaces `SANKHYATMAK`)
- [ ] **P7-T07** Service: PlayerLevelSummaryReport (replaces `PLAYERS LEVEL`)
- [ ] **P7-T08** Service: NewJoinersReport
- [ ] **P7-T09** Service: AchievementHistoryReport
- [ ] **P7-T10** `ReportController` Inertia (`Index`, `Show`)
- [ ] **P7-T11** `ExportReportJob` (XLSX via `maatwebsite/excel`)
- [ ] **P7-T12** `ExportReportJob` (PDF via DomPDF with Noto Sans Devanagari embedded)
- [ ] **P7-T13** API mirror: `GET /api/v1/reports/{key}`
- [ ] **P7-T14** `Pages/Reports/Index.tsx` gallery + `Pages/Reports/Show.tsx` (filter + table + Recharts + export buttons)
- [ ] **P7-T15** Pest Feature: numbers match SQL-counted ground truth
- [ ] **P7-T16** Visual check: PDF Devanagari renders correctly

---

## Phase 8 — Search Backend Upgrade (Meilisearch)

- [ ] **P8-T01** Configure Scout + Meili driver; env wiring
- [ ] **P8-T02** Searchable trait on `Member` (doc shape per spec)
- [ ] **P8-T03** Searchable trait on `Tournament`
- [ ] **P8-T04** Meili index settings: synonyms (`खिलाडी ↔ खिलाड़ी`, …), typo tolerance, filterable attrs
- [ ] **P8-T05** `SyncToSearchJob` (queued via Horizon) + model observers
- [ ] **P8-T06** `php artisan search:reindex` command (chunked, < 60 s for 10k)
- [ ] **P8-T07** Swap `/api/v1/search/members` and `/api/v1/search/tournaments` implementations (contracts unchanged)
- [ ] **P8-T08** Pest Feature: contract parity vs Phase-2 (golden response fixtures)
- [ ] **P8-T09** Perf test: < 100 ms search on 10k members

---

## Phase 9 — Bilingual UI Polish + Localization Coverage

- [ ] **P9-T01** Audit all JSX → extract literals to `resources/lang/{hi,en}.json`
- [ ] **P9-T02** `resources/lang/hi/validation.php` + `lang/en/validation.php`
- [ ] **P9-T03** Add ESLint rule: fail on JSX text literals
- [ ] **P9-T04** Sidebar / menu / page titles bilingual
- [ ] **P9-T05** Locale-aware date formatting (`dd MMM yyyy`, Devanagari numerals toggle)
- [ ] **P9-T06** Export jobs honor caller locale (read from session at dispatch)
- [ ] **P9-T07** Pest Browser: toggle locale on each top-level page

---

## Phase 10 — Audit Logs UI, Backup, Hardening, Demo Polish

- [ ] **P10-T01** `Pages/AuditLogs/Index.tsx` (filter + diff viewer; admin only)
- [ ] **P10-T02** `spatie/laravel-backup` config + scheduled daily DB + S3 backup
- [ ] **P10-T03** Rate limiting on auth + search routes
- [ ] **P10-T04** `SecurityHeaders` middleware (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] **P10-T05** Sentry backend (`sentry/sentry-laravel`)
- [ ] **P10-T06** Sentry frontend (`@sentry/react`)
- [ ] **P10-T07** Health check upgraded: DB + Redis + Meili + S3 reachability
- [ ] **P10-T08** Empty-state designs for every list screen
- [ ] **P10-T09** `DemoSeeder` (500 members, 50 coaches, 30 teams, 20 tournaments, 200 participations)
- [ ] **P10-T10** README "Run a demo" section + `make demo`
- [ ] **P10-T11** Smoke E2E covering every top-level page (admin role)

---

## Phase FT — Frontend Component Tests (Vitest)

All Vitest component/unit tests are batched here. Frontend flows are validated manually during development; this phase runs as a dedicated sprint once enough components exist to make the setup worthwhile.

- [ ] **FT-T01** Setup: `vitest.config.ts`, `resources/js/tests/setup.ts`, `@/` alias, `@testing-library/jest-dom` — _packages already installed_
- [ ] **FT-T02** `LocaleSwitcher` — renders both buttons; active has `aria-pressed`; click inactive calls `router.patch`; click active is a no-op
- [ ] **FT-T03** `NavMain` — renders items with correct hrefs; active URL sets `data-active`; group label renders
- [ ] **FT-T04** `AppLayout` / `AppSidebar` — smoke-render; sidebar item list matches `mainNavItems` + `referenceDataNavItems`
- [ ] **FT-T05** `MemberPicker` — debounced input fires `useHttp`; results render; selecting fires `onSelect` callback
- [ ] **FT-T06** `StatusChangeModal` — open/close; form submits with correct payload; validation errors display
- [ ] **FT-T07** Add `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` scripts to `package.json`; update `docs/STACK.md` with installed Vitest version

---

## Phase 11+ — Future (post-MVP, not scheduled)

Tracked at high level only. Each becomes its own phase file when prioritized.

- F1 Kit issuance & inventory
- F2 Sports fund ledger
- F3 Tournament bracketing
- F4 Attendance & fitness
- F5 Medical records + document uploads
- F6 Public athlete profile pages
- F7 Multi-org tenancy UI
- F8 Mobile app / PWA
- F9 Notifications (SMS/WA/email)
- F10 Analytics dashboards
- F11 Public REST API + tokens (Sanctum)
- F12 Krutidev-original audit view
