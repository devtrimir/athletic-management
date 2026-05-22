<?php

use App\Models\District;
use App\Models\Organization;
use App\Models\Role;
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
        ->get(route('districts.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/districts/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('districts.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('districts.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/districts/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('districts.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates district and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('districts.store'), [
            'name_hi' => 'लखनऊ',
            'name_en' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertRedirect(route('districts.index'));

    expect(District::where('code', 'LKO')->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('districts.store'), [])
        ->assertSessionHasErrors(['name_hi', 'name_en', 'state', 'code']);
});

test('store validates code uniqueness', function (): void {
    District::factory()->create(['code' => 'LKO']);

    $this->actingAs($this->admin)
        ->post(route('districts.store'), [
            'name_hi' => 'लखनऊ नया',
            'name_en' => 'Lucknow New',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertSessionHasErrors(['code']);
});

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('districts.store'), [
            'name_hi' => 'लखनऊ',
            'name_en' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $district = District::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('districts.edit', $district))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/districts/edit'));
});

test('edit page redirects guest', function (): void {
    $district = District::factory()->create();

    $this->get(route('districts.edit', $district))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $district = District::factory()->create([
        'name_en' => 'Lucknow',
        'code' => 'LKO',
    ]);

    $this->actingAs($this->admin)
        ->patch(route('districts.update', $district), [
            'name_hi' => 'लखनऊ',
            'name_en' => 'Lucknow Updated',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertRedirect(route('districts.index'));

    expect($district->refresh()->name_en)->toBe('Lucknow Updated');
});

test('update allows same code on self', function (): void {
    $district = District::factory()->create(['code' => 'LKO']);

    $this->actingAs($this->admin)
        ->patch(route('districts.update', $district), [
            'name_hi' => 'लखनऊ',
            'name_en' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertRedirect(route('districts.index'));
});

test('update validates required fields', function (): void {
    $district = District::factory()->create();

    $this->actingAs($this->admin)
        ->patch(route('districts.update', $district), [])
        ->assertSessionHasErrors(['name_hi', 'name_en', 'state', 'code']);
});

test('update returns 403 for user without permission', function (): void {
    $district = District::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->patch(route('districts.update', $district), [
            'name_hi' => 'लखनऊ',
            'name_en' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'code' => 'LKO',
        ])
        ->assertForbidden();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes district and redirects', function (): void {
    $district = District::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('districts.destroy', $district))
        ->assertRedirect(route('districts.index'));

    expect(District::find($district->id))->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $district = District::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('districts.destroy', $district))
        ->assertForbidden();
});
