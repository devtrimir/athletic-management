<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\Sport;
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
        ->get(route('sports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sports/index'));
});

test('index redirects guest to login', function (): void {
    $this->get(route('sports.index'))
        ->assertRedirect(route('login'));
});

// ─── Create page ──────────────────────────────────────────────────────────────

test('create page returns 200 for admin', function (): void {
    $this->actingAs($this->admin)
        ->get(route('sports.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sports/create'));
});

test('create page redirects guest', function (): void {
    $this->get(route('sports.create'))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('store creates sport and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sports.store'), [
            'name' => 'हॉकी',
            'name' => 'Hockey',
            'category' => 'TEAM',
        ])
        ->assertRedirect(route('sports.index'));

    expect(Sport::where('name', 'Hockey')->where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('store sets slug from name', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sports.store'), [
            'name' => 'एथलेटिक्स',
            'name' => 'Athletics',
            'category' => 'INDIVIDUAL',
        ])
        ->assertRedirect(route('sports.index'));

    expect(Sport::where('slug', 'athletics')->where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sports.store'), [])
        ->assertSessionHasErrors(['name', 'name', 'category']);
});

test('store validates category enum', function (): void {
    $this->actingAs($this->admin)
        ->post(route('sports.store'), [
            'name' => 'टेस्ट',
            'name' => 'Test',
            'category' => 'INVALID',
        ])
        ->assertSessionHasErrors(['category']);
});

test('store returns 403 for user without permission', function (): void {
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('sports.store'), [
            'name' => 'हॉकी',
            'name' => 'Hockey',
            'category' => 'TEAM',
        ])
        ->assertForbidden();
});

// ─── Edit page ────────────────────────────────────────────────────────────────

test('edit page returns 200 for admin', function (): void {
    $sport = Sport::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->get(route('sports.edit', $sport))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/sports/edit'));
});

test('edit page redirects guest', function (): void {
    $sport = Sport::factory()->create(['organization_id' => $this->org->id]);

    $this->get(route('sports.edit', $sport))
        ->assertRedirect(route('login'));
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('update saves changes and redirects', function (): void {
    $sport = Sport::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'हॉकी',
        'name' => 'Hockey',
        'category' => 'TEAM',
        'slug' => 'hockey',
    ]);

    $this->actingAs($this->admin)
        ->patch(route('sports.update', $sport), [
            'name' => 'फील्ड हॉकी',
            'name' => 'Field Hockey',
            'category' => 'TEAM',
        ])
        ->assertRedirect(route('sports.index'));

    expect($sport->refresh()->name)->toBe('Field Hockey');
    expect($sport->refresh()->slug)->toBe('field-hockey');
});

test('update validates required fields', function (): void {
    $sport = Sport::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->patch(route('sports.update', $sport), [])
        ->assertSessionHasErrors(['name', 'name', 'category']);
});

test('update returns 404 for sport in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $otherOrg->id]);

    // Regular user (not admin) — admin bypasses Gate::before
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->patch(route('sports.update', $sport), [
            'name' => 'हॉकी',
            'name' => 'Hockey',
            'category' => 'TEAM',
        ])
        ->assertNotFound();
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes sport and redirects', function (): void {
    $sport = Sport::factory()->create(['organization_id' => $this->org->id]);

    $this->actingAs($this->admin)
        ->delete(route('sports.destroy', $sport))
        ->assertRedirect(route('sports.index'));

    expect(Sport::find($sport->id))->toBeNull();
});

test('destroy returns 403 for user without permission', function (): void {
    $sport = Sport::factory()->create(['organization_id' => $this->org->id]);
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('sports.destroy', $sport))
        ->assertForbidden();
});

test('destroy returns 404 for sport in another org', function (): void {
    $otherOrg = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $otherOrg->id]);

    // Regular user (not admin) — admin bypasses Gate::before
    $user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('sports.destroy', $sport))
        ->assertNotFound();
});
