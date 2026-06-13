# Phase 7P — Player Performance Points System

> Source context: Phase 5 achievements + Phase 7 reports. This is a report-first extension that adds a scoring layer on top of existing sports records.

**Goal:** track overall player progress through a transparent points system built from participations, achievements, and special awards such as Best Player.

**Exit criteria:** the application can calculate auditable player points, rank players by filters, and surface the score in reports and the member profile without changing existing medal / promotion source records.

---

## Task ordering

```
Foundation (T01)
  └─► Scoring service (T02)
        └─► Report backend (T03)
              └─► Report frontend (T04)
                    └─► Member profile performance tab (T05)
                          └─► Test sweep (T06)
```

---

## Detailed task notes

### P7P-T01 — Foundation

- Add `participation_awards` as a separate concept from `achievements.medal_type`; do not overload `MERIT` to mean Best Player.
- Schema should be org-scoped and participation-scoped:
  - `organization_id`
  - `participation_id`
  - `award_type`
  - `title`
  - `points_override` nullable
  - `remarks`
- Start rules in `config/player_points.php`, not DB-managed admin settings.
- Keep the initial rule set additive and easy to audit:
  - base participation points
  - medal points
  - tier bonus points
  - award points

### P7P-T02 — Scoring service

- `PlayerPointsService` should return both totals and the underlying scoring rows.
- Each scoring row should identify:
  - session
  - tournament
  - event
  - participation id
  - medal points
  - tier bonus
  - award bonus
  - total row score
- Avoid writing final totals back into `members`; compute from source facts.

### P7P-T03 — Report backend

- Add report key `player-performance-ranking`.
- Filter using the existing report filter approach.
- Return ranking rows with:
  - member identity
  - unit
  - participation count
  - medal counts
  - award count
  - total points
  - rank

### P7P-T04 — Report frontend

- Reuse the existing reports shell.
- Keep the first UI simple: table + small chart + filters.
- No custom “admin tuning” surface yet.

### P7P-T05 — Member profile performance tab

- Show:
  - total points
  - current-session points
  - rank context
  - season-by-season totals
  - event-wise ledger
- This tab must explain the score by showing the contributing rows, not just the final number.

### P7P-T06 — Tests

- Unit-test the score math heavily.
- Feature-test filtered rankings.
- Add data-shape tests for the member performance view.

---

## Routes / pages to add

| Route | Type | Handler / Page |
|---|---|---|
| `GET /reports/player-performance-ranking` | web | Reports show shell via `ReportController@show` |
| `GET /api/v1/reports/player-performance-ranking` | API | future mirror, same contract |

