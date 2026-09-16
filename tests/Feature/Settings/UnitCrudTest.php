<?php

use App\Models\District;
use App\Models\Organization;
use App\Models\Role;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Control Board']);
    $this->unitType = UnitType::where('code', 'PAC')->firstOrFail();

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
        ->get(route('units.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/units/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('units.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('units.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/units/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('units.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates unit and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('units.store'), [
            'name' => 'प्रथम वाहिनी पीएसी',
            'name' => '1st Battalion PAC',
            'unit_type_id' => $this->unitType->id,
        ])
        ->assertRedirect(route('units.index'));

    expect(Unit::where('name', '1st Battalion PAC')
        ->where('organization_id', $this->org->id)
        ->exists())->toBeTrue();
});

test('store creates unit with district', function (): void {
    $district = District::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('units.store'), [
            'name' => 'जिला पुलिस',
            'name' => 'District Police',
            'unit_type_id' => $this->unitType->id,
            'commandant' => 'SP Singh',
            'district_id' => $district->id,
        ])
        ->assertRedirect(route('units.index'));

    $unit = Unit::where('name', 'District Police')->first();
    expect($unit->district_id)->toBe($district->id);
    expect($unit->commandant)->toBe('SP Singh');
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('units.store'), [])
        ->assertSessionHasErrors(['name', 'name', 'unit_type_id']);
});

test('store validates unit_type_id exists', function (): void {
    $this->actingAs($this->admin)
        ->post(route('units.store'), [
            'name' => 'टेस्ट',
            'name' => 'Test',
            'unit_type_id' => 99999,
        ])
        ->assertSessionHasErrors(['unit_type_id']);
});

test('store validates district_id exists', function (): void {
    $this->actingAs($this->admin)
        ->post(route('units.store'), [
            'name' => 'टेस्ट',
            'name' => 'Test',
            'unit_type_id' => $this->unitType->id,
            'district_id' => 99999,
        ])
        ->assertSessionHasErrors(['district_id']);
});

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('units.store'), [
            'name' => 'प्रथम वाहिनी',
            'name' => '1st Battalion',
            'unit_type_id' => $this->unitType->id,
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $unit = Unit::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->get(route('units.edit', $unit))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/units/edit'));
});

test('edit page redirects guest', function (): void {
    $unit = Unit::factory()->create(['organization_id' => $this->org->id]);

    $this->get(route('units.edit', $unit))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $newType = UnitType::where('code', 'HQ')->firstOrFail();
    $unit = Unit::factory()->create([
        'organization_id' => $this->org->id,
        'name' => '1st Battalion',
        'unit_type_id' => $this->unitType->id,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('units.update', $unit), [
            'name' => 'प्रथम वाहिनी',
            'name' => '1st Battalion Updated',
            'unit_type_id' => $newType->id,
        ])
        ->assertRedirect(route('units.index'));

    expect($unit->refresh()->name)->toBe('1st Battalion Updated');
    expect($unit->refresh()->unit_type_id)->toBe($newType->id);
});

test('update validates required fields', function (): void {
    $unit = Unit::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->patch(route('units.update', $unit), [])
        ->assertSessionHasErrors(['name', 'name', 'unit_type_id']);
});

test('update returns 404 for unit in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $otherOrg->id]);

    // Regular user — admin bypasses Gate::before
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->patch(route('units.update', $unit), [
            'name' => 'टेस्ट',
            'name' => 'Test',
            'unit_type_id' => $this->unitType->id,
        ])
        ->assertNotFound();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes unit and redirects', function (): void {
    $unit = Unit::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->delete(route('units.destroy', $unit))
        ->assertRedirect(route('units.index'));

    expect(Unit::find($unit->id))->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $unit = Unit::factory()->create(['organization_id' => $this->org->id]);
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('units.destroy', $unit))
        ->assertForbidden();
});

test('destroy returns 404 for unit in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $otherOrg->id]);

    // Regular user — admin bypasses Gate::before
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('units.destroy', $unit))
        ->assertNotFound();
});
