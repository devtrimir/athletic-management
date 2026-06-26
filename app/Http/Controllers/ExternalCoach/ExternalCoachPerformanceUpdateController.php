<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExternalCoach\StoreExternalCoachPerformanceUpdateRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachPerformanceUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');

        $assignments = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('status', 'active')
            ->latest('id')
            ->get(['id', 'organization_id', 'member_id', 'sport_id', 'start_date', 'end_date', 'status']);
        $selectedAssignmentId = (string) $request->integer('assignment');

        $updates = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->latest('update_date')
            ->latest('id')
            ->limit(50)
            ->get();

        return Inertia::render('external-coach/performance/index', [
            'assignments' => $assignments,
            'selectedAssignmentId' => $assignments->contains('id', (int) $selectedAssignmentId) ? $selectedAssignmentId : null,
            'updates' => $updates,
            'performanceLevels' => ['improving', 'stable', 'needs_attention', 'excellent'],
        ]);
    }

    public function store(StoreExternalCoachPerformanceUpdateRequest $request): RedirectResponse
    {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');
        $payload = $request->validated();
        $updateDate = Carbon::parse($payload['update_date'])->startOfDay();
        $assignment = $this->assignmentForCoach((int) $payload['external_coaching_assignment_id'], $coach);

        if ($assignment->status !== 'active') {
            throw ValidationException::withMessages([
                'external_coaching_assignment_id' => __('Performance updates can only be submitted for active assignments.'),
            ]);
        }

        if ($updateDate->lt($assignment->start_date) || $updateDate->gt($assignment->end_date)) {
            throw ValidationException::withMessages([
                'update_date' => __('Performance update date must be inside the assignment date range.'),
            ]);
        }

        ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)->create([
            ...$payload,
            'organization_id' => $assignment->organization_id,
            'external_coaching_assignment_id' => $assignment->id,
            'member_id' => $assignment->member_id,
            'external_coach_id' => $coach->id,
            'sport_id' => $assignment->sport_id,
            'update_date' => $updateDate,
            'review_status' => 'pending',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Performance update submitted.')]);

        return to_route('external-coach.performance.index');
    }

    private function assignmentForCoach(int $assignmentId, ExternalCoach $coach): ExternalCoachingAssignment
    {
        return ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->findOrFail($assignmentId);
    }
}
