# 0001. Monolith with Inertia + React (vs split API + Next.js)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @devtrimir
- Related task: P0-T13

## Context

The UP Police Sports Unit management system manages athlete rosters, coach assignments, team
composition, tournaments, and achievement records for ~1,000 athletes and ~50 coaches. Users are
internal staff operating from a single organisation.

We need to choose between:

1. **Monolith** — Laravel handles routing, auth, validation, and data fetching. Inertia v3 bridges
   the server to React page components without a separate JSON API layer.
2. **Split API + Next.js** — Laravel exposes a versioned JSON API; a separate Next.js frontend
   consumes it over HTTP.

Constraints:
- Small team; the domain model is actively being designed (P0–P4 foundations still in progress).
- All users are authenticated internal staff; no public consumer API required.
- Domain is forms-heavy CRUD with complex server-side validation (Form Requests).
- Devanagari (Hindi) UI from P9 forward — shared translation keys must live in one place.

## Decision

**Monolith with Inertia v3 + React 19 (TypeScript strict, React Compiler enabled).**

Laravel owns routing, authentication (Fortify), authorisation (in-house RBAC — ADR-0003),
validation (Form Requests), and data access (Eloquent). Inertia passes Eloquent/DTO props directly
to React page components as typed JSON — no REST contract, no serialisation ceremony.

## Consequences

- **Positive:** Single repo, single deployment unit, single CI pipeline. Form validation errors
  flow from Form Requests directly to React `useForm` without a client-side schema mirror.
  Session-based auth with Fortify works without CORS or token management. Developer context stays
  in one language boundary. Wayfinder auto-generates typed route/action helpers so there are no
  hardcoded URLs on the frontend.
- **Negative / costs:** Not a public API — adding a native mobile app later requires exposing
  `/api/v1` endpoints behind Sanctum tokens at that time (out of scope, not planned).
  Inertia SSR (via `@inertiajs/vite`) adds Node.js to the production process if ever enabled.
- **Follow-ups:** If a consumer API is required in the future, add versioned API routes under
  `/api/v1` without touching the Inertia layer.

## Alternatives considered

- **Split API (Laravel) + Next.js frontend** — Rejected: adds CORS configuration, Sanctum SPA
  tokens or JWT, a second deployment target, duplicated env management, and forces an API contract
  before the domain model is stable. The cost is proportional to team size; for a small team it is
  pure overhead.
- **Laravel Blade + Alpine.js / Livewire** — Rejected: team wants TypeScript + React Compiler for
  type-safe component reuse, richer interactive UI (recharts dashboards, drag-and-drop roster
  management), and consistent front-end testing via Vitest.
