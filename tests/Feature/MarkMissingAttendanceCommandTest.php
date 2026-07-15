<?php

declare(strict_types=1);

use App\Jobs\MarkMissingAttendanceBatchJob;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function markAttendanceFixture(array $assignmentOverrides = []): array
{
    $organization = Organization::factory()->create();
    $member = Member::factory()->create([
        'organization_id' => $organization->id,
        'current_status' => 'ACTIVE',
    ]);
    $coach = ExternalCoach::factory()->create([
        'organization_id' => $organization->id,
        'status' => 'active',
    ]);
    $venue = TrainingVenue::factory()->create([
        'organization_id' => $organization->id,
        'status' => 'active',
    ]);
    $sport = Sport::factory()->create([
        'organization_id' => $organization->id,
        'is_active' => true,
    ]);

    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->addWeek()->toDateString(),
        'status' => 'active',
        'training_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        ...$assignmentOverrides,
    ]);

    return compact('organization', 'member', 'coach', 'venue', 'sport', 'assignment');
}

test('command marks absent attendance for missing active assignments', function (): void {
    $targetDate = Carbon::today()->subDays(2)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(4)->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])
        ->assertSuccessful();

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->firstOrFail();

    expect($attendance->attendance_status)->toBe('absent')
        ->and($attendance->flag_reason)->toBe('coach_not_submitted_attendance')
        ->and($attendance->review_status)->toBe('pending')
        ->and($attendance->attendance_date->toDateString())->toBe($targetDate);
});

test('command defaults to yesterday when date is not provided', function (): void {
    $targetDate = Carbon::yesterday()->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::yesterday()->subDays(3)->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance')->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(1);
});

test('command does not duplicate attendance if already submitted manually', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'external_coaching_assignment_id' => $fixture['assignment']->id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['coach']->id,
        'training_venue_id' => $fixture['venue']->id,
        'attendance_date' => $targetDate,
        'attendance_status' => 'present',
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])
        ->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(1);
});

test('command is idempotent when rerun for same date', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])->assertSuccessful();
    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(1);
});

test('command ignores assignments outside active range', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->addWeek()->toDateString(),
        'end_date' => Carbon::today()->addWeeks(2)->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])
        ->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(0);
});

test('command rejects future target dates', function (): void {
    $futureDate = Carbon::today()->addDay()->toDateString();

    markAttendanceFixture();

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $futureDate])
        ->assertExitCode(1)
        ->assertFailed();
});

test('command rejects invalid attendance date format', function (): void {
    markAttendanceFixture();

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => 'invalid-date'])
        ->assertExitCode(1)
        ->assertFailed();
});

test('command skips assignments not scheduled for the target weekday', function (): void {
    $targetDate = Carbon::today()->subDays(3)->toDateString();
    $targetDay = strtolower(Carbon::parse($targetDate)->format('l'));
    $otherDay = strtolower(Carbon::parse($targetDate)->subDay()->format('l'));

    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->addWeek()->toDateString(),
        'training_days' => [$otherDay],
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(0);
    expect($targetDay)->not->toBe($otherDay);
});

test('command skips attendance when training_days is an empty array', function (): void {
    $targetDate = Carbon::today()->subDays(2)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(4)->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
        'training_days' => [],
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => $targetDate])->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(0);
});

test('command runs in dry-run mode without writing attendance', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', [
        '--date' => $targetDate,
        '--dry-run' => true,
    ])->assertSuccessful();

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(0);
});

test('command dispatches batch jobs to attendance queue when --queue is used', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    Queue::fake();

    $this->artisan('external-coaching:mark-missing-attendance', [
        '--date' => $targetDate,
        '--queue' => true,
    ])->assertSuccessful();

    Queue::assertPushed(MarkMissingAttendanceBatchJob::class, function (MarkMissingAttendanceBatchJob $job): bool {
        return $job->queue === 'attendance' && $job->rows !== [];
    });

    $count = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->count();

    expect($count)->toBe(0);
});

test('attendance batch job inserts missing attendance rows', function (): void {
    $targetDate = Carbon::today()->subDays(1)->toDateString();
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subWeek()->toDateString(),
        'end_date' => Carbon::today()->toDateString(),
    ]);

    $row = [
        'organization_id' => $fixture['organization']->id,
        'external_coaching_assignment_id' => $fixture['assignment']->id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['coach']->id,
        'training_venue_id' => $fixture['venue']->id,
        'attendance_date' => $targetDate,
        'attendance_status' => 'absent',
        'review_status' => 'pending',
        'geo_status' => 'manual_review_required',
        'flag_reason' => 'coach_not_submitted_attendance',
        'submitted_at' => now(),
        'submitted_photo_path' => null,
        'submitted_photo_source' => 'system',
        'submitted_source' => 'auto_scheduler',
    ];

    (new MarkMissingAttendanceBatchJob([$row]))->handle();

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->firstOrFail();

    expect($attendance->attendance_status)->toBe('absent')
        ->and($attendance->flag_reason)->toBe('coach_not_submitted_attendance');
});
