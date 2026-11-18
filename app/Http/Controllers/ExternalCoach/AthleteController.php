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
        $months = $this->trainingMonths($context['assignments']);
        $selectedMonth = $this->selectedMonth($months, $validated['month'] ?? null);

        $attendances = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $context['coach']->organization_id)
            ->where('external_coach_id', $context['coach']->id)
            ->where('member_id', $context['athlete']->id)
            ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
            ->whereBetween('attendance_date', $this->rangeOf($months))
            ->latest('attendance_date')
            ->get([
                'id',
                'attendance_date',
                'attendance_status',
                'corrected_attendance_status',
                'review_status',
                'review_remarks',
                'reviewed_at',
                'geo_status',
                'submitted_at',
                'coach_remarks',
            ])
            ->each->append('final_attendance_status');

        return Inertia::render('external-coach/athletes/show', [
            ...$this->shellPayload($context['athlete'], $context['assignments'], 'attendance'),
            'tabCounts' => $this->tabCounts($context),
            'attendanceFilters' => $this->monthFilters($selectedMonth, $months, $attendances->pluck('attendance_date'), $validated['month'] ?? null),
            'attendances' => $attendances,
        ]);
    }

    public function performance(Request $request, Member $member): Response
    {
        $context = $this->athleteContext($request, $member);
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $months = $this->trainingMonths($context['assignments']);
        $selectedMonth = $this->selectedMonth($months, $validated['month'] ?? null);

        $performanceUpdates = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['sport:id,name'])
            ->where('organization_id', $context['coach']->organization_id)
            ->where('external_coach_id', $context['coach']->id)
            ->where('member_id', $context['athlete']->id)
            ->whereIn('external_coaching_assignment_id', $context['assignmentIds'])
            ->whereBetween('update_date', $this->rangeOf($months))
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
                'review_remarks',
            ]);

        return Inertia::render('external-coach/athletes/show', [
            ...$this->shellPayload($context['athlete'], $context['assignments'], 'performance'),
            'tabCounts' => $this->tabCounts($context),
            'performanceFilters' => $this->monthFilters($selectedMonth, $months, $performanceUpdates->pluck('update_date'), $validated['month'] ?? null),
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
            ->visibleToCoach()
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
            // No active assignment left: the coach may look back but not submit anything.
            'readOnly' => ! $assignments->contains(fn (ExternalCoachingAssignment $assignment): bool => $assignment->status === 'active'),
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
     * The calendar months this athlete trains in with this coach: every month
     * covered by an active assignment, up to the current month (nothing can be
     * submitted for the future). Newest last.
     *
     * @param  Collection<int, ExternalCoachingAssignment>  $assignments
     * @return Collection<int, string> "Y-m" values
     */
    private function trainingMonths(Collection $assignments): Collection
    {
        $currentMonth = now()->startOfMonth();
        $months = collect();

        foreach ($assignments as $assignment) {
            $cursor = $assignment->start_date->copy()->startOfMonth();
            $last = $assignment->end_date->copy()->startOfMonth()->min($currentMonth);

            do {
                $months->push($cursor->format('Y-m'));
                $cursor = $cursor->copy()->addMonthNoOverflow();
            } while ($cursor->lte($last));
        }

        return $months->unique()->sort()->values();
    }

    /**
     * The requested month if the athlete trains in it, otherwise the nearest
     * earlier training month (or the first one, or the latest when none is requested).
     *
     * @param  Collection<int, string>  $months
     */
    private function selectedMonth(Collection $months, ?string $requested): Carbon
    {
        $requested ??= now()->format('Y-m');
        $chosen = $months->filter(fn (string $month): bool => $month <= $requested)->last() ?? $months->first();

        return Carbon::createFromFormat('!Y-m', $chosen);
    }

    /**
     * @param  Collection<int, string>  $months
     * @return array{0: string, 1: string}
     */
    private function rangeOf(Collection $months): array
    {
        return [
            Carbon::createFromFormat('!Y-m', (string) $months->first())->startOfMonth()->toDateString(),
            Carbon::createFromFormat('!Y-m', (string) $months->last())->endOfMonth()->toDateString(),
        ];
    }

    /**
     * Everything the month picker needs in one payload: the selected month and
     * every training month with how many records it holds.
     *
     * @param  Collection<int, string>  $months
     * @param  Collection<int, mixed>  $recordDates
     * @return array{month: string, months: list<array{value: string, label: string, count: int}>}
     */
    private function monthFilters(Carbon $selectedMonth, Collection $months, Collection $recordDates, ?string $requested = null): array
    {
        $counts = $recordDates->map(fn (mixed $date): string => substr((string) $date, 0, 7))->countBy();

        // With no month asked for, open on the latest month that actually has records.
        $month = $requested === null
            ? ($months->filter(fn (string $candidate): bool => ($counts[$candidate] ?? 0) > 0)->last() ?? $selectedMonth->format('Y-m'))
            : $selectedMonth->format('Y-m');

        return [
            'month' => $month,
            'months' => $months->map(fn (string $month): array => [
                'value' => $month,
                'label' => Carbon::createFromFormat('!Y-m', $month)->translatedFormat('F Y'),
                'count' => (int) ($counts[$month] ?? 0),
            ])->all(),
        ];
    }
}
