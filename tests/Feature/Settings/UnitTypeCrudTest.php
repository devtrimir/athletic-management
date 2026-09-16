<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\Unit;
use App\Models\UnitType;
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
        ->get(route('unit-types.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/unit-types/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('unit-types.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('unit-types.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/unit-types/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('unit-types.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates unit type and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('unit-types.store'), [
            'code' => 'ARMOURY',
            'name' => 'शस्त्रागार',
            'name_en' => 'Armoury',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertRedirect(route('unit-types.index'));

    expect(UnitType::where('code', 'ARMOURY')->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('unit-types.store'), [])
        ->assertSessionHasErrors(['code', 'name', 'sort_order', 'is_active']);
});

test('store validates code uniqueness', function (): void {
    UnitType::factory()->create(['code' => 'ARMOURY']);

    $this->actingAs($this->admin)
        ->post(route('unit-types.store'), [
            'code' => 'ARMOURY',
            'name' => 'शस्त्रागार',
            'name_en' => 'Armoury',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertSessionHasErrors(['code']);
});

test('store rejects a code with spaces or symbols', function (string $badCode): void {
    $this->actingAs($this->admin)
        ->post(route('unit-types.store'), [
            'code' => $badCode,
            'name' => 'शस्त्रागार',
            'name_en' => 'Armoury',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertSessionHasErrors(['code']);
})->with(['ARMOURY ROOM', 'ARMOURY-ROOM', '1ARMOURY', 'ARMOURY!']);

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('unit-types.store'), [
            'code' => 'ARMOURY',
            'name' => 'शस्त्रागार',
            'name_en' => 'Armoury',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $unitType = UnitType::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('unit-types.edit', $unitType))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/unit-types/edit'));
});

test('edit page redirects guest', function (): void {
    $unitType = UnitType::factory()->create();

    $this->get(route('unit-types.edit', $unitType))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $unitType = UnitType::factory()->create([
        'code' => 'ARMOURY',
        'name' => 'Armoury',
    ]);

    $this->actingAs($this->admin)
        ->patch(route('unit-types.update', $unitType), [
            'code' => 'ARMOURY',
            'name' => 'Armoury Updated',
            'name_en' => 'Armoury Updated',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertRedirect(route('unit-types.index'));

    expect($unitType->refresh()->name)->toBe('Armoury Updated');
});

test('update validates required fields', function (): void {
    $unitType = UnitType::factory()->create();

    $this->actingAs($this->admin)
        ->patch(route('unit-types.update', $unitType), [])
        ->assertSessionHasErrors(['code', 'name', 'sort_order', 'is_active']);
});

test('update returns 403 for user without permission', function (): void {
    $unitType = UnitType::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->patch(route('unit-types.update', $unitType), [
            'code' => 'ARMOURY',
            'name' => 'Armoury',
            'sort_order' => 6,
            'is_active' => true,
        ])
        ->assertForbidden();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes unit type and redirects', function (): void {
    $unitType = UnitType::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('unit-types.destroy', $unitType))
        ->assertRedirect(route('unit-types.index'));

    expect(UnitType::find($unitType->id))->toBeNull();
});

test('destroy is blocked when the unit type is still in use', function (): void {
    $unitType = UnitType::factory()->create();
    Unit::factory()->create([
        'organization_id' => $this->org->id,
        'unit_type_id' => $unitType->id,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('unit-types.destroy', $unitType))
        ->assertRedirect(route('unit-types.index'));

    expect(UnitType::find($unitType->id))->not->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $unitType = UnitType::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('unit-types.destroy', $unitType))
        ->assertForbidden();
});
