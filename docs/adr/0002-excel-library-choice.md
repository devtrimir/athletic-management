# 0002. Excel library: maatwebsite/excel (vs rap2hpoutre/fast-excel)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @devtrimir
- Related task: P0-T13

## Context

Data is entered manually via the web application — legacy workbook import is not required.
The Excel library is needed exclusively for:

- **P7 XLSX report exports** — achievement summaries, roster exports, and tournament result sheets
  that users download. These reports must closely mirror the familiar column layout, include
  Devanagari (Noto Sans Devanagari) font embedding, merged header cells for grouped columns, and
  per-cell styling (bold section titles, border rules).

Two candidates evaluated:

| | `maatwebsite/excel ^3.1` | `rap2hpoutre/fast-excel ^5` |
|---|---|---|
| Underlying library | PhpSpreadsheet | SpreadsheetReader |
| Merged cells | ✅ full support | ❌ not supported |
| Font embedding | ✅ | limited |
| Per-cell styles | ✅ | minimal |
| Queued exports | ✅ `ShouldQueue` | manual |
| Memory per export | ~30 MB | ~5 MB |
| Import support | ✅ `ChunkReading` | ✅ streaming |

## Decision

**`maatwebsite/excel ^3.1`.**

The P7 reports require merged header cells (to match the grouped-column layout users are
familiar with from the legacy workbooks), Devanagari font embedding, and per-cell styling.
`fast-excel` cannot produce these features. The memory difference is moot because:

1. Exports run inside queued `ExportReportJob` workers — memory is isolated.
2. The largest report is a full roster (~1,000 rows × 10 columns) — well within
   PhpSpreadsheet's comfortable range.

No import pipeline exists; if one is ever needed, `ChunkReading` in `maatwebsite/excel`
handles large files without loading the entire workbook into memory.

## Consequences

- **Positive:** Full formatting control for styled XLSX reports. Single package covers both
  current export needs and any future import requirements. Deep Laravel integration
  (`Exportable` / `Importable` traits, `ShouldQueue`, `WithHeadings`).
- **Negative / costs:** ~30 MB per PhpSpreadsheet instance. Mitigated by queued jobs.
  Install deferred to P7 to keep the P0 dependency footprint minimal.
- **Follow-ups:** `composer require maatwebsite/excel` in P7. Pin the confirmed installed
  version in `docs/STACK.md` at that time.

## Alternatives considered

- **`rap2hpoutre/fast-excel`** — Rejected: insufficient formatting API for styled,
  Devanagari-heavy XLSX reports. Suitable for simple flat-table exports; not for the
  multi-section, grouped-header reports required in P7.
- **Direct PhpSpreadsheet (no wrapper)** — Rejected: `maatwebsite/excel` wraps
  PhpSpreadsheet with Laravel conventions (queued exports, chunk reading, resource exports,
  test helpers). No benefit in bypassing the abstraction.
