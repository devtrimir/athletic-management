<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Inertia\Testing\AssertableInertia as Assert;

function reviewVisibilityFixture(): array
{
    $admin = rcUser(
        'external-training-attendances.view',
        'external-training-attendances.review',
        'external-training-attendances.accept',
        'external-training-attendances.reject',
        'external-training-attendances.correct',
        'external-training-attendances.manual-review',
        'external-training-attendances.lock',
        'external-coach-performance-updates.view',
        'external-coach-performance-updates.review',
    );
    $member = Member::factory()->create(['organization_id' => $admin->organization_id, 'current_status' => 'ACTIVE']);
    $coach = ExternalCoach::factory()->create(['organization_id' => $admin->organization_id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $admin->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $admin->organization_id, 'is_active' => true]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $admin->organization_id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'start_date' => today()->subWeek(),
        'end_date' => today()->addWeek(),
        'status' => 'active',
    ]);
    $base = [
        'organization_id' => $admin->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
    ];

    return [
        'admin' => $admin,
        'coach' => $coach,
        'member' => $member,
        'attendance' => ExternalTrainingAttendance::factory()->create([
            ...$base,
            'training_venue_id' => $venue->id,
            'attendance_date' => today(),
            'attendance_status' => 'present',
            'review_status' => 'pending',
            'geo_status' => 'outside_radius',
        ]),
        'performance' => ExternalCoachPerformanceUpdate::factory()->create([
            ...$base,
            'sport_id' => $sport->id,
            'update_date' => today(),
            'review_status' => 'pending',
        ]),
    ];
}

function latestAudit(string $entity, int $id): AuditLog
{
    return AuditLog::query()->where('entity', $entity)->where('entity_id', $id)->where('action', 'updated')->latest('id')->firstOrFail();
}

dataset('attendance review actions', [
    'accept' => [['action' => 'accept', 'review_remarks' => 'Verified on site.'], 'accepted', 'present'],
    'reject' => [['action' => 'reject', 'review_remarks' => 'Photo does not match.'], 'rejected', 'present'],
    'correct to absent' => [['action' => 'correct', 'attendance_status' => 'absent', 'review_remarks' => 'Was not at venue.'], 'corrected', 'absent'],
    'correct to late' => [['action' => 'correct', 'attendance_status' => 'late', 'review_remarks' => 'Arrived late.'], 'corrected', 'late'],
    'correct to excused' => [['action' => 'correct', 'attendance_status' => 'excused', 'review_remarks' => 'Medical.'], 'corrected', 'excused'],
    'correct to not marked' => [['action' => 'correct', 'attendance_status' => 'not_marked', 'review_remarks' => 'No record.'], 'corrected', 'not_marked'],
    'manual review' => [['action' => 'manual_review', 'review_remarks' => 'Needs a field check.'], 'pending', 'present'],
    'lock' => [['action' => 'lock', 'review_remarks' => 'Month closed.'], 'locked', 'present'],
]);

it('shows every attendance review outcome to the coach and records it in the audit trail', function (array $payload, string $reviewStatus, string $finalStatus): void {
    $f = reviewVisibilityFixture();

    $this->actingAs($f['admin'])
        ->patch(route('external-training-attendances.review', $f['attendance']), $payload)
        ->assertRedirect();

    // The coach sees exactly what the admin decided, including the remarks.
    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('attendances.0.review_status', $reviewStatus)
            ->where('attendances.0.final_attendance_status', $finalStatus)
            ->where('attendances.0.review_remarks', $payload['review_remarks'])
            ->etc());

    // Every change is audited with the acting admin and what changed.
    $audit = latestAudit('ExternalTrainingAttendance', $f['attendance']->id);

    expect($audit->actor_id)->toBe($f['admin']->id)
        ->and($audit->diff['new'])->toHaveKeys(['reviewed_by', 'reviewed_at', 'review_remarks'])
        ->and($audit->diff['new']['review_remarks'])->toBe($payload['review_remarks']);

    if ($reviewStatus !== 'pending') {
        expect($audit->diff['new']['review_status'])->toBe($reviewStatus);
    }

    if ($payload['action'] === 'correct') {
        expect($audit->diff['new']['corrected_attendance_status'])->toBe($finalStatus);
    }
})->with('attendance review actions');

it('keeps showing the correction after later reviews until the admin changes it', function (): void {
    $f = reviewVisibilityFixture();

    $this->actingAs($f['admin'])->patch(route('external-training-attendances.review', $f['attendance']), [
        'action' => 'correct', 'attendance_status' => 'absent', 'review_remarks' => 'Was not at venue.',
    ]);
    $this->actingAs($f['admin'])->patch(route('external-training-attendances.review', $f['attendance']), [
        'action' => 'accept', 'review_remarks' => 'Accepted as submitted after recheck.',
    ]);

    // Accepting clears the correction, so the submitted status counts again.
    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('attendances.0.review_status', 'accepted')
            ->where('attendances.0.final_attendance_status', 'present')
            ->etc());

    expect(AuditLog::query()->where('entity', 'ExternalTrainingAttendance')->where('entity_id', $f['attendance']->id)->where('action', 'updated')->count())->toBe(2);
});

dataset('performance review actions', [
    'accept' => [['action' => 'accept', 'review_remarks' => 'Good progress.'], 'accepted'],
    'reject' => [['action' => 'reject', 'review_remarks' => 'Summary is too short.'], 'rejected'],
    'needs correction' => [['action' => 'needs_correction', 'review_remarks' => 'Add injury notes.'], 'needs_correction'],
    'lock' => [['action' => 'lock', 'review_remarks' => 'Month closed.'], 'locked'],
]);

it('shows every performance review outcome and remark to the coach and audits it', function (array $payload, string $reviewStatus): void {
    $f = reviewVisibilityFixture();

    $this->actingAs($f['admin'])
        ->patch(route('external-coach-performance-updates.review', $f['performance']), $payload)
        ->assertRedirect();

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.performance', $f['member']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('performanceUpdates.0.review_status', $reviewStatus)
            ->where('performanceUpdates.0.review_remarks', $payload['review_remarks'])
            ->etc());

    $audit = latestAudit('ExternalCoachPerformanceUpdate', $f['performance']->id);

    expect($audit->actor_id)->toBe($f['admin']->id)
        ->and($audit->diff['new']['review_status'])->toBe($reviewStatus)
        ->and($audit->diff['new']['review_remarks'])->toBe($payload['review_remarks']);
})->with('performance review actions');

it('audits the coach submissions too', function (): void {
    $f = reviewVisibilityFixture();

    expect(AuditLog::query()->where('entity', 'ExternalTrainingAttendance')->where('entity_id', $f['attendance']->id)->where('action', 'created')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('entity', 'ExternalCoachPerformanceUpdate')->where('entity_id', $f['performance']->id)->where('action', 'created')->exists())->toBeTrue();
});
