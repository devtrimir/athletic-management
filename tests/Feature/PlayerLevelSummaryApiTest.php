<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plApiUser(string ...$permissions): User
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
    $this->getJson(route('v1.reports.player-level-summary'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = plApiUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.player-level-summary'))
        ->assertForbidden();
});

test('returns 200 with correct structure', function (): void {
    $user = plApiUser('reports.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'player_level' => 'NATIONAL',
        'current_status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.player-level-summary'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.player_level'))->toBe('NATIONAL');
    expect($response->json('data.0.total'))->toBe(1);
    expect($response->json('filters'))->toBe(['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);
});

test('returns empty data when no qualifying members exist', function (): void {
    $user = plApiUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.player-level-summary'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});
