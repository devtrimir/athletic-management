<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Control Board']);

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
        ->get(route('tournament-tiers.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/tournament-tiers/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('tournament-tiers.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('tournament-tiers.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/tournament-tiers/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('tournament-tiers.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates tier and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('tournament-tiers.store'), [
            'code' => 'NATIONAL',
            'label_hi' => 'राष्ट्रीय',
            'label_en' => 'National',
            'weight' => 80,
        ])
        ->assertRedirect(route('tournament-tiers.index'));

    expect(TournamentTier::where('code', 'NATIONAL')->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('tournament-tiers.store'), [])
        ->assertSessionHasErrors(['code', 'label_hi', 'label_en', 'weight']);
});

test('store rejects invalid code', function (): void {
    $this->actingAs($this->admin)
        ->post(route('tournament-tiers.store'), [
            'code' => 'INVALID',
            'label_hi' => 'परीक्षण',
            'label_en' => 'Test',
            'weight' => 50,
        ])
        ->assertSessionHasErrors(['code']);
});

test('store validates code uniqueness', function (): void {
    TournamentTier::factory()->create(['code' => 'ZONAL']);

    $this->actingAs($this->admin)
        ->post(route('tournament-tiers.store'), [
            'code' => 'ZONAL',
            'label_hi' => 'ज़ोनल',
            'label_en' => 'Zonal',
            'weight' => 40,
        ])
        ->assertSessionHasErrors(['code']);
});

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('tournament-tiers.store'), [
            'code' => 'STATE',
            'label_hi' => 'राज्य',
            'label_en' => 'State',
            'weight' => 60,
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $tier = TournamentTier::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('tournament-tiers.edit', $tier))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/tournament-tiers/edit'));
});

test('edit page redirects guest', function (): void {
    $tier = TournamentTier::factory()->create();

    $this->get(route('tournament-tiers.edit', $tier))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $tier = TournamentTier::factory()->create([
        'code' => 'INTERNATIONAL',
        'label_en' => 'International',
        'weight' => 100,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('tournament-tiers.update', $tier), [
            'code' => 'INTERNATIONAL',
            'label_hi' => 'अंतरराष्ट्रीय',
            'label_en' => 'International Updated',
            'weight' => 110,
        ])
        ->assertRedirect(route('tournament-tiers.index'));

    expect($tier->refresh()->label_en)->toBe('International Updated');
    expect($tier->refresh()->weight)->toBe(110);
});

test('update allows same code on self', function (): void {
    $tier = TournamentTier::factory()->create(['code' => 'AIPSC']);

    $this->actingAs($this->admin)
        ->patch(route('tournament-tiers.update', $tier), [
            'code' => 'AIPSC',
            'label_hi' => 'एआईपीएससी',
            'label_en' => 'AIPSC',
            'weight' => 70,
        ])
        ->assertRedirect(route('tournament-tiers.index'));
});

test('update validates required fields', function (): void {
    $tier = TournamentTier::factory()->create();

    $this->actingAs($this->admin)
        ->patch(route('tournament-tiers.update', $tier), [])
        ->assertSessionHasErrors(['code', 'label_hi', 'label_en', 'weight']);
});

test('update returns 403 for user without permission', function (): void {
    $tier = TournamentTier::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->patch(route('tournament-tiers.update', $tier), [
            'code' => 'OTHER',
            'label_hi' => 'अन्य',
            'label_en' => 'Other',
            'weight' => 10,
        ])
        ->assertForbidden();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes tier and redirects', function (): void {
    $tier = TournamentTier::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('tournament-tiers.destroy', $tier))
        ->assertRedirect(route('tournament-tiers.index'));

    expect(TournamentTier::find($tier->id))->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $tier = TournamentTier::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('tournament-tiers.destroy', $tier))
        ->assertForbidden();
});
