<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CoachTeamResource;
use App\Models\Coach;
use App\Models\CoachAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachTeamsController extends Controller
{
    public function __invoke(Request $request, Coach $coach): JsonResponse
    {
        Gate::authorize('view', $coach);

        $assignments = CoachAssignment::where('coach_id', $coach->id)
            ->with([
                'team:id,name,sport_id',
                'team.sport:id,name',
                'session:id,name',
            ])
            ->orderByDesc('id')
            ->get();

        return CoachTeamResource::collection($assignments)
            ->response();
    }
}
