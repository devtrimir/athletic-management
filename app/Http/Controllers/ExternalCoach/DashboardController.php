<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach;

use App\Http\Controllers\Controller;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');
        $pno = $request->query('pno');
        $pno = is_string($pno) ? mb_substr(trim($pno), 0, 30) : '';
        $likePno = addcslashes($pno, '%_\\');

        $baseQuery = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name,current_status', 'trainingVenue:id,name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('status', 'active')
            ->when($pno !== '', function ($query) use ($likePno): void {
                $query->whereHas('member', fn ($memberQuery) => $memberQuery->where('pno', 'like', "%{$likePno}%"));
            });

        $assignments = (clone $baseQuery)
            ->orderBy('end_date')
            ->paginate(10, ['id', 'organization_id', 'member_id', 'training_venue_id', 'sport_id', 'start_date', 'end_date', 'training_start_time', 'training_end_time', 'status'])
            ->withQueryString();

        // Finished assignments the admin allowed read-only history for, unless
        // the player is training with this coach again.
        $historyAssignments = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name,current_status', 'trainingVenue:id,name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->whereIn('status', ExternalCoachingAssignment::FINISHED_STATUSES)
            ->where('coach_history_access', true)
            ->whereNotIn('member_id', ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
                ->where('organization_id', $coach->organization_id)
                ->where('external_coach_id', $coach->id)
                ->where('status', 'active')
                ->select('member_id'))
            ->when($pno !== '', function ($query) use ($likePno): void {
                $query->whereHas('member', fn ($memberQuery) => $memberQuery->where('pno', 'like', "%{$likePno}%"));
            })
            ->latest('end_date')
            ->limit(50)
            ->get(['id', 'organization_id', 'member_id', 'training_venue_id', 'sport_id', 'start_date', 'end_date', 'status']);

        return Inertia::render('external-coach/dashboard', [
            'assignments' => $assignments,
            'historyAssignments' => $historyAssignments,
            'summary' => [
                'active_assignments' => (clone $baseQuery)->count(),
                'sports_covered' => (clone $baseQuery)->distinct('sport_id')->count('sport_id'),
                'training_venues' => (clone $baseQuery)->distinct('training_venue_id')->count('training_venue_id'),
            ],
            'filters' => [
                'pno' => $pno,
            ],
        ]);
    }
}
