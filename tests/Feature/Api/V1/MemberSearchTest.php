<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\MemberSearchService;
use Illuminate\Support\Facades\DB;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function searchUser(string ...$permissions): User
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
// Auth / permission gates
// ---------------------------------------------------------------------------

test('unauthenticated request returns 401', function () {
    $this->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertUnauthorized();
});

test('user without members.view gets 403', function () {
    $user = searchUser();

    $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('missing q returns 422', function () {
    $user = searchUser('members.view');

    $this->actingAs($user)
        ->getJson(route('v1.search.members'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['q']);
});

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

test('returns matching members in correct contract shape', function () {
    $user = searchUser('members.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'राम कुमार',
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'श्याम लाल',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'member_code', 'pno', 'full_name_hi', 'full_name_en', 'player_category', 'player_level', 'current_status']],
            'meta' => ['q', 'count'],
        ]);

    $data = $response->json('data');
    expect(count($data))->toBe(1)
        ->and($data[0]['full_name_hi'])->toBe('राम कुमार');
});

test('PNO exact match returns the correct member', function () {
    $user = searchUser('members.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '1234567890',
        'full_name_hi' => 'राम कुमार',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => '1234567890']))
        ->assertOk();

    expect($response->json('data.0.pno'))->toBe('1234567890')
        ->and($response->json('meta.count'))->toBe(1);
});

test('cross-org members are not returned', function () {
    $user = searchUser('members.view');
    $otherOrg = Organization::factory()->create();
    Member::factory()->create([
        'organization_id' => $otherOrg->id,
        'full_name_hi' => 'राम कुमार',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(0);
});

// ---------------------------------------------------------------------------
// MemberSearchService::normalize unit-style tests
// ---------------------------------------------------------------------------

test('normalize strips ZWJ and ZWNJ', function () {
    $service = app(MemberSearchService::class);
    expect($service->normalize("राम\u{200D}कुमार"))->toBe('रामकुमार');
});

test('normalize strips rank prefixes', function () {
    $service = app(MemberSearchService::class);
    expect($service->normalize('दलनायक राम'))->toBe('राम');
});
