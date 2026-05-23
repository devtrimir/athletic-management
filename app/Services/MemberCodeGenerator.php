<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;

class MemberCodeGenerator
{
    /**
     * Generate the next unique member code for the given organisation and year.
     *
     * Pattern: UPP-{year}-{6-digit-seq} (e.g. UPP-2026-000001)
     *
     * Concurrency safety: the sequence row is locked with SELECT … FOR UPDATE
     * before the increment so that concurrent calls block rather than race.
     * The insertOrIgnore before the lock ensures the row exists regardless of
     * which caller arrives first.
     *
     * Call this inside the same DB::transaction() that INSERTs the member row
     * so that the sequence increment and the member creation are atomic.
     */
    public function next(int $organizationId, ?int $year = null): string
    {
        $year ??= now()->year;

        return DB::transaction(function () use ($organizationId, $year): string {
            // Ensure the sequence row exists; concurrent inserts are silently ignored.
            DB::table('member_code_sequences')->insertOrIgnore([
                'organization_id' => $organizationId,
                'year' => $year,
                'last_seq' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Lock the row so concurrent callers queue up rather than racing.
            $current = DB::table('member_code_sequences')
                ->where('organization_id', $organizationId)
                ->where('year', $year)
                ->lockForUpdate()
                ->value('last_seq');

            $next = $current + 1;

            DB::table('member_code_sequences')
                ->where('organization_id', $organizationId)
                ->where('year', $year)
                ->update(['last_seq' => $next, 'updated_at' => now()]);

            return sprintf('UPP-%d-%06d', $year, $next);
        });
    }

    /**
     * Reserve a batch of sequential codes in one transaction.
     *
     * Advances last_seq by $count in a single locked write and returns every
     * code in the reserved range.  Use this for bulk operations (e.g. the
     * MemberVolumeSeeder) to avoid the overhead of $count separate transactions.
     *
     * @return array<int, string>
     */
    public function nextBatch(int $organizationId, int $count, ?int $year = null): array
    {
        $year ??= now()->year;

        return DB::transaction(function () use ($organizationId, $count, $year): array {
            DB::table('member_code_sequences')->insertOrIgnore([
                'organization_id' => $organizationId,
                'year' => $year,
                'last_seq' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $current = DB::table('member_code_sequences')
                ->where('organization_id', $organizationId)
                ->where('year', $year)
                ->lockForUpdate()
                ->value('last_seq');

            DB::table('member_code_sequences')
                ->where('organization_id', $organizationId)
                ->where('year', $year)
                ->update(['last_seq' => $current + $count, 'updated_at' => now()]);

            return array_map(
                fn (int $i): string => sprintf('UPP-%d-%06d', $year, $current + $i),
                range(1, $count),
            );
        });
    }
}
