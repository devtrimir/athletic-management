<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalCoachingAssignments\StoreExternalCoachingAssignmentRequest;
use App\Http\Requests\ExternalCoachingAssignments\UpdateExternalCoachingAssignmentRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalCoachingAssignmentController extends Controller
{
    /** @var string[] */
    private const array ASSIGNMENT_STATUSES = [
        'draft',
        'pending_approval',
        'approved',
        'active',
        'paused',
        'completed',
        'cancelled',
        'rejected',
        'expired',
    ];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoachingAssignment::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $statusFilter = $this->filterString($filters['status'] ?? null);
        $memberQuery = $this->filterString($filters['member_query'] ?? $filters['member'] ?? null);
        $coachQuery = $this->filterString($filters['coach_query'] ?? $filters['coach'] ?? null);
        $sportId = $this->filterString($filters['sport_id'] ?? null);
        $startDateFrom = $this->filterDate($filters['start_date_from'] ?? $filters['from_date'] ?? null);
        $startDateTo = $this->filterDate($filters['start_date_to'] ?? $filters['to_date'] ?? null);

        $assignments = ExternalCoachingAssignment::query()
            ->with(['member:id,member_code,pno,full_name', 'externalCoach:id,name,email,phone', 'trainingVenue:id,name', 'sport:id,name'])
            ->when($statusFilter !== null, fn ($query) => $query->where('status', $statusFilter))
            ->when($sportId !== null, fn ($query) => $query->where('sport_id', $sportId))
            ->when($memberQuery !== null, function ($query) use ($memberQuery): void {
                $query->whereHas('member', function ($memberQueryBuilder) use ($memberQuery): void {
                    $memberQueryBuilder
                        ->where('full_name', 'like', "%{$memberQuery}%")
                        ->orWhere('pno', 'like', "%{$memberQuery}%");
                });
            })
            ->when($coachQuery !== null, function ($query) use ($coachQuery): void {
                $query->whereHas('externalCoach', function ($coachQueryBuilder) use ($coachQuery): void {
                    $coachQueryBuilder
                        ->where('name', 'like', "%{$coachQuery}%")
                        ->orWhere('phone', 'like', "%{$coachQuery}%");
                });
            })
            ->when(
                $startDateFrom !== null || $startDateTo !== null,
                function ($query) use ($startDateFrom, $startDateTo): void {
                    if ($startDateFrom === null) {
                        $query->whereDate('start_date', '<=', $startDateTo);

                        return;
                    }

                    if ($startDateTo === null) {
                        $query->where(function ($query) use ($startDateFrom): void {
                            $query->whereDate('end_date', '>=', $startDateFrom)
                                ->orWhereNull('end_date');
                        });

                        return;
                    }

                    $query
                        ->whereDate('start_date', '<=', $startDateTo)
                        ->where(function ($query) use ($startDateFrom): void {
                            $query->whereDate('end_date', '>=', $startDateFrom)
                                ->orWhereNull('end_date');
                        });
                },
            )
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-coaching-assignments/index', [
            'assignments' => $assignments,
            'filters' => [
                'member_query' => $memberQuery,
                'coach_query' => $coachQuery,
                'status' => $statusFilter,
                'sport_id' => $sportId,
                'start_date_from' => $startDateFrom,
                'start_date_to' => $startDateTo,
            ],
            'statuses' => $this->assignmentStatuses((int) $request->user()->organization_id),
            'sports' => Sport::query()->where('organization_id', (int) $request->user()->organization_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', ExternalCoachingAssignment::class);

        return Inertia::render('external-coaching-assignments/create', $this->formOptions((int) $request->user()->organization_id));
    }

    public function store(StoreExternalCoachingAssignmentRequest $request): RedirectResponse
    {
        Gate::authorize('create', ExternalCoachingAssignment::class);

        $payload = $request->safe()->except('permission_document');
        $approvalData = $this->approvalData($payload['status'], $request->user()->id);

        $assignment = ExternalCoachingAssignment::create([
            ...$payload,
            ...$approvalData,
            ...$this->storePermissionDocument($request, (int) $request->user()->organization_id),
            'organization_id' => (int) $request->user()->organization_id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coaching assignment created.')]);

        return to_route('external-coaching-assignments.show', $assignment);
    }

    public function show(ExternalCoachingAssignment $externalCoachingAssignment): Response
    {
        Gate::authorize('view', $externalCoachingAssignment);

        return Inertia::render('external-coaching-assignments/show', [
            'assignment' => $this->assignmentPayload($externalCoachingAssignment),
        ]);
    }

    public function edit(Request $request, ExternalCoachingAssignment $externalCoachingAssignment): Response
    {
        Gate::authorize('update', $externalCoachingAssignment);

        return Inertia::render('external-coaching-assignments/edit', [
            'assignment' => $this->assignmentPayload($externalCoachingAssignment),
            ...$this->formOptions((int) $request->user()->organization_id),
        ]);
    }

    public function update(
        UpdateExternalCoachingAssignmentRequest $request,
        ExternalCoachingAssignment $externalCoachingAssignment,
    ): RedirectResponse {
        Gate::authorize('update', $externalCoachingAssignment);

        $oldDocumentPath = $externalCoachingAssignment->permission_document_path;
        $documentData = $this->storePermissionDocument($request, (int) $request->user()->organization_id);
        $payload = $request->safe()->except('permission_document');

        $externalCoachingAssignment->update([
            ...$payload,
            ...$this->approvalData($payload['status'], $request->user()->id, $externalCoachingAssignment),
            ...$documentData,
            'updated_by' => $request->user()->id,
        ]);

        if ($documentData !== [] && $oldDocumentPath !== null) {
            $this->deletePermissionDocument($oldDocumentPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coaching assignment updated.')]);

        return to_route('external-coaching-assignments.show', $externalCoachingAssignment);
    }

    public function destroy(ExternalCoachingAssignment $externalCoachingAssignment): RedirectResponse
    {
        Gate::authorize('delete', $externalCoachingAssignment);

        if ($externalCoachingAssignment->permission_document_path !== null) {
            $this->deletePermissionDocument($externalCoachingAssignment->permission_document_path);
        }

        $externalCoachingAssignment->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coaching assignment deleted.')]);

        return to_route('external-coaching-assignments.index');
    }

    public function permissionDocument(ExternalCoachingAssignment $externalCoachingAssignment): StreamedResponse
    {
        $this->authorizePermissionDocumentAccess($externalCoachingAssignment);

        return Storage::disk('local')->download(
            $externalCoachingAssignment->permission_document_path,
            $externalCoachingAssignment->permission_document_original_name,
        );
    }

    public function previewPermissionDocument(ExternalCoachingAssignment $externalCoachingAssignment): BinaryFileResponse
    {
        $this->authorizePermissionDocumentAccess($externalCoachingAssignment);

        $response = response()->file(
            Storage::disk('local')->path($externalCoachingAssignment->permission_document_path),
            array_filter([
                'Content-Type' => $externalCoachingAssignment->permission_document_mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $externalCoachingAssignment->permission_document_original_name ?? 'permission-document',
        );

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(int $organizationId): array
    {
        return [
            'externalCoaches' => ExternalCoach::query()->where('organization_id', $organizationId)->where('status', 'active')->orderBy('name')->get(['id', 'name', 'email', 'phone']),
            'trainingVenues' => TrainingVenue::query()->where('organization_id', $organizationId)->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'sports' => Sport::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'statuses' => $this->assignmentStatuses($organizationId),
            'attendanceModes' => ['single_mark', 'check_in_check_out'],
        ];
    }

    /**
     * @return list<string>
     */
    private function assignmentStatuses(int $organizationId): array
    {
        return $this->orderedDistinctValues(
            ExternalCoachingAssignment::query()
                ->where('organization_id', $organizationId)
                ->whereNotNull('status')
                ->select('status')
                ->distinct()
                ->pluck('status')
                ->filter()
                ->map(static fn (string $status): string => trim($status))
                ->values(),
            self::ASSIGNMENT_STATUSES,
        );
    }

    /**
     * @param  Collection<int, string>  $values
     * @return list<string>
     */
    private function orderedDistinctValues(Collection $values, array $fallback): array
    {
        $normalized = $values
            ->unique()
            ->values()
            ->toArray();

        if ($normalized === []) {
            return $fallback;
        }

        $normalized = array_values(array_unique($normalized));

        return array_values(array_unique(array_merge(
            $fallback,
            array_filter($normalized, static fn (string $status): bool => ! in_array($status, $fallback, true)),
        )));
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function filterDate(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function assignmentPayload(ExternalCoachingAssignment $assignment): array
    {
        $assignment->load(['member:id,member_code,pno,full_name,player_category,player_level,current_status', 'externalCoach:id,name,email,phone', 'trainingVenue:id,name', 'sport:id,name', 'sportEvent:id,name']);

        return [
            ...$assignment->toArray(),
            'has_attendances' => $assignment->attendances()->exists(),
            'permission_document' => $assignment->permission_document_path === null ? null : [
                'name' => $assignment->permission_document_original_name,
                'original_name' => $assignment->permission_document_original_name,
                'mime_type' => $assignment->permission_document_mime_type,
                'size_bytes' => $assignment->permission_document_size_bytes,
                'preview_url' => route('external-coaching-assignments.permission-document.preview', $assignment),
                'download_url' => route('external-coaching-assignments.permission-document', $assignment),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function storePermissionDocument(
        StoreExternalCoachingAssignmentRequest|UpdateExternalCoachingAssignmentRequest $request,
        int $organizationId,
    ): array {
        $file = $request->file('permission_document');

        if ($file === null) {
            return [];
        }

        $path = $file->store("external-coaching/assignments/org_{$organizationId}", 'local');

        return [
            'permission_document_path' => $path,
            'permission_document_original_name' => $file->getClientOriginalName(),
            'permission_document_mime_type' => $file->getMimeType(),
            'permission_document_size_bytes' => $file->getSize(),
        ];
    }

    private function deletePermissionDocument(string $path): void
    {
        Storage::disk('local')->delete($path);
        Storage::disk('public')->delete($path);
    }

    /**
     * @return array<string, mixed>
     */
    private function approvalData(string $status, int $userId, ?ExternalCoachingAssignment $assignment = null): array
    {
        if (! in_array($status, ['approved', 'active'], true)) {
            return [];
        }

        if ($assignment?->approved_at !== null) {
            return [];
        }

        return [
            'approved_by' => $userId,
            'approved_at' => now(),
        ];
    }

    private function authorizePermissionDocumentAccess(ExternalCoachingAssignment $assignment): void
    {
        Gate::authorize('view', $assignment);
        abort_if($assignment->permission_document_path === null, 404);
        abort_unless(Storage::disk('local')->exists($assignment->permission_document_path), 404);
    }
}
