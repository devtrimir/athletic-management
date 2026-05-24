<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MemberSearchService
{
    /** Rank prefix pattern mirroring the MySQL normalize_devanagari() function. */
    private const RANK_PREFIX = '/^(दलनायक|मु\.आ\.|पी\.सी\.|म\.आ\.|आ\.)\s*/u';

    /** Columns returned in every search hit — the frozen contract. */
    private const COLUMNS = ['id', 'member_code', 'pno', 'full_name_hi', 'full_name_en', 'player_category', 'player_level', 'current_status'];

    /**
     * Search members for the given org and query string.
     * Returns at most 50 results.
     *
     * @return Collection<int, mixed>
     */
    public function search(int $orgId, string $q): Collection
    {
        $q = $this->normalize($q);

        if ($q === '') {
            return collect();
        }

        if (DB::connection()->getDriverName() === 'sqlite') {
            return $this->searchSqlite($orgId, $q);
        }

        return $this->searchMysql($orgId, $q);
    }

    /**
     * PHP-side equivalent of the MySQL normalize_devanagari() stored function.
     * Must produce tokens that match what the DB trigger stored in *_normalized columns.
     */
    public function normalize(string $q): string
    {
        // Strip ZWJ (U+200D) and ZWNJ (U+200C)
        $q = str_replace(["\u{200C}", "\u{200D}"], '', $q);
        // Lowercase (ASCII only — mirrors MySQL LOWER())
        $q = mb_strtolower($q, 'UTF-8');
        // Strip rank prefixes
        $q = preg_replace(self::RANK_PREFIX, '', $q) ?? $q;

        // Collapse whitespace
        return trim(preg_replace('/\s+/u', ' ', $q) ?? $q);
    }

    /** MySQL path: PNO exact short-circuit, then FULLTEXT ngram BOOLEAN MODE. */
    private function searchMysql(int $orgId, string $q): Collection
    {
        // PNO short-circuit — numeric query, skip FULLTEXT
        if (ctype_digit($q)) {
            $hit = DB::select(
                'SELECT '.implode(', ', self::COLUMNS).' FROM members WHERE organization_id = ? AND pno = ? AND deleted_at IS NULL LIMIT 1',
                [$orgId, $q],
            );
            if (count($hit) > 0) {
                return collect($hit);
            }
        }

        $boolQ = $this->toBooleanQuery($q);

        if ($boolQ === '') {
            return collect();
        }

        $cols = implode(', m.', self::COLUMNS);

        $rows = DB::select(<<<SQL
            SELECT m.{$cols}
            FROM members m
            WHERE m.organization_id = ?
              AND m.deleted_at IS NULL
              AND (
                MATCH(m.full_name_normalized) AGAINST (? IN BOOLEAN MODE)
                OR m.id IN (
                    SELECT a.member_id FROM name_aliases a
                    WHERE MATCH(a.alias_normalized) AGAINST (? IN BOOLEAN MODE)
                )
              )
            ORDER BY MATCH(m.full_name_normalized) AGAINST (? IN BOOLEAN MODE) DESC
            LIMIT 50
        SQL, [$orgId, $boolQ, $boolQ, $boolQ]);

        return collect($rows);
    }

    /**
     * SQLite path (test environment): PNO exact + LIKE on full_name_hi OR alias_hi.
     * Mirrors the MySQL path which also searches name_aliases via FULLTEXT.
     */
    private function searchSqlite(int $orgId, string $q): Collection
    {
        $base = Member::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->select(self::COLUMNS);

        // PNO short-circuit
        $pnoHit = (clone $base)->where('pno', $q)->first();
        if ($pnoHit) {
            return collect([$pnoHit]);
        }

        return (clone $base)
            ->where(function ($query) use ($q): void {
                $query->where('full_name_hi', 'LIKE', '%'.$q.'%')
                    ->orWhereHas('aliases', fn ($a) => $a->where('alias_hi', 'LIKE', '%'.$q.'%'));
            })
            ->limit(50)
            ->get();
    }

    /**
     * Build a FULLTEXT BOOLEAN MODE query string.
     * Each token gets a trailing * for prefix expansion.
     */
    private function toBooleanQuery(string $q): string
    {
        return collect(explode(' ', $q))
            ->filter()
            ->map(fn (string $token) => preg_replace('/[+\-><()~*"@]/', '', $token).'*')
            ->filter(fn (string $token) => $token !== '*')
            ->implode(' ');
    }
}
