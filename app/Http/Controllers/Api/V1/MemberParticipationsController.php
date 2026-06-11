<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Participation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberParticipationsController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $participations = Participation::where('member_id', $member->id)
            ->with([
                'session:id,name',
                'event:id,tournament_id,name_hi,gender_class',
                'event.tournament:id,name_hi,tier_id,date_from',
                'event.tournament.tier:id,code',
                'achievement:id,participation_id,medal_type,position,remarks',
                'achievement.benefits',
            ])
            ->withCount('media')
            ->orderByDesc('session_id')
            ->get();

        $grouped = $participations
            ->groupBy('session_id')
            ->map(function ($group) {
                $session = $group->first()->session;

                return [
                    'session' => ['id' => $session->id, 'name' => $session->name],
                    'participations' => $group->map(fn ($p) => [
                        'id' => $p->id,
                        'position' => $p->position,
                        'media_files_count' => $p->media_count,
                        'tournament' => [
                            'id' => $p->event->tournament->id,
                            'name_hi' => $p->event->tournament->name_hi,
                            'tier_code' => $p->event->tournament->tier->code ?? null,
                            'date_from' => $p->event->tournament->date_from?->toDateString(),
                        ],
                        'event' => [
                            'id' => $p->event->id,
                            'name_hi' => $p->event->name_hi,
                            'gender_class' => $p->event->gender_class,
                        ],
                        'achievement' => $p->achievement ? [
                            'medal_type' => $p->achievement->medal_type,
                            'position' => $p->achievement->position,
                            'remarks' => $p->achievement->remarks,
                            'benefits' => $p->achievement->benefits->map(fn ($b) => [
                                'id' => $b->id,
                                'benefit_type' => $b->benefit_type,
                                'promoted_from_rank' => $b->promoted_from_rank,
                                'promoted_to_rank' => $b->promoted_to_rank,
                                'cash_amount' => $b->cash_amount,
                                'benefit_date' => $b->benefit_date?->toDateString(),
                                'order_reference' => $b->order_reference,
                                'remarks' => $b->remarks,
                            ])->values()->all(),
                        ] : null,
                    ])->values(),
                ];
            })
            ->values();

        return response()->json(['data' => $grouped]);
    }
}
