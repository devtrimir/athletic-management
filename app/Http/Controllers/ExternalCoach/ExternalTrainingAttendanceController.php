<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExternalCoach\StoreExternalTrainingAttendanceRequest;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\TrainingVenue;
use App\Services\ExternalCoaching\ExternalTrainingAttendanceFlaggingService;
use App\Services\ExternalCoaching\GeoDistanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExternalTrainingAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');

        $assignments = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->with(['member:id,pno,full_name', 'trainingVenue:id,name', 'sport:id,name'])
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->where('status', 'active')
            ->orderBy('end_date')
            ->get(['id', 'organization_id', 'member_id', 'training_venue_id', 'sport_id', 'start_date', 'end_date', 'training_start_time', 'training_end_time', 'status']);
        $selectedAssignmentId = (string) $request->integer('assignment');

        return Inertia::render('external-coach/attendance/index', [
            'assignments' => $assignments,
            'selectedAssignmentId' => $assignments->contains('id', (int) $selectedAssignmentId) ? $selectedAssignmentId : null,
            'attendanceStatuses' => ['present', 'absent', 'late', 'excused'],
        ]);
    }

    public function store(
        StoreExternalTrainingAttendanceRequest $request,
        GeoDistanceService $distanceService,
        ExternalTrainingAttendanceFlaggingService $flaggingService,
    ): RedirectResponse {
        /** @var ExternalCoach $coach */
        $coach = $request->user('external_coach');
        $validated = $request->safe()->except('submitted_photo');
        $attendanceDate = Carbon::parse($validated['attendance_date'])->startOfDay();

        $assignment = $this->assignmentForCoach((int) $validated['external_coaching_assignment_id'], $coach);
        $this->validateAssignmentCanReceiveAttendance($assignment, $attendanceDate);

        $venue = TrainingVenue::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->findOrFail($assignment->training_venue_id);

        $latitude = isset($validated['submitted_latitude']) ? (float) $validated['submitted_latitude'] : null;
        $longitude = isset($validated['submitted_longitude']) ? (float) $validated['submitted_longitude'] : null;
        $distanceMeters = $distanceService->metersBetween(
            $latitude,
            $longitude,
            $venue->latitude === null ? null : (float) $venue->latitude,
            $venue->longitude === null ? null : (float) $venue->longitude,
        );
        $submittedAt = now();
        $flag = $flaggingService->flag(
            $assignment,
            $latitude,
            $longitude,
            isset($validated['submitted_gps_accuracy']) ? (int) $validated['submitted_gps_accuracy'] : null,
            $distanceMeters,
            $submittedAt,
            $venue->allowed_radius_meters === null ? null : (int) $venue->allowed_radius_meters,
        );

        $file = $request->file('submitted_photo');
        $realPath = $file?->getRealPath();
        $imageSize = $realPath === false || $realPath === null ? false : getimagesize($realPath);
        $path = $file?->store("external-training-attendance/org_{$coach->organization_id}/assignment_{$assignment->id}", 'local');

        ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->create([
            'organization_id' => $assignment->organization_id,
            'external_coaching_assignment_id' => $assignment->id,
            'member_id' => $assignment->member_id,
            'external_coach_id' => $coach->id,
            'training_venue_id' => $assignment->training_venue_id,
            'attendance_date' => $attendanceDate,
            'attendance_status' => $validated['attendance_status'],
            'review_status' => 'pending',
            'geo_status' => $flag['geo_status'],
            'flag_reason' => $flag['flag_reason'],
            'coach_remarks' => $validated['coach_remarks'] ?? null,
            'submitted_at' => $submittedAt,
            'submitted_latitude' => $latitude,
            'submitted_longitude' => $longitude,
            'submitted_gps_accuracy' => $validated['submitted_gps_accuracy'] ?? null,
            'distance_from_venue_meters' => $distanceMeters,
            'submitted_photo_path' => $path,
            'submitted_photo_original_name' => $file?->getClientOriginalName(),
            'submitted_photo_mime_type' => $file?->getMimeType(),
            'submitted_photo_size_bytes' => $file?->getSize(),
            'submitted_photo_uploaded_at' => $file === null ? null : $submittedAt,
            'submitted_photo_width' => $imageSize === false ? null : $imageSize[0],
            'submitted_photo_height' => $imageSize === false ? null : $imageSize[1],
            'venue_latitude_snapshot' => $venue->latitude,
            'venue_longitude_snapshot' => $venue->longitude,
            'allowed_radius_meters_snapshot' => $venue->allowed_radius_meters,
            'venue_name_snapshot' => $venue->name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_info' => $validated['device_info'] ?? null,
            'browser_timezone' => $validated['browser_timezone'] ?? null,
            'submitted_source' => 'external_coach_portal',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Training attendance submitted.')]);

        return to_route('external-coach.attendance.index');
    }

    private function assignmentForCoach(int $assignmentId, ExternalCoach $coach): ExternalCoachingAssignment
    {
        return ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->findOrFail($assignmentId);
    }

    private function validateAssignmentCanReceiveAttendance(ExternalCoachingAssignment $assignment, Carbon $attendanceDate): void
    {
        $errors = [];

        if ($assignment->status !== 'active') {
            $errors['external_coaching_assignment_id'] = __('Attendance can only be submitted for active assignments.');
        }

        if ($attendanceDate->lt($assignment->start_date) || $attendanceDate->gt($assignment->end_date)) {
            $errors['attendance_date'] = __('Attendance date must be inside the assignment date range.');
        }

        $alreadySubmitted = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
            ->where('external_coaching_assignment_id', $assignment->id)
            ->where('member_id', $assignment->member_id)
            ->whereDate('attendance_date', $attendanceDate)
            ->exists();

        if ($alreadySubmitted) {
            $errors['attendance_date'] = __('Attendance has already been submitted for this athlete and date.');
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
