<?php

declare(strict_types=1);

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

function externalAttendanceFixture(array $assignmentOverrides = []): array
{
    $organization = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $organization->id, 'current_status' => 'ACTIVE']);
    $coach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create([
        'organization_id' => $organization->id,
        'latitude' => 26.8467000,
        'longitude' => 80.9462000,
        'allowed_radius_meters' => 200,
        'status' => 'active',
    ]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'is_active' => true]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'start_date' => today()->subWeek(),
        'end_date' => today()->addWeek(),
        'training_start_time' => null,
        'training_end_time' => null,
        'status' => 'active',
        ...$assignmentOverrides,
    ]);

    return compact('organization', 'member', 'coach', 'venue', 'sport', 'assignment');
}

function externalAttendancePayload(ExternalCoachingAssignment $assignment, array $overrides = []): array
{
    return [
        'external_coaching_assignment_id' => $assignment->id,
        'attendance_date' => today()->toDateString(),
        'attendance_status' => 'present',
        'submitted_latitude' => 26.8467000,
        'submitted_longitude' => 80.9462000,
        'submitted_gps_accuracy' => 15,
        'coach_remarks' => 'Completed sprint drills.',
        'submitted_photo' => UploadedFile::fake()->image('proof.jpg', 800, 600),
        ...$overrides,
    ];
}

test('external training attendances table exists with proof and review columns', function (): void {
    expect(Schema::hasTable('external_training_attendances'))->toBeTrue();

    foreach ([
        'organization_id',
        'external_coaching_assignment_id',
        'member_id',
        'external_coach_id',
        'training_venue_id',
        'attendance_date',
        'attendance_status',
        'review_status',
        'geo_status',
        'flag_reason',
        'submitted_latitude',
        'submitted_longitude',
        'submitted_gps_accuracy',
        'distance_from_venue_meters',
        'submitted_photo_path',
        'submitted_photo_original_name',
        'submitted_photo_mime_type',
        'submitted_photo_size_bytes',
        'submitted_photo_uploaded_at',
        'submitted_photo_width',
        'submitted_photo_height',
        'venue_latitude_snapshot',
        'venue_longitude_snapshot',
        'allowed_radius_meters_snapshot',
        'ip_address',
        'user_agent',
        'deleted_at',
    ] as $column) {
        expect(Schema::hasColumn('external_training_attendances', $column))->toBeTrue("Missing column: {$column}");
    }
});

test('external coach can submit attendance for assigned active athlete with private proof photo', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();
    $photo = UploadedFile::fake()->image('proof.jpg', 800, 600);

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment'], [
            'submitted_photo' => $photo,
        ]))
        ->assertRedirect(route('external-coach.attendance.index'));

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($attendance->organization_id)->toBe($fixture['organization']->id)
        ->and($attendance->member_id)->toBe($fixture['member']->id)
        ->and($attendance->external_coach_id)->toBe($fixture['coach']->id)
        ->and($attendance->geo_status)->toBe('valid')
        ->and((float) $attendance->distance_from_venue_meters)->toBe(0.0)
        ->and($attendance->venue_name_snapshot)->toBe($fixture['venue']->name)
        ->and($attendance->submitted_photo_original_name)->toBe('proof.jpg')
        ->and($attendance->submitted_photo_mime_type)->toBe('image/jpeg')
        ->and($attendance->submitted_photo_size_bytes)->toBe($photo->getSize())
        ->and($attendance->submitted_photo_uploaded_at)->not->toBeNull()
        ->and($attendance->submitted_photo_width)->toBe(800)
        ->and($attendance->submitted_photo_height)->toBe(600);

    Storage::disk('local')->assertExists($attendance->submitted_photo_path);
});

test('external coach attendance page only lists their assigned athletes', function (): void {
    $fixture = externalAttendanceFixture();
    $otherMember = Member::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'full_name' => 'Other Coach Athlete',
        'current_status' => 'ACTIVE',
    ]);
    $otherCoach = ExternalCoach::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'status' => 'active',
    ]);
    $otherAssignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $fixture['venue']->id,
        'sport_id' => $fixture['sport']->id,
        'status' => 'active',
    ]);

    $this->actingAs($fixture['coach'], 'external_coach')
        ->get(route('external-coach.attendance.index', ['assignment' => $fixture['assignment']->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-coach/attendance/index')
            ->has('assignments', 1)
            ->where('selectedAssignmentId', (string) $fixture['assignment']->id)
            ->where('assignments.0.member.full_name', $fixture['member']->full_name)
            ->missing('assignments.0.member.member_code')
            ->etc());

    $this->actingAs($fixture['coach'], 'external_coach')
        ->get(route('external-coach.attendance.index', ['assignment' => $otherAssignment->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedAssignmentId', null)
            ->etc());
});

test('outside radius attendance is saved and flagged for review', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment'], [
            'submitted_latitude' => 26.9000000,
            'submitted_longitude' => 81.0000000,
        ]))
        ->assertRedirect(route('external-coach.attendance.index'));

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($attendance->geo_status)->toBe('outside_radius')
        ->and($attendance->flag_reason)->toContain('meters from the venue');
});

test('missing gps attendance is saved and flagged instead of blocked', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment'], [
            'submitted_latitude' => null,
            'submitted_longitude' => null,
            'submitted_gps_accuracy' => null,
        ]))
        ->assertRedirect(route('external-coach.attendance.index'));

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($attendance->geo_status)->toBe('location_missing')
        ->and($attendance->distance_from_venue_meters)->toBeNull();
});

test('external coach can mark athlete absent without proof photo or gps', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment'], [
            'attendance_status' => 'absent',
            'submitted_latitude' => null,
            'submitted_longitude' => null,
            'submitted_gps_accuracy' => null,
            'submitted_photo' => null,
            'coach_remarks' => 'Athlete did not attend training.',
        ]))
        ->assertRedirect(route('external-coach.attendance.index'));

    $attendance = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($attendance->attendance_status)->toBe('absent')
        ->and($attendance->submitted_photo_path)->toBeNull()
        ->and($attendance->submitted_photo_original_name)->toBeNull()
        ->and($attendance->submitted_photo_uploaded_at)->toBeNull()
        ->and($attendance->geo_status)->toBe('location_missing');
});

test('external coach cannot submit attendance for another coach assignment', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();
    $otherCoach = ExternalCoach::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'status' => 'active',
    ]);

    $this->actingAs($otherCoach, 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment']))
        ->assertForbidden();
});

test('duplicate attendance for same assignment member and date is rejected', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture();

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'external_coaching_assignment_id' => $fixture['assignment']->id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['coach']->id,
        'training_venue_id' => $fixture['venue']->id,
        'attendance_date' => today(),
    ]);

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment']))
        ->assertSessionHasErrors(['attendance_date']);
});

test('attendance is rejected when assignment is inactive or date is outside range', function (): void {
    Storage::fake('local');
    $fixture = externalAttendanceFixture([
        'status' => 'paused',
        'start_date' => today()->subDays(10),
        'end_date' => today()->subDay(),
    ]);

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), externalAttendancePayload($fixture['assignment'], [
            'attendance_date' => today()->toDateString(),
        ]))
        ->assertSessionHasErrors(['external_coaching_assignment_id', 'attendance_date']);

    expect(ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->count())->toBe(0);
});

test('example', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
});
