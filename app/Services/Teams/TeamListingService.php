<?php

declare(strict_types=1);

namespace App\Services\Teams;

use App\Http\Resources\TeamResource;
use App\Models\CoachAssignment;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSessionStatus;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class TeamListingService
{
    public function __construct(private TeamSessionStatusManager $teamSessionStatusManager) {}

    /**
     * @return array{teams: LengthAwarePaginator, defaultSessionId: int|null, selectedSessionId: int|null, filters: array<string, mixed>}
     */
    public function forRequest(Request $request, int $orgId): array
    {
        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');
        $selectedSessionId = (int) ($request->input('filter.session_id') ?: $defaultSessionId ?: 0);

        $teams = QueryBuilder::for(Team::class)
            ->allowedFilters($this->allowedFilters($selectedSessionId))
            ->allowedSorts(['name', 'created_at'])
            ->defaultSort('name')
            ->withCount($this->rosterCounts($selectedSessionId))
            ->with([
                'sport:id,name',
                'session:id,name',
                'district:id,name',
                'unit:id,name,district_id',
                'currentInchargeAssignment',
            ])
            ->when(
                ! $request->has('filter.is_active'),
                fn (Builder $query): Builder => $query->where('is_active', true)
            )
            ->paginate(25);

        $sessionStatuses = $this->teamSessionStatusManager->statusesForTeams($teams->getCollection(), $selectedSessionId);

        $teams
            ->through(function (Team $team) use ($sessionStatuses, $request): array {
                /** @var TeamSessionStatus|null $sessionStatus */
                $sessionStatus = $sessionStatuses->get($team->id);
                $status = $sessionStatus?->status ?? TeamSessionStatus::STATUS_INACTIVE;

                $team->setAttribute(
                    'listing_is_active',
                    $team->is_active && $status === TeamSessionStatus::STATUS_ACTIVE,
                );
                $team->setAttribute('session_status', $status);
                $team->setAttribute('session_status_label', match ($status) {
                    TeamSessionStatus::STATUS_ACTIVE => __('Active'),
                    TeamSessionStatus::STATUS_CARRIED_FORWARD => __('Carried forward'),
                    default => __('Inactive'),
                });

                return (new TeamResource($team))->resolve($request);
            })
            ->withQueryString();

        return [
            'teams' => $teams,
            'filters' => array_merge($request->query('filter', []), [
                'session_id' => $selectedSessionId > 0 ? (string) $selectedSessionId : null,
            ]),
            'defaultSessionId' => $defaultSessionId !== null ? (int) $defaultSessionId : null,
            'selectedSessionId' => $selectedSessionId > 0 ? $selectedSessionId : null,
        ];
    }

    /**
     * @return list<AllowedFilter>
     */
    private function allowedFilters(int $selectedSessionId): array
    {
        return [
            AllowedFilter::callback('session_id', fn ($query, $value): null => null),
            AllowedFilter::exact('sport_id'),
            AllowedFilter::exact('district_id'),
            AllowedFilter::exact('unit_id'),
            AllowedFilter::exact('location_type'),
            AllowedFilter::callback('is_active', function (Builder $query, mixed $value) use ($selectedSessionId): void {
                $isActive = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

                $query->where(function (Builder $statusAwareQuery) use ($selectedSessionId, $isActive): void {
                    $statusAwareQuery->whereHas('sessionStatuses', function (Builder $statusQuery) use ($selectedSessionId, $isActive): void {
                        $statusQuery->where('session_id', $selectedSessionId);

                        if ($isActive === true) {
                            $statusQuery->where('status', TeamSessionStatus::STATUS_ACTIVE);
                        }

                        if ($isActive === false) {
                            $statusQuery->where('status', '!=', TeamSessionStatus::STATUS_ACTIVE);
                        }
                    })->orWhere(function (Builder $legacyQuery) use ($selectedSessionId, $isActive): void {
                        $legacyQuery->whereDoesntHave('sessionStatuses', fn (Builder $statusQuery): Builder => $statusQuery->where('session_id', $selectedSessionId));

                        if ($isActive === true) {
                            $legacyQuery->where('is_active', true)->where('session_id', $selectedSessionId);
                        }

                        if ($isActive === false) {
                            $legacyQuery->where(function (Builder $inactiveLegacyQuery) use ($selectedSessionId): void {
                                $inactiveLegacyQuery->where('is_active', false)->orWhere('session_id', '!=', $selectedSessionId);
                            });
                        }
                    });
                });
            }),
            AllowedFilter::callback('q', function (Builder $query, mixed $value): void {
                $term = '%'.mb_strtolower((string) $value).'%';
                $query->where(function (Builder $query) use ($term): void {
                    $query->whereRaw('LOWER(name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(in_charge, \'\')) LIKE ?', [$term])
                        ->orWhereHas('currentInchargeAssignment', function (Builder $assignmentQuery) use ($term): void {
                            $assignmentQuery
                                ->whereRaw('LOWER(full_name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(COALESCE(pno, \'\')) LIKE ?', [$term]);
                        });
                });
            }),
            AllowedFilter::callback('pno', function (Builder $query, mixed $value): void {
                $term = '%'.mb_strtolower(trim((string) $value)).'%';
                $teamIdsByMember = TeamMember::whereHas(
                    'member',
                    fn (Builder $query): Builder => $query->whereRaw('LOWER(pno) LIKE ?', [$term])
                )->pluck('team_id');
                $teamIdsByCoach = CoachAssignment::whereHas(
                    'coach',
                    fn (Builder $query): Builder => $query->whereRaw('LOWER(pno) LIKE ?', [$term])
                )->pluck('team_id');
                $teamIds = $teamIdsByMember->merge($teamIdsByCoach)->unique()->values();
                $query->whereIn('id', $teamIds);
            }),
        ];
    }

    /**
     * @return array<string, callable>
     */
    private function rosterCounts(int $selectedSessionId): array
    {
        $activeInSelectedSession = fn (Builder $query): Builder => $query
            ->where('session_id', $selectedSessionId)
            ->whereNull('left_on');

        $genderAndCategory = function (string $gender, ?bool $isGd) use ($activeInSelectedSession): callable {
            return function (Builder $query) use ($activeInSelectedSession, $gender, $isGd): Builder {
                $activeInSelectedSession($query);

                return $query->whereHas('member', function (Builder $memberQuery) use ($gender, $isGd): void {
                    $memberQuery->where('gender', $gender);

                    if ($isGd === true) {
                        $memberQuery->where('player_category', 'GD');
                    }

                    if ($isGd === false) {
                        $memberQuery->where('player_category', '!=', 'GD');
                    }
                });
            };
        };

        return [
            'teamMembers as players_count' => $activeInSelectedSession,
            'teamMembers as men_players_count' => $genderAndCategory('M', null),
            'teamMembers as men_gd_players_count' => $genderAndCategory('M', true),
            'teamMembers as men_non_gd_players_count' => $genderAndCategory('M', false),
            'teamMembers as women_players_count' => $genderAndCategory('F', null),
            'teamMembers as women_gd_players_count' => $genderAndCategory('F', true),
            'teamMembers as women_non_gd_players_count' => $genderAndCategory('F', false),
            'teamMembers as male_players_count' => $genderAndCategory('M', null),
            'teamMembers as female_players_count' => $genderAndCategory('F', null),
            'teamMembers as captains_count' => fn (Builder $query): Builder => $activeInSelectedSession($query)
                ->where('role', 'CAPTAIN'),
            'teamMembers as reserves_count' => fn (Builder $query): Builder => $activeInSelectedSession($query)
                ->where('role', 'RESERVE'),
            'teamMemberMovements as removed_players_count' => fn (Builder $query): Builder => $query
                ->where('session_id', $selectedSessionId)
                ->where('action', 'REMOVED'),
            'coachAssignments as coaches_count' => fn (Builder $query): Builder => $query
                ->where('session_id', $selectedSessionId)
                ->current(),
        ];
    }
}
