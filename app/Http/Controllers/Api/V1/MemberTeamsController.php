<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\MemberTeamResource;
use App\Models\Member;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberTeamsController extends Controller
{
    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $memberships = TeamMember::where('member_id', $member->id)
            ->with([
                'team:id,name,sport_id',
                'team.sport:id,name',
                'session:id,name',
            ])
            ->orderByDesc('id')
            ->get();

        return MemberTeamResource::collection($memberships)
            ->response();
    }
}
