<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\Member;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamSessionStatus;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $canViewMembers = Gate::allows('viewAny', Member::class);
        $canViewCoaches = Gate::allows('viewAny', Coach::class);
        $canViewTeams = Gate::allows('viewAny', Team::class);
        $canViewTournaments = Gate::allows('viewAny', Tournament::class);

        $currentSession = SportSession::where('is_current', true)->first();
        $selectedSession = SportSession::query()
            ->when(
                $request->filled('session_id'),
                fn (Builder $query): Builder => $query->whereKey($request->integer('session_id')),
                fn (Builder $query): Builder => $currentSession
                    ? $query->whereKey($currentSession->id)
                    : $query->whereRaw('1 = 0'),
            )
            ->first();

        $stats = [];

        if ($canViewMembers) {
            $memberStatusCounts = Member::query()
                ->selectRaw('current_status, count(*) as cnt')
                ->groupBy('current_status')
                ->pluck('cnt', 'current_status')
                ->toArray();

            $totalMembers = (int) array_sum($memberStatusCounts);
            $activeMemberQuery = Member::query()
                ->where('current_status', 'ACTIVE')
                ->whereHas('teamMemberships', function (Builder $query) use ($selectedSession): void {
                    $query
                        ->where('session_id', $selectedSession?->id ?? 0)
                        ->whereNull('left_on')
                        ->whereHas('team', fn (Builder $query): Builder => $query
                            ->where('session_id', $selectedSession?->id ?? 0)
                            ->where('is_active', true));
                });
            $activeMembers = (clone $activeMemberQuery)->count();

            $memberLevelCounts = (clone $activeMemberQuery)
                ->selectRaw('player_level, count(*) as cnt')
                ->groupBy('player_level')
                ->pluck('cnt', 'player_level')
                ->toArray();

            $memberGenderCounts = (clone $activeMemberQuery)
                ->selectRaw('gender, count(*) as cnt')
                ->groupBy('gender')
                ->pluck('cnt', 'gender')
                ->toArray();

            $stats['members'] = [
                'total' => $totalMembers,
                'active' => $activeMembers,
                'inactive' => max(0, $totalMembers - $activeMembers),
                'by_status' => $memberStatusCounts,
                'by_level' => $memberLevelCounts,
                'by_gender' => $memberGenderCounts,
            ];
        }

        if ($canViewCoaches) {
            $activeCoaches = Coach::whereHas('assignmentHistory', function (Builder $query) use ($selectedSession): void {
                $query
                    ->where('session_id', $selectedSession?->id ?? 0)
                    ->where('is_current', true)
                    ->whereHas('team', fn (Builder $query): Builder => $query
                        ->where('session_id', $selectedSession?->id ?? 0)
                        ->where('is_active', true));
            })->count();
            $totalCoaches = Coach::count();

            $stats['coaches'] = [
                'total' => $totalCoaches,
                'active' => $activeCoaches,
                'inactive' => max(0, $totalCoaches - $activeCoaches),
            ];
        }

        if ($canViewTeams) {
            $selectedSessionId = $selectedSession?->id;
            if ($selectedSession === null) {
                $selectedTeamQuery = Team::query();
                $teamTotal = 0;
                $teamActive = 0;
            } else {
                $selectedTeamQuery = Team::where('session_id', $selectedSession->id);
                $teamTotal = (clone $selectedTeamQuery)->count();
                $teamActive = (clone $selectedTeamQuery)->where(function (Builder $query) use ($selectedSessionId): void {
                    $query
                        ->whereHas('sessionStatuses', function (Builder $statusQuery) use ($selectedSessionId): void {
                            $statusQuery
                                ->where('session_id', $selectedSessionId)
                                ->where('status', TeamSessionStatus::STATUS_ACTIVE);
                        })
                        ->orWhere(function (Builder $legacyQuery) use ($selectedSessionId): void {
                            $legacyQuery->whereDoesntHave('sessionStatuses', function (Builder $statusQuery) use ($selectedSessionId): void {
                                $statusQuery->where('session_id', $selectedSessionId);
                            })->where('is_active', true);
                        });
                })->count();
            }

            $stats['teams'] = [
                'total' => (int) $teamTotal,
                'active' => (int) $teamActive,
                'inactive' => (int) max(0, $teamTotal - $teamActive),
                'current_session' => (clone $selectedTeamQuery)->count(),
            ];
        }

        if ($canViewTournaments) {
            $medalQuery = Achievement::query();

            if ($selectedSession) {
                $medalQuery->whereHas('participation', fn (Builder $query): Builder => $query
                    ->where('session_id', $selectedSession->id));
            }

            $medalCounts = $medalQuery
                ->selectRaw('medal_type, count(*) as cnt')
                ->groupBy('medal_type')
                ->pluck('cnt', 'medal_type')
                ->toArray();

            $selectedTournamentQuery = $selectedSession
                ? Tournament::where('session_id', $selectedSession->id)
                : Tournament::query();

            $stats['tournaments'] = [
                'total' => $selectedTournamentQuery->count(),
                'current_session' => $selectedTournamentQuery->count(),
            ];

            $stats['medals'] = [
                'gold' => $medalCounts['GOLD'] ?? 0,
                'silver' => $medalCounts['SILVER'] ?? 0,
                'bronze' => $medalCounts['BRONZE'] ?? 0,
                'total' => array_sum($medalCounts),
            ];
        }

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'currentSession' => $currentSession?->only(['id', 'name', 'start_year', 'end_year']),
            'selectedSession' => $selectedSession?->only(['id', 'name', 'start_year', 'end_year']),
            'sessions' => SportSession::query()
                ->select(['id', 'name', 'start_year', 'end_year', 'is_current'])
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'permissions' => [
                'viewMembers' => $canViewMembers,
                'viewCoaches' => $canViewCoaches,
                'viewTeams' => $canViewTeams,
                'viewTournaments' => $canViewTournaments,
            ],
        ]);
    }
}
