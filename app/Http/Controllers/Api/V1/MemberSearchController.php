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
        ]);

        $orgId = (int) $request->user()->organization_id;
        $results = $service->search($orgId, (string) $validated['q']);

        return MemberSearchResource::collection($results)
            ->additional(['meta' => ['q' => $validated['q'], 'count' => $results->count()]])
            ->response();
    }
}
