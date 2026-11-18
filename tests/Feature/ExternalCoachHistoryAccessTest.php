<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Inertia\Testing\AssertableInertia as Assert;

function historyFixture(string $status, bool $access, ?ExternalCoach $coach = null, ?Member $member = null): array
{
    $org = $coach?->organization ?? Organization::factory()->create();
    $coach ??= ExternalCoach::factory()->create(['organization_id' => $org->id, 'status' => 'active']);
    $member ??= Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'ACTIVE']);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $org->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => TrainingVenue::factory()->create(['organization_id' => $org->id])->id,
        'sport_id' => Sport::factory()->create(['organization_id' => $org->id])->id,
        'start_date' => now()->subMonths(3)->toDateString(),
        'end_date' => now()->subDays(5)->toDateString(),
        'status' => $status,
        'coach_history_access' => $access,
    ]);
    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $org->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $assignment->training_venue_id,
        'attendance_date' => now()->subMonth()->toDateString(),
        'attendance_status' => 'present',
    ]);

    return compact('org', 'coach', 'member', 'assignment');
}

it('hides a finished player from the coach unless the admin allowed history', function (string $status): void {
    $f = historyFixture($status, false);

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('historyAssignments', 0)->etc());

    foreach (['show', 'attendance', 'performance'] as $page) {
        $this->actingAs($f['coach'], 'external_coach')
            ->get(route("external-coach.athletes.{$page}", $f['member']))
            ->assertNotFound();
    }
})->with(['completed', 'cancelled', 'expired']);

it('lets the coach look back, read-only, once the admin allows it', function (string $status): void {
    $f = historyFixture($status, true);

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('historyAssignments', 1)
            ->where('historyAssignments.0.member.id', $f['member']->id)
            ->has('assignments.data', 0)
            ->etc());

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('readOnly', true)
            ->has('attendances', 1)
            ->etc());

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.performance', $f['member']))
        ->assertOk();
})->with(['completed', 'cancelled', 'expired']);

it('never opens history for assignments that are not finished, even with the flag on', function (string $status): void {
    $f = historyFixture($status, true);

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertNotFound();

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('historyAssignments', 0)->etc());
})->with(['draft', 'pending_approval', 'approved', 'paused', 'rejected']);

it('keeps history read-only: nothing can be submitted against a finished assignment', function (): void {
    $f = historyFixture('completed', true);

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), [
            'external_coaching_assignment_id' => $f['assignment']->id,
            'attendance_date' => today()->toDateString(),
            'attendance_status' => 'absent',
        ])
        ->assertSessionHasErrors();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['assignment']->id,
            'update_date' => today()->toDateString(),
            'training_summary' => 'x',
        ])
        ->assertSessionHasErrors();

    expect(ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->count())->toBe(1);
});

it('keeps another coach out of someone else\'s finished history', function (): void {
    $f = historyFixture('completed', true);
    $other = ExternalCoach::factory()->create(['organization_id' => $f['org']->id, 'status' => 'active']);

    $this->actingAs($other, 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertNotFound();
});

it('shows a returning player once, as active, not as history', function (): void {
    $f = historyFixture('completed', true);
    $again = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $f['org']->id,
        'member_id' => $f['member']->id,
        'external_coach_id' => $f['coach']->id,
        'training_venue_id' => $f['assignment']->training_venue_id,
        'sport_id' => $f['assignment']->sport_id,
        'start_date' => now()->subDays(2)->toDateString(),
        'end_date' => now()->addMonth()->toDateString(),
        'status' => 'active',
    ]);

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('assignments.data', 1)->has('historyAssignments', 0)->etc());

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', $f['member']))
        ->assertInertia(fn (Assert $page) => $page->where('readOnly', false)->etc());

    expect($again->exists)->toBeTrue();
});

it('lets only an admin switch the access on, and audits it', function (): void {
    $user = rcUser('external-coaching-assignments.view', 'external-coaching-assignments.update');
    $coach = ExternalCoach::factory()->create(['organization_id' => $user->organization_id, 'status' => 'active']);
    $f = historyFixture('completed', false, $coach);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.update', $f['assignment']), [
            '_method' => 'patch',
            'member_id' => $f['member']->id,
            'external_coach_id' => $coach->id,
            'training_venue_id' => $f['assignment']->training_venue_id,
            'sport_id' => $f['assignment']->sport_id,
            'start_date' => $f['assignment']->start_date->toDateString(),
            'end_date' => $f['assignment']->end_date->toDateString(),
            'attendance_mode' => 'single_mark',
            'status' => 'completed',
            'coach_history_access' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($f['assignment']->fresh()->coach_history_access)->toBeTrue()
        ->and(AuditLog::query()->where('entity', 'ExternalCoachingAssignment')->where('entity_id', $f['assignment']->id)->where('action', 'updated')->latest('id')->first()->diff['new'])
        ->toHaveKey('coach_history_access');
});

it('lets an admin finish an assignment that already has attendance when the dates are unchanged', function (): void {
    $user = rcUser('external-coaching-assignments.view', 'external-coaching-assignments.update');
    $coach = ExternalCoach::factory()->create(['organization_id' => $user->organization_id, 'status' => 'active']);
    $f = historyFixture('active', false, $coach);
    $payload = fn (string $end): array => [
        '_method' => 'patch',
        'member_id' => $f['member']->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $f['assignment']->training_venue_id,
        'sport_id' => $f['assignment']->sport_id,
        'start_date' => $f['assignment']->start_date->toDateString(),
        'end_date' => $end,
        'attendance_mode' => 'single_mark',
        'status' => 'completed',
    ];

    // Same dates: fine, the form always sends them even when the fields are locked.
    $this->actingAs($user)->post(route('external-coaching-assignments.update', $f['assignment']), $payload($f['assignment']->end_date->toDateString()))
        ->assertSessionHasNoErrors();
    expect($f['assignment']->fresh()->status)->toBe('completed');

    // A real date change is still refused once attendance exists.
    $this->actingAs($user)->post(route('external-coaching-assignments.update', $f['assignment']), $payload(now()->addYear()->toDateString()))
        ->assertSessionHasErrors();
});
