<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\MemberSearchResource;
use App\Models\Member;
use App\Services\MemberSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberSearchController extends Controller
{
    public function __invoke(Request $request, MemberSearchService $service): JsonResponse
    {
        Gate::authorize('viewAny', Member::class);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'player_category' => ['nullable', 'string', 'in:GD,SPORTS_QUOTA'],
            'player_level' => ['nullable', 'string', 'in:ZONAL,NATIONAL,INTERNATIONAL,AIPSC'],
            'current_status' => ['nullable', 'string', 'in:ACTIVE,RESIGNED,DISMISSED'],
        ]);

        $orgId = (int) $request->user()->organization_id;

        $filters = array_filter([
            'player_category' => $validated['player_category'] ?? null,
            'player_level' => $validated['player_level'] ?? null,
            'current_status' => $validated['current_status'] ?? null,
        ]);

        $results = $service->search($orgId, (string) $validated['q'], $filters);

        return MemberSearchResource::collection($results)
            ->additional(['meta' => ['q' => $validated['q'], 'count' => $results->count()]])
            ->response();
    }
}
