<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachStatusHistory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

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
