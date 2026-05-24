<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hcApiUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request returns 401', function (): void {
    $this->getJson(route('v1.reports.unit-headcount'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = hcApiUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.unit-headcount'))
        ->assertForbidden();
});

test('returns 200 with correct structure', function (): void {
    $user = hcApiUser('reports.view');
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'player_category' => 'SKILLED',
        'current_status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.unit-headcount'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.unit.id'))->toBe($unit->id);
    expect($response->json('data.0.total'))->toBe(1);
    expect($response->json('data.0.SKILLED'))->toBe(1);
    expect($response->json('data.0.GD'))->toBe(0);
    expect($response->json('filters'))->toBe(['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);
});

test('returns empty data when no units exist', function (): void {
    $user = hcApiUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.unit-headcount'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});
