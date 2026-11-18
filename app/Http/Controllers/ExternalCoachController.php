<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\ExternalCoaches\SaveExternalCoach;
use App\Http\Requests\ExternalCoaches\StoreExternalCoachRequest;
use App\Http\Requests\ExternalCoaches\UpdateExternalCoachRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoach::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $orgId = (int) $request->user()->organization_id;
        $statusFilter = $this->filterString($filters['status'] ?? null);
        $search = $this->filterString($filters['q'] ?? null);
        $perPage = min(max((int) $request->query('per_page', 25), 10), 100);

        $externalCoaches = ExternalCoach::query()
            ->where('organization_id', $orgId)
            ->filter($statusFilter, $search)
            ->with(['sports:id,name', 'trainingVenues:id,name'])
            ->withActivePlayersCount()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('external-coaches/index', [
            'externalCoaches' => $externalCoaches,
            'filters' => [
                'q' => $search,
                'status' => $statusFilter,
            ],
            'statuses' => $this->statuses(),
            'perPage' => $perPage,
        ]);
    }

    /**
     * Printable listing (letterhead + table) for the current filters, or for the
     * selected `ids` when given.
     */
    public function print(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoach::class);
        abort_unless($request->user()->can('coaches.print'), 403);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusFilter = $this->filterString($filters['status'] ?? null);
        $search = $this->filterString($filters['q'] ?? null);
        $ids = collect((array) $request->query('ids', []))->map(fn ($id): int => (int) $id)->filter()->values();

        $coaches = ExternalCoach::query()
            ->where('organization_id', (int) $request->user()->organization_id)
            ->filter($statusFilter, $search)
            ->when($ids->isNotEmpty(), fn ($query) => $query->whereKey($ids))
            ->with(['sports:id,name', 'trainingVenues:id,name'])
            ->withActivePlayersCount()
            ->orderBy('name')
            ->limit(2000)
            ->get(['id', 'name', 'email', 'phone', 'photo_path', 'status', 'experience_years', 'city']);

        return Inertia::render('external-coaches/print', [
            'coaches' => $coaches,
            'filters' => ['q' => $search, 'status' => $statusFilter, 'selected' => $ids->count()],
            'printedAt' => now()->timezone('Asia/Kolkata')->format('d M Y, h:i A').' IST',
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', ExternalCoach::class);

        return Inertia::render('external-coaches/create', [
            'statuses' => $this->statuses(),
            ...$this->formOptions(),
        ]);
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' || $value === 'all' ? null : $value;
    }

    public function store(StoreExternalCoachRequest $request, SaveExternalCoach $saveExternalCoach): RedirectResponse
    {
        Gate::authorize('create', ExternalCoach::class);

        $externalCoach = $saveExternalCoach(null, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach created.')]);

        return to_route('external-coaches.show', $externalCoach);
    }

    public function show(ExternalCoach $externalCoach): Response
    {
        Gate::authorize('view', $externalCoach);

        $externalCoach->load([
            'district:id,name',
            'statusHistory.recordedBy:id,name',
            'sports:id,name',
            'trainingVenues:id,name',
            'documents:id,external_coach_id,type,original_name,mime_type,size_bytes',
        ])->loadCount([
            'externalCoachingAssignments as active_assignments_count' => fn ($query) => $query
                ->currentlyActive()
                ->selectRaw('COUNT(DISTINCT member_id)'),
        ]);

        return Inertia::render('external-coaches/show', [
            'externalCoach' => $externalCoach,
        ]);
    }

    public function assignments(Request $request, ExternalCoach $externalCoach): Response
    {
        Gate::authorize('view', $externalCoach);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:100'],
            'active' => ['nullable', 'string', 'in:all,active,inactive'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $status = (string) ($validated['status'] ?? '');
        if ($status === 'all') {
            $status = '';
        }
        $active = (string) ($validated['active'] ?? 'all');
        $perPage = (int) ($validated['per_page'] ?? 25);

        $activeMemberIds = $externalCoach->externalCoachingAssignments()
            ->currentlyActive()
            ->pluck('member_id')
            ->unique()
            ->values();

        $assignmentsQuery = $externalCoach->externalCoachingAssignments()
            ->with([
                'member:id,full_name,pno,mobile,current_status,rank',
                'sport:id,name',
                'trainingVenue:id,name',
            ])
            ->filterListing($status, $active, $search, $activeMemberIds)
            ->select([
                'id',
                'member_id',
                'sport_id',
                'training_venue_id',
                'start_date',
                'end_date',
                'status',
                'attendance_mode',
                'created_at',
                'updated_at',
                'approved_at',
                'cancellation_reason',
                'completion_remarks',
                'remarks',
            ])
            ->orderByDesc('id');

        $assignments = $assignmentsQuery->paginate($perPage)->withQueryString();

        return Inertia::render('external-coaches/assignments', [
            'externalCoach' => $externalCoach->only(['id', 'name', 'email', 'phone']),
            'assignments' => $assignments,
            'activeAssignmentMemberIds' => $activeMemberIds,
            'activeAssignmentsCount' => $activeMemberIds->count(),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'active' => $active,
            ],
            'statusOptions' => $externalCoach->externalCoachingAssignments()
                ->distinct('status')
                ->orderBy('status')
                ->pluck('status')
                ->filter()
                ->values(),
            'perPage' => $perPage,
        ]);
    }

    public function playerAssignments(Request $request, ExternalCoach $externalCoach, Member $member): Response
    {
        Gate::authorize('view', $externalCoach);

        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $selectedMonth = Carbon::createFromFormat('!Y-m', $validated['month'] ?? now()->format('Y-m'));

        $assignments = $externalCoach->externalCoachingAssignments()
            ->where('member_id', $member->id)
            ->with([
                'sport:id,name',
                'trainingVenue:id,name',
            ])
            ->orderByDesc('start_date')
            ->get([
                'id',
                'start_date',
                'end_date',
                'status',
                'attendance_mode',
                'member_id',
                'sport_id',
                'training_venue_id',
            ]);

        $assignmentIds = $assignments->pluck('id');

        $attendances = ExternalTrainingAttendance::query()
            ->with([
                'trainingVenue:id,name',
            ])
            ->when($assignmentIds->isNotEmpty(), function ($query) use ($assignmentIds): void {
                $query->whereIn('external_coaching_assignment_id', $assignmentIds);
            }, static function ($query): void {
                $query->whereRaw('1 = 0');
            })
            ->where('external_coach_id', $externalCoach->id)
            ->where('member_id', $member->id)
            ->inMonth($selectedMonth)
            ->latest('attendance_date')
            ->get([
                'id',
                'external_coaching_assignment_id',
                'attendance_date',
                'attendance_status',
                'corrected_attendance_status',
                'review_status',
                'geo_status',
                'distance_from_venue_meters',
                'submitted_at',
                'coach_remarks',
                'review_remarks',
            ])
            ->each->append('final_attendance_status');

        return Inertia::render('external-coaches/player-assignments', [
            'externalCoach' => $externalCoach->only(['id', 'name', 'email', 'phone']),
            'member' => $member->only(['id', 'full_name', 'pno', 'mobile', 'current_status', 'rank']),
            'assignments' => $assignments,
            'attendances' => $attendances,
            'attendanceFilters' => [
                'month' => $selectedMonth->format('Y-m'),
                'label' => $selectedMonth->translatedFormat('F Y'),
                'previous' => route('external-coaches.player-assignments', [
                    'externalCoach' => $externalCoach,
                    'member' => $member,
                    'month' => $selectedMonth->copy()->subMonthNoOverflow()->format('Y-m'),
                ]),
                'current' => route('external-coaches.player-assignments', [
                    'externalCoach' => $externalCoach,
                    'member' => $member,
                ]),
                'next' => route('external-coaches.player-assignments', [
                    'externalCoach' => $externalCoach,
                    'member' => $member,
                    'month' => $selectedMonth->copy()->addMonthNoOverflow()->format('Y-m'),
                ]),
            ],
        ]);
    }

    public function edit(ExternalCoach $externalCoach): Response
    {
        Gate::authorize('update', $externalCoach);

        $externalCoach->load('documents:id,external_coach_id,type,original_name,mime_type,size_bytes');

        return Inertia::render('external-coaches/edit', [
            'externalCoach' => [
                ...$externalCoach->toArray(),
                'sport_ids' => $externalCoach->sports()->pluck('sports.id')->map(fn ($id): string => (string) $id)->all(),
                'training_venue_ids' => $externalCoach->trainingVenues()->pluck('training_venues.id')->map(fn ($id): string => (string) $id)->all(),
            ],
            'statuses' => $this->statuses(),
            ...$this->formOptions(),
        ]);
    }

    public function update(UpdateExternalCoachRequest $request, ExternalCoach $externalCoach, SaveExternalCoach $saveExternalCoach): RedirectResponse
    {
        Gate::authorize('update', $externalCoach);

        if ($externalCoach->status !== $request->validated('status')) {
            Gate::authorize('manageStatus', $externalCoach);
        }

        $saveExternalCoach($externalCoach, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach updated.')]);

        return to_route('external-coaches.show', $externalCoach);
    }

    public function destroy(ExternalCoach $externalCoach): RedirectResponse
    {
        Gate::authorize('delete', $externalCoach);

        $externalCoach->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach deleted.')]);

        return to_route('external-coaches.index');
    }

    /**
     * @return array{sports: Collection<int, Sport>, trainingVenues: Collection<int, TrainingVenue>}
     */
    private function formOptions(): array
    {
        $orgId = (int) auth()->user()->organization_id;

        return [
            'sports' => Sport::query()->where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
            'trainingVenues' => TrainingVenue::query()->where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
        ];
    }

    /**
     * @return list<string>
     */
    private function statuses(): array
    {
        return ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'];
    }
}
