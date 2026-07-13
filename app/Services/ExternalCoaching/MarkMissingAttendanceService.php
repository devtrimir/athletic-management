<?php

declare(strict_types=1);

namespace App\Services\ExternalCoaching;

use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Scopes\BelongsToOrganization;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class MarkMissingAttendanceService
{
    private const string AutoAbsentStatus = 'absent';
    private const string AutoAbsentReason = 'coach_not_submitted_attendance';
    private const string AutoGeoStatus = 'manual_review_required';
    private const int DefaultInsertChunkSize = 1000;
    /**
     * @var array<string, list<string>>
     */
    private const array DayAliases = [
        'sun' => ['sunday'],
        'mon' => ['monday'],
        'tue' => ['tuesday'],
        'wed' => ['wednesday'],
        'thu' => ['thursday'],
        'fri' => ['friday'],
        'sat' => ['saturday'],
    ];

    /**
     * @return array{
     *   attendance_date: string,
     *   assignments_scanned: int,
     *   missing_pairs: int,
     *   inserted: int,
     *   skipped: int,
     *   errors: int,
     *   dry_run: bool,
     *   insert_chunk_size: int,
     * }
     */
    public function markMissingForDate(
        CarbonInterface $attendanceDate,
        int $fetchChunkSize = 500,
        int $insertChunkSize = self::DefaultInsertChunkSize,
        bool $dryRun = false,
    ): array
    {
        $attendanceDate = $attendanceDate->startOfDay();
        $attendanceDateString = $attendanceDate->toDateString();
        $dayOfWeek = strtolower($attendanceDate->format('l'));
        $submittedAt = now();

        $summary = [
            'attendance_date' => $attendanceDateString,
            'assignments_scanned' => 0,
            'missing_pairs' => 0,
            'inserted' => 0,
            'skipped' => 0,
            'errors' => 0,
            'dry_run' => $dryRun,
            'insert_chunk_size' => $insertChunkSize,
        ];

        ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('status', 'active')
            ->whereDate('start_date', '<=', $attendanceDateString)
            ->whereDate('end_date', '>=', $attendanceDateString)
            ->orderBy('id')
            ->select([
                'id',
                'organization_id',
                'member_id',
                'external_coach_id',
                'training_venue_id',
                'training_days',
            ])
            ->chunkById(
                max(1, $fetchChunkSize),
                function (EloquentCollection $assignments) use (
                    &$summary,
                    $attendanceDateString,
                    $dayOfWeek,
                    $submittedAt,
                    $insertChunkSize,
                    $dryRun,
                ): void {
                    $summary['assignments_scanned'] += $assignments->count();

                    $assignmentIds = $assignments->pluck('id')->all();
                    if ($assignmentIds === []) {
                        return;
                    }

                    $alreadySubmitted = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
                        ->whereDate('attendance_date', $attendanceDateString)
                        ->whereIn('external_coaching_assignment_id', $assignmentIds)
                        ->pluck('external_coaching_assignment_id')
                        ->all();
                    $alreadySubmittedLookup = array_flip($alreadySubmitted);

                    $rows = [];
                    $candidateAssignmentIds = [];

                    foreach ($assignments as $assignment) {
                        if (! $this->isScheduledForDay($assignment->training_days, $dayOfWeek)) {
                            continue;
                        }

                        if (isset($alreadySubmittedLookup[$assignment->id])) {
                            continue;
                        }

                        $candidateAssignmentIds[] = $assignment->id;
                        $rows[] = [
                            'organization_id' => $assignment->organization_id,
                            'external_coaching_assignment_id' => $assignment->id,
                            'member_id' => $assignment->member_id,
                            'external_coach_id' => $assignment->external_coach_id,
                            'training_venue_id' => $assignment->training_venue_id,
                            'attendance_date' => $attendanceDateString,
                            'attendance_status' => self::AutoAbsentStatus,
                            'review_status' => 'pending',
                            'geo_status' => self::AutoGeoStatus,
                            'flag_reason' => self::AutoAbsentReason,
                            'submitted_at' => $submittedAt,
                            'submitted_photo_path' => null,
                            'submitted_photo_source' => 'system',
                            'submitted_source' => 'auto_scheduler',
                        ];
                    }

                    $summary['missing_pairs'] += count($rows);
                    if ($rows === []) {
                        return;
                    }

                    if ($dryRun) {
                        return;
                    }

                    $chunkSize = max(1, $insertChunkSize);
                    foreach (array_chunk($rows, $chunkSize) as $chunkRows) {
                        ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
                            ->insertOrIgnore($chunkRows);
                    }

                    $insertedInChunk = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
                        ->whereDate('attendance_date', $attendanceDateString)
                        ->whereIn('external_coaching_assignment_id', $candidateAssignmentIds)
                        ->count();

                    $summary['inserted'] += $insertedInChunk;
                    $summary['skipped'] += max(0, count($candidateAssignmentIds) - $insertedInChunk);
                },
            );

        return $summary;
    }

    /**
     * @param array<string>|null $trainingDays
     */
    private function isScheduledForDay(?array $trainingDays, string $dayOfWeek): bool
    {
        if ($trainingDays === null || $trainingDays === []) {
            return false;
        }

        $targetDays = [
            strtolower(trim($dayOfWeek)),
            strtolower(trim(substr($dayOfWeek, 0, 3))),
        ];

        $normalized = array_map(
            static fn (string $day) => strtolower(trim($day)),
            $trainingDays,
        );

        $expanded = [];
        foreach ($normalized as $day) {
            if ($day === '') {
                continue;
            }

            $expanded[] = $day;
            if (isset(self::DayAliases[$day])) {
                $expanded[] = self::DayAliases[$day][0];
            }
        }

        if ($expanded === []) {
            return true;
        }

        return (bool) array_intersect($targetDays, array_unique($expanded));
    }
}
