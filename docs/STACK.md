# Stack & Pinned Versions

Single source of truth for "what version are we on". Update this file in the same PR that bumps a major version. Minor/patch updates do not require an edit here unless the upgrade was non-trivial.

Last verified: 2026-05.

## Runtime

| Tech | Version | Notes |
|---|---|---|
| PHP | 8.4.x | Installed via `php.new` or Herd. Required: `pdo_mysql`, `redis`, `intl`, `gd`, `zip`, `bcmath`. |
| Node | 22 LTS | Engines pinned in `package.json`. |
| MySQL | 8.4 LTS | `utf8mb4` charset, `utf8mb4_0900_ai_ci` collation, `innodb_ft_min_token_size=1`, ngram parser for FULLTEXT (P2 Hindi search). |
| Redis | 8 | Used for cache, session, queue (Horizon). |
| Meilisearch | v1.13 | Phase 8+. |
| MinIO / S3 | latest | S3-compatible object storage. |
| Mailpit | latest | Local mail capture. |

## Backend (Composer)

| Package | Constraint | Phase introduced |
|---|---|---|
| laravel/framework | ^13.0 | P0 |
| inertiajs/inertia-laravel | ^3.0 | P0 (via React starter kit) |
| laravel/horizon | ^5.0 | P0-T03 |
| laravel/scout | ^10.0 | P8 |
| meilisearch/meilisearch-php | ^1.13 | P8 |
| spatie/laravel-query-builder | ^6.0 | P1 |
| spatie/laravel-backup | ^9.0 | P10 |
| barryvdh/laravel-dompdf | ^3.0 | P7 |
| maatwebsite/excel | ^3.1 | P3 — ADR-0002 |
| sentry/sentry-laravel | ^4.0 | P10 |
| laravel/boost | ^2.0 | dev, P0 (AI agent helper, already installed) |
| larastan/larastan | ^3.0 | dev, P0-T03 |
| laravel/pint | ^1.0 | dev, P0 (already installed) |
| pestphp/pest | ^4.0 | dev, P0 (already installed) |

Explicitly **NOT** used:
- `spatie/laravel-permission` — RBAC is in-house (see PHASED_REQUIREMENTS P1, ADR-0003).
- `laravel/sanctum` for the SPA — session auth via the Inertia React starter kit. Sanctum may be added in F11 for the public API.
- `spatie/laravel-activitylog` — audit logging is in-house via P1-T24 `AuditLogger` writing to `audit_logs` (avoids dependency for a single observer's worth of code).
- `react-hook-form`, `zod`, `@tanstack/react-query` — Inertia `useForm` + `useHttp` own data flow; Laravel Form Requests own validation. No client-side schema layer needed.

## Frontend (npm)

| Package | Constraint | Notes |
|---|---|---|
| react | ^19.0 | React compiler enabled |
| react-dom | ^19.0 | |
| @inertiajs/react | ^3.0 | |
| typescript | ^5.7 | strict mode |
| vite | ^8.0 | |
| @vitejs/plugin-react | ^5.0 | |
| laravel-vite-plugin | ^3.0 | |
| tailwindcss | ^4.0 | CSS-first config via `@theme` |
| @tailwindcss/vite | ^4.0 | |
| babel-plugin-react-compiler | ^1.0 | React 19 compiler, wired in `vite.config.ts` |
| recharts | ^3.0 | P0-T04 |
| lucide-react | latest | |
| clsx, tailwind-merge, class-variance-authority | latest | shadcn/ui deps |
| vitest | ^2.0 | |
| @testing-library/react | latest | |
| eslint | ^9.0 | flat config |
| prettier | ^3.0 | |

## Upgrade rules

- **Patch**: auto-merge via Renovate after CI green.
- **Minor**: Renovate PR, human review, no ADR needed.
- **Major**: requires an ADR documenting motivation, blast radius, and rollout plan.
