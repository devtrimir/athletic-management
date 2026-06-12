<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberAchievementsController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $data = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
        ]);

        $fromDate = isset($data['from_date']) ? Carbon::parse($data['from_date'])->startOfDay() : null;
        $toDate = isset($data['to_date']) ? Carbon::parse($data['to_date'])->endOfDay() : null;

        if ($fromDate !== null && $toDate !== null && $fromDate->diffInDays($toDate) > 365) {
            abort(422, 'Date range must not exceed 365 days.');
        }

        $achievements = Achievement::whereHas(
            'participation',
            fn ($q) => $q->where('member_id', $member->id)
                ->when($fromDate !== null, fn ($query) => $query->whereHas('event.tournament', fn ($tournament) => $tournament->whereDate('date_from', '>=', $fromDate)))
                ->when($toDate !== null, fn ($query) => $query->whereHas('event.tournament', fn ($tournament) => $tournament->whereDate('date_from', '<=', $toDate))),
        )
            ->with([
                'participation.session:id,name',
                'participation.event:id,tournament_id,name_hi',
                'participation.event.tournament:id,name_hi,tier_id',
                'participation.event.tournament.tier:id,code,weight',
                'benefits',
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
                'tier_weight' => $a->participation->event->tournament->tier->weight ?? null,
                'date_from' => $a->participation->event->tournament->date_from?->toDateString(),
                'date_to' => $a->participation->event->tournament->date_to?->toDateString(),
                'venue' => $a->participation->event->tournament->venue,
            ],
            'event' => [
                'id' => $a->participation->event->id,
                'name_hi' => $a->participation->event->name_hi,
            ],
            'benefits' => $a->benefits->map(fn ($b) => [
                'id' => $b->id,
                'benefit_type' => $b->benefit_type,
                'promoted_from_rank' => $b->promoted_from_rank,
                'promoted_to_rank' => $b->promoted_to_rank,
                'cash_amount' => $b->cash_amount,
                'benefit_date' => $b->benefit_date?->toDateString(),
                'order_reference' => $b->order_reference,
                'remarks' => $b->remarks,
            ])->values()->all(),
        ])->values();

        return response()->json([
            'data' => [
                'summary' => $summary,
                'achievements' => $list,
            ],
        ]);
    }
}
