<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CoachSearchResource;
use App\Models\Coach;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Coach::class);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
        ]);

        $q = trim((string) $validated['q']);
        $orgId = (int) $request->user()->organization_id;

        // PNO short-circuit — numeric query, exact match
        if (ctype_digit($q)) {
            $results = Coach::where('organization_id', $orgId)
                ->where('pno', $q)
                ->limit(1)
                ->get(['id', 'full_name_hi', 'full_name_en', 'pno', 'nis_certified']);

            if ($results->isNotEmpty()) {
                return CoachSearchResource::collection($results)
                    ->additional(['meta' => ['q' => $q, 'count' => $results->count()]])
                    ->response();
            }
        }

        $results = Coach::where('organization_id', $orgId)
            ->where(function ($query) use ($q): void {
                $query->where('full_name_hi', 'LIKE', '%'.$q.'%')
                    ->orWhere('full_name_en', 'LIKE', '%'.$q.'%');
            })
            ->orderBy('full_name_hi')
            ->limit(20)
            ->get(['id', 'full_name_hi', 'full_name_en', 'pno', 'nis_certified']);

        return CoachSearchResource::collection($results)
            ->additional(['meta' => ['q' => $q, 'count' => $results->count()]])
            ->response();
    }
}
