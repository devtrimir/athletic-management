<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Support\Facades\Storage;

function reviewAttendanceFixture(array $attendanceOverrides = []): array
{
    $user = rcUser(
        'external-training-attendances.view',
        'external-training-attendances.review',
        'external-training-attendances.accept',
        'external-training-attendances.reject',
        'external-training-attendances.correct',
        'external-training-attendances.manual-review',
        'external-training-attendances.lock',
    );
    $member = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    $coach = ExternalCoach::factory()->create(['organization_id' => $user->organization_id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create([
        'organization_id' => $user->organization_id,
        'latitude' => 26.8467000,
        'longitude' => 80.9462000,
        'allowed_radius_meters' => 200,
    ]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id, 'is_active' => true]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);
    $attendance = ExternalTrainingAttendance::factory()->create([
        'organization_id' => $user->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'attendance_date' => today(),
        'geo_status' => 'outside_radius',
        'flag_reason' => 'Submission was outside the approved radius.',
        'submitted_photo_path' => 'external-training-attendance/review-proof.jpg',
        'submitted_photo_original_name' => 'review-proof.jpg',
        'submitted_photo_mime_type' => 'image/jpeg',
        ...$attendanceOverrides,
    ]);

    if ($attendance->submitted_photo_path !== null) {
        Storage::disk('local')->put($attendance->submitted_photo_path, 'proof');
    }

    return compact('user', 'member', 'coach', 'venue', 'sport', 'assignment', 'attendance');
}

test('external training attendance review index requires permission', function (): void {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('external-training-attendances.index'))
        ->assertForbidden();
});

test('view only user can list attendance but cannot access review details', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture();
    $viewer = rcUser('external-training-attendances.view');

    $fixture['attendance']->update(['organization_id' => $viewer->organization_id]);

    $this->actingAs($viewer)
        ->get(route('external-training-attendances.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/index')
            ->where('canReviewAttendanceDetails', false));

    $this->actingAs($viewer)
        ->get(route('external-training-attendances.show', $fixture['attendance']))
        ->assertForbidden();
});

test('admin can filter external training attendances with one search box', function (): void {
    $fixture = reviewAttendanceFixture();
    reviewAttendanceFixture();

    $fixture['member']->update(['full_name' => 'Searchable Athlete', 'pno' => 'PNO-ATT-99']);

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.index', [
            'filter' => ['q' => 'PNO-ATT-99'],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/index')
            ->where('filters.q', 'PNO-ATT-99')
            ->where('attendances.total', 1)
            ->where('attendances.data.0.member.full_name', 'Searchable Athlete'));
});

test('admin can change external training attendance rows per page', function (): void {
    $fixture = reviewAttendanceFixture();

    foreach (range(1, 14) as $index) {
        ExternalTrainingAttendance::factory()->create([
            'organization_id' => $fixture['user']->organization_id,
            'external_coaching_assignment_id' => $fixture['assignment']->id,
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['coach']->id,
            'training_venue_id' => $fixture['venue']->id,
            'attendance_date' => today()->subDays($index),
            'coach_remarks' => "Extra attendance {$index}",
        ]);
    }

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.index', ['per_page' => 10]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/index')
            ->where('attendances.per_page', 10)
            ->has('attendances.data', 10));
});

test('admin can narrow external training attendances by coach and review queue', function (): void {
    $fixture = reviewAttendanceFixture([
        'geo_status' => 'outside_radius',
        'flag_reason' => 'Coach submitted from outside the approved venue.',
    ]);
    reviewAttendanceFixture(['geo_status' => 'valid', 'flag_reason' => null]);

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.index', [
            'filter' => [
                'external_coach_id' => (string) $fixture['coach']->id,
                'flagged_only' => '1',
            ],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/index')
            ->where('filters.external_coach_id', (string) $fixture['coach']->id)
            ->where('filters.flagged_only', '1')
            ->where('attendances.total', 1)
            ->where('attendances.data.0.external_coach.name', $fixture['coach']->name));
});

test('admin can narrow external training attendances by selected ids', function (): void {
    $fixture = reviewAttendanceFixture();
    reviewAttendanceFixture();

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.index', [
            'filter' => ['ids' => [(string) $fixture['attendance']->id]],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/index')
            ->where('filters.ids.0', $fixture['attendance']->id)
            ->where('attendances.total', 1)
            ->where('attendances.data.0.id', $fixture['attendance']->id));
});

test('admin can export filtered external training attendance records', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture(['attendance_date' => today()->subDay()]);
    reviewAttendanceFixture(['attendance_date' => today()->subMonth()]);

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.export', [
            'filter' => ['date_from' => today()->subWeek()->toDateString()],
            'columns' => ['date', 'member', 'attendance_status'],
        ]))
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=external-training-attendances-'.now()->format('Y-m-d').'.xlsx');
});

test('admin can view attendance detail and private proof photo', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture();

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.show', $fixture['attendance']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-training-attendances/show')
            ->where('attendance.photo.preview_url', route('external-training-attendances.photo.preview', $fixture['attendance']))
            ->where('attendance.photo.download_url', route('external-training-attendances.photo', $fixture['attendance'])));

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.photo', $fixture['attendance']))
        ->assertDownload('review-proof.jpg');
});

test('attendance without proof photo does not expose photo links', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture([
        'attendance_status' => 'absent',
        'submitted_photo_path' => null,
        'submitted_photo_original_name' => null,
        'submitted_photo_mime_type' => null,
        'submitted_photo_size_bytes' => null,
    ]);

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.show', $fixture['attendance']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('attendance.photo', null));

    $this->actingAs($fixture['user'])
        ->get(route('external-training-attendances.photo', $fixture['attendance']))
        ->assertNotFound();
});

test('admin review actions store reviewer metadata and audit the update', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture();

    $this->actingAs($fixture['user'])
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'accept',
            'review_remarks' => 'Accepted after coach confirmed the alternate gate location.',
        ])
        ->assertRedirect(route('external-training-attendances.show', $fixture['attendance']));

    $attendance = $fixture['attendance']->refresh();

    expect($attendance->review_status)->toBe('accepted')
        ->and($attendance->reviewed_by)->toBe($fixture['user']->id)
        ->and($attendance->reviewed_at)->not->toBeNull()
        ->and($attendance->review_remarks)->toBe('Accepted after coach confirmed the alternate gate location.');

    expect(AuditLog::query()
        ->where('entity', 'ExternalTrainingAttendance')
        ->where('entity_id', $attendance->id)
        ->where('action', 'updated')
        ->exists())->toBeTrue();
});

test('rejecting or accepting flagged attendance requires remarks', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture();

    $this->actingAs($fixture['user'])
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'reject',
        ])
        ->assertSessionHasErrors(['review_remarks']);

    $this->actingAs($fixture['user'])
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'accept',
        ])
        ->assertSessionHasErrors(['review_remarks']);
});

test('admin correction stores a separate status and locked attendance cannot be reviewed again', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture(['attendance_status' => 'present', 'geo_status' => 'valid']);

    $this->actingAs($fixture['user'])
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'correct',
            'attendance_status' => 'late',
            'review_remarks' => 'Coach reported a delayed start.',
        ])
        ->assertRedirect(route('external-training-attendances.show', $fixture['attendance']));

    expect($fixture['attendance']->refresh()->attendance_status)->toBe('present')
        ->and($fixture['attendance']->corrected_attendance_status)->toBe('late')
        ->and($fixture['attendance']->review_status)->toBe('corrected');

    $audit = AuditLog::query()
        ->where('entity', 'ExternalTrainingAttendance')
        ->where('entity_id', $fixture['attendance']->id)
        ->where('action', 'updated')
        ->latest('id')
        ->firstOrFail();

    expect($audit->diff['new']['corrected_attendance_status'] ?? null)->toBe('late')
        ->and($audit->diff['new'])->not->toHaveKey('attendance_status');

    $fixture['attendance']->update(['review_status' => 'locked']);

    $this->actingAs($fixture['user'])
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'accept',
        ])
        ->assertForbidden();
});

test('attendance correction requires explicit override permission', function (): void {
    Storage::fake('local');
    $fixture = reviewAttendanceFixture(['attendance_status' => 'present', 'geo_status' => 'valid']);
    $reviewer = rcUser(
        'external-training-attendances.view',
        'external-training-attendances.review',
        'external-training-attendances.accept',
        'external-training-attendances.reject',
        'external-training-attendances.manual-review',
    );

    $fixture['attendance']->update(['organization_id' => $reviewer->organization_id]);

    $this->actingAs($reviewer)
        ->patch(route('external-training-attendances.review', $fixture['attendance']), [
            'action' => 'correct',
            'attendance_status' => 'late',
            'review_remarks' => 'Trying to override without permission.',
        ])
        ->assertForbidden();

    $attendance = $fixture['attendance']->refresh();

    expect($attendance->attendance_status)->toBe('present')
        ->and($attendance->corrected_attendance_status)->toBeNull();
});

test('attendance route binding does not expose another organization records', function (): void {
    Storage::fake('local');
    $user = rcUser('external-training-attendances.view');
    $otherOrg = Organization::factory()->create();
    $otherMember = Member::factory()->create(['organization_id' => $otherOrg->id]);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $otherOrg->id]);
    $otherVenue = TrainingVenue::factory()->create(['organization_id' => $otherOrg->id]);
    $otherSport = Sport::factory()->create(['organization_id' => $otherOrg->id]);
    $otherAssignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $otherOrg->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $otherVenue->id,
        'sport_id' => $otherSport->id,
    ]);
    $attendance = ExternalTrainingAttendance::factory()->create([
        'organization_id' => $otherOrg->id,
        'external_coaching_assignment_id' => $otherAssignment->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $otherVenue->id,
    ]);

    $this->actingAs($user)
        ->get(route('external-training-attendances.show', $attendance))
        ->assertNotFound();
});

test('attendance review cannot mutate another organization record', function (): void {
    Storage::fake('local');
    $user = rcUser('external-training-attendances.view', 'external-training-attendances.review');
    $otherOrg = Organization::factory()->create();
    $otherMember = Member::factory()->create(['organization_id' => $otherOrg->id]);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $otherOrg->id]);
    $otherVenue = TrainingVenue::factory()->create(['organization_id' => $otherOrg->id]);
    $otherSport = Sport::factory()->create(['organization_id' => $otherOrg->id]);
    $otherAssignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $otherOrg->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $otherVenue->id,
        'sport_id' => $otherSport->id,
    ]);
    $attendance = ExternalTrainingAttendance::factory()->create([
        'organization_id' => $otherOrg->id,
        'external_coaching_assignment_id' => $otherAssignment->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $otherVenue->id,
        'review_status' => 'pending',
    ]);

    $this->actingAs($user)
        ->patch(route('external-training-attendances.review', $attendance), [
            'action' => 'lock',
        ])
        ->assertNotFound();

    expect($attendance->refresh()->review_status)->toBe('pending');
});

test('example', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
});
