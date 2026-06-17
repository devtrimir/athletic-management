# Phase 7N — Single Name Field Cleanup

> Cross-cutting cleanup requested by the client: stored domain names should be one neutral field, not separate Hindi and English columns. UI labels, module names, permissions, roles, ranks, designations, and tournament-tier labels stay bilingual.

**Goal:** simplify client-entered domain data so users enter one name value in whichever language is appropriate, while preserving translated UI/system labels.

**Exit criteria:** domain tables, forms, API/Inertia payloads, reports, exports, seeders, and tests use neutral name fields; only intentional system-label fields retain `name_hi/name_en` or `label_hi/label_en`.

---

## Task ordering

```
Docs + journal (T01)
  └─► Schema migration (T02)
        └─► Backend contracts (T03)
              └─► Seeders + factories (T04)
                    └─► Reports + exports + search (T05)
                          └─► React/Inertia UI (T06)
                                └─► Cleanup sweep (T07)
```

---

## Detailed task notes

### P7N-T01 — Phase Docs + Journal Bootstrap

- Add this phase file and the Phase 7N backlog entries.
- Create the first journal from `_TEMPLATE.md`.
- Record Boost research, schema findings, and doc drift.
- No app behavior change.

### P7N-T02 — Core Schema Migration

- Rename stored domain data columns:
  - `members.full_name/full_name_en` → `members.full_name`, `members.father_name` → `members.father_name`
  - `coaches.full_name/full_name_en` → `coaches.full_name`
  - `sports.name_hi/name_en`, `units.name_hi/name_en`, `districts.name_hi/name_en` → `name`
  - `teams.name_hi` → `name`, `teams.in_charge` → `in_charge`
  - `tournaments.name_hi`, `events.name_hi` → `name`
  - `name_aliases.alias` → `alias`
  - `member_status_history.reason` → `reason`
  - `media_files.caption` → `caption`
- Preserve normalized columns and update database triggers to read neutral names.
- Keep rollback reversible by recreating old columns from neutral values.

### P7N-T03 — Models, Requests, Resources, APIs

- Update fillables, PHPDoc, Form Requests, controllers, resources, and API payloads to neutral names.
- Query filters/sorts should use `name`, `full_name`, `alias`, `reason`, and `caption`.
- Remove duplicate Hindi/English search branches for domain data.

### P7N-T04 — Seeders, Factories, Master Data

- Convert CSV loaders and seed data to one `name` column for sports, districts, and units.
- Update factories to emit neutral names.
- Generate sport slugs from `name`, with a stable hash fallback when needed.

### P7N-T05 — Reports, Exports, Search

- Update report services and export controllers to select neutral fields.
- Export headings should use `Name`, `Father's Name`, `Unit`, etc.
- Simplify report filters and ordering around neutral columns.

### P7N-T06 — React/Inertia Frontend

- Update TypeScript types, forms, filters, pickers, dialogs, and report pages to neutral field names.
- Replace Hindi/English domain-name input pairs with one `Name` input.
- Keep all UI labels translated via `t()`.

### P7N-T07 — Cleanup Sweep + Compatibility Removal

- Remove temporary compatibility aliases.
- Grep for removed domain fields and leave only intentional system-label fields:
  - `roles`, `permissions`, `ranks`, `designations`: `name_hi/name_en`
  - `tournament_tiers`: `label_hi/label_en`
  - translation resources and UI copy
- Run final affected PHP and JS verification.
