<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberStatusHistory;
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

function rdApiUser(string ...$permissions): User
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
    $this->getJson(route('v1.reports.resignation-dismissal-log'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = rdApiUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.resignation-dismissal-log'))
        ->assertForbidden();
});

test('returns 200 with correct structure', function (): void {
    $user = rdApiUser('reports.view');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RESIGNED',
    ]);
    MemberStatusHistory::factory()->create([
        'member_id' => $member->id,
        'status' => 'RESIGNED',
        'effective_on' => '2024-06-01',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.resignation-dismissal-log'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.member_code'))->toBe($member->member_code);
    expect($response->json('data.0.pno'))->toBe($member->pno);
    expect($response->json('data.0.current_status'))->toBe('RESIGNED');
    expect($response->json('filters.from_date'))->toBeNull();
    expect($response->json('filters.to_date'))->toBeNull();
    expect($response->json('filters.status'))->toBeNull();
});

test('returns empty data when no resigned or dismissed members', function (): void {
    $user = rdApiUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.resignation-dismissal-log'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});
