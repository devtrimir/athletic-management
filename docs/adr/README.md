# Architecture Decision Records

We use lightweight ADRs (Michael Nygard style) to capture non-obvious decisions. Append-only — never edit a `Status: Accepted` ADR; supersede it with a new one.

## Filename

`NNNN-kebab-title.md` — zero-padded 4-digit, monotonically increasing.

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: @handle1, @handle2
- Related task: P<phase>-T<task>

## Context
What problem are we solving? What constraints apply?

## Decision
What we chose. Be specific.

## Consequences
- Positive: …
- Negative / costs: …
- Follow-ups: …

## Alternatives considered
- **Option A** — why rejected
- **Option B** — why rejected
```

## Index

| ID | Title | Status |
|---|---|---|
| 0001 | Monolith with Inertia + React (vs split API + Next.js) | TBD |
| 0002 | Excel library: `maatwebsite/excel` vs `rap2hpoutre/fast-excel` | TBD |
| 0003 | In-house RBAC (no `spatie/laravel-permission`) | TBD |
| 0004 | MySQL FULLTEXT (ngram) search for P2, Meilisearch swap-in for P8 | TBD |
| 0005 | Per-cell Krutidev detection heuristic | TBD |
| 0006 | MySQL 8.4 chosen over PostgreSQL | TBD |
