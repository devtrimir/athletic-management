# 0004. MySQL FULLTEXT (ngram) for Phase-2 member search

- Status: Accepted
- Date: 2026-05-23
- Related task: P2-T05

## Context

Phase 2 requires fast (< 300 ms on 10k members) Hindi name search across `members.full_name_normalized`
and `name_aliases.alias_normalized`. Queries arrive as partial Devanagari strings; users expect prefix
and substring matching (e.g. "रामप्र" should find "रामप्रसाद"). The normalized columns are pre-processed
by the `normalize_devanagari()` function (ADR implicitly covered in P2-T04): NFC, ZWJ/ZWNJ stripped,
rank prefixes removed, whitespace collapsed.

Phase 8 will introduce Meilisearch v1.13+ for richer relevance; the search API contract must not change.

## Decision

Use MySQL 8 FULLTEXT indexes with the built-in `ngram` parser (`ngram_token_size=2`, server default).

Index names:
- `ft_full_name_norm` on `members(full_name_normalized)`
- `ft_alias_norm` on `name_aliases(alias_normalized)`

Search mode: `BOOLEAN MODE` with `*` appended to the last token for prefix expansion.
The query value is normalised PHP-side via the same logic as `normalize_devanagari()` before binding.

The `/api/v1/search/members` endpoint shape is frozen from P2-T13 onward so that the P8 Meilisearch
swap is purely a backend change with no frontend diff.

## Consequences

- Positive: zero extra infrastructure; works inside Herd/MySQL; < 300 ms on 10k rows (measured in P2-T07 perf test).
- Positive: `ngram` splits on every 2-character sequence — good fit for Devanagari syllable clusters.
- Negative: no relevance tuning beyond score; no typo tolerance — acceptable for P2; Meilisearch covers this in P8.
- Negative: `ngram_token_size` is a server-global variable; changing it requires `OPTIMIZE TABLE`. We pin to 2 and document this constraint.
- Follow-ups: P8-T01 will add Meilisearch and keep the same endpoint contract (see ADR-0004 Phase-8 superseding record when filed).

## Alternatives considered

- **`ft_parser=mecab`** — Japanese morphological analyser; not installed on Herd; overkill for Hindi.
- **`LIKE '%query%'` with a B-tree index** — no index support for leading wildcard; 300 ms budget fails at 10k rows.
- **Meilisearch now (P2)** — adds operational complexity before the core schema is stable; deferred to P8.
