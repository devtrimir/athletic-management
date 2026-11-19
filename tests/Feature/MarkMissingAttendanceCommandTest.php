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
        ->and($attendance->attendance_date->toDateString())->toBe($targetDate)
        ->and($attendance->created_at)->not->toBeNull()
        ->and($attendance->updated_at)->not->toBeNull();
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
        ->whereDate('attendance_date', $targetDate)
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

test('command dispatches batch jobs to the default queue when --queue is used', function (): void {
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
        if ($job->queue !== null || $job->rows === []) {
            return false;
        }

        $firstRow = $job->rows[0];

        return array_key_exists('created_at', $firstRow) && array_key_exists('updated_at', $firstRow);
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

    $now = now();
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
        'submitted_at' => $now,
        'submitted_photo_path' => null,
        'submitted_photo_source' => 'system',
        'submitted_source' => 'auto_scheduler',
        'created_at' => $now,
        'updated_at' => $now,
    ];

    (new MarkMissingAttendanceBatchJob([$row]))->handle();

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->where('attendance_date', $targetDate)
        ->firstOrFail();

    expect($attendance->attendance_status)->toBe('absent')
        ->and($attendance->flag_reason)->toBe('coach_not_submitted_attendance')
        ->and($attendance->created_at->toDateTimeString())->toBe($now->toDateTimeString())
        ->and($attendance->updated_at->toDateTimeString())->toBe($now->toDateTimeString());
});

test('the auto-mark jobs use the default queue so any worker setup processes them', function (): void {
    expect((new MarkMissingAttendanceBatchJob([]))->queue)->toBeNull();
});

function markedDates(array $fixture): array
{
    return ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
        ->where('external_coaching_assignment_id', $fixture['assignment']->id)
        ->orderBy('attendance_date')->get()
        ->map(fn ($row) => $row->attendance_date->toDateString().':'.$row->attendance_status)->all();
}

test('catch-up marks every missed scheduled day up to yesterday and keeps submitted days', function (): void {
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(10)->toDateString(),
        'end_date' => Carbon::today()->addDays(10)->toDateString(),
    ]);
    $submitted = Carbon::today()->subDays(3)->toDateString();

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'external_coaching_assignment_id' => $fixture['assignment']->id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['coach']->id,
        'training_venue_id' => $fixture['venue']->id,
        'attendance_date' => $submitted,
        'attendance_status' => 'present',
    ]);

    $this->artisan('external-coaching:mark-missing-attendance')->assertSuccessful();

    $expected = collect(range(7, 1))->map(fn (int $ago) => Carbon::today()->subDays($ago)->toDateString())
        ->map(fn (string $date) => $date.':'.($date === $submitted ? 'present' : 'absent'))->all();
    expect(markedDates($fixture))->toBe($expected);

    // Running again changes nothing.
    $this->artisan('external-coaching:mark-missing-attendance')->assertSuccessful();
    expect(markedDates($fixture))->toBe($expected);
});

test('catch-up never goes before the assignment start, today, or an unscheduled weekday', function (): void {
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(2)->toDateString(),
        'end_date' => Carbon::today()->addDays(10)->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance')->assertSuccessful();

    expect(markedDates($fixture))->toBe([
        Carbon::today()->subDays(2)->toDateString().':absent',
        Carbon::today()->subDays(1)->toDateString().':absent',
    ]);

    $weekday = strtolower(Carbon::today()->subDays(1)->format('l'));
    $skipped = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(5)->toDateString(),
        'end_date' => Carbon::today()->addDays(10)->toDateString(),
        'training_days' => [$weekday],
    ]);
    $this->artisan('external-coaching:mark-missing-attendance')->assertSuccessful();

    expect(collect(markedDates($skipped))->every(fn (string $row) => strtolower(Carbon::parse(substr($row, 0, 10))->format('l')) === $weekday))->toBeTrue();
});

test('--catch-up-days limits the window and --date marks only that day', function (): void {
    $fixture = markAttendanceFixture([
        'start_date' => Carbon::today()->subDays(10)->toDateString(),
        'end_date' => Carbon::today()->addDays(10)->toDateString(),
    ]);

    $this->artisan('external-coaching:mark-missing-attendance', ['--catch-up-days' => 2])->assertSuccessful();
    expect(markedDates($fixture))->toHaveCount(2);

    $this->artisan('external-coaching:mark-missing-attendance', ['--date' => Carbon::today()->subDays(6)->toDateString()])->assertSuccessful();
    expect(markedDates($fixture))->toHaveCount(3);

    $this->artisan('external-coaching:mark-missing-attendance', ['--catch-up-days' => 'abc'])->assertFailed();
});
