# Phase 1 — Foundation

> Source spec: [PHASED_REQUIREMENTS.md → PHASE 1](../../analysis/report/PHASED_REQUIREMENTS.md). Read it first.

**Goal:** multi-tenancy, session auth, in-house RBAC, reference data, audit logging — the foundation every later phase rests on.

**Exit criteria:** all acceptance criteria in the source spec for Phase 1 pass; RBAC matrix test green; reference-data CRUD usable by an admin.

---

## Task ordering (build in this order — earlier tasks unblock later ones)

```
Schema (T01..T09)
  └─► RBAC engine (T10..T15)
        └─► Multi-tenancy + locale (T16..T18)
              └─► Seeders (T19..T23)
                    └─► AuditLogger (T24)
                          └─► Per-resource CRUD (T25..T29) — parallelizable
                                └─► JSON API endpoints (T30)
                                      └─► Frontend shell (T31..T33) — parallelizable
                                            └─► Tests (T34..T37)
```

---

## Detailed task notes

### Schema (P1-T01 … P1-T09)
Each task = one migration + matching Eloquent model stub + factory. Keep model annotations (Larastan) accurate. **Every migration must have a working `down()`** — CI verifies via `migrate:rollback`.

Columns called out in PHASED_REQUIREMENTS take priority. Add these to every domain table:
- `id` bigint PK
- `organization_id` FK (where applicable) — indexed
- `created_at`, `updated_at`
- `deleted_at` only where the spec calls for soft-delete

### RBAC engine (P1-T10 … P1-T15)
The most subtle part of this phase. Build in this micro-order:

1. **T10** Service first (`App\Auth\Rbac`) — pure functions over Eloquent, Redis-cached per (user, org).
2. **T11** Trait next — thin wrapper over the service.
3. **T12** Wire `AuthServiceProvider::boot` — `Gate::before` for `admin`; auto-discover permissions on boot and `Gate::define` each one. Cache via `php artisan permission:cache`.
4. **T13** Two route middlewares: `role` and `permission`. Both accept pipe-delimited any-of.
5. **T14** Declarative catalog in `config/rbac.php`; idempotent `rbac:sync` command run on deploy.
6. **T15** Policy stubs returning `$user->can('permission.code')` — never hard-code role names in policies.

> ADR-0003: "RBAC in-house (not `spatie/laravel-permission`)" — file with this task.

### Multi-tenancy + locale (P1-T16 … P1-T18)
- `BelongsToOrganization` global scope auto-applied via a `Tenanted` trait on models that have `organization_id`. Document the **escape hatch** (`Model::withoutGlobalScope(...)`) and where it's allowed (background reindex jobs only).
- `SetLocale` already stubbed in P0-T12 — extend to read from `users.locale` for authenticated requests.
- `HandleInertiaRequests`: include `auth.permissions: string[]` so the React side can hide affordances.

### Seeders (P1-T19 … P1-T23)
- Districts: drive from a CSV checked into `database/data/up_districts.csv` (source: official UP gov list). Hindi + English.
- Sports: drive from `database/data/sports.csv` populated from `analysis/report/hindi_entity_dictionary.csv`.
- Sessions: programmatically generate `2019-20` … `2026-27`; mark `2026-27` `is_current = true`.
- Admin user: env-driven (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`); fail if env not set in non-local environments.

### Reference-data CRUD (P1-T25 … P1-T29)
Each resource is **one task** with this internal slice:
- Form Requests (`Store*Request`, `Update*Request`)
- Policy methods (`viewAny`, `view`, `create`, `update`, `delete`)
- Controller (Inertia)
- Inertia pages: `Index.tsx`, `Create.tsx`, `Edit.tsx`
- Pest Feature test (CRUD happy path)

If any single resource grows beyond ~400 LOC diff, split BE / FE into separate tasks.

### Tests (P1-T34 … P1-T37)
- **T34 (RBAC matrix)** is the most important test in this phase. Table-driven: for each role × every gated route, assert expected HTTP status.
- **T35** must include cross-org leak attempts on every reference-data endpoint.

---

## Phase 1 routes / pages added

> Update in the same PR that adds the route/page.

| Route | Type | Handler / Page |
|---|---|---|
| `GET /{locale}/login` … | web | starter kit (restyled) |
| `GET /{locale}/settings/sessions` … | web | `Settings/Sessions/*` |
| `GET /{locale}/settings/sports` … | web | `Settings/Sports/*` |
| `GET /{locale}/settings/units` … | web | `Settings/Units/*` |
| `GET /{locale}/settings/districts` … | web | `Settings/Districts/*` |
| `GET /{locale}/settings/tournament-tiers` … | web | `Settings/TournamentTiers/*` |
| `GET /api/v1/tournament-tiers` | API | autocomplete |
| `GET /api/v1/sports` | API | autocomplete |
| `GET /api/v1/units` | API | autocomplete |
| `GET /api/v1/districts` | API | autocomplete |
