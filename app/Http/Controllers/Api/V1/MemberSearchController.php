<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\MemberSearchResource;
use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\MemberSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MemberSearchController extends Controller
{
    public function __invoke(Request $request, MemberSearchService $service): JsonResponse
    {
        Gate::authorize('viewAny', Member::class);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'player_category' => ['nullable', 'string', 'in:GD,SPORTS_QUOTA'],
            'player_level' => ['nullable', 'string', 'in:ZONAL,NATIONAL,INTERNATIONAL,AIPSC'],
            'current_status' => ['nullable', 'string', Rule::in(Member::STATUSES)],
            'sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'available_for_team_id' => ['nullable', 'integer', Rule::exists('teams', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'available_for_session_id' => ['nullable', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'historical' => ['nullable', 'boolean'],
        ]);

        $orgId = (int) $request->user()->organization_id;
        $team = null;
        $historical = (bool) ($validated['historical'] ?? false);

        if (! empty($validated['available_for_team_id'])) {
            $team = Team::query()
                ->where('organization_id', $orgId)
                ->findOrFail((int) $validated['available_for_team_id']);
        }

        $filters = array_filter([
            'player_category' => $validated['player_category'] ?? null,
            'player_level' => $validated['player_level'] ?? null,
            'current_status' => $team && ! $historical ? null : ($validated['current_status'] ?? null),
            'allowed_statuses' => $team && ! $historical ? ['ACTIVE', 'INACTIVE'] : null,
            'sport_id' => $team && ! $historical ? null : ($validated['sport_id'] ?? null),
            'available_session_id' => $validated['available_for_session_id'] ?? $team?->session_id,
            'available_sport_id' => $team?->sport_id,
        ]);

        $results = $service->search($orgId, (string) $validated['q'], $filters);
        $this->attachActiveTeamLabels($results, $orgId);

        return MemberSearchResource::collection($results)
            ->additional(['meta' => ['q' => $validated['q'], 'count' => $results->count()]])
            ->response();
    }

    /**
     * @param  Collection<int, mixed>  $results
     */
    private function attachActiveTeamLabels($results, int $organizationId): void
    {
        $memberIds = $results
            ->map(fn (mixed $member): int => (int) data_get($member, 'id'))
            ->filter()
            ->values();

        if ($memberIds->isEmpty()) {
            return;
        }

        $memberships = TeamMember::query()
            ->whereIn('member_id', $memberIds)
            ->whereNull('left_on')
            ->whereHas('team', fn ($query) => $query->where('organization_id', $organizationId)->where('is_active', true))
            ->with('team:id,name,is_active')
            ->latest('id')
            ->get(['id', 'team_id', 'member_id', 'role', 'joined_on'])
            ->unique('member_id')
            ->keyBy('member_id');

        $results->each(function (mixed $member) use ($memberships): void {
            $membership = $memberships->get((int) data_get($member, 'id'));
            $activeTeam = $membership === null ? null : [
                'id' => $membership->team?->id,
                'name' => $membership->team?->name,
                'role' => $membership->role,
                'joined_on' => $membership->joined_on?->toDateString(),
            ];

            if (method_exists($member, 'setAttribute')) {
                $member->setAttribute('active_team', $activeTeam);

                return;
            }

            $member->active_team = $activeTeam;
        });
    }
}
