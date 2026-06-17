<?php

use App\Models\District;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Unit']);

    // ── admin (system role — Gate::before short-circuits to true) ─────────
    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);
    $this->admin = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);
    DB::table('user_role')->insert([
        'user_id' => $this->admin->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);

    // ── data_entry (reference_data.manage permission) ─────────────────────
    $dataEntryRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'data_entry',
        'is_system' => false,
    ]);
    $refDataPerm = Permission::factory()->create(['code' => 'reference_data.manage']);
    DB::table('role_permission')->insert([
        'role_id' => $dataEntryRole->id,
        'permission_id' => $refDataPerm->id,
    ]);
    $this->dataEntry = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);
    DB::table('user_role')->insert([
        'user_id' => $this->dataEntry->id,
        'role_id' => $dataEntryRole->id,
        'organization_id' => $this->org->id,
    ]);

    // ── viewer (no reference_data.manage) ─────────────────────────────────
    $viewerRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'viewer',
        'is_system' => false,
    ]);
    $this->viewer = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);
    DB::table('user_role')->insert([
        'user_id' => $this->viewer->id,
        'role_id' => $viewerRole->id,
        'organization_id' => $this->org->id,
    ]);

    // ── One model instance per resource (for edit/update/destroy routes) ──
    $this->session = SportSession::factory()->create(['organization_id' => $this->org->id]);
    $this->sport = Sport::factory()->create(['organization_id' => $this->org->id]);
    $this->unit = Unit::factory()->create(['organization_id' => $this->org->id]);
    $this->district = District::factory()->create();
    $this->tier = TournamentTier::factory()->create();
});

// ── Guest redirects ───────────────────────────────────────────────────────────

test('guest is redirected to login on all reference-data index routes', function (): void {
    foreach (['sessions.index', 'sports.index', 'units.index', 'districts.index', 'tournament-tiers.index'] as $route) {
        $this->get(route($route))->assertRedirect(route('login'));
    }
});

// ── admin × read routes ───────────────────────────────────────────────────────

test('admin: index routes return 200', function (): void {
    foreach (['sessions.index', 'sports.index', 'units.index', 'districts.index', 'tournament-tiers.index'] as $route) {
        $this->actingAs($this->admin)->get(route($route))->assertOk();
    }
});

test('admin: create routes return 200', function (): void {
    foreach (['sessions.create', 'sports.create', 'units.create', 'districts.create', 'tournament-tiers.create'] as $route) {
        $this->actingAs($this->admin)->get(route($route))->assertOk();
    }
});

test('admin: edit routes return 200', function (): void {
    $this->actingAs($this->admin)->get(route('sessions.edit', $this->session))->assertOk();
    $this->actingAs($this->admin)->get(route('sports.edit', $this->sport))->assertOk();
    $this->actingAs($this->admin)->get(route('units.edit', $this->unit))->assertOk();
    $this->actingAs($this->admin)->get(route('districts.edit', $this->district))->assertOk();
    $this->actingAs($this->admin)->get(route('tournament-tiers.edit', $this->tier))->assertOk();
});

// ── data_entry × read routes ──────────────────────────────────────────────────

test('data_entry: index routes return 200', function (): void {
    foreach (['sessions.index', 'sports.index', 'units.index', 'districts.index', 'tournament-tiers.index'] as $route) {
        $this->actingAs($this->dataEntry)->get(route($route))->assertOk();
    }
});

test('data_entry: create routes return 200', function (): void {
    foreach (['sessions.create', 'sports.create', 'units.create', 'districts.create', 'tournament-tiers.create'] as $route) {
        $this->actingAs($this->dataEntry)->get(route($route))->assertOk();
    }
});

test('data_entry: edit routes return 200', function (): void {
    $this->actingAs($this->dataEntry)->get(route('sessions.edit', $this->session))->assertOk();
    $this->actingAs($this->dataEntry)->get(route('sports.edit', $this->sport))->assertOk();
    $this->actingAs($this->dataEntry)->get(route('units.edit', $this->unit))->assertOk();
    $this->actingAs($this->dataEntry)->get(route('districts.edit', $this->district))->assertOk();
    $this->actingAs($this->dataEntry)->get(route('tournament-tiers.edit', $this->tier))->assertOk();
});

// ── viewer × read routes ──────────────────────────────────────────────────────

test('viewer: index routes return 403', function (): void {
    foreach (['sessions.index', 'sports.index', 'units.index', 'districts.index', 'tournament-tiers.index'] as $route) {
        $this->actingAs($this->viewer)->get(route($route))->assertForbidden();
    }
});

test('viewer: create routes return 403', function (): void {
    foreach (['sessions.create', 'sports.create', 'units.create', 'districts.create', 'tournament-tiers.create'] as $route) {
        $this->actingAs($this->viewer)->get(route($route))->assertForbidden();
    }
});

test('viewer: edit routes return 403', function (): void {
    $this->actingAs($this->viewer)->get(route('sessions.edit', $this->session))->assertForbidden();
    $this->actingAs($this->viewer)->get(route('sports.edit', $this->sport))->assertForbidden();
    $this->actingAs($this->viewer)->get(route('units.edit', $this->unit))->assertForbidden();
    $this->actingAs($this->viewer)->get(route('districts.edit', $this->district))->assertForbidden();
    $this->actingAs($this->viewer)->get(route('tournament-tiers.edit', $this->tier))->assertForbidden();
});

// ── Write-operation policy checks (admin / data_entry / viewer) ───────────────
// Assert the Gate / policy layer directly, independent of HTTP validation.

test('admin: policy allows create/update/delete on all reference resources', function (): void {
    $user = $this->admin;

    expect($user->can('create', Sport::class))->toBeTrue()
        ->and($user->can('update', $this->sport))->toBeTrue()
        ->and($user->can('delete', $this->sport))->toBeTrue()
        ->and($user->can('create', SportSession::class))->toBeTrue()
        ->and($user->can('update', $this->session))->toBeTrue()
        ->and($user->can('delete', $this->session))->toBeTrue()
        ->and($user->can('create', Unit::class))->toBeTrue()
        ->and($user->can('update', $this->unit))->toBeTrue()
        ->and($user->can('delete', $this->unit))->toBeTrue()
        ->and($user->can('create', District::class))->toBeTrue()
        ->and($user->can('update', $this->district))->toBeTrue()
        ->and($user->can('delete', $this->district))->toBeTrue()
        ->and($user->can('create', TournamentTier::class))->toBeTrue()
        ->and($user->can('update', $this->tier))->toBeTrue()
        ->and($user->can('delete', $this->tier))->toBeTrue();
});

test('data_entry: policy allows create/update/delete on all reference resources', function (): void {
    $user = $this->dataEntry;

    expect($user->can('create', Sport::class))->toBeTrue()
        ->and($user->can('update', $this->sport))->toBeTrue()
        ->and($user->can('delete', $this->sport))->toBeTrue()
        ->and($user->can('create', SportSession::class))->toBeTrue()
        ->and($user->can('update', $this->session))->toBeTrue()
        ->and($user->can('delete', $this->session))->toBeTrue()
        ->and($user->can('create', Unit::class))->toBeTrue()
        ->and($user->can('update', $this->unit))->toBeTrue()
        ->and($user->can('delete', $this->unit))->toBeTrue()
        ->and($user->can('create', District::class))->toBeTrue()
        ->and($user->can('update', $this->district))->toBeTrue()
        ->and($user->can('delete', $this->district))->toBeTrue()
        ->and($user->can('create', TournamentTier::class))->toBeTrue()
        ->and($user->can('update', $this->tier))->toBeTrue()
        ->and($user->can('delete', $this->tier))->toBeTrue();
});

test('viewer: policy denies create/update/delete on all reference resources', function (): void {
    $user = $this->viewer;

    expect($user->can('create', Sport::class))->toBeFalse()
        ->and($user->can('update', $this->sport))->toBeFalse()
        ->and($user->can('delete', $this->sport))->toBeFalse()
        ->and($user->can('create', SportSession::class))->toBeFalse()
        ->and($user->can('update', $this->session))->toBeFalse()
        ->and($user->can('delete', $this->session))->toBeFalse()
        ->and($user->can('create', Unit::class))->toBeFalse()
        ->and($user->can('update', $this->unit))->toBeFalse()
        ->and($user->can('delete', $this->unit))->toBeFalse()
        ->and($user->can('create', District::class))->toBeFalse()
        ->and($user->can('update', $this->district))->toBeFalse()
        ->and($user->can('delete', $this->district))->toBeFalse()
        ->and($user->can('create', TournamentTier::class))->toBeFalse()
        ->and($user->can('update', $this->tier))->toBeFalse()
        ->and($user->can('delete', $this->tier))->toBeFalse();
});

// ── HTTP write smoke: viewer + valid data → Gate::authorize runs → 403 ────────
// FormRequest validation passes first (data is valid), then Gate::authorize
// in the controller body runs and returns 403 for the viewer.

test('viewer: POST store with valid sport data returns 403', function (): void {
    $this->actingAs($this->viewer)
        ->post(route('sports.store'), [
            'name' => 'टेस्ट खेल',
            'name' => 'Test Sport Matrix',
            'category' => 'INDIVIDUAL',
        ])
        ->assertForbidden();
});

test('viewer: PATCH update with valid sport data returns 403', function (): void {
    $this->actingAs($this->viewer)
        ->patch(route('sports.update', $this->sport), [
            'name' => 'अपडेट खेल',
            'name' => 'Updated Sport Matrix',
            'category' => 'TEAM',
        ])
        ->assertForbidden();
});

test('viewer: DELETE destroy sport returns 403', function (): void {
    $this->actingAs($this->viewer)
        ->delete(route('sports.destroy', $this->sport))
        ->assertForbidden();
});
