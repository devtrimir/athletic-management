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
        $pno = trim((string) $request->query('pno', ''));

        $baseQuery = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name,current_status', 'trainingVenue:id,name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('status', 'active')
            ->when($pno !== '', function ($query) use ($pno): void {
                $query->whereHas('member', fn ($memberQuery) => $memberQuery->where('pno', 'like', "%{$pno}%"));
            });

        $assignments = (clone $baseQuery)
            ->orderBy('end_date')
            ->paginate(10, ['id', 'organization_id', 'member_id', 'training_venue_id', 'sport_id', 'start_date', 'end_date', 'training_start_time', 'training_end_time', 'status'])
            ->withQueryString();

        return Inertia::render('external-coach/dashboard', [
            'assignments' => $assignments,
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
