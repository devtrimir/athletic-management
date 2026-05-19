# Sports Member Management — Legacy Excel Migration & Architecture Analysis
**Project:** UP Police Sports Unit — Athlete / Coach / Team / Achievement system
**Scope of this document:** evidence-based analysis of three legacy Excel workbooks; recommended data model, MVP scope, and migration plan. No application code is built in this engagement.
**Source artifacts produced:**
- Per-sheet CSV dumps: `analysis/raw_csv/`
- Per-sheet cell-grid JSON (merges/formulas/hidden/format): `analysis/raw_json/`
- Structural manifest: `analysis/manifest/workbooks.md` (+ `workbooks.json`)
- Header inventory: `analysis/manifest/headers_inventory.csv`, `headers_distinct.csv`
- Per-column value samples: `analysis/manifest/value_samples.json`
- Hindi → entity dictionary: `analysis/report/hindi_entity_dictionary.csv`
- ERD (Mermaid): `analysis/report/erd.mmd`

---

## 0. Executive Summary

Three workbooks (`2019 se 2025 (1).xlsx`, `2026 (1).xlsx`, `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx`) total **39 sheets** and represent ~7 years of UP Police sports operations: athlete rosters by quota, coach assignments, team aggregates, achievement records at international/national/AIPSC/other tiers, resignations, and miscellaneous yearly summaries.

**Three findings dominate every other consideration:**

1. **Mixed text encoding (Krutidev vs Unicode).** The historical workbooks (`2019 se 2025`, `2026`) are written almost entirely in **Krutidev legacy ASCII font encoding** (e.g., `f[kykMh dk uke` = खिलाड़ी का नाम). The master roster (`UP POLICE TEAM PLAYERS DETAILS UPDATED`) is mostly Unicode Devanagari but contains **rows mixed with Krutidev** (e.g., TYAGPATRA rows 6–7). Any import pipeline MUST detect & transliterate Krutidev → Unicode before anything else.

2. **PNO (Police Number) is the only reliable natural key.** It appears in roster sheets (`KUSHAL KHILADI`, `GD KHILADI`) and intermittently in achievement sheets. Names alone are unreliable: same person appears with/without rank prefix (`आ.`), spelling variants, and even encoding variants. The system must use PNO when available + a generated `member_code` otherwise, plus a `name_aliases` table.

3. **Sheets are visual reports, not normalized tables.** Recurring patterns: top banner rows (title, repeated across all columns due to merges), section banner rows splitting a sheet into per-team blocks (`GD KHILADI`), repeated header rows mid-sheet, two-row headers with merged group cells (`SANKHYATMAK`, `PLAYERS LEVEL`), summary/total rows interleaved with data, and free-text date ranges in date columns (`28-07-2023 ls 6-08-2023 rd fofuisx dukMk` = `28-07-2023 to 6-08-2023 at Winnipeg, Canada`). Migration must be section-aware, not naïve row-by-row.

**Migration complexity: Medium–High.** Drivers: encoding conversion, identity reconciliation across years, section-block parsing, and ~30 inconsistent date formats.

---

## 1. Workbook Analysis

| # | Workbook | Sheets | Probable Purpose | Session/Year Coverage | Approx Volume |
|---|---|---:|---|---|---|
| 1 | `2019 se 2025 (1).xlsx` | 20 | Cumulative achievement ledger 2019–2025 + per-year working sheets + scratch sheets | 2019–2025 | ~1,700 data rows across achievement sheets |
| 2 | `2026 (1).xlsx` | 6 | Current-year (2025–26 / 2026 calendar) achievement working file. Same column layout as #1's headline sheets. | 2026 | ~200 data rows |
| 3 | `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx` | 13 | Master roster + aggregates: skilled-quota players (`KUSHAL KHILADI`), GD-quota players (`GD KHILADI`), unit-wise headcounts (`SANKHYATMAK`), player-level summary (`PLAYERS LEVEL`), exits (`TYAGPATRA`), coaches (`COACH`), plus working sheets. | Current state snapshot | ~1,000 rostered athletes + 50 coaches |

**Repeated structures across workbooks:**
- `international` / `national` / `all india police` / `other` quadrant of achievement sheets exists in both `2019 se 2025` and `2026`. Same 11–17 columns, same Krutidev headers. This is the canonical "achievement record" schema.
- `1-1-24 to 31-7-24` exists in both #1 and #2 — partial-period working copy carried forward.

**Implication:** the two achievement workbooks are append-only year-extensions of the same logical table. Treat as ONE entity (`participations`+`achievements`) partitioned by `session_id`.

Full per-sheet dimensions, merged-cell ranges, formula counts, and 5-row previews are in `analysis/manifest/workbooks.md`.

---

## 2. Sheet Structure Analysis (representative)

### `2019 se 2025 (1).xlsx › international` (44 rows × 13 cols)
- **Row 1:** banner (merged across cols A–K): `o"kZ 2022] 2023 ,oa 2024 esa vUrjkZ"Vªh; izfr;ksfxrkvks esa izkIr fd;s x;s indksa dk fooj.k` → "Details of medals won in international competitions in years 2022, 2023 and 2024."
- **Row 2:** header (Krutidev): क्र.सं. | खिलाड़ी का प्रकार | स्पर्धा | पीएनओ | पद व नाम | प्रतियोगिता का नाम | स्थान | दिनांक | वर्ष | इवेंट | मेडल
- **Row 3:** column-number row (1..11) — discard on import.
- **Rows 4..N:** data rows.
- **Anomaly:** column `पीएनओ` is consistently empty in this sheet (achievement sheets rarely back-link to PNO). Reconciliation by name only — error-prone.
- **Multi-line cells:** "पद व नाम" sometimes lists multiple players in one cell (e.g., "Police Constable Kishan Kumar Mishra, Police Constable Brijesh Kumar Pradhan") — needs split-and-fan-out on import.

### `2019 se 2025 (1).xlsx › other` (real bounds ~ a few hundred rows × 17 cols)
- Excel reports allocated bound of 1,048,575 rows; real data terminates earlier. Our extractor trimmed this.
- **Schema drift:** has duplicated `पीएनओ` column header and adds `कब से` / `कब तक` / second `वर्ष` columns the other achievement sheets don't have.

### `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx › GD KHILADI` (568 rows × 52 cols)
- **Section pattern:** the sheet repeats `[banner row = team name] → [header row] → [data rows] → blank → [next team banner]` ~30+ times for different (sport, battalion) teams.
- The `52` declared columns are mostly empty padding; real columns are 10 (क्र.सं. | भार वर्ग | पीएनओ नं | अधि०/कर्म० का नाम | नियुक्ति | गृह जनपद | जन्म तिथि | भर्ती तिथि | मोबाइल नम्बर | खिलाडी का स्तर).
- Importer must (a) detect banner rows (single non-numeric cell repeated/merged across the row, all-bold) → emits a `team` record, (b) detect header rows (matches known header signature), (c) treat subsequent rows as `members` + `team_members` of that team.

### `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx › SANKHYATMAK` (41 × 11) and `PLAYERS LEVEL` (34 × 8)
- **Two-row merged headers**: row 1 = group headers ("कुशल खिलाडी", "सामान्य खिलाडी") spanning 3 cols each, row 2 = sub-headers ("महिला", "पुरूष", "कुल"). These are **derived aggregates** of GD/KUSHAL KHILADI sheets — do NOT import as facts; regenerate via SQL views.

### `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx › COACH` (52 × 10)
- Multi-line cells: each `प्रशिक्षक का नाम` cell embeds rank prefix + PNO + name + posting district as a single text blob across line breaks. Parse with regex: `(रैंक) (PNO 9-digit) (नाम)\nनियुक्ति-(जनपद)`.

### `UP POLICE TEAM PLAYERS DETAILS UPDATED.xlsx › TYAGPATRA` (21 × 10)
- Exits log: नाम, पिता का नाम, भर्ती तिथि, नियुक्ति जनपद, गृह जनपद, वर्तमान स्थिति (त्यागपत्र / डिसमिस / मृत्यु).
- **Encoding mix inside one sheet:** rows 6–7 are Krutidev (`fl)kUr lsB`, `Jo.k dqekj`), rest Unicode → confirms per-row encoding detection is required.
- Some rows put PNO inside the `पिता का नाम` column (rows 8–9: "PNO-234103658") — a data-entry error. Importer must regex-extract `PNO-\d{9}` from ANY column.

### Hidden columns / formulas / merges (manifest summary)
- Formulas: present only in the aggregate sheets (`SANKHYATMAK`, `PLAYERS LEVEL`, `Sheet1/2/3/...`). Treat as derived.
- Hidden rows/cols: a small number on scratch sheets (`Sheet6 (2)`, `Sheet8 (2)`). Ignore on import.
- Merged ranges: heavy on banners/section dividers; we resolve by forward-filling merged-member cells with the anchor value during CSV emission.

---

## 3. Hindi Data Interpretation

A full mapping table (97 rows so far) is at [analysis/report/hindi_entity_dictionary.csv](analysis/report/hindi_entity_dictionary.csv). Highlights:

| Krutidev (legacy) | Unicode | English | Entity / Field |
|---|---|---|---|
| `f[kykMh dk uke` | खिलाड़ी का नाम | Player Name | members.full_name |
| `in o uke` | पद व नाम | Rank & Name (combined) | split → members.rank + members.full_name |
| `ih,uvks` | पीएनओ | Police Number | members.pno (natural key) |
| `[ksy fo/kk` | खेल विधा | Sport Discipline | sports.name |
| `Li/kkZ` | स्पर्धा | Event / sub-discipline | events.discipline |
| `izfr;ksfxrk dk uke` | प्रतियोगिता का नाम | Competition | tournaments.name |
| `LFkku` / `vk;kstu LFky` | स्थान / आयोजन स्थल | Venue | tournaments.venue |
| `fnukad` / `dc ls` / `dc rd` | दिनांक / कब से / कब तक | Date / from / to | tournaments.date_from, date_to, raw_date_text |
| `o"kZ` | वर्ष | Year | sessions.year |
| `esMy` / `Iknd` | मेडल / पदक | Medal | achievements.medal_type |
| `Lo.kZ / jtr / dkaL;` | स्वर्ण / रजत / कांस्य | Gold / Silver / Bronze | achievements.medal_type enum |
| `lkekU; / dq-f[k-` | सामान्य / कुशल खिलाड़ी | GD quota / Skilled-player quota | members.player_category |
| `vUrjkZ"Vªh; / jk"Vªh; / vf[ky Hkkjrh; iqfyl / vU;` | अन्तर्राष्ट्रीय / राष्ट्रीय / अखिल भारतीय पुलिस / अन्य | Intl / National / AIPSC / Other | tournament_tiers.code |
| (n/a) | त्यागपत्र / डिसमिस / मृत्यु | Resignation / Dismissal / Death | members.current_status |

**Krutidev → Unicode conversion strategy:** use an existing converter such as the `indic-transliteration` Python package (Krutidev → DEVANAGARI mapping) or the well-tested `krutidev-to-unicode` JS port; both implement the documented Krutidev 010 mapping. Apply at row-cell level, not sheet level (since encoding is mixed).

---

## 4. Entity Discovery

Confirmed by the data:
- **Organizations** (multi-tenant ready — single tenant for now: UP Police)
- **Districts** (नियुक्ति जनपद, गृह जनपद)
- **Units** (वाहिनी / PAC / GRP / जनपद posting — e.g., "06वीं वाहिनी PAC मेरठ", "जीआरपी मुरादाबाद")
- **Sports** (वुशू, ताइक्वाण्डो, हॉकी, कबड्डी, एथलेटिक्स, वाटर स्पोर्ट्स, बैडमिंटन, …)
- **Sessions** (वर्ष 2019..2026; advisable to model as "2019-20", "2020-21" academic-style if required by user)
- **Members / Athletes** (with PNO + player_category + player_level + current_status)
- **Name aliases** (Krutidev variant, spelling variant, rank-prefixed vs not)
- **Coaches** (often themselves a member; link via nullable `coaches.member_id`)
- **Teams** (per sport per session per unit; team in-charge is the दलनायक)
- **Team-members** (M:N member↔team scoped by session)
- **Coach-assignments** (M:N coach↔team scoped by session, with HEAD/ASSISTANT role)
- **Tournament tiers** (अन्तर्राष्ट्रीय / राष्ट्रीय / अखिल भारतीय पुलिस / अन्य / state / zonal)
- **Tournaments / Competitions** (प्रतियोगिता — name, venue, date range, tier, session)
- **Events** (the specific contest within a tournament, with weight class / gender / discipline)
- **Participations** (member competed in event, possibly as part of a team)
- **Achievements** (medal won in a participation)
- **Member status history** (joining → active → resigned/dismissed/deceased → retired)
- **Kit issuances** (ट्रैकशूट / जूता / किट सेट — referenced in headers)
- **Funds** (उ.प्र. पुलिस खेल विकास कोष — referenced; future enhancement)
- **Imports / import_rows** (audit trail of Excel batches)
- **Users / roles** (Admin / Data-entry / Viewer)
- **Audit logs**

---

## 5. Relationship Map

See [analysis/report/erd.mmd](analysis/report/erd.mmd) (Mermaid). Cardinality summary:

- `members` (1) — (N) `team_members` (N) — (1) `teams`  →  member↔team M:N **per session**
- `teams` (N) — (1) `sports`, `teams` (N) — (1) `sessions`, `teams` (N) — (1) `units`
- `coaches` (1) — (N) `coach_assignments` (N) — (1) `teams`  → coach↔team M:N **per session**, with role
- `tournaments` (1) — (N) `events` (1) — (N) `participations` (N) — (1) `members`
- `participations` (1) — (0..1) `achievements` (medal optional)
- `members` (1) — (N) `member_status_history` (lifecycle audit)
- `members` (1) — (N) `name_aliases` (identity reconciliation across encoding/spelling variants)
- `coaches` (0..1) — (1) `members` (coach may be a serving constable)

---

## 6. Historical Data Strategy

**How legacy stores history:** mostly via separate workbooks per year-range (`2019 se 2025` cumulative + `2026` for current year) and per-period working sheets (`1-1-24 to 31-7-24`, `2023`, `2024`, `2025`). Roster sheets (`KUSHAL KHILADI`, `GD KHILADI`) are state snapshots without historical versioning — when a player moves units or quits, the row is silently edited.

**Recommended migration:**
1. Define a single `sessions` table (e.g., `2019-20`, `2020-21`, …, `2025-26`, `2026-27`). Bind every team / team_member / coach_assignment / tournament / participation to a `session_id`.
2. Members are **session-independent identities**. Movements (unit, status, level) are recorded in `member_status_history` with `effective_on`.
3. Re-import achievement sheets idempotently keyed by (member_id, event_id) so re-runs don't duplicate.
4. Snapshots like `SANKHYATMAK` / `PLAYERS LEVEL` are NOT imported as data — they are SQL views derived from `team_members` × `sports` × `units`.

---

## 7. Data Quality Audit

Issues observed (with evidence locations):

| # | Issue | Evidence | Remediation |
|---|---|---|---|
| 1 | **Mixed Krutidev / Unicode encoding** within the same workbook and even same sheet | `TYAGPATRA` rows 6–7 vs others; entire `2019 se 2025`/`2026` workbooks are Krutidev | Per-cell encoding detection (range of ASCII chars in Devanagari headers → Krutidev) + Krutidev→Unicode converter |
| 2 | **Missing PNO on achievement rows** | `international`, `national` sheets: PNO column empty for most rows | Reconcile by `name_normalized + sport + session + medal`; ambiguous → manual review queue (`import_rows.status='AMBIGUOUS'`) |
| 3 | **Combined "rank + name" cells** | header `पद व नाम` / `in o uke` | Regex split: `^(आ\.|मु\.आ\.|पी\.सी\.|दलनायक|…)\s+(.+)$` |
| 4 | **Multi-person cells** | e.g., `"vkj{kh fd'ku dqekj feJk] vkj{kh czts'k dqekj iz/kku"` (two officers in one cell) | Split on `]` / `,` / `;` / line-break → fan out into multiple `participations` |
| 5 | **Free-text date ranges** in a single column | `28-07-2023 ls 6-08-2023 rd fofuisx dukMk` mixes date range with venue | Parse with regex extracting two dates; preserve original in `raw_date_text` |
| 6 | **Date format inconsistency** | `dd.mm.yyyy`, `dd-mm-yyyy`, `dd-mm-yyyy ls dd-mm-yyyy`, `dd/mm/yyyy`, year-only | Multi-pattern parser with fallback to NULL + flag for manual review |
| 7 | **PNO placed in wrong column** | `TYAGPATRA` rows 8–9: PNO inside `पिता का नाम` | Global regex `PNO[-\s]?\d{9}` over every cell; promote to `members.pno` |
| 8 | **Player-category column not normalized** | `lkekU;`, `सामान्य`, `GD`, `dq-f[k-`, `कु-f[k-`, `कुशल खिलाडी` all coexist | Lookup table → enum (`GD`, `SKILLED`) |
| 9 | **Column-number row immediately under header** (row of 1, 2, 3, …) | International / National / Other sheets | Detect numeric-only row right after header → discard |
| 10 | **Sheets with allocated 1,048,575 rows** | `other` in both workbooks | Trim to last non-empty row (already done by extractor) |
| 11 | **Duplicate `पीएनओ` columns** | `other` sheet has the header twice | On import, pick first non-null between duplicates; flag mismatches |
| 12 | **Spelling variants of sport names** | `Vscy Vsful` vs `टेबल टेनिस`; `dq'rh` vs `कुश्ती` | After Krutidev conversion, normalize via `sports.name` alias table |
| 13 | **Name spelling variants** for same PNO across sheets | rank prefix included/excluded, hindi spelling drift | Resolve on PNO match; record old form in `name_aliases` |
| 14 | **Merged-cell value inheritance not always intended** | banner rows merged across all columns | Distinguish "banner" merge (whole row, bold, no header context) from "group header" merge (top of multi-row header) using openpyxl format metadata captured in our cell-grid JSON |
| 15 | **Section banner rows lack a session/year field** | `GD KHILADI` team banners do not carry session — implicit current snapshot | Importer must accept a `default_session_id` parameter per upload |
| 16 | **Phone numbers as numeric not text** | leading-zero strip risk in mobile column | Force string read (we use `cell.value` raw); validate length=10 |
| 17 | **Aggregate sheets confused with fact sheets** | `SANKHYATMAK`, `PLAYERS LEVEL` look like data | Whitelist of "fact" sheets for import; ignore others or import to `imports.metadata` only |

---

## 8. Searchability Analysis

**Primary search keys:**
1. `members.pno` (exact) — fastest, when known
2. `members.member_code` (exact) — system-generated, always present
3. `members.full_name_normalized` (fuzzy) — for "find by name"
4. `members.mobile` (exact)
5. `sports.name_normalized` (autocomplete)
6. `tournaments.name_normalized` + `session_id` + `tier`
7. medal-winner queries: `achievements.medal_type` × `session_id` × `sport_id`

**Index strategy (Postgres assumed; MySQL alternatives noted):**
- B-tree on `members(pno)`, `members(member_code)`, `members(mobile)`
- B-tree composite on `team_members(session_id, team_id)`, `participations(session_id, sport_id)`, `achievements(medal_type, session_id)`
- `pg_trgm` GIN index on `members.full_name_normalized` + `name_aliases.alias_normalized` for fuzzy Hindi search (MySQL: substring + n-gram FT index on `utf8mb4_unicode_ci`).
- **Recommended:** **Meilisearch** (or Typesense) index for member directory: docs of shape `{id, member_code, pno, name, name_aliases[], sport, unit, district, session_tags[], medal_count}` — sub-100 ms Devanagari fuzzy search, typo tolerance, faceting for sport/unit/session.
- Maintain a `normalize_devanagari(text)` SQL function: NFC, strip ZWJ/ZWNJ, lowercase ASCII, collapse whitespace, drop common rank prefixes (`आ.`, `मु.आ.`, `पी.सी.`, `दलनायक`).

---

## 9. MVP Scope Extraction

**Must-have MVP (demo-ready, drives daily ops):**
1. Auth + RBAC (Admin / Data-Entry / Viewer)
2. Members module: list with fast multi-key search; create / edit; status change with effective date
3. Sessions, Sports, Units, Districts as managed reference data
4. Teams per session (sport × unit × session); assign team members; assign coaches
5. Tournaments + Events: create competition, list events, record participation, record achievement (medal)
6. Member profile page showing **historical participation across all sessions** (the headline value: replaces the manual cross-sheet lookup users do today)
7. Excel-import wizard for the three legacy files (run once) + ongoing single-sheet uploads, with column-mapping templates and an `import_rows` review/approve queue
8. Reports/exports: medals by session / by sport / by tier; team rosters; resignation log — exportable to Excel & PDF
9. Bilingual UI (Hindi default, English toggle) with Unicode Devanagari only (no Krutidev anywhere in the app)

**Future enhancements (deferred):**
- Tournament bracketing / fixtures
- Attendance & fitness tracking
- Medical records, certificates upload, profile photos (documents module)
- Public-facing athlete profile pages
- Kit issuance & inventory management
- Sports fund (खेल विकास कोष) ledger & disbursements
- Multi-organization tenancy switching, granular row-level RBAC
- Mobile app for data entry at venues
- Analytics dashboards (medal trends, unit-wise performance)
- Notifications (SMS/WhatsApp for selection)
- API for external federations

---

## 10. Suggested Database Design

Full ERD: [analysis/report/erd.mmd](analysis/report/erd.mmd). Table inventory:

`organizations`, `users`, `audit_logs`,
`districts`, `units`,
`sessions`, `sports`,
`members`, `name_aliases`, `member_status_history`, `kit_issuances`,
`coaches`,
`teams`, `team_members`, `coach_assignments`,
`tournament_tiers`, `tournaments`, `events`, `participations`, `achievements`,
`imports`, `import_rows`.

**Design notes:**
- `organization_id` is on every root entity → multi-tenant later without rewrite.
- Every operational row has `session_id` → historical reports are simple `WHERE session_id IN (...)`.
- `members.pno` UNIQUE NULLABLE; `members.member_code` UNIQUE NOT NULL (generated `UPP-{joining_year}-{seq}`).
- `name_aliases` stores Krutidev forms, rank-prefixed forms, and historical misspellings so legacy users can still search.
- `participations.team_id` NULLABLE so individual-sport entries don't need a synthetic team.
- `tournaments.raw_date_text` preserves the original Excel string when our date parser can't extract a clean range — important for audit & manual cleanup later.
- `import_rows` stores BOTH raw cells and resolved entity references, so any single legacy row is traceable end-to-end.

---

## 11. Migration Complexity Assessment

**Overall: Medium–High.**

| Factor | Severity | Why |
|---|---|---|
| Krutidev decoding | High | Affects every cell in 2 of 3 workbooks; per-row mixed-encoding in the third |
| Identity resolution (member dedup across years) | High | PNO missing on most achievement rows; names have rank prefixes & spelling drift |
| Section-block parsing | Medium | `GD KHILADI`, `KUSHAL KHILADI`, `COACH` need stateful scanners, not simple `pd.read_excel` |
| Date parsing | Medium | At least 5 distinct formats in date columns + free-text ranges |
| Aggregate vs fact disambiguation | Low–Medium | Solved by whitelist of import-eligible sheets |
| Multi-person and multi-line cells | Medium | Requires fan-out splitting + per-piece reconciliation |
| Sheet structure drift between workbooks | Low | `2019..2025` and `2026` share the same achievement schema |
| Data volume | Low | ~3,000 total reconcilable rows — fits comfortably in a single import job |

---

## 12. Final Deliverables (summary)

### 12.1 Data Audit Summary
3 workbooks · 39 sheets · ~3,000 importable rows · 2 distinct encodings · 17 distinct data-quality issue classes catalogued (§7) · achievement sheets share a single canonical schema; master roster uses repeated section-blocks; aggregate sheets must be regenerated as views.

### 12.2 Identified Entities
22 tables (§10). Core 9: `members`, `coaches`, `sports`, `sessions`, `teams`, `team_members`, `tournaments`, `events`, `participations`, `achievements` (+ `units`, `districts`).

### 12.3 Relationship Map
Mermaid ERD in [analysis/report/erd.mmd](analysis/report/erd.mmd). Render in any Mermaid viewer (VS Code Markdown preview, mermaid.live).

### 12.4 MVP Feature Recommendation
9 must-haves listed in §9.

### 12.5 Migration Risks
1. Krutidev mis-conversion silently corrupts names (use round-trip validation: convert → render → human spot-check 5%).
2. Achievement rows without PNO → ambiguous member match → manual review queue must scale (could be 30–40% of historical achievement rows).
3. Date-range free text loses precision; some rows will end up with NULL start/end + populated `raw_date_text` only.
4. Section-banner detection false negatives → players assigned to wrong team. Mitigate with mandatory post-import "team roster verification" UI per team.
5. Aggregate sheets accidentally imported as facts → double counting. Mitigate via explicit sheet whitelist.
6. Multi-person cells fanned-out incorrectly → over-counted medals. Mitigate via per-cell preview during import-row review.
7. PNO collisions if data-entry typos → require 9-digit length + checksum-style validation if available.
8. Coach-vs-member identity (coach may also be a competing member) — model with nullable `coaches.member_id`.

### 12.6 Database Architecture Suggestion
PostgreSQL 16 (recommended over MySQL for: `pg_trgm` Hindi fuzzy index, native `jsonb` for `source_refs` / `raw_cells`, robust collation). Search layer: Meilisearch alongside Postgres for member directory & tournament lookup. Backend: Laravel 11 + Inertia; queue worker (Redis) for import jobs. Storage: S3-compatible for uploaded Excel files + future certificates.

### 12.7 Data Cleanup Recommendations
1. Run extractor (done) → review `headers_inventory.csv` with stakeholder → finalize Hindi dictionary.
2. Build Krutidev→Unicode converter once; unit-test with at least 50 sample cells per Krutidev sheet.
3. Define `sports`, `units`, `districts`, `tournament_tiers` as **seeded reference data** before any fact import.
4. Import master roster (`KUSHAL KHILADI` + `GD KHILADI`) first → produces `members` + `team_members(session=current)` + `coach_assignments`.
5. Import `COACH` → produces `coaches` records; back-link `coaches.member_id` where PNO matches.
6. Import `TYAGPATRA` → updates `members.current_status` + writes `member_status_history`.
7. Import achievement sheets year-by-year, oldest first; each import requires a `default_session_id` and a `default_tier`.
8. Generate aggregates as SQL views (replacing `SANKHYATMAK`, `PLAYERS LEVEL`).
9. Run reconciliation report: members without PNO, achievements without member match, sports without canonical name.

### 12.8 Open Questions (need stakeholder input before build)
1. Should sessions be **calendar year** (2024, 2025) or **academic/sport year** (2024-25)? Sheets use both.
2. Is **PNO** guaranteed unique forever (no recycling on retirement)? Affects whether we can use it as a hard UNIQUE constraint.
3. For achievements with multi-person cells, are all listed people **medal-winners** or only one (e.g., a doubles event)? Affects fan-out semantics.
4. Coach data has embedded `नियुक्ति-{जनपद}` per coach — should we keep current posting in the coach record or maintain a coach-posting history table?
5. Do players ever appear under **multiple categories simultaneously** (e.g., GD-quota athlete competing in skilled-quota tournaments)? Currently we model `player_category` as a single value on `members`.
6. Will the system need to manage **other state forces** (UP STF, fire services) in the same DB later, or is the multi-tenant column purely defensive?
7. Are old workbooks **read-only history** post-import, or will users still edit them in Excel and re-upload? Drives whether import is one-shot or recurring.
8. What is the authoritative source when the same PNO appears in two workbooks with different mobile / district values?
9. Should the system surface the **Krutidev original strings** anywhere (e.g., compliance/audit), or are we OK discarding them once converted?
10. Required language for **exports / official letters**: Hindi only, English only, or bilingual?

---

## Appendices

- **Appendix A** — Per-workbook structural manifest: `analysis/manifest/workbooks.md`
- **Appendix B** — Hindi → entity dictionary (97 mappings, Krutidev + Unicode): [analysis/report/hindi_entity_dictionary.csv](analysis/report/hindi_entity_dictionary.csv)
- **Appendix C** — Per-column value samples (cardinality, null %, top-10 values): `analysis/manifest/value_samples.json`
- **Appendix D** — Raw CSV/JSON dumps of every sheet: `analysis/raw_csv/`, `analysis/raw_json/`
- **Appendix E** — Mermaid ERD source: [analysis/report/erd.mmd](analysis/report/erd.mmd)
