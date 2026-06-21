---
name: route-backed-tabs-refactor
description: "Use when refactoring a Laravel Inertia React module show/profile page that has many tabs, slow initial loading, deferred props, or client/API-fed tab content into route-backed Inertia web tab pages. Trigger for requests like split tabs into pages, make tabs URL-backed, reduce show page payload, avoid API integration in the monolith, share tab payload logic, or reuse this pattern across members, coaches, teams, tournaments, reports, or other modules."
---

# Route-Backed Tabs Refactor

## Core Pattern

Refactor heavy tabbed show pages into separate web routes that render the same Inertia component shell with an `activeTab` prop and tab-specific payloads. Keep the UI visually stable, but make the initial overview route lean.

Default to Laravel web controllers + Inertia props. Keep JSON APIs for external contracts, autocomplete/search, or interactions that truly need JSON without a full Inertia visit.

## Required Companion Skills

Also use these skills when they apply:

- `laravel-best-practices` for controllers, services, policies, redirects, and request validation.
- `inertia-react-development` for Inertia pages, links, forms, deferred props, and route visits.
- `wayfinder-development` for route helper imports and regeneration.
- `tailwindcss-development` when tab markup or component styling changes.
- `pest-testing` for route, authorization, payload, and redirect tests.

## Workflow

1. **Map the current show page**
   - Inspect routes, controller `show()`, the Inertia page, tab components, API calls, deferred props, mutation redirects, and tests.
   - Identify heavy props loaded on initial show: history, teams, participations, achievements, promotions, media, audit log, performance, reports, or large reference lists.
   - Check existing generated Wayfinder imports before choosing route helper names.

2. **Create route-backed tab endpoints**
   - Keep the canonical `show` route as the overview page.
   - Add web routes like:
     - `{resource}/{model}` -> overview
     - `{resource}/{model}/teams`
     - `{resource}/{model}/events`
     - `{resource}/{model}/performance`
     - `{resource}/{model}/changelog`
     - module-specific tab names as needed
   - Authorize every tab action with the same policy ability used by `show`, usually `Gate::authorize('view', $model)`.
   - Preserve route model binding and organization scope behavior.

3. **Extract payload builders**
   - Move shared show-profile payload logic into a reusable service/support class, for example `MemberProfileData`.
   - Provide one method per tab: `overview()`, `teams()`, `events()`, `performance()`, `promotions()`, `changelog()`, `media()`, `status()`.
   - Provide a small `shell()` payload for data needed by every tab: the resource, header metadata, breadcrumbs support, and permissions if needed.
   - Keep heavy queries out of `overview()`.
   - Reuse existing API Resource classes or private payload helpers where useful, but do not make the page call the API just to shape data.

4. **Convert the frontend tab UI**
   - Keep the existing header and tab bar styling.
   - Replace local tab state with an `activeTab` prop from the server.
   - Render tab triggers as Inertia `<Link>` elements using Wayfinder URLs.
   - Use `prefetch` where it improves perceived navigation.
   - Remove `useHttp`, `fetch`, or API-controller imports for tab data when the web tab can receive the same data as Inertia props.
   - Keep purely interactive JSON usage only when justified, such as autocomplete, upload/delete-in-place, or progressive filtering that should not navigate.

5. **Redirect mutations to the right tab**
   - Update post/patch/delete redirects so users return to the tab they worked in.
   - Examples:
     - aliases/status -> status tab
     - achievements/benefits -> events or achievements tab
     - promotions/evidence -> promotions tab
     - photo/media -> media tab
   - Preserve special referer behavior already in the module, such as returning to a coach page when the mutation was launched from there.

6. **Regenerate Wayfinder**
   - After route changes, run:
     ```bash
     php artisan wayfinder:generate --with-form --no-interaction
     ```
   - Use `--with-form` when the app already relies on `.form()` helpers.

## Testing Checklist

Add or update Pest tests for:

- Overview route returns the existing show component with `activeTab = overview`.
- Overview route omits heavy tab props.
- Each tab route returns the same shell component with the expected `activeTab`.
- Each tab route includes only the props it needs.
- Tab routes return `403` without the relevant view permission.
- Cross-organization models remain inaccessible.
- Mutation redirects land on the relevant tab.
- Existing frozen API endpoint tests still pass if APIs remain present.

Run the focused test files first, then the relevant verification commands:

```bash
php artisan test --compact tests/Feature/<Module>...
vendor/bin/pint --dirty --format agent
npm run lint
npm run types:check
npm run build
```

## Guardrails

- Do not create a second visual design for the tabs unless explicitly requested.
- Do not duplicate query logic between controller actions; extract a builder/service/resource.
- Do not move monolith page data behind `/api/v1` just because a JSON endpoint already exists.
- Do not break existing API contracts; leave them available for external consumers or API-shaped UI interactions.
- Do not let Wayfinder regeneration drop form helpers in projects that use `.form()`.
- Do not make the tab refactor absorb unrelated module rewrites unless they are required for type-checks/tests.
