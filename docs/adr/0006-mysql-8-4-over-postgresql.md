# 0006. MySQL 8.4 as primary database (over PostgreSQL)

- Status: Accepted
- Date: 2026-05-23
- Related task: P2-T05

## Context

The project needs a relational database that supports: utf8mb4 with Devanagari full-text search (ngram
parser), JSON columns for `source_refs`, ENUM types, stored functions, BEFORE triggers, and InnoDB
transactional integrity. The target deployment environment is Laravel Herd (macOS dev) and Laravel
Cloud (production), both of which default to MySQL.

## Decision

MySQL 8.4 (LTS) is the primary database. The existing Herd installation ships MySQL 8.0.33+; we
target the 8.4 LTS feature set (FULLTEXT ngram, `REGEXP_REPLACE` with ICU engine, `DETERMINISTIC`
stored functions, `utf8mb4_0900_ai_ci` collation).

All migrations use `utf8mb4` charset and `utf8mb4_0900_ai_ci` collation. MySQL-specific DDL
(stored functions, triggers, FULLTEXT indexes via `ALTER TABLE`) is guarded with
`DB::connection()->getDriverName() !== 'mysql'` so the SQLite in-memory test environment is
unaffected.

## Consequences

- Positive: Herd default — no extra service setup for developers.
- Positive: ngram FULLTEXT parser built-in — no plugin required for Devanagari substring search.
- Positive: Operational familiarity with the UP Police IT team who already run MySQL.
- Negative: Lose `pg_trgm` similarity-search operators (irrelevant — we use ngram FULLTEXT instead).
- Negative: Lose PostgreSQL `jsonb` GIN indexes (our `source_refs` JSON is write-once/read-rarely; no index needed).
- Negative: MySQL stored functions cannot be called from generated columns — mitigated by using BEFORE triggers (P2-T04).
- Follow-ups: If search requirements exceed MySQL FULLTEXT capabilities, P8 swaps to Meilisearch keeping the same API contract (ADR-0004).
