<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Unit']);

    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);

    $this->admin = User::factory()->create([
        'email' => 'admin@upp.local',
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->admin->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);
});

// ─── Index ────────────────────────────────────────────────────────────────────

test('index returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('sessions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sessions/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('sessions.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('sessions.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sessions/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('sessions.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates session and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sessions.store'), [
            'name' => '2027-28',
            'start_year' => 2027,
            'end_year' => 2028,
            'is_current' => false,
        ])
        ->assertRedirect(route('sessions.index'));

    expect(SportSession::where('name', '2027-28')->where('organization_id', $this->org->id)->exists())
        ->toBeTrue();
});

test('store with is_current=true flips other sessions to false', function (): void {
    $existing = SportSession::factory()->create([
        'organization_id' => $this->org->id,
        'name' => '2025-26',
        'start_year' => 2025,
        'end_year' => 2026,
        'is_current' => true,
    ]);

    $this->actingAs($this->admin)
        ->post(route('sessions.store'), [
            'name' => '2027-28',
            'start_year' => 2027,
            'end_year' => 2028,
            'is_current' => true,
        ])
        ->assertRedirect(route('sessions.index'));

    expect($existing->refresh()->is_current)->toBeFalse();
    expect(SportSession::where('name', '2027-28')->value('is_current'))->toBeTrue();
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sessions.store'), [])
        ->assertSessionHasErrors(['name', 'start_year', 'end_year']);
});

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create(['organization_id' => $this->org->id, 'email_verified_at' => now()]);

    $this->actingAs($user)
        ->post(route('sessions.store'), [
            'name' => '2027-28',
            'start_year' => 2027,
            'end_year' => 2028,
            'is_current' => false,
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $session = SportSession::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->get(route('sessions.edit', $session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sessions/edit'));
});

test('edit page redirects guest', function (): void {
    $session = SportSession::factory()->create(['organization_id' => $this->org->id]);

    $this->get(route('sessions.edit', $session))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $session = SportSession::factory()->create([
        'organization_id' => $this->org->id,
        'name' => '2025-26',
        'start_year' => 2025,
        'end_year' => 2026,
        'is_current' => false,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('sessions.update', $session), [
            'name' => '2025-26',
            'start_year' => 2025,
            'end_year' => 2026,
            'is_current' => true,
        ])
        ->assertRedirect(route('sessions.index'));

    expect($session->refresh()->is_current)->toBeTrue();
});

test('update returns 404 for session in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $otherOrg->id]);

    $user = User::factory()->create(['organization_id' => $this->org->id, 'email_verified_at' => now()]);

    $this->actingAs($user)
        ->patch(route('sessions.update', $session), [
            'name' => '2025-26',
            'start_year' => 2025,
            'end_year' => 2026,
            'is_current' => false,
        ])
        ->assertNotFound();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes session and redirects', function (): void {
    $session = SportSession::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->delete(route('sessions.destroy', $session))
        ->assertRedirect(route('sessions.index'));

    expect(SportSession::find($session->id))->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $session = SportSession::factory()->create(['organization_id' => $this->org->id]);
    $user = User::factory()->create(['organization_id' => $this->org->id, 'email_verified_at' => now()]);

    $this->actingAs($user)
        ->delete(route('sessions.destroy', $session))
        ->assertForbidden();
});

test('destroy returns 404 for session in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $otherOrg->id]);

    // A regular (non-admin) user from this org cannot delete a session from another org
    $user = User::factory()->create(['organization_id' => $this->org->id, 'email_verified_at' => now()]);

    $this->actingAs($user)
        ->delete(route('sessions.destroy', $session))
        ->assertNotFound();
});
