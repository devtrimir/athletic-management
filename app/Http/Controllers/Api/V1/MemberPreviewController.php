<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberPreviewController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $member->loadMissing(['homeDistrict', 'currentUnit', 'sport']);

        return response()->json([
            'id' => $member->id,
            'member_code' => $member->member_code,
            'pno' => $member->pno,
            'full_name_hi' => $member->full_name_hi,
            'full_name_en' => $member->full_name_en,
            'father_name_hi' => $member->father_name_hi,
            'rank' => $member->rank,
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
            'sport_event' => $member->sport_event,
            'team_since' => $member->team_since?->toDateString(),
            'home_district' => $member->homeDistrict ? ['name_hi' => $member->homeDistrict->name_hi] : null,
            'current_unit' => $member->currentUnit ? ['name_hi' => $member->currentUnit->name_hi] : null,
            'sport' => $member->sport ? ['name_hi' => $member->sport->name_hi] : null,
        ]);
    }
}
