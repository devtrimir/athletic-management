<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Helpers to create an admin user in a given org (no role-permission rows needed —
 * admin is_system=true short-circuits all Gate checks; 404 comes from the scope, not 403).
 */
function makeAdminInOrg(Organization $org): User
{
    $role = Role::factory()->create([
        'organization_id' => $org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);

    $user = User::factory()->create([
        'organization_id' => $org->id,
        'email_verified_at' => now(),
    ]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    return $user;
}

beforeEach(function (): void {
    $this->orgA = Organization::factory()->create(['code' => 'ORGA', 'name' => 'Org A']);
    $this->orgB = Organization::factory()->create(['code' => 'ORGB', 'name' => 'Org B']);

    $this->adminA = makeAdminInOrg($this->orgA);
    $this->adminB = makeAdminInOrg($this->orgB);

    // Models owned by Org A
    $this->sessionA = SportSession::factory()->create(['organization_id' => $this->orgA->id]);
    $this->sportA = Sport::factory()->create(['organization_id' => $this->orgA->id]);
    $this->unitA = Unit::factory()->create(['organization_id' => $this->orgA->id]);

    // Models owned by Org B (for own-data sanity checks)
    $this->sessionB = SportSession::factory()->create(['organization_id' => $this->orgB->id]);
    $this->sportB = Sport::factory()->create(['organization_id' => $this->orgB->id]);
    $this->unitB = Unit::factory()->create(['organization_id' => $this->orgB->id]);
});

// ── Index: Org B user sees only Org B records, never Org A records ────────────

test('SportSession index: Org B user cannot see Org A sessions', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('sessions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('sessions', fn ($sessions) => collect($sessions)
                ->pluck('id')
                ->doesntContain($this->sessionA->id)
            )
        );
});

test('Sport index: Org B user cannot see Org A sports', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('sports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('sports', fn ($sports) => collect($sports)
                ->pluck('id')
                ->doesntContain($this->sportA->id)
            )
        );
});

test('Unit index: Org B user cannot see Org A units', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('units.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('units', fn ($units) => collect($units)
                ->pluck('id')
                ->doesntContain($this->unitA->id)
            )
        );
});

// ── Index: Org B user still sees their own records ────────────────────────────

test('Org B user sees their own sessions on the index', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('sessions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('sessions', fn ($sessions) => collect($sessions)
                ->pluck('id')
                ->contains($this->sessionB->id)
            )
        );
});

// ── Edit: cross-org model lookup returns 404 (scope excludes the row) ─────────

test('Org B user cannot edit Org A session — 404', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('sessions.edit', $this->sessionA))
        ->assertNotFound();
});

test('Org B user cannot edit Org A sport — 404', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('sports.edit', $this->sportA))
        ->assertNotFound();
});

test('Org B user cannot edit Org A unit — 404', function (): void {
    $this->actingAs($this->adminB)
        ->get(route('units.edit', $this->unitA))
        ->assertNotFound();
});

// ── Update (PATCH): cross-org write returns 404 ───────────────────────────────

test('Org B user cannot update Org A session — 404', function (): void {
    $this->actingAs($this->adminB)
        ->patch(route('sessions.update', $this->sessionA), [
            'name' => $this->sessionA->name,
            'start_year' => $this->sessionA->start_year,
            'end_year' => $this->sessionA->end_year,
            'is_current' => false,
        ])
        ->assertNotFound();
});

test('Org B user cannot update Org A sport — 404', function (): void {
    $this->actingAs($this->adminB)
        ->patch(route('sports.update', $this->sportA), [
            'name_hi' => $this->sportA->name_hi,
            'name_en' => $this->sportA->name_en,
            'category' => $this->sportA->category,
        ])
        ->assertNotFound();
});

test('Org B user cannot update Org A unit — 404', function (): void {
    $this->actingAs($this->adminB)
        ->patch(route('units.update', $this->unitA), [
            'name_hi' => $this->unitA->name_hi,
            'name_en' => $this->unitA->name_en,
            'unit_type' => $this->unitA->unit_type,
        ])
        ->assertNotFound();
});

// ── Destroy (DELETE): cross-org delete returns 404 ───────────────────────────

test('Org B user cannot delete Org A session — 404', function (): void {
    $this->actingAs($this->adminB)
        ->delete(route('sessions.destroy', $this->sessionA))
        ->assertNotFound();
});

test('Org B user cannot delete Org A sport — 404', function (): void {
    $this->actingAs($this->adminB)
        ->delete(route('sports.destroy', $this->sportA))
        ->assertNotFound();
});

test('Org B user cannot delete Org A unit — 404', function (): void {
    $this->actingAs($this->adminB)
        ->delete(route('units.destroy', $this->unitA))
        ->assertNotFound();
});
