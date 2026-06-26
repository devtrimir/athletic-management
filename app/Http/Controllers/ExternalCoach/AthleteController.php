<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach;

use App\Http\Controllers\Controller;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AthleteController extends Controller
{
    public function show(Request $request, Member $member): Response
    {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');

        $assignmentIds = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('member_id', $member->id)
            ->where('status', 'active')
            ->pluck('id');

        abort_if($assignmentIds->isEmpty(), 404);

        $athlete = Member::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->whereKey($member->id)
            ->firstOrFail([
                'id',
                'organization_id',
                'pno',
                'full_name',
                'gender',
                'player_category',
                'player_level',
                'current_status',
                'sport_id',
                'sport_event',
            ]);

        $assignments = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['trainingVenue:id,name', 'sport:id,name', 'sportEvent:id,name'])
            ->whereIn('id', $assignmentIds)
            ->latest('start_date')
            ->get([
                'id',
                'training_venue_id',
                'sport_id',
                'sport_event_id',
                'start_date',
                'end_date',
                'training_start_time',
                'training_end_time',
                'attendance_mode',
                'status',
            ]);

        $attendances = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('member_id', $athlete->id)
            ->whereIn('external_coaching_assignment_id', $assignmentIds)
            ->latest('attendance_date')
            ->limit(20)
            ->get([
                'id',
                'attendance_date',
                'attendance_status',
                'review_status',
                'geo_status',
                'submitted_at',
                'coach_remarks',
            ]);

        $performanceUpdates = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('member_id', $athlete->id)
            ->whereIn('external_coaching_assignment_id', $assignmentIds)
            ->latest('update_date')
            ->limit(20)
            ->get([
                'id',
                'sport_id',
                'update_date',
                'performance_level',
                'performance_score',
                'training_summary',
                'improvement_notes',
                'review_status',
            ]);

        return Inertia::render('external-coach/athletes/show', [
            'athlete' => $athlete,
            'assignments' => $assignments,
            'attendances' => $attendances,
            'performanceUpdates' => $performanceUpdates,
        ]);
    }
}
