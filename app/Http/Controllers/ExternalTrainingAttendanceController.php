<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Http\Requests\ExternalTrainingAttendances\ReviewExternalTrainingAttendanceRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
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

    /** @var array<string, string> */
    private const array EXPORT_COLUMNS = [
        'record_id' => 'Record ID',
        'assignment_id' => 'Assignment ID',
        'date' => 'Date',
        'submitted_at' => 'Submitted At',
        'member' => 'Member',
        'pno' => 'PNO',
        'member_code' => 'Member Code',
        'external_coach' => 'External Coach',
        'coach_phone' => 'Coach Phone',
        'coach_email' => 'Coach Email',
        'venue' => 'Venue',
        'venue_snapshot' => 'Venue Snapshot',
        'sport' => 'Sport',
        'assignment_status' => 'Assignment Status',
        'assignment_start_date' => 'Assignment Start Date',
        'assignment_end_date' => 'Assignment End Date',
        'training_start_time' => 'Training Start Time',
        'training_end_time' => 'Training End Time',
        'attendance_mode' => 'Attendance Mode',
        'attendance_status' => 'Attendance Status',
        'geo_status' => 'Geo Status',
        'review_status' => 'Review Status',
        'flag_reason' => 'Flag Reason',
        'coach_remarks' => 'Coach Remarks',
        'review_remarks' => 'Review Remarks',
        'distance_meters' => 'Distance (m)',
        'submitted_latitude' => 'Submitted Latitude',
        'submitted_longitude' => 'Submitted Longitude',
        'submitted_gps_accuracy_m' => 'Submitted GPS Accuracy (m)',
        'venue_latitude_snapshot' => 'Venue Latitude Snapshot',
        'venue_longitude_snapshot' => 'Venue Longitude Snapshot',
        'allowed_radius_meters' => 'Allowed Radius (m)',
        'photo_file_name' => 'Photo File Name',
        'photo_source' => 'Photo Source',
        'photo_mime_type' => 'Photo MIME Type',
        'photo_size_bytes' => 'Photo Size (bytes)',
        'photo_dimensions' => 'Photo Dimensions',
        'photo_uploaded_at' => 'Photo Uploaded At',
        'check_in_at' => 'Check In At',
        'check_in_latitude' => 'Check In Latitude',
        'check_in_longitude' => 'Check In Longitude',
        'check_in_gps_accuracy_m' => 'Check In GPS Accuracy (m)',
        'check_in_distance_meters' => 'Check In Distance (m)',
        'check_in_geo_status' => 'Check In Geo Status',
        'check_out_at' => 'Check Out At',
        'check_out_latitude' => 'Check Out Latitude',
        'check_out_longitude' => 'Check Out Longitude',
        'check_out_gps_accuracy_m' => 'Check Out GPS Accuracy (m)',
        'check_out_distance_meters' => 'Check Out Distance (m)',
        'check_out_geo_status' => 'Check Out Geo Status',
        'duration_minutes' => 'Duration (minutes)',
        'reviewed_by' => 'Reviewed By',
        'reviewed_at' => 'Reviewed At',
        'submitted_source' => 'Submitted Source',
        'ip_address' => 'IP Address',
        'browser_timezone' => 'Browser Timezone',
    ];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalTrainingAttendance::class);

        $filters = $this->attendanceFilters($request);

        $attendances = $this->attendanceQuery($filters)
            ->latest('attendance_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-training-attendances/index', [
            'attendances' => $attendances,
            'filters' => [
                'date_from' => $filters['dateFrom'],
                'date_to' => $filters['dateTo'],
                'member_query' => $filters['memberQuery'],
                'coach_query' => $filters['coachQuery'],
                'venue_query' => $filters['venueQuery'],
                'sport_query' => $filters['sportQuery'],
                'member_id' => $filters['memberId'] !== null ? (string) $filters['memberId'] : null,
                'external_coach_id' => $filters['coachId'] !== null ? (string) $filters['coachId'] : null,
                'training_venue_id' => $filters['venueId'] !== null ? (string) $filters['venueId'] : null,
                'sport_id' => $filters['sportId'] !== null ? (string) $filters['sportId'] : null,
                'attendance_status' => $filters['attendanceStatus'],
                'geo_status' => $filters['geoStatus'],
                'review_status' => $filters['reviewStatus'],
                'flagged_only' => $filters['flaggedOnly'] ? '1' : '0',
                'outside_radius_only' => $filters['outsideRadiusOnly'] ? '1' : '0',
                'missing_location_only' => $filters['missingLocationOnly'] ? '1' : '0',
                'low_accuracy_only' => $filters['lowAccuracyOnly'] ? '1' : '0',
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

    public function export(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', ExternalTrainingAttendance::class);

        $columns = $this->exportColumns($request);

        $rows = $this->attendanceQuery($this->attendanceFilters($request))
            ->latest('attendance_date')
            ->latest('id')
            ->limit(5000)
            ->get()
            ->map(fn (ExternalTrainingAttendance $attendance): array => [
                'record_id' => $attendance->id,
                'assignment_id' => $attendance->external_coaching_assignment_id,
                'date' => $attendance->attendance_date?->format('d M Y'),
                'submitted_at' => $attendance->submitted_at?->format('d M Y, h:i A'),
                'member' => $attendance->member?->full_name,
                'pno' => $attendance->member?->pno,
                'member_code' => $attendance->member?->member_code,
                'external_coach' => $attendance->externalCoach?->name,
                'coach_phone' => $attendance->externalCoach?->phone,
                'coach_email' => $attendance->externalCoach?->email,
                'venue' => $attendance->trainingVenue?->name,
                'venue_snapshot' => $attendance->venue_name_snapshot,
                'sport' => $attendance->assignment?->sport?->name,
                'assignment_status' => $attendance->assignment?->status,
                'assignment_start_date' => $attendance->assignment?->start_date?->format('d M Y'),
                'assignment_end_date' => $attendance->assignment?->end_date?->format('d M Y'),
                'training_start_time' => $attendance->assignment?->training_start_time,
                'training_end_time' => $attendance->assignment?->training_end_time,
                'attendance_mode' => $attendance->assignment?->attendance_mode,
                'attendance_status' => $attendance->attendance_status,
                'geo_status' => $attendance->geo_status,
                'review_status' => $attendance->review_status,
                'flag_reason' => $attendance->flag_reason,
                'coach_remarks' => $attendance->coach_remarks,
                'review_remarks' => $attendance->review_remarks,
                'distance_meters' => $attendance->distance_from_venue_meters,
                'submitted_latitude' => $attendance->submitted_latitude,
                'submitted_longitude' => $attendance->submitted_longitude,
                'submitted_gps_accuracy_m' => $attendance->submitted_gps_accuracy,
                'venue_latitude_snapshot' => $attendance->venue_latitude_snapshot,
                'venue_longitude_snapshot' => $attendance->venue_longitude_snapshot,
                'allowed_radius_meters' => $attendance->allowed_radius_meters_snapshot,
                'photo_file_name' => $attendance->submitted_photo_original_name,
                'photo_source' => $attendance->submitted_photo_source,
                'photo_mime_type' => $attendance->submitted_photo_mime_type,
                'photo_size_bytes' => $attendance->submitted_photo_size_bytes,
                'photo_dimensions' => $attendance->submitted_photo_width !== null && $attendance->submitted_photo_height !== null
                    ? "{$attendance->submitted_photo_width} x {$attendance->submitted_photo_height}"
                    : null,
                'photo_uploaded_at' => $attendance->submitted_photo_uploaded_at?->format('d M Y, h:i A'),
                'check_in_at' => $attendance->check_in_at?->format('d M Y, h:i A'),
                'check_in_latitude' => $attendance->check_in_latitude,
                'check_in_longitude' => $attendance->check_in_longitude,
                'check_in_gps_accuracy_m' => $attendance->check_in_gps_accuracy,
                'check_in_distance_meters' => $attendance->check_in_distance_from_venue_meters,
                'check_in_geo_status' => $attendance->check_in_geo_status,
                'check_out_at' => $attendance->check_out_at?->format('d M Y, h:i A'),
                'check_out_latitude' => $attendance->check_out_latitude,
                'check_out_longitude' => $attendance->check_out_longitude,
                'check_out_gps_accuracy_m' => $attendance->check_out_gps_accuracy,
                'check_out_distance_meters' => $attendance->check_out_distance_from_venue_meters,
                'check_out_geo_status' => $attendance->check_out_geo_status,
                'duration_minutes' => $attendance->duration_minutes,
                'reviewed_by' => $attendance->reviewer?->name,
                'reviewed_at' => $attendance->reviewed_at?->format('d M Y, h:i A'),
                'submitted_source' => $attendance->submitted_source,
                'ip_address' => $attendance->ip_address,
                'browser_timezone' => $attendance->browser_timezone,
            ])
            ->map(fn (array $row): array => array_intersect_key($row, array_flip($columns)));

        return Excel::download(
            new ReportExport($rows, array_map(fn (string $column): string => self::EXPORT_COLUMNS[$column], $columns), 'External Training Attendance'),
            'external-training-attendances-'.now()->format('Y-m-d').'.xlsx',
        );
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

    /**
     * @return array{
     *     memberQuery: ?string,
     *     coachQuery: ?string,
     *     venueQuery: ?string,
     *     sportQuery: ?string,
     *     dateFrom: ?string,
     *     dateTo: ?string,
     *     memberId: ?int,
     *     coachId: ?int,
     *     venueId: ?int,
     *     sportId: ?int,
     *     attendanceStatus: ?string,
     *     geoStatus: ?string,
     *     reviewStatus: ?string,
     *     flaggedOnly: bool,
     *     outsideRadiusOnly: bool,
     *     missingLocationOnly: bool,
     *     lowAccuracyOnly: bool
     * }
     */
    private function attendanceFilters(Request $request): array
    {
        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        return [
            'memberQuery' => $this->filterString($filters['member_query'] ?? $filters['member'] ?? null),
            'coachQuery' => $this->filterString($filters['coach_query'] ?? $filters['coach'] ?? null),
            'venueQuery' => $this->filterString($filters['venue_query'] ?? $filters['training_venue'] ?? null),
            'sportQuery' => $this->filterString($filters['sport_query'] ?? $filters['sport'] ?? null),
            'dateFrom' => $this->filterDate($filters['date_from'] ?? $filters['attendance_date_from'] ?? null),
            'dateTo' => $this->filterDate($filters['date_to'] ?? $filters['attendance_date_to'] ?? null),
            'memberId' => $this->filterInt($filters['member_id'] ?? null),
            'coachId' => $this->filterInt($filters['external_coach_id'] ?? null),
            'venueId' => $this->filterInt($filters['training_venue_id'] ?? null),
            'sportId' => $this->filterInt($filters['sport_id'] ?? null),
            'attendanceStatus' => $this->filterString($filters['attendance_status'] ?? null),
            'geoStatus' => $this->filterString($filters['geo_status'] ?? null),
            'reviewStatus' => $this->filterString($filters['review_status'] ?? null),
            'flaggedOnly' => ($filters['flagged_only'] ?? null) === '1',
            'outsideRadiusOnly' => ($filters['outside_radius_only'] ?? null) === '1',
            'missingLocationOnly' => ($filters['missing_location_only'] ?? null) === '1',
            'lowAccuracyOnly' => ($filters['low_accuracy_only'] ?? null) === '1',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<ExternalTrainingAttendance>
     */
    private function attendanceQuery(array $filters): Builder
    {
        return ExternalTrainingAttendance::query()
            ->with([
                'member:id,member_code,pno,full_name',
                'externalCoach:id,name,email,phone',
                'trainingVenue:id,name',
                'assignment:id,sport_id,status,start_date,end_date,training_start_time,training_end_time,attendance_mode',
                'assignment.sport:id,name',
                'reviewer:id,name',
            ])
            ->when($filters['dateFrom'] !== null, fn (Builder $query) => $query->whereDate('attendance_date', '>=', $filters['dateFrom']))
            ->when($filters['dateTo'] !== null, fn (Builder $query) => $query->whereDate('attendance_date', '<=', $filters['dateTo']))
            ->when($filters['memberQuery'] !== null, function (Builder $query) use ($filters): void {
                $query->whereHas('member', function (Builder $memberQueryBuilder) use ($filters): void {
                    $memberQueryBuilder
                        ->where('full_name', 'like', "%{$filters['memberQuery']}%")
                        ->orWhere('member_code', 'like', "%{$filters['memberQuery']}%")
                        ->orWhere('pno', 'like', "%{$filters['memberQuery']}%");
                });
            })
            ->when($filters['coachQuery'] !== null, function (Builder $query) use ($filters): void {
                $query->whereHas('externalCoach', function (Builder $coachQueryBuilder) use ($filters): void {
                    $coachQueryBuilder
                        ->where('name', 'like', "%{$filters['coachQuery']}%")
                        ->orWhere('phone', 'like', "%{$filters['coachQuery']}%")
                        ->orWhere('email', 'like', "%{$filters['coachQuery']}%");
                });
            })
            ->when($filters['venueQuery'] !== null, function (Builder $query) use ($filters): void {
                $query->whereHas('trainingVenue', function (Builder $venueQueryBuilder) use ($filters): void {
                    $venueQueryBuilder->where('name', 'like', "%{$filters['venueQuery']}%");
                });
            })
            ->when($filters['sportQuery'] !== null, function (Builder $query) use ($filters): void {
                $query->whereHas('assignment.sport', function (Builder $sportQueryBuilder) use ($filters): void {
                    $sportQueryBuilder->where('name', 'like', "%{$filters['sportQuery']}%");
                });
            })
            ->when($filters['memberId'] !== null, fn (Builder $query) => $query->where('member_id', $filters['memberId']))
            ->when($filters['coachId'] !== null, fn (Builder $query) => $query->where('external_coach_id', $filters['coachId']))
            ->when($filters['venueId'] !== null, fn (Builder $query) => $query->where('training_venue_id', $filters['venueId']))
            ->when($filters['sportId'] !== null, fn (Builder $query) => $query->whereHas('assignment', fn (Builder $assignmentQuery) => $assignmentQuery->where('sport_id', $filters['sportId'])))
            ->when($filters['attendanceStatus'] !== null, fn (Builder $query) => $query->where('attendance_status', $filters['attendanceStatus']))
            ->when($filters['geoStatus'] !== null, fn (Builder $query) => $query->where('geo_status', $filters['geoStatus']))
            ->when($filters['reviewStatus'] !== null, fn (Builder $query) => $query->where('review_status', $filters['reviewStatus']))
            ->when($filters['flaggedOnly'], fn (Builder $query) => $query->where('geo_status', '!=', 'valid'))
            ->when($filters['outsideRadiusOnly'], fn (Builder $query) => $query->where('geo_status', 'outside_radius'))
            ->when($filters['missingLocationOnly'], fn (Builder $query) => $query->where('geo_status', 'location_missing'))
            ->when($filters['lowAccuracyOnly'], fn (Builder $query) => $query->where('geo_status', 'low_accuracy'));
    }

    /**
     * @return list<string>
     */
    private function exportColumns(Request $request): array
    {
        $columns = $request->query('columns', []);
        $columns = is_array($columns) ? $columns : [];

        $selected = collect($columns)
            ->filter(fn (mixed $column): bool => is_string($column) && array_key_exists($column, self::EXPORT_COLUMNS))
            ->values()
            ->all();

        if ($selected !== []) {
            return $selected;
        }

        return [
            'record_id',
            'date',
            'submitted_at',
            'member',
            'pno',
            'external_coach',
            'venue',
            'sport',
            'attendance_status',
            'geo_status',
            'review_status',
            'distance_meters',
            'reviewed_by',
        ];
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
