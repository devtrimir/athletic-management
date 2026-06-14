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
                    'team_name' => $tm->team?->name,
                    'session_name' => $tm->session?->name,
                    'role' => $tm->role,
                    'joined_on' => $tm->joined_on?->toDateString(),
                    'left_on' => $tm->left_on?->toDateString(),
                ])
            : collect();

        $m = $coach->member;

        return response()->json([
            'id' => $coach->id,
            'full_name' => $coach->full_name,
            'pno' => $coach->pno,
            'mobile' => $coach->mobile,
            'nis_certified' => $coach->nis_certified,
            'member' => $m ? [
                'id' => $m->id,
                'member_code' => $m->member_code,
                'full_name' => $m->full_name,
                'father_name' => $m->father_name,
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
                'home_district' => $m->homeDistrict ? ['name' => $m->homeDistrict->name] : null,
                'current_unit' => $m->currentUnit ? ['name' => $m->currentUnit->name] : null,
                'sport' => $m->sport ? ['name' => $m->sport->name] : null,
                'status_history' => $m->statusHistory->map(fn ($h) => [
                    'status' => $h->status,
                    'effective_on' => $h->effective_on->toDateString(),
                    'reason' => $h->reason,
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
