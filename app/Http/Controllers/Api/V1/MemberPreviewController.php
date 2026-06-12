<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberPreviewController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $member->loadMissing([
            'homeDistrict',
            'postingDistrict',
            'currentUnit',
            'sport',
            'playableSports',
            'statusHistory',
            'legacyAchievements',
        ]);

        // Load team memberships via TeamMember without a direct relation on Member
        $teamHistory = TeamMember::with(['team', 'session'])
            ->where('member_id', $member->id)
            ->orderByDesc('joined_on')
            ->get()
            ->map(fn ($tm) => [
                'team_name_hi' => $tm->team?->name_hi,
                'session_name' => $tm->session?->name,
                'role' => $tm->role,
                'joined_on' => $tm->joined_on?->toDateString(),
                'left_on' => $tm->left_on?->toDateString(),
            ]);

        return response()->json([
            'id' => $member->id,
            'member_code' => $member->member_code,
            'pno' => $member->pno,
            'full_name_hi' => $member->full_name_hi,
            'full_name_en' => $member->full_name_en,
            'father_name_hi' => $member->father_name_hi,
            'rank' => $member->rank,
            'designation' => $member->designation,
            'gender' => $member->gender,
            'dob' => $member->dob?->toDateString(),
            'joining_date' => $member->joining_date?->toDateString(),
            'mobile' => $member->mobile,
            'player_category' => $member->player_category,
            'player_level' => $member->player_level,
            'current_status' => $member->current_status,
            'blood_group' => $member->blood_group,
            'caste' => $member->caste,
            'promotion_date' => $member->promotion_date?->toDateString(),
            'appointment' => $member->appointment,
            'recruitment_type' => $member->recruitment_type,
            'home_address' => $member->home_address,
            'other_notes' => $member->other_notes,
            'team_since' => $member->team_since?->toDateString(),
            'home_district' => $member->homeDistrict ? ['name_hi' => $member->homeDistrict->name_hi] : null,
            'posting_district' => $member->postingDistrict ? ['name_hi' => $member->postingDistrict->name_hi] : null,
            'current_unit' => $member->currentUnit ? ['name_hi' => $member->currentUnit->name_hi] : null,
            'sport' => $member->sport ? ['name_hi' => $member->sport->name_hi] : null,
            'playable_sports' => $member->playableSports->map(fn ($sport) => [
                'id' => $sport->id,
                'name_hi' => $sport->name_hi,
                'name_en' => $sport->name_en,
                'role' => $sport->pivot?->role,
                'position' => $sport->pivot?->position,
                'notes' => $sport->pivot?->notes,
            ])->values(),
            'status_history' => $member->statusHistory->map(fn ($h) => [
                'status' => $h->status,
                'effective_on' => $h->effective_on->toDateString(),
                'reason_hi' => $h->reason_hi,
            ]),
            'team_history' => $teamHistory,
            'achievements' => $member->legacyAchievements->map(fn ($a) => [
                'period' => $a->period,
                'level' => $a->level,
                'competition_details' => $a->competition_details,
                'event' => $a->event,
                'medal_type' => $a->medal_type,
                'event_date' => $a->event_date?->toDateString(),
                'venue' => $a->venue,
            ]),
        ]);
    }
}
