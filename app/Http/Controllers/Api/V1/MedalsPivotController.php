<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MedalsPivotController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $orgId = (int) $request->user()->organization_id;
        $sessionId = $request->integer('session_id') ?: null;
        $sportId = $request->integer('sport_id') ?: null;
        $tierId = $request->integer('tier_id') ?: null;

        $rows = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->join('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->select('tt.id', 'tt.code', 'tt.label_hi', 'tt.weight', 'a.medal_type', DB::raw('COUNT(*) as cnt'))
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->when($sessionId, fn ($q) => $q->where('t.session_id', $sessionId))
            ->when($sportId, fn ($q) => $q->where('e.sport_id', $sportId))
            ->when($tierId, fn ($q) => $q->where('t.tier_id', $tierId))
            ->groupBy('tt.id', 'tt.code', 'tt.label_hi', 'tt.weight', 'a.medal_type')
            ->orderByDesc('tt.weight')
            ->get();

        // Pivot: group by tier, fill missing medal_type keys with 0
        $blank = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        $pivoted = $rows
            ->groupBy('id')
            ->map(function ($tierRows) use ($blank) {
                $first = $tierRows->first();
                $counts = $tierRows->pluck('cnt', 'medal_type')->toArray();

                return [
                    'tier' => [
                        'code' => $first->code,
                        'label_hi' => $first->label_hi,
                        'weight' => $first->weight,
                    ],
                ] + array_merge($blank, $counts);
            })
            ->values();

        return response()->json([
            'data' => $pivoted,
            'filters' => [
                'session_id' => $sessionId,
                'sport_id' => $sportId,
                'tier_id' => $tierId,
            ],
        ]);
    }
}
