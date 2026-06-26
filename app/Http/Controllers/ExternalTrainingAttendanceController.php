<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalTrainingAttendances\ReviewExternalTrainingAttendanceRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Sport;
use App\Models\TrainingVenue;
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

class ExternalTrainingAttendanceController extends Controller
{
    /** @var array<int, string> */
    private const array ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused', 'not_marked'];

    /** @var array<int, string> */
    private const array GEO_STATUSES = ['valid', 'outside_radius', 'location_missing', 'location_permission_denied', 'low_accuracy', 'outside_training_time', 'manual_review_required'];

    /** @var array<int, string> */
    private const array REVIEW_STATUSES = ['pending', 'accepted', 'rejected', 'corrected', 'locked'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalTrainingAttendance::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $memberQuery = $this->filterString($filters['member_query'] ?? $filters['member'] ?? null);
        $coachQuery = $this->filterString($filters['coach_query'] ?? $filters['coach'] ?? null);
        $venueQuery = $this->filterString($filters['venue_query'] ?? $filters['training_venue'] ?? null);
        $sportQuery = $this->filterString($filters['sport_query'] ?? $filters['sport'] ?? null);
        $dateFrom = $this->filterDate($filters['date_from'] ?? $filters['attendance_date_from'] ?? null);
        $dateTo = $this->filterDate($filters['date_to'] ?? $filters['attendance_date_to'] ?? null);
        $memberId = $this->filterInt($filters['member_id'] ?? null);
        $coachId = $this->filterInt($filters['external_coach_id'] ?? null);
        $venueId = $this->filterInt($filters['training_venue_id'] ?? null);
        $sportId = $this->filterInt($filters['sport_id'] ?? null);
        $attendanceStatus = $this->filterString($filters['attendance_status'] ?? null);
        $geoStatus = $this->filterString($filters['geo_status'] ?? null);
        $reviewStatus = $this->filterString($filters['review_status'] ?? null);
        $flaggedOnly = ($filters['flagged_only'] ?? null) === '1';
        $outsideRadiusOnly = ($filters['outside_radius_only'] ?? null) === '1';
        $missingLocationOnly = ($filters['missing_location_only'] ?? null) === '1';
        $lowAccuracyOnly = ($filters['low_accuracy_only'] ?? null) === '1';

        $attendances = ExternalTrainingAttendance::query()
            ->with([
                'member:id,member_code,pno,full_name',
                'externalCoach:id,name,email,phone',
                'trainingVenue:id,name',
                'assignment:id,sport_id,status',
                'assignment.sport:id,name',
                'reviewer:id,name',
            ])
            ->when($dateFrom !== null, fn ($query) => $query->whereDate('attendance_date', '>=', $dateFrom))
            ->when($dateTo !== null, fn ($query) => $query->whereDate('attendance_date', '<=', $dateTo))
            ->when($memberQuery !== null, function ($query) use ($memberQuery): void {
                $query->whereHas('member', function ($memberQueryBuilder) use ($memberQuery): void {
                    $memberQueryBuilder
                        ->where('full_name', 'like', "%{$memberQuery}%")
                        ->orWhere('member_code', 'like', "%{$memberQuery}%")
                        ->orWhere('pno', 'like', "%{$memberQuery}%");
                });
            })
            ->when($coachQuery !== null, function ($query) use ($coachQuery): void {
                $query->whereHas('externalCoach', function ($coachQueryBuilder) use ($coachQuery): void {
                    $coachQueryBuilder
                        ->where('name', 'like', "%{$coachQuery}%")
                        ->orWhere('phone', 'like', "%{$coachQuery}%")
                        ->orWhere('email', 'like', "%{$coachQuery}%");
                });
            })
            ->when($venueQuery !== null, function ($query) use ($venueQuery): void {
                $query->whereHas('trainingVenue', function ($venueQueryBuilder) use ($venueQuery): void {
                    $venueQueryBuilder->where('name', 'like', "%{$venueQuery}%");
                });
            })
            ->when($sportQuery !== null, function ($query) use ($sportQuery): void {
                $query->whereHas('assignment.sport', function ($sportQueryBuilder) use ($sportQuery): void {
                    $sportQueryBuilder->where('name', 'like', "%{$sportQuery}%");
                });
            })
            ->when($memberId !== null, fn ($query) => $query->where('member_id', $memberId))
            ->when($coachId !== null, fn ($query) => $query->where('external_coach_id', $coachId))
            ->when($venueId !== null, fn ($query) => $query->where('training_venue_id', $venueId))
            ->when($sportId !== null, fn ($query) => $query->whereHas('assignment', fn ($assignmentQuery) => $assignmentQuery->where('sport_id', $sportId)))
            ->when($attendanceStatus !== null, fn ($query) => $query->where('attendance_status', $attendanceStatus))
            ->when($geoStatus !== null, fn ($query) => $query->where('geo_status', $geoStatus))
            ->when($reviewStatus !== null, fn ($query) => $query->where('review_status', $reviewStatus))
            ->when($flaggedOnly, fn ($query) => $query->where('geo_status', '!=', 'valid'))
            ->when($outsideRadiusOnly, fn ($query) => $query->where('geo_status', 'outside_radius'))
            ->when($missingLocationOnly, fn ($query) => $query->where('geo_status', 'location_missing'))
            ->when($lowAccuracyOnly, fn ($query) => $query->where('geo_status', 'low_accuracy'))
            ->latest('attendance_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-training-attendances/index', [
            'attendances' => $attendances,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'member_query' => $memberQuery,
                'coach_query' => $coachQuery,
                'venue_query' => $venueQuery,
                'sport_query' => $sportQuery,
                'member_id' => $memberId !== null ? (string) $memberId : null,
                'external_coach_id' => $coachId !== null ? (string) $coachId : null,
                'training_venue_id' => $venueId !== null ? (string) $venueId : null,
                'sport_id' => $sportId !== null ? (string) $sportId : null,
                'attendance_status' => $attendanceStatus,
                'geo_status' => $geoStatus,
                'review_status' => $reviewStatus,
                'flagged_only' => $flaggedOnly ? '1' : '0',
                'outside_radius_only' => $outsideRadiusOnly ? '1' : '0',
                'missing_location_only' => $missingLocationOnly ? '1' : '0',
                'low_accuracy_only' => $lowAccuracyOnly ? '1' : '0',
            ],
            'members' => Member::query()->orderBy('full_name')->get(['id', 'member_code', 'pno', 'full_name']),
            'externalCoaches' => ExternalCoach::query()->orderBy('name')->get(['id', 'name']),
            'trainingVenues' => TrainingVenue::query()->orderBy('name')->get(['id', 'name']),
            'sports' => Sport::query()->orderBy('name')->get(['id', 'name']),
            'attendanceStatuses' => $this->attendanceStatuses((int) $request->user()->organization_id),
            'geoStatuses' => $this->geoStatuses((int) $request->user()->organization_id),
            'reviewStatuses' => $this->reviewStatuses((int) $request->user()->organization_id),
        ]);
    }

    public function show(ExternalTrainingAttendance $externalTrainingAttendance): Response
    {
        Gate::authorize('view', $externalTrainingAttendance);

        return Inertia::render('external-training-attendances/show', [
            'attendance' => $this->attendancePayload($externalTrainingAttendance),
            'reviewActions' => ['accept', 'reject', 'correct', 'manual_review', 'lock'],
            'attendanceStatuses' => ['present', 'absent', 'late', 'excused', 'not_marked'],
        ]);
    }

    public function review(
        ReviewExternalTrainingAttendanceRequest $request,
        ExternalTrainingAttendance $externalTrainingAttendance,
    ): RedirectResponse {
        $payload = $request->validated();

        $externalTrainingAttendance->update([
            ...$this->reviewData($payload),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_remarks' => $payload['review_remarks'] ?? null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Attendance review saved.')]);

        return to_route('external-training-attendances.show', $externalTrainingAttendance);
    }

    public function photo(ExternalTrainingAttendance $externalTrainingAttendance): StreamedResponse
    {
        $this->authorizePhotoAccess($externalTrainingAttendance);

        return Storage::disk('local')->download(
            $externalTrainingAttendance->submitted_photo_path,
            $externalTrainingAttendance->submitted_photo_original_name,
        );
    }

    public function previewPhoto(ExternalTrainingAttendance $externalTrainingAttendance): BinaryFileResponse
    {
        $this->authorizePhotoAccess($externalTrainingAttendance);

        $response = response()->file(
            Storage::disk('local')->path($externalTrainingAttendance->submitted_photo_path),
            array_filter([
                'Content-Type' => $externalTrainingAttendance->submitted_photo_mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $externalTrainingAttendance->submitted_photo_original_name ?? 'attendance-photo',
        );

        return $response;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function reviewData(array $payload): array
    {
        return match ($payload['action']) {
            'accept' => ['review_status' => 'accepted'],
            'reject' => ['review_status' => 'rejected'],
            'correct' => [
                'review_status' => 'corrected',
                'attendance_status' => $payload['attendance_status'],
            ],
            'manual_review' => ['review_status' => 'pending', 'geo_status' => 'manual_review_required'],
            'lock' => ['review_status' => 'locked'],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function attendancePayload(ExternalTrainingAttendance $attendance): array
    {
        $attendance->load([
            'member:id,member_code,pno,full_name',
            'externalCoach:id,name,email,phone',
            'trainingVenue:id,name,address,latitude,longitude,allowed_radius_meters',
            'assignment:id,start_date,end_date,training_start_time,training_end_time,attendance_mode,status,sport_id',
            'assignment.sport:id,name',
            'reviewer:id,name',
        ]);

        return [
            ...$attendance->toArray(),
            'photo' => $attendance->submitted_photo_path === null ? null : [
                'name' => $attendance->submitted_photo_original_name,
                'mime_type' => $attendance->submitted_photo_mime_type,
                'size_bytes' => $attendance->submitted_photo_size_bytes,
                'preview_url' => route('external-training-attendances.photo.preview', $attendance),
                'download_url' => route('external-training-attendances.photo', $attendance),
            ],
        ];
    }

    private function authorizePhotoAccess(ExternalTrainingAttendance $attendance): void
    {
        Gate::authorize('view', $attendance);
        abort_if($attendance->submitted_photo_path === null, 404);
        abort_unless(Storage::disk('local')->exists($attendance->submitted_photo_path), 404);
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

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        return $value;
    }

    /**
     * @return list<string>
     */
    private function attendanceStatuses(int $organizationId): array
    {
        return $this->orderedDistinctValues(
            ExternalTrainingAttendance::query()
                ->where('organization_id', $organizationId)
                ->whereNotNull('attendance_status')
                ->select('attendance_status')
                ->distinct()
                ->pluck('attendance_status'),
            self::ATTENDANCE_STATUSES,
        );
    }

    /**
     * @return list<string>
     */
    private function geoStatuses(int $organizationId): array
    {
        return $this->orderedDistinctValues(
            ExternalTrainingAttendance::query()
                ->where('organization_id', $organizationId)
                ->whereNotNull('geo_status')
                ->select('geo_status')
                ->distinct()
                ->pluck('geo_status'),
            self::GEO_STATUSES,
        );
    }

    /**
     * @return list<string>
     */
    private function reviewStatuses(int $organizationId): array
    {
        return $this->orderedDistinctValues(
            ExternalTrainingAttendance::query()
                ->where('organization_id', $organizationId)
                ->whereNotNull('review_status')
                ->select('review_status')
                ->distinct()
                ->pluck('review_status'),
            self::REVIEW_STATUSES,
        );
    }

    /**
     * @param  Collection<int, string>  $values
     * @return list<string>
     */
    private function orderedDistinctValues(Collection $values, array $fallback): array
    {
        $normalized = $values
            ->map(static fn (string $value): string => trim($value))
            ->filter(static fn (string $value): bool => $value !== '')
            ->unique()
            ->values()
            ->toArray();

        if ($normalized === []) {
            return $fallback;
        }

        $ordered = array_values(array_intersect($fallback, $normalized));
        $additional = array_values(array_filter($normalized, static fn (string $status): bool => ! in_array($status, $fallback, true)));

        return array_values(array_unique(array_merge($ordered, $additional)));
    }

    private function filterInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        if (! ctype_digit($value)) {
            return null;
        }

        $intValue = (int) $value;

        return $intValue > 0 ? $intValue : null;
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
