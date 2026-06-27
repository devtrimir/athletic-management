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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AthleteController extends Controller
{
    public function show(Request $request, Member $member): RedirectResponse
    {
        $this->athleteContext($request, $member);

        return to_route('external-coach.athletes.attendance', $member);
    }

    public function attendance(Request $request, Member $member): Response
    {
        $context = $this->athleteContext($request, $member);
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $selectedMonth = Carbon::createFromFormat('!Y-m', $validated['month'] ?? now()->format('Y-m'));

        $attendances = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $context['coach']->organization_id)
            ->where('external_coach_id', $context['coach']->id)
            ->where('member_id', $context['athlete']->id)
            ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
            ->whereBetween('attendance_date', [
                $selectedMonth->copy()->startOfMonth()->toDateString(),
                $selectedMonth->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('attendance_date')
            ->get([
                'id',
                'attendance_date',
                'attendance_status',
                'review_status',
                'review_remarks',
                'reviewed_at',
                'geo_status',
                'submitted_at',
                'coach_remarks',
            ]);

        return Inertia::render('external-coach/athletes/show', [
            ...$this->shellPayload($context['athlete'], $context['assignments'], 'attendance'),
            'tabCounts' => $this->tabCounts($context),
            'attendanceFilters' => $this->monthFilters($context['athlete'], $selectedMonth, 'external-coach.athletes.attendance'),
            'attendances' => $attendances,
        ]);
    }

    public function performance(Request $request, Member $member): Response
    {
        $context = $this->athleteContext($request, $member);
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $selectedMonth = Carbon::createFromFormat('!Y-m', $validated['month'] ?? now()->format('Y-m'));

        $performanceUpdates = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['sport:id,name'])
            ->where('organization_id', $context['coach']->organization_id)
            ->where('external_coach_id', $context['coach']->id)
            ->where('member_id', $context['athlete']->id)
            ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
            ->whereBetween('update_date', [
                $selectedMonth->copy()->startOfMonth()->toDateString(),
                $selectedMonth->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('update_date')
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
            ...$this->shellPayload($context['athlete'], $context['assignments'], 'performance'),
            'tabCounts' => $this->tabCounts($context),
            'performanceFilters' => $this->monthFilters($context['athlete'], $selectedMonth, 'external-coach.athletes.performance'),
            'performanceUpdates' => $performanceUpdates,
        ]);
    }

    /**
     * @return array{coach: ExternalCoach, athlete: Member, assignmentIds: Collection<int, int>, assignments: Collection<int, ExternalCoachingAssignment>}
     */
    private function athleteContext(Request $request, Member $member): array
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

        return [
            'coach' => $coach,
            'athlete' => $athlete,
            'assignmentIds' => $assignmentIds,
            'assignments' => $assignments,
        ];
    }

    /**
     * @param  Collection<int, ExternalCoachingAssignment>  $assignments
     * @return array{athlete: Member, assignments: Collection<int, ExternalCoachingAssignment>, activeTab: string, tabLinks: array{attendance: string, performance: string}}
     */
    private function shellPayload(Member $athlete, Collection $assignments, string $activeTab): array
    {
        return [
            'athlete' => $athlete,
            'assignments' => $assignments,
            'activeTab' => $activeTab,
            'tabLinks' => [
                'attendance' => route('external-coach.athletes.attendance', $athlete),
                'performance' => route('external-coach.athletes.performance', $athlete),
            ],
        ];
    }

    /**
     * @param  array{coach: ExternalCoach, athlete: Member, assignmentIds: Collection<int, int>, assignments: Collection<int, ExternalCoachingAssignment>}  $context
     * @return array{attendance: int, performance: int}
     */
    private function tabCounts(array $context): array
    {
        return [
            'attendance' => ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
                ->where('organization_id', $context['coach']->organization_id)
                ->where('external_coach_id', $context['coach']->id)
                ->where('member_id', $context['athlete']->id)
                ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
                ->count(),
            'performance' => ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)
                ->where('organization_id', $context['coach']->organization_id)
                ->where('external_coach_id', $context['coach']->id)
                ->where('member_id', $context['athlete']->id)
                ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
                ->count(),
        ];
    }

    /**
     * @return array{month: string, label: string, previous: string, current: string, next: string}
     */
    private function monthFilters(Member $athlete, Carbon $selectedMonth, string $routeName): array
    {
        return [
            'month' => $selectedMonth->format('Y-m'),
            'label' => $selectedMonth->translatedFormat('F Y'),
            'previous' => route($routeName, [
                'member' => $athlete,
                'month' => $selectedMonth->copy()->subMonthNoOverflow()->format('Y-m'),
            ]),
            'current' => route($routeName, [
                'member' => $athlete,
                'month' => now()->format('Y-m'),
            ]),
            'next' => route($routeName, [
                'member' => $athlete,
                'month' => $selectedMonth->copy()->addMonthNoOverflow()->format('Y-m'),
            ]),
        ];
    }
}
