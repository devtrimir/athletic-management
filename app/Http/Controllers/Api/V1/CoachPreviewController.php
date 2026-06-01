<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coach;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachPreviewController extends Controller
{
    public function __invoke(Request $request, Coach $coach): JsonResponse
    {
        Gate::authorize('view', $coach);

        $coach->loadMissing([
            'member.currentUnit',
            'member.homeDistrict',
            'member.sport',
            'member.statusHistory',
            'member.legacyAchievements',
        ]);

        $memberTeamHistory = $coach->member
            ? TeamMember::with(['team', 'session'])
                ->where('member_id', $coach->member->id)
                ->orderByDesc('joined_on')
                ->get()
                ->map(fn ($tm) => [
                    'team_name_hi' => $tm->team?->name_hi,
                    'session_name' => $tm->session?->name,
                    'role' => $tm->role,
                    'joined_on' => $tm->joined_on?->toDateString(),
                    'left_on' => $tm->left_on?->toDateString(),
                ])
            : collect();

        $m = $coach->member;

        return response()->json([
            'id' => $coach->id,
            'full_name_hi' => $coach->full_name_hi,
            'full_name_en' => $coach->full_name_en,
            'pno' => $coach->pno,
            'mobile' => $coach->mobile,
            'nis_certified' => $coach->nis_certified,
            'member' => $m ? [
                'id' => $m->id,
                'member_code' => $m->member_code,
                'full_name_hi' => $m->full_name_hi,
                'full_name_en' => $m->full_name_en,
                'father_name_hi' => $m->father_name_hi,
                'rank' => $m->rank,
                'gender' => $m->gender,
                'dob' => $m->dob?->toDateString(),
                'joining_date' => $m->joining_date?->toDateString(),
                'mobile' => $m->mobile,
                'blood_group' => $m->blood_group,
                'caste' => $m->caste,
                'current_status' => $m->current_status,
                'promotion_date' => $m->promotion_date?->toDateString(),
                'appointment' => $m->appointment,
                'recruitment_type' => $m->recruitment_type,
                'sport_event' => $m->sport_event,
                'player_level' => $m->player_level,
                'player_category' => $m->player_category,
                'team_since' => $m->team_since?->toDateString(),
                'home_district' => $m->homeDistrict ? ['name_hi' => $m->homeDistrict->name_hi] : null,
                'current_unit' => $m->currentUnit ? ['name_hi' => $m->currentUnit->name_hi] : null,
                'sport' => $m->sport ? ['name_hi' => $m->sport->name_hi] : null,
                'status_history' => $m->statusHistory->map(fn ($h) => [
                    'status' => $h->status,
                    'effective_on' => $h->effective_on->toDateString(),
                    'reason_hi' => $h->reason_hi,
                ]),
                'team_history' => $memberTeamHistory,
                'achievements' => $m->legacyAchievements->map(fn ($a) => [
                    'period' => $a->period,
                    'level' => $a->level,
                    'competition_details' => $a->competition_details,
                    'event' => $a->event,
                    'medal_type' => $a->medal_type,
                    'event_date' => $a->event_date?->toDateString(),
                    'venue' => $a->venue,
                ]),
            ] : null,
        ]);
    }
}
