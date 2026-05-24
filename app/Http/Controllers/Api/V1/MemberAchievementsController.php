<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberAchievementsController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $achievements = Achievement::whereHas(
            'participation',
            fn ($q) => $q->where('member_id', $member->id),
        )
            ->with([
                'participation.session:id,name',
                'participation.event:id,tournament_id,name_hi',
                'participation.event.tournament:id,name_hi,tier_id',
                'participation.event.tournament.tier:id,code',
            ])
            ->orderByDesc('id')
            ->get();

        $summary = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        foreach ($achievements as $achievement) {
            $summary[$achievement->medal_type]++;
        }

        $list = $achievements->map(fn ($a) => [
            'id' => $a->id,
            'medal_type' => $a->medal_type,
            'position' => $a->position,
            'remarks' => $a->remarks,
            'session' => [
                'id' => $a->participation->session->id,
                'name' => $a->participation->session->name,
            ],
            'tournament' => [
                'id' => $a->participation->event->tournament->id,
                'name_hi' => $a->participation->event->tournament->name_hi,
                'tier_code' => $a->participation->event->tournament->tier->code ?? null,
            ],
            'event' => [
                'id' => $a->participation->event->id,
                'name_hi' => $a->participation->event->name_hi,
            ],
        ])->values();

        return response()->json([
            'data' => [
                'summary' => $summary,
                'achievements' => $list,
            ],
        ]);
    }
}
