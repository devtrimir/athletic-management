<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\NameAlias;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper (unique name to avoid collision with MemberSearchTest::searchUser)
// ---------------------------------------------------------------------------

function normSearchUser(string ...$permissions): User
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
// Rank-prefix stripping
// ---------------------------------------------------------------------------

test('rank prefix in query is stripped and finds member', function () {
    $user = normSearchUser('members.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'राम कुमार',
    ]);

    // "दलनायक राम कुमार" normalizes to "राम कुमार" → should match the member
    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'दलनायक राम']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(1)
        ->and($response->json('data.0.full_name_hi'))->toBe('राम कुमार');
});

// ---------------------------------------------------------------------------
// Alias matching (SQLite-compatible: searchSqlite now joins name_aliases)
// ---------------------------------------------------------------------------

test('member is found when query matches an alias', function () {
    $user = normSearchUser('members.view');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'रामकुमार शर्मा',
    ]);
    NameAlias::create([
        'member_id' => $member->id,
        'alias_hi' => 'राम शर्मा',
        'source' => 'krutidev',
    ]);

    // "राम शर्मा" does not appear in full_name_hi, only in alias
    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम शर्मा']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($member->id);
});

test('soft-deleted member is not returned when found only via alias', function () {
    $user = normSearchUser('members.view');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'रामकुमार शर्मा',
    ]);
    NameAlias::create([
        'member_id' => $member->id,
        'alias_hi' => 'राम शर्मा',
        'source' => 'manual',
    ]);
    $member->delete();

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम शर्मा']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(0);
});

// ---------------------------------------------------------------------------
// ZWJ/ZWNJ stripped from stored normalized name (MySQL-only)
// ---------------------------------------------------------------------------

test('ZWJ in stored name is normalized by trigger; clean query finds member', function () {
    $orgId = DB::table('organizations')->insertGetId([
        'name' => 'Test Org',
        'code' => 'TST'.fake()->unique()->numerify('##'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $user = User::factory()->create(['organization_id' => $orgId]);
    // Grant members.view permission
    $role = Role::factory()->create(['organization_id' => $orgId]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $orgId]);
    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    // Insert name containing ZWJ — trigger will strip it in full_name_normalized
    DB::table('members')->insert([
        'organization_id' => $orgId,
        'member_code' => 'UPP-2026-ZWJ01',
        'full_name_hi' => "राम\u{200D}कुमार",
        'gender' => 'M',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
        'current_status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Search by clean form (no ZWJ) — ngram FULLTEXT on normalized column finds the member
    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'रामकुमार']))
        ->assertOk();

    expect($response->json('meta.count'))->toBeGreaterThanOrEqual(1);
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'MySQL-only: FULLTEXT ngram requires MySQL');
