# Phase 2 — Members Module

> Source spec: [PHASED_REQUIREMENTS.md → PHASE 2](../../analysis/report/PHASED_REQUIREMENTS.md). Read it first.

**Goal:** the headline entity. CRUD + fast (MySQL FULLTEXT with ngram parser) search + status history + name aliases + the profile shell that justifies the whole project.

**Exit criteria:** all acceptance criteria in the source spec for Phase 2 pass; search under 300 ms on 10k members; Pest Browser end-to-end happy path green.

---

## Task ordering

```
Schema + helpers (T01..T05)
  └─► Services (T06..T07)
        └─► Backend Inertia + API (T08..T14)
              └─► Frontend (T15..T21) — parallelizable
                    └─► Tests (T22..T26)
```

---

## Detailed task notes

### Schema (P2-T01 … P2-T05)

- **T01** `members` — the column list in the source spec is authoritative. Use native MySQL `ENUM('M','F','O')` etc. for the small fixed sets (we accept the cost of `ALTER TABLE` to add new values — these sets are stable). Charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`. JSON columns for `source_refs`.
- **T02** `name_aliases` — FULLTEXT index `alias_normalized` (added in T05).
- **T03** `member_status_history` — append-only; no UPDATE.
- **T04** `normalize_devanagari(text)` MySQL stored function (`DETERMINISTIC`) — see PHASED_REQUIREMENTS §P2 for required steps (NFC via `CONVERT(... USING utf8mb4)`, strip ZWJ/ZWNJ via `REGEXP_REPLACE`, lowercase ASCII via `LOWER`, collapse whitespace, strip the rank prefixes listed). Fill `full_name_normalized` / `alias_normalized` with a `BEFORE INSERT / BEFORE UPDATE` trigger that calls the function. (Generated columns are an alternative but cannot reference stored functions in MySQL — use triggers.)
- **T05** FULLTEXT indexes: `ALTER TABLE members ADD FULLTEXT INDEX ft_full_name_norm (full_name_normalized) WITH PARSER ngram;` (same for `name_aliases.alias_normalized`). Requires InnoDB + MySQL 8 ngram parser; tune `ngram_token_size=2` (default).

> ADR-0004: "MySQL FULLTEXT (ngram) for Phase-2 search; swap to Meili in Phase 8 keeping the same `/api/v1/search/members` contract."
> ADR-0006: "MySQL 8.4 chosen over PostgreSQL" — file with this task (records the trade-off: lose `pg_trgm` similarity & `jsonb` operators, gain operational familiarity / Herd default).

### Services (P2-T06 … P2-T07)

- **T06** `MemberCodeGenerator` — pattern `UPP-{year}-{6-digit-seq}`. Implementation: a `member_code_sequences` table keyed by `(organization_id, year)` with a `last_seq` column. On generation: `SELECT ... FOR UPDATE` (row-level lock) inside the same transaction as the INSERT into `members`. Unit test must exercise concurrency.
- **T07** Factory + DB seeder fixture for **10k members** (gated behind `--volume` flag so dev seed stays fast). Used for the search perf test.

### Backend (P2-T08 … P2-T14)

- **T08** `MemberPolicy` — wire every method to a `members.*` permission code (no role checks in the policy).
- **T09** Form Requests — Zod schemas on the frontend mirror these field-by-field.
- **T10** `MemberController` — thin; delegates to actions/services. Index supports the full filter list from the spec via `spatie/laravel-query-builder`.
- **T11** Status change is its own controller because it triggers history writes; wrap in a DB transaction.
- **T12** Aliases controller — DELETE accepts the alias id (not the text) to avoid normalization mismatches.
- **T13** Search endpoint — MySQL FULLTEXT (ngram parser) + PNO exact short-circuit. Query:

  ```sql
  -- PNO exact match wins; otherwise FULLTEXT ngram score on normalized name + aliases.
  SELECT m.id, m.member_code, m.pno, m.full_name_hi,
         MATCH(m.full_name_normalized) AGAINST (:q IN BOOLEAN MODE) AS name_score,
         (
           SELECT MAX(MATCH(a.alias_normalized) AGAINST (:q IN BOOLEAN MODE))
           FROM name_aliases a WHERE a.member_id = m.id
         ) AS alias_score
  FROM members m
  WHERE m.organization_id = :org
    AND (
      m.pno = :q
      OR MATCH(m.full_name_normalized) AGAINST (:q IN BOOLEAN MODE)
      OR m.id IN (
        SELECT a.member_id FROM name_aliases a
        WHERE MATCH(a.alias_normalized) AGAINST (:q IN BOOLEAN MODE)
      )
    )
  ORDER BY GREATEST(COALESCE(name_score, 0), COALESCE(alias_score, 0)) DESC
  LIMIT 50;
  ```

  Notes: the `:q` value must be passed through `normalize_devanagari()` (PHP side) before binding. Use `BOOLEAN MODE` so we can append `*` to the last token for prefix expansion. Must complete in < 300 ms on the 10k fixture (test enforces).
- **T14** `/profile` endpoint returns the aggregated JSON shape (members + counts + stubs for later phases). Will be consumed by the Show page.

### Frontend (P2-T15 … P2-T21)

- **T16** `MemberPicker` is reused in Phases 3, 4, 5, 6. Build it carefully:
  - Debounced (300 ms), TanStack Query, abortable on each new keystroke.
  - Keyboard navigable (Radix `Command` / `cmdk`).
  - Shows: name (Hindi), PNO, unit; secondary line shows English name if present.
- **T17 / T18** Use Inertia `useForm`; mirror server Form Request fields in a Zod schema for inline UX feedback. The server remains authoritative.
- **T19** `Show` page is the **profile shell** that gets filled in by Phases 4–5. Build the tab framework and the Overview / StatusHistory / Aliases tabs fully; render placeholders for Teams / Participations / Achievements.

### Tests (P2-T22 … P2-T26)

- **T22** RBAC × CRUD matrix.
- **T23** Search tests **must** include:
  - Typo: searching `खिलाडी` (no nukta) finds members stored as `खिलाड़ी`.
  - Krutidev alias: alias `fl)kUr lsB` is converted/stored and finds member `सिद्धान्त सेठ`.
  - PNO exact-match short-circuit.
  - Perf: 10k fixture, asserts wall time.
- **T24** Concurrency test for code generator: spawn N parallel inserts via Pest's `concurrently` helper (or a `pcntl_fork` test); assert no duplicates.
- **T25** Pest Browser E2E: login → create member → see in list → open → edit name → change status → soft-delete → confirm absence from default list.
- **T26** Vitest for `MemberPicker` and `StatusChangeModal` — keyboard a11y assertions.

---

## Phase 2 routes / pages added

> Update in the same PR that adds the route/page.

| Route | Type | Handler / Page |
|---|---|---|
| `GET /{locale}/members` | web | `Members/Index` |
| `GET /{locale}/members/create` | web | `Members/Create` |
| `POST /{locale}/members` | web | store |
| `GET /{locale}/members/{member}` | web | `Members/Show` |
| `GET /{locale}/members/{member}/edit` | web | `Members/Edit` |
| `PATCH /{locale}/members/{member}` | web | update |
| `DELETE /{locale}/members/{member}` | web | soft-delete |
| `POST /{locale}/members/{member}/status` | web | status change |
| `POST /{locale}/members/{member}/aliases` | web | add alias |
| `DELETE /{locale}/members/{member}/aliases/{alias}` | web | remove alias |
| `GET /api/v1/search/members` | API | typeahead source |
| `GET /api/v1/members/{member}/profile` | API | aggregated JSON |
