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
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalTrainingAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalTrainingAttendance::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $attendances = ExternalTrainingAttendance::query()
            ->with([
                'member:id,member_code,pno,full_name',
                'externalCoach:id,name,email,phone',
                'trainingVenue:id,name',
                'assignment:id,sport_id,status',
                'assignment.sport:id,name',
                'reviewer:id,name',
            ])
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->whereDate('attendance_date', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->whereDate('attendance_date', '<=', $date))
            ->when($filters['member_id'] ?? null, fn ($query, string $memberId) => $query->where('member_id', $memberId))
            ->when($filters['external_coach_id'] ?? null, fn ($query, string $coachId) => $query->where('external_coach_id', $coachId))
            ->when($filters['training_venue_id'] ?? null, fn ($query, string $venueId) => $query->where('training_venue_id', $venueId))
            ->when($filters['sport_id'] ?? null, fn ($query, string $sportId) => $query->whereHas('assignment', fn ($assignmentQuery) => $assignmentQuery->where('sport_id', $sportId)))
            ->when($filters['attendance_status'] ?? null, fn ($query, string $status) => $query->where('attendance_status', $status))
            ->when($filters['geo_status'] ?? null, fn ($query, string $status) => $query->where('geo_status', $status))
            ->when($filters['review_status'] ?? null, fn ($query, string $status) => $query->where('review_status', $status))
            ->when(($filters['flagged_only'] ?? null) === '1', fn ($query) => $query->where('geo_status', '!=', 'valid'))
            ->when(($filters['outside_radius_only'] ?? null) === '1', fn ($query) => $query->where('geo_status', 'outside_radius'))
            ->when(($filters['missing_location_only'] ?? null) === '1', fn ($query) => $query->where('geo_status', 'location_missing'))
            ->when(($filters['low_accuracy_only'] ?? null) === '1', fn ($query) => $query->where('geo_status', 'low_accuracy'))
            ->latest('attendance_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-training-attendances/index', [
            'attendances' => $attendances,
            'filters' => $filters,
            'members' => Member::query()->orderBy('full_name')->get(['id', 'member_code', 'pno', 'full_name']),
            'externalCoaches' => ExternalCoach::query()->orderBy('name')->get(['id', 'name']),
            'trainingVenues' => TrainingVenue::query()->orderBy('name')->get(['id', 'name']),
            'sports' => Sport::query()->orderBy('name')->get(['id', 'name']),
            'attendanceStatuses' => ['present', 'absent', 'late', 'excused', 'not_marked'],
            'geoStatuses' => ['valid', 'outside_radius', 'location_missing', 'location_permission_denied', 'low_accuracy', 'outside_training_time', 'manual_review_required'],
            'reviewStatuses' => ['pending', 'accepted', 'rejected', 'corrected', 'locked'],
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
            'photo' => [
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
        abort_unless(Storage::disk('local')->exists($attendance->submitted_photo_path), 404);
    }
}
