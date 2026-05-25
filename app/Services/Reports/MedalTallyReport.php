<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalTallyReport
{
    private const BLANK = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

    /**
     * Run the medal-tally pivot query.
     *
     * Returns one row per tier that has at least one achievement, with medal
     * counts keyed by type (GOLD/SILVER/BRONZE/MERIT) and a nested tier object.
     *
     * @param  array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}  $filters
     * @return Collection<int, array{tier: array{code: string, label: string, weight: int}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int}>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $sessionId = $filters['session_id'] ?? null;
        $sportId = $filters['sport_id'] ?? null;
        $unitId = $filters['unit_id'] ?? null;
        $tierId = $filters['tier_id'] ?? null;

        $rows = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->join('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->select('tt.id', 'tt.code', 'tt.label_hi', 'tt.label_en', 'tt.weight', 'a.medal_type', DB::raw('COUNT(*) as cnt'))
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->when($sessionId, fn ($q) => $q->where('t.session_id', $sessionId))
            ->when($sportId, fn ($q) => $q->where('e.sport_id', $sportId))
            ->when($tierId, fn ($q) => $q->where('t.tier_id', $tierId))
            ->when($unitId, fn ($q) => $q
                ->join('members as m', 'm.id', '=', 'p.member_id')
                ->where('m.current_unit_id', $unitId)
            )
            ->groupBy('tt.id', 'tt.code', 'tt.label_hi', 'tt.label_en', 'tt.weight', 'a.medal_type')
            ->orderByDesc('tt.weight')
            ->get();

        return $rows
            ->groupBy('id')
            ->map(function (Collection $tierRows): array {
                $first = $tierRows->first();
                $counts = $tierRows->pluck('cnt', 'medal_type')->toArray();

                return [
                    'tier' => [
                        'code' => $first->code,
                        'label' => app()->getLocale() === 'en' ? $first->label_en : $first->label_hi,
                        'weight' => $first->weight,
                    ],
                ] + array_merge(self::BLANK, $counts);
            })
            ->values();
    }
}
