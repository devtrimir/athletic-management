<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Participation;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberParticipationsController extends Controller
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

        $participations = Participation::where('member_id', $member->id)
            ->with([
                'session:id,name,is_current',
                'team:id,name_hi',
                'event:id,tournament_id,sport_id,name_hi,gender_class,discipline,weight_category',
                'event.sport:id,name_hi,name_en',
                'event.tournament:id,name_hi,tier_id,date_from,date_to,venue,session_id,sport_id',
                'event.tournament.sport:id,name_hi,name_en',
                'event.tournament.tier:id,code,weight',
                'achievement:id,participation_id,medal_type,position,remarks',
                'achievement.benefits',
            ])
            ->when($fromDate !== null, fn ($query) => $query->whereHas('event.tournament', fn ($tournament) => $tournament->whereDate('date_from', '>=', $fromDate)))
            ->when($toDate !== null, fn ($query) => $query->whereHas('event.tournament', fn ($tournament) => $tournament->whereDate('date_from', '<=', $toDate)))
            ->withCount('media')
            ->orderByDesc('session_id')
            ->get();

        $grouped = $participations
            ->groupBy('session_id')
            ->map(function ($group) {
                $session = $group->first()->session;

                return [
                    'session' => [
                        'id' => $session->id,
                        'name' => $session->name,
                        'is_current' => (bool) $session->is_current,
                    ],
                    'participations' => $group->map(fn ($p) => [
                        'id' => $p->id,
                        'position' => $p->position,
                        'media_files_count' => $p->media_count,
                        'tournament' => [
                            'id' => $p->event->tournament->id,
                            'name_hi' => $p->event->tournament->name_hi,
                            'tier_code' => $p->event->tournament->tier->code ?? null,
                            'tier_weight' => $p->event->tournament->tier->weight ?? null,
                            'date_from' => $p->event->tournament->date_from?->toDateString(),
                            'date_to' => $p->event->tournament->date_to?->toDateString(),
                            'venue' => $p->event->tournament->venue,
                            'sport' => $p->event->tournament->sport ? [
                                'id' => $p->event->tournament->sport->id,
                                'name_hi' => $p->event->tournament->sport->name_hi,
                                'name_en' => $p->event->tournament->sport->name_en,
                            ] : null,
                            'session_id' => $p->event->tournament->session_id,
                        ],
                        'event' => [
                            'id' => $p->event->id,
                            'name_hi' => $p->event->name_hi,
                            'gender_class' => $p->event->gender_class,
                            'discipline' => $p->event->discipline,
                            'weight_category' => $p->event->weight_category,
                            'sport' => $p->event->sport ? [
                                'id' => $p->event->sport->id,
                                'name_hi' => $p->event->sport->name_hi,
                                'name_en' => $p->event->sport->name_en,
                            ] : null,
                        ],
                        'team' => $p->team ? [
                            'id' => $p->team->id,
                            'name_hi' => $p->team->name_hi,
                        ] : null,
                        'achievement' => $p->achievement ? [
                            'id' => $p->achievement->id,
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
