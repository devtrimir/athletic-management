<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CoachSearchResource;
use App\Models\Coach;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CoachSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Coach::class);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'sport_id' => [
                'nullable',
                'integer',
                Rule::exists('sports', 'id')->where('organization_id', (int) $request->user()->organization_id),
            ],
        ]);

        $q = trim((string) $validated['q']);
        $orgId = (int) $request->user()->organization_id;
        $sportId = isset($validated['sport_id']) ? (int) $validated['sport_id'] : null;

        // PNO short-circuit — numeric query, exact match
        if (ctype_digit($q)) {
            $results = Coach::where('organization_id', $orgId)
                ->when($sportId !== null, fn ($query) => $query->whereHas('sports', fn ($sportQuery) => $sportQuery->where('sports.id', $sportId)))
                ->with('member:id,member_code')
                ->with([
                    'certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,metadata',
                    'sports:id,name',
                    'assignmentHistory' => fn ($query) => $query
                        ->with(['team:id,name', 'session:id,name'])
                        ->orderByDesc('is_current')
                        ->orderByDesc('assigned_at')
                        ->orderByDesc('id'),
                ])
                ->where(function ($query) use ($q): void {
                    $query->where('pno', $q)
                        ->orWhere('mobile', $q)
                        ->orWhere('email', $q);
                })
                ->limit(1)
                ->get(['id', 'full_name', 'display_name', 'pno', 'mobile', 'designation', 'coach_status', 'email', 'date_of_birth', 'gender']);

            if ($results->isNotEmpty()) {
                return CoachSearchResource::collection($results)
                    ->additional(['meta' => ['q' => $q, 'count' => $results->count()]])
                    ->response();
            }
        }

        $results = Coach::where('organization_id', $orgId)
            ->when($sportId !== null, fn ($query) => $query->whereHas('sports', fn ($sportQuery) => $sportQuery->where('sports.id', $sportId)))
            ->where(function ($query) use ($q): void {
                $query->where('full_name', 'LIKE', '%'.$q.'%')
                    ->orWhere('display_name', 'LIKE', '%'.$q.'%')
                    ->orWhere('pno', 'LIKE', '%'.$q.'%')
                    ->orWhere('mobile', 'LIKE', '%'.$q.'%')
                    ->orWhere('designation', 'LIKE', '%'.$q.'%')
                    ->orWhere('email', 'LIKE', '%'.$q.'%')
                    ->orWhere('coach_status', 'LIKE', '%'.$q.'%')
                    ->orWhereHas('aliases', fn ($aliasQuery) => $aliasQuery->where('alias', 'LIKE', '%'.$q.'%'));
            })
            ->with('member:id,member_code')
            ->with([
                'certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,metadata',
                'sports:id,name',
                'assignmentHistory' => fn ($query) => $query
                    ->with(['team:id,name', 'session:id,name'])
                    ->orderByDesc('is_current')
                    ->orderByDesc('assigned_at')
                    ->orderByDesc('id'),
            ])
            ->orderBy('full_name')
            ->limit(20)
            ->get(['id', 'full_name', 'display_name', 'pno', 'mobile', 'designation', 'coach_status', 'email', 'date_of_birth', 'gender']);

        return CoachSearchResource::collection($results)
            ->additional(['meta' => ['q' => $q, 'count' => $results->count()]])
            ->response();
    }
}
