<?php

use App\Models\District;
use App\Models\Organization;
use App\Models\Role;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Control Board']);

    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);

    $this->user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);
});

// ─── Tournament Tiers ─────────────────────────────────────────────────────────

test('GET /api/v1/tournament-tiers returns tiers ordered by weight desc', function (): void {
    TournamentTier::factory()->create(['code' => 'STATE', 'weight' => 60]);
    TournamentTier::factory()->create(['code' => 'INTERNATIONAL', 'weight' => 100]);

    $this->actingAs($this->user)
        ->getJson(route('v1.tournament-tiers.index'))
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'code', 'label_hi', 'label_en', 'weight']]])
        ->assertJsonPath('data.0.code', 'INTERNATIONAL');
});

test('GET /api/v1/tournament-tiers returns 401 for guest', function (): void {
    $this->getJson(route('v1.tournament-tiers.index'))
        ->assertUnauthorized();
});

// ─── Sports ──────────────────────────────────────────────────────────────────

test('GET /api/v1/sports returns org-scoped sports', function (): void {
    $sport = Sport::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'Athletics',
    ]);

    $otherOrg = Organization::factory()->create(['code' => 'OTHER']);
    Sport::factory()->create([
        'organization_id' => $otherOrg->id,
        'name' => 'Swimming',
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('v1.sports.index'))
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'name', 'category', 'slug']]]);

    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($sport->id);
    expect($ids)->not->toContain($sport->id + 1);
});

test('GET /api/v1/sports excludes other org sports', function (): void {
    $otherOrg = Organization::factory()->create(['code' => 'OTHER2']);
    $otherSport = Sport::factory()->create(['organization_id' => $otherOrg->id]);

    $response = $this->actingAs($this->user)
        ->getJson(route('v1.sports.index'))
        ->assertOk();

    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($otherSport->id);
});

test('GET /api/v1/sports returns 401 for guest', function (): void {
    $this->getJson(route('v1.sports.index'))
        ->assertUnauthorized();
});

// ─── Units ────────────────────────────────────────────────────────────────────

test('GET /api/v1/units returns org-scoped units', function (): void {
    $unit = Unit::factory()->create([
        'organization_id' => $this->org->id,
        'name' => '17th Battalion',
    ]);

    $otherOrg = Organization::factory()->create(['code' => 'OTH3']);
    Unit::factory()->create(['organization_id' => $otherOrg->id]);

    $response = $this->actingAs($this->user)
        ->getJson(route('v1.units.index'))
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'name', 'unit_type']]]);

    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($unit->id);
});

test('GET /api/v1/units excludes other org units', function (): void {
    $otherOrg = Organization::factory()->create(['code' => 'OTH4']);
    $otherUnit = Unit::factory()->create(['organization_id' => $otherOrg->id]);

    $response = $this->actingAs($this->user)
        ->getJson(route('v1.units.index'))
        ->assertOk();

    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($otherUnit->id);
});

test('GET /api/v1/units returns 401 for guest', function (): void {
    $this->getJson(route('v1.units.index'))
        ->assertUnauthorized();
});

// ─── Districts ────────────────────────────────────────────────────────────────

test('GET /api/v1/districts returns all districts ordered by name', function (): void {
    District::factory()->create(['name' => 'Lucknow', 'code' => 'LKO']);
    District::factory()->create(['name' => 'Agra', 'code' => 'AGR']);

    $response = $this->actingAs($this->user)
        ->getJson(route('v1.districts.index'))
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'name', 'state', 'code']]]);

    $names = collect($response->json('data'))->pluck('name');
    expect($names->first())->toBe('Agra');
});

test('GET /api/v1/districts returns 401 for guest', function (): void {
    $this->getJson(route('v1.districts.index'))
        ->assertUnauthorized();
});
