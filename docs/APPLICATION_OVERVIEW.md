# Athletic Management — Application Overview

> One-page summary for presenting the system to another team.

---

## 1. What it is

A **sports member management system** built for the **UP Police Sports Unit**.

It replaces a set of legacy Excel workbooks used to track athletes, coaches, teams, tournaments, and medals. The app centralizes the data, enforces rules, and makes history searchable.

---

## 2. Who uses it

| Role | What they do |
|------|--------------|
| **Admin** | Full access: users, reference data, member records, teams, reports |
| **Data Entry** | Add/edit members, coaches, teams, tournament results |
| **Viewer** | Read-only access to lists and reports |
| **External Coach** | Log in via a separate portal to record attendance and athlete performance updates |

Authentication is session-based with an in-house RBAC engine (roles + permissions, scoped per organization).

---

## 3. Core modules

### Members
- Central athlete registry: PNO, member code, name aliases, rank, posting, contact, category (GD / Sports Quota), level, status.
- Status lifecycle: **Active → Inactive → Retired / Resigned / Dismissed / Deceased / Doping-disqualified**.
- Every status change is recorded with date and reason.
- Fast Hindi search by name, PNO, or alias using MySQL FULLTEXT + ngram parser.

### Coaches
- Coach profiles with NIS certification, specializations, promotions, and assignments.
- Can be linked to a serving member record when the coach is also a police athlete.

### Teams
- Stable team identity across sessions (sport + location + name).
- Per-session roster: add/remove players, captains, reserves.
- Historical backfill for old rosters.
- Track roster movements with reason and audit trail.

### Tournaments, Events & Achievements
- Create tournaments, define events, record participation and medals (Gold / Silver / Bronze / Merit).
- Member profile shows session-grouped participation and medal history.

### Incharges
- Manage team incharges, their achievements, special achievements, and postings.

### External Coaching
- Separate portal for external coaches to mark attendance and submit performance updates.
- Review workflow for submitted updates.

### Reports & Exports
- Medal tally, medals by member, team roster, resignation/dismissal log, unit headcount, player-level summary, new joiners, achievement history.
- Export to Excel (and PDF in progress).

### Settings
- Reference data: sessions, sports, units, districts, tournament tiers, ranks, designations, training venues, sports calendars.

---

## 4. Tech stack

| Layer | Technology |
|-------|------------|
| Backend | PHP 8.4, Laravel 13 |
| Frontend | React 19, TypeScript, Inertia.js 3, Tailwind CSS v4, shadcn/ui |
| Build | Vite |
| Database | MySQL 8.4 LTS |
| Queue / Cache | Redis 8 with Laravel Horizon 5 |
| Search | MySQL FULLTEXT (current) → Meilisearch planned |
| Storage | S3-compatible (MinIO locally) |
| Testing | Pest 4, PHPUnit 12, Vitest |
| Formatting | Laravel Pint, Prettier, ESLint |

---

## 5. Architecture highlights

- **Monolith**: one Laravel app serves the UI via Inertia and JSON APIs from the same codebase.
- **Thin controllers**: business logic lives in `app/Services` (queries/orchestration) and `app/Actions` (single operations).
- **Server-driven routing**: Laravel owns URLs and validation; React handles the UX.
- **Bilingual UI**: Hindi default, English toggle; all user-facing strings go through translation.
- **Audit trail**: every create/update/delete is logged via an in-house audit observer.
- **Multi-tenancy ready**: `organization_id` is present on root entities for future expansion.

---

## 6. Legacy context

The system is migrating data from three Excel workbooks (`2019 se 2025`, `2026`, `UP POLICE TEAM PLAYERS DETAILS UPDATED`) containing:

- ~39 sheets
- Mixed Krutidev and Unicode Devanagari text
- ~3,000 importable rows
- Achievements, rosters, coaches, exits, and aggregate summaries

Import pipeline is planned to handle per-cell encoding detection, identity resolution by PNO/name, section-block parsing, and date-range extraction.

---

## 7. Current state

| Module | Status |
|--------|--------|
| Auth, RBAC, reference data | Live |
| Members, coaches, teams, tournaments | Live |
| Achievements, participations, medals | Live |
| Reports & Excel exports | Live |
| Incharges | Live |
| External coaching portal | Live |
| PDF exports | In progress |
| Excel import pipeline | Deferred to later sprint |
| Meilisearch upgrade | Planned |
| Public API / mobile app | Future |

---

## 8. One-line pitch

> A single, auditable, bilingual system that turns scattered Excel sports records into a searchable, reportable member-and-team registry for the UP Police Sports Unit.
