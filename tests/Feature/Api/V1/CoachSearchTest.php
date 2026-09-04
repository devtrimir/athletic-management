<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// ---------------------------------------------------------------------------
// Helper — mirrors searchUser() pattern from MemberSearchTest
// ---------------------------------------------------------------------------

function coachSearchUser(string ...$permissions): User
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

test('unauthenticated coach search returns 401', function () {
    $this->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertUnauthorized();
});

test('user without coaches.view gets 403', function () {
    $user = coachSearchUser();

    $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('missing q returns 422', function () {
    $user = coachSearchUser('coaches.view');

    $this->actingAs($user)
        ->getJson(route('v1.search.coaches'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['q']);
});

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

test('returns matching coaches in correct contract shape', function () {
    $user = coachSearchUser('coaches.view');
    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'राम प्रसाद',
    ]);
    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'श्याम सुंदर',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'full_name', 'full_name', 'pno']],
            'meta' => ['q', 'count'],
        ]);

    $data = $response->json('data');
    expect(count($data))->toBe(1)
        ->and($data[0]['full_name'])->toBe('राम प्रसाद');
});

test('PNO exact match returns the correct coach', function () {
    $user = coachSearchUser('coaches.view');
    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '9876543',
        'full_name' => 'राम प्रसाद',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => '9876543']))
        ->assertOk();

    expect($response->json('data.0.pno'))->toBe('9876543')
        ->and($response->json('meta.count'))->toBe(1);
});

test('cross-org coaches are not returned', function () {
    $user = coachSearchUser('coaches.view');
    $otherOrg = Organization::factory()->create();
    Coach::factory()->create([
        'organization_id' => $otherOrg->id,
        'full_name' => 'राम प्रसाद',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(0);
});

test('soft-deleted coach is not returned', function () {
    $user = coachSearchUser('coaches.view');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'राम प्रसाद',
    ]);
    $coach->delete();

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(0);
});

test('nis_certified field is no longer part of the search payload', function () {
    $user = coachSearchUser('coaches.view');
    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'राम प्रसाद',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'राम']))
        ->assertOk();

    expect($response->json('data.0'))->not->toHaveKey('nis_certified');
});
