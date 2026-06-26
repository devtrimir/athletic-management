<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;

function performanceUpdateFixture(array $assignmentOverrides = []): array
{
    $organization = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $organization->id, 'current_status' => 'ACTIVE']);
    $coach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'is_active' => true]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'start_date' => today()->subWeek(),
        'end_date' => today()->addWeek(),
        'status' => 'active',
        ...$assignmentOverrides,
    ]);

    return compact('organization', 'member', 'coach', 'venue', 'sport', 'assignment');
}

function performanceUpdatePayload(ExternalCoachingAssignment $assignment, array $overrides = []): array
{
    return [
        'external_coaching_assignment_id' => $assignment->id,
        'update_date' => today()->toDateString(),
        'performance_level' => 'improving',
        'performance_score' => 8,
        'training_summary' => 'Improved sprint starts and completed endurance session.',
        'improvement_notes' => 'Better recovery between intervals.',
        'injury_or_fitness_notes' => null,
        'next_focus' => 'Explosive first 20 meters.',
        ...$overrides,
    ];
}

test('external coach can submit performance update for assigned active athlete', function (): void {
    $fixture = performanceUpdateFixture();

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), performanceUpdatePayload($fixture['assignment']))
        ->assertRedirect(route('external-coach.performance.index'));

    $update = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($update->organization_id)->toBe($fixture['organization']->id)
        ->and($update->member_id)->toBe($fixture['member']->id)
        ->and($update->external_coach_id)->toBe($fixture['coach']->id)
        ->and($update->sport_id)->toBe($fixture['sport']->id)
        ->and($update->review_status)->toBe('pending');
});

test('external coach cannot submit performance for another coach assignment or invalid dates', function (): void {
    $fixture = performanceUpdateFixture();
    $otherCoach = ExternalCoach::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'status' => 'active',
    ]);

    $this->actingAs($otherCoach, 'external_coach')
        ->post(route('external-coach.performance.store'), performanceUpdatePayload($fixture['assignment']))
        ->assertNotFound();

    $this->actingAs($fixture['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), performanceUpdatePayload($fixture['assignment'], [
            'update_date' => today()->addMonth()->toDateString(),
        ]))
        ->assertSessionHasErrors(['update_date']);
});

test('admin can review performance update and review actions require remarks when needed', function (): void {
    $admin = rcUser('external-coach-performance-updates.view', 'external-coach-performance-updates.review');
    $member = Member::factory()->create(['organization_id' => $admin->organization_id]);
    $coach = ExternalCoach::factory()->create(['organization_id' => $admin->organization_id]);
    $venue = TrainingVenue::factory()->create(['organization_id' => $admin->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $admin->organization_id]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $admin->organization_id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
    ]);
    $update = ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $admin->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($admin)
        ->patch(route('external-coach-performance-updates.review', $update), [
            'action' => 'reject',
        ])
        ->assertSessionHasErrors(['review_remarks']);

    $this->actingAs($admin)
        ->patch(route('external-coach-performance-updates.review', $update), [
            'action' => 'accept',
            'review_remarks' => 'Looks consistent with attendance logs.',
        ])
        ->assertRedirect(route('external-coach-performance-updates.show', $update));

    expect($update->refresh()->review_status)->toBe('accepted')
        ->and($update->reviewed_by)->toBe($admin->id)
        ->and($update->reviewed_at)->not->toBeNull();

    expect(AuditLog::query()
        ->where('entity', 'ExternalCoachPerformanceUpdate')
        ->where('entity_id', $update->id)
        ->where('action', 'updated')
        ->exists())->toBeTrue();

    $update->update(['review_status' => 'locked']);

    $this->actingAs($admin)
        ->patch(route('external-coach-performance-updates.review', $update), [
            'action' => 'accept',
        ])
        ->assertForbidden();
});

test('member profile external coaching tab shows assignments attendance and performance updates', function (): void {
    $admin = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $admin->organization_id]);
    $coach = ExternalCoach::factory()->create(['organization_id' => $admin->organization_id]);
    $venue = TrainingVenue::factory()->create(['organization_id' => $admin->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $admin->organization_id]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $admin->organization_id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
    ]);
    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $admin->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $venue->id,
    ]);
    ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $admin->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'sport_id' => $sport->id,
        'training_summary' => 'Improved match fitness.',
    ]);

    $this->actingAs($admin)
        ->get(route('members.external-coaching', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->where('activeTab', 'external-coaching')
            ->has('externalCoaching.assignments', 1)
            ->has('externalCoaching.attendances', 1)
            ->has('externalCoaching.performanceUpdates', 1));
});

test('example', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
});
