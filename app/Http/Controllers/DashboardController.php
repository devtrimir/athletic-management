<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\Member;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Tournament;
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

        $stats = [];

        if ($canViewMembers) {
            $activeMemberQuery = Member::where('current_status', 'ACTIVE');

            $memberStatusCounts = (clone $activeMemberQuery)
                ->selectRaw('current_status, count(*) as cnt')
                ->groupBy('current_status')
                ->pluck('cnt', 'current_status')
                ->toArray();

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
                'total' => array_sum($memberStatusCounts),
                'by_status' => $memberStatusCounts,
                'by_level' => $memberLevelCounts,
                'by_gender' => $memberGenderCounts,
                'active' => $memberStatusCounts['ACTIVE'] ?? 0,
            ];
        }

        if ($canViewCoaches) {
            $stats['coaches'] = [
                'total' => Coach::count(),
                'linked' => Coach::whereNotNull('member_id')->count(),
            ];
        }

        if ($canViewTeams) {
            $teamQuery = Team::query();
            $currentTeamQuery = $currentSession
                ? Team::where('session_id', $currentSession->id)
                : Team::query();

            $stats['teams'] = [
                'total' => $teamQuery->count(),
                'current_session' => $currentTeamQuery->count(),
            ];
        }

        if ($canViewTournaments) {
            $medalCounts = Achievement::selectRaw('medal_type, count(*) as cnt')
                ->groupBy('medal_type')
                ->pluck('cnt', 'medal_type')
                ->toArray();

            $currentTournamentQuery = $currentSession
                ? Tournament::where('session_id', $currentSession->id)
                : Tournament::query();

            $stats['tournaments'] = [
                'total' => Tournament::count(),
                'current_session' => $currentTournamentQuery->count(),
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
            'permissions' => [
                'viewMembers' => $canViewMembers,
                'viewCoaches' => $canViewCoaches,
                'viewTeams' => $canViewTeams,
                'viewTournaments' => $canViewTournaments,
            ],
        ]);
    }
}
