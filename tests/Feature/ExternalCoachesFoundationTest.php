<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalCoachStatusHistory;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('external coaches table has the foundation columns', function () {
    expect(Schema::hasTable('external_coaches'))->toBeTrue();

    foreach ([
        'id',
        'organization_id',
        'name',
        'phone',
        'email',
        'password',
        'remarks',
        'status',
        'last_login_at',
        'remember_token',
        'deleted_at',
        'created_at',
        'updated_at',
    ] as $column) {
        expect(Schema::hasColumn('external_coaches', $column))->toBeTrue("Missing column: {$column}");
    }

    expect(Schema::hasTable('external_coach_status_histories'))->toBeTrue();
});

test('external coach guard authenticates external coaches separately from web users', function () {
    $organization = Organization::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'admin@example.test',
    ]);
    $externalCoach = ExternalCoach::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'coach@example.test',
    ]);

    expect(Auth::guard('web')->attempt([
        'email' => $externalCoach->email,
        'password' => 'password',
    ]))->toBeFalse();

    expect(Auth::guard('external_coach')->attempt([
        'email' => $externalCoach->email,
        'password' => 'password',
    ]))->toBeTrue();

    expect(Auth::guard('external_coach')->id())->toBe($externalCoach->id);

    Auth::guard('external_coach')->logout();

    expect(Auth::guard('external_coach')->attempt([
        'email' => $user->email,
        'password' => 'password',
    ]))->toBeFalse();
});

test('external coach model reports login eligibility from status', function () {
    expect(ExternalCoach::factory()->make(['status' => 'active'])->isActiveForLogin())->toBeTrue();
    expect(ExternalCoach::factory()->make(['status' => 'inactive'])->isActiveForLogin())->toBeFalse();
    expect(ExternalCoach::factory()->make(['status' => 'suspended'])->isActiveForLogin())->toBeFalse();
    expect(ExternalCoach::factory()->make(['status' => 'blacklisted'])->isActiveForLogin())->toBeFalse();
});

test('external coach login page is separate from admin login', function () {
    $this->get(route('external-coach.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/auth/login')
            ->etc());
});

test('external coach protected pages redirect guests to external coach login', function () {
    $this->get(route('external-coach.dashboard'))
        ->assertRedirect(route('external-coach.login'));
});

test('external coach dashboard does not resolve internal rbac permissions', function () {
    $externalCoach = ExternalCoach::factory()->create(['status' => 'active']);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->where('auth.permissions', [])
            ->etc());
});

test('external coach dashboard lists assigned active athletes', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $member = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Assigned Player', 'current_status' => 'ACTIVE']);
    $otherMember = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Other Coach Player', 'current_status' => 'ACTIVE']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id, 'name' => 'Main Training Ground']);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'name' => 'Athletics']);

    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);
    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->has('assignments.data', 1)
            ->where('assignments.data.0.member.full_name', 'Assigned Player')
            ->where('assignments.data.0.training_venue.name', 'Main Training Ground')
            ->where('assignments.data.0.sport.name', 'Athletics')
            ->where('summary.active_assignments', 1)
            ->etc());
});

test('external coach dashboard paginates large assigned athlete lists', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);

    for ($index = 1; $index <= 12; $index++) {
        $member = Member::factory()->create([
            'organization_id' => $organization->id,
            'full_name' => "Assigned Athlete {$index}",
            'pno' => "PNO-{$index}",
            'current_status' => 'ACTIVE',
        ]);

        ExternalCoachingAssignment::factory()->create([
            'organization_id' => $organization->id,
            'member_id' => $member->id,
            'external_coach_id' => $externalCoach->id,
            'training_venue_id' => $venue->id,
            'sport_id' => $sport->id,
            'status' => 'active',
            'end_date' => today()->addDays($index),
        ]);
    }

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->has('assignments.data', 10)
            ->where('assignments.total', 12)
            ->where('assignments.per_page', 10)
            ->where('summary.active_assignments', 12)
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('assignments.data', 2)
            ->where('assignments.current_page', 2)
            ->where('summary.active_assignments', 12)
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard', ['pno' => 'PNO-12']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('assignments.data', 1)
            ->where('assignments.data.0.member.pno', 'PNO-12')
            ->where('summary.active_assignments', 1)
            ->where('filters.pno', 'PNO-12')
            ->etc());
});

test('external coach can view assigned athlete profile and history only', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $member = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Assigned Athlete', 'current_status' => 'ACTIVE']);
    $otherMember = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Other Athlete', 'current_status' => 'ACTIVE']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id, 'name' => 'Training Hall']);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'name' => 'Boxing']);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);
    $otherAssignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'attendance_status' => 'present',
    ]);
    ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'sport_id' => $sport->id,
        'training_summary' => 'Footwork improved.',
    ]);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.show', $member))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/athletes/show')
            ->where('athlete.full_name', 'Assigned Athlete')
            ->missing('athlete.member_code')
            ->has('assignments', 1)
            ->where('assignments.0.training_venue.name', 'Training Hall')
            ->has('attendances', 1)
            ->has('performanceUpdates', 1)
            ->where('performanceUpdates.0.training_summary', 'Footwork improved.')
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.show', $otherAssignment->member_id))
        ->assertNotFound();
});

test('external coach admin routes require permission', function () {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('external-coaches.index'))
        ->assertForbidden();
});

test('admin can create update and delete external coaches with status history', function () {
    $user = rcUser(
        'external-coaches.view',
        'external-coaches.create',
        'external-coaches.update',
        'external-coaches.manageStatus',
        'external-coaches.delete',
    );

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'Private Coach',
            'phone' => '9876543210',
            'email' => 'private.coach@example.test',
            'password' => 'password',
            'status' => 'active',
            'remarks' => 'Works with sprint athletes.',
        ])
        ->assertRedirect();

    $externalCoach = ExternalCoach::query()->where('email', 'private.coach@example.test')->firstOrFail();

    expect($externalCoach->organization_id)->toBe($user->organization_id)
        ->and($externalCoach->created_by)->toBe($user->id)
        ->and($externalCoach->statusHistory()->count())->toBe(1);

    $this->actingAs($user)
        ->patch(route('external-coaches.update', $externalCoach), [
            'name' => 'Private Coach Updated',
            'phone' => '9876543210',
            'email' => 'private.coach@example.test',
            'password' => '',
            'status' => 'suspended',
            'status_reason' => 'Repeated missing reports.',
        ])
        ->assertRedirect(route('external-coaches.show', $externalCoach));

    expect($externalCoach->refresh()->status)->toBe('suspended')
        ->and($externalCoach->statusHistory()->count())->toBe(2)
        ->and(ExternalCoachStatusHistory::query()->latest('id')->first()?->reason)->toBe('Repeated missing reports.');

    $this->actingAs($user)
        ->delete(route('external-coaches.destroy', $externalCoach))
        ->assertRedirect(route('external-coaches.index'));

    $this->assertSoftDeleted($externalCoach);
    expect(AuditLog::query()
        ->where('entity', 'ExternalCoach')
        ->where('entity_id', $externalCoach->id)
        ->whereIn('action', ['created', 'updated', 'deleted'])
        ->count())->toBe(3);
});

test('suspending or blacklisting an external coach requires a reason', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'No Reason Coach',
            'email' => 'no.reason@example.test',
            'password' => 'password',
            'status' => 'blacklisted',
        ])
        ->assertSessionHasErrors(['status_reason']);
});

test('external coach route binding does not expose other organization records', function () {
    $user = rcUser('external-coaches.view');
    $otherOrg = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->get(route('external-coaches.show', $externalCoach))
        ->assertNotFound();
});

test('external coaches can login only through the external coach portal', function () {
    $externalCoach = ExternalCoach::factory()->create([
        'email' => 'portal.coach@example.test',
        'status' => 'active',
    ]);

    $this->post(route('external-coach.login.store'), [
        'email' => $externalCoach->email,
        'password' => 'password',
    ])
        ->assertRedirect(route('external-coach.dashboard'));

    $this->assertAuthenticatedAs($externalCoach, 'external_coach');
    $this->assertGuest('web');

    $this->post(route('external-coach.logout'))
        ->assertRedirect(route('external-coach.login'));

    $this->assertGuest('external_coach');
});

test('inactive external coaches cannot login', function () {
    $externalCoach = ExternalCoach::factory()->inactive()->create([
        'email' => 'inactive.coach@example.test',
    ]);

    $this->post(route('external-coach.login.store'), [
        'email' => $externalCoach->email,
        'password' => 'password',
    ])
        ->assertSessionHasErrors(['email']);

    $this->assertGuest('external_coach');
});
