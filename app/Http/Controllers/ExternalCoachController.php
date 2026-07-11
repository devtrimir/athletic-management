<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalCoaches\StoreExternalCoachRequest;
use App\Http\Requests\ExternalCoaches\UpdateExternalCoachRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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
            ->when($statusFilter !== null, fn ($query) => $query->where('status', $statusFilter))
            ->when($search !== null, function ($query) use ($search): void {
                $like = '%'.mb_strtolower($search).'%';

                $query->where(function ($builder) use ($like): void {
                    $builder->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$like]);
                });
            })
            ->withCount([
                'externalCoachingAssignments as active_coached_players_count' => function ($query): void {
                    $query->where('status', 'active')
                        ->whereDate('start_date', '<=', now())
                        ->where(function ($dateQuery): void {
                            $dateQuery->whereNull('end_date')->orWhereDate('end_date', '>=', now());
                        })
                        ->selectRaw('COUNT(DISTINCT member_id)');
                },
            ])
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

    public function create(): Response
    {
        Gate::authorize('create', ExternalCoach::class);

        return Inertia::render('external-coaches/create', [
            'statuses' => $this->statuses(),
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

    public function store(StoreExternalCoachRequest $request): RedirectResponse
    {
        Gate::authorize('create', ExternalCoach::class);

        $payload = $request->validated();
        $statusReason = Arr::pull($payload, 'status_reason');

        $externalCoach = ExternalCoach::create([
            ...$payload,
            'organization_id' => (int) $request->user()->organization_id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->recordStatus($externalCoach, $externalCoach->status, $request->user()->id, $statusReason);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach created.')]);

        return to_route('external-coaches.show', $externalCoach);
    }

    public function show(ExternalCoach $externalCoach): Response
    {
        Gate::authorize('view', $externalCoach);

        $externalCoach->load([
            'district:id,name',
            'statusHistory.recordedBy:id,name',
        ])->loadCount([
            'externalCoachingAssignments as active_assignments_count' => function ($query): void {
                $query->where('status', 'active')
                    ->whereDate('start_date', '<=', now())
                    ->where(function ($dateQuery): void {
                        $dateQuery->whereNull('end_date')->orWhereDate('end_date', '>=', now());
                    })
                    ->selectRaw('COUNT(DISTINCT member_id)');
            },
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
            ->where('status', 'active')
            ->whereDate('start_date', '<=', now())
            ->where(function ($dateQuery): void {
                $dateQuery->whereNull('end_date')->orWhereDate('end_date', '>=', now());
            })
            ->pluck('member_id')
            ->unique()
            ->values();

        $assignmentsQuery = $externalCoach->externalCoachingAssignments()
            ->with([
                'member:id,full_name,pno,mobile,current_status,rank',
                'sport:id,name',
                'trainingVenue:id,name',
            ])
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($active === 'active', fn ($query) => $query->whereIn('member_id', $activeMemberIds))
            ->when($active === 'inactive', function ($query) use ($activeMemberIds): void {
                if ($activeMemberIds->isNotEmpty()) {
                    $query->whereNotIn('member_id', $activeMemberIds);
                }
            })
            ->when(
                $search !== '',
                function ($query) use ($search): void {
                    $lowerSearch = mb_strtolower($search);

                    $query->where(function ($memberQuery) use ($lowerSearch): void {
                        $memberQuery->whereHas('member', function ($member) use ($lowerSearch): void {
                            $like = "%{$lowerSearch}%";

                            $member
                                ->whereRaw('LOWER(full_name) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(pno) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(mobile) LIKE ?', [$like]);
                        });
                    });
                },
            )
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
            'activeAssignmentMemberIds' => $externalCoach->externalCoachingAssignments()
                ->where('status', 'active')
                ->whereDate('start_date', '<=', now())
                ->where(function ($dateQuery): void {
                    $dateQuery->whereNull('end_date')->orWhereDate('end_date', '>=', now());
                })
                ->pluck('member_id')
                ->unique()
                ->values(),
            'activeAssignmentsCount' => $externalCoach->externalCoachingAssignments()
                ->where('status', 'active')
                ->whereDate('start_date', '<=', now())
                ->where(function ($dateQuery): void {
                    $dateQuery->whereNull('end_date')->orWhereDate('end_date', '>=', now());
                })
                ->distinct('member_id')
                ->count('member_id'),
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
            ->whereBetween('attendance_date', [
                $selectedMonth->copy()->startOfMonth()->toDateString(),
                $selectedMonth->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('attendance_date')
            ->get([
                'id',
                'external_coaching_assignment_id',
                'attendance_date',
                'attendance_status',
                'review_status',
                'geo_status',
                'distance_from_venue_meters',
                'submitted_at',
                'coach_remarks',
                'review_remarks',
            ]);

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

        return Inertia::render('external-coaches/edit', [
            'externalCoach' => $externalCoach,
            'statuses' => $this->statuses(),
        ]);
    }

    public function update(UpdateExternalCoachRequest $request, ExternalCoach $externalCoach): RedirectResponse
    {
        Gate::authorize('update', $externalCoach);

        $payload = $request->validated();
        $statusReason = Arr::pull($payload, 'status_reason');
        $oldStatus = $externalCoach->status;

        if (($payload['password'] ?? null) === null) {
            unset($payload['password']);
        }

        if ($oldStatus !== $payload['status']) {
            Gate::authorize('manageStatus', $externalCoach);
        }

        $externalCoach->update([
            ...$payload,
            'updated_by' => $request->user()->id,
        ]);

        if ($oldStatus !== $externalCoach->status) {
            $this->recordStatus($externalCoach, $externalCoach->status, $request->user()->id, $statusReason);
        }

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
     * @return list<string>
     */
    private function statuses(): array
    {
        return ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'];
    }

    private function recordStatus(ExternalCoach $externalCoach, string $status, ?int $recordedBy, ?string $reason): void
    {
        $externalCoach->statusHistory()->create([
            'status' => $status,
            'reason' => $reason,
            'recorded_by' => $recordedBy,
            'recorded_at' => now(),
        ]);
    }
}
