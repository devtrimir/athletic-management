<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamMember;
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
        'full_name' => 'राम कुमार',
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'श्याम लाल',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'member_code', 'pno', 'full_name', 'full_name', 'player_category', 'player_level', 'current_status']],
            'meta' => ['q', 'count'],
        ]);

    $data = $response->json('data');
    expect(count($data))->toBe(1)
        ->and($data[0]['full_name'])->toBe('राम कुमार');
});

test('PNO exact match returns the correct member', function () {
    $user = searchUser('members.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '1234567890',
        'full_name' => 'राम कुमार',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => '1234567890']))
        ->assertOk();

    expect($response->json('data.0.pno'))->toBe('1234567890')
        ->and($response->json('meta.count'))->toBe(1);
});

test('PNO partial match returns matching members', function () {
    $user = searchUser('members.view');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '1234567890',
        'full_name' => 'राम कुमार',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => '4567']))
        ->assertOk();

    expect($response->json('data.0.pno'))->toBe('1234567890');
});

test('search results include current status and active team involvement labels', function () {
    $user = searchUser('members.view');
    $org = Organization::find($user->organization_id);
    $team = Team::factory()->forOrganization($org)->create(['name' => 'Boxing Team']);

    $assigned = Member::factory()->create([
        'organization_id' => $org->id,
        'pno' => '7001',
        'full_name' => 'राम टीम',
        'current_status' => 'ACTIVE',
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $assigned->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
    ]);

    Member::factory()->create([
        'organization_id' => $org->id,
        'pno' => '7002',
        'full_name' => 'राम खाली',
        'current_status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['current_status', 'active_team']],
        ]);

    $assignedResult = collect($response->json('data'))->firstWhere('id', $assigned->id);

    expect($assignedResult['current_status'])->toBe('ACTIVE')
        ->and($assignedResult['active_team']['name'])->toBe('Boxing Team')
        ->and($assignedResult['active_team']['role'])->toBe('PLAYER');

    $unassignedResult = collect($response->json('data'))->firstWhere('pno', '7002');
    expect($unassignedResult['active_team'])->toBeNull();
});

test('cross-org members are not returned', function () {
    $user = searchUser('members.view');
    $otherOrg = Organization::factory()->create();
    Member::factory()->create([
        'organization_id' => $otherOrg->id,
        'full_name' => 'राम कुमार',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', ['q' => 'राम']))
        ->assertOk();

    expect($response->json('meta.count'))->toBe(0);
});

test('team availability search returns active and inactive playable available members', function () {
    $user = searchUser('members.view');
    $org = Organization::find($user->organization_id);
    $team = Team::factory()->forOrganization($org)->create();

    $available = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम उपलब्ध',
        'current_status' => 'ACTIVE',
    ]);
    $available->playableSports()->sync([$team->sport_id]);

    $inactive = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम निष्क्रिय',
        'current_status' => 'INACTIVE',
    ]);
    $inactive->playableSports()->sync([$team->sport_id]);

    $retired = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम सेवानिवृत्त',
        'current_status' => 'RETIRED',
    ]);
    $retired->playableSports()->sync([$team->sport_id]);

    Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम अयोग्य',
        'current_status' => 'ACTIVE',
    ]);

    $assigned = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम नियुक्त',
        'current_status' => 'ACTIVE',
    ]);
    $assigned->playableSports()->sync([$team->sport_id]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $assigned->id,
        'session_id' => $team->session_id,
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', [
            'q' => 'राम',
            'available_for_team_id' => $team->id,
        ]))
        ->assertOk();

    expect(collect($response->json('data'))->pluck('id')->all())
        ->toEqualCanonicalizing([$available->id, $inactive->id]);
});

test('historical team availability search includes inactive playable members', function () {
    $user = searchUser('members.view');
    $org = Organization::find($user->organization_id);
    $team = Team::factory()->forOrganization($org)->create();

    $inactive = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'राम पुराना',
        'current_status' => 'RETIRED',
    ]);
    $inactive->playableSports()->sync([$team->sport_id]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.members', [
            'q' => 'राम',
            'available_for_team_id' => $team->id,
            'historical' => '1',
        ]))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.id'))->toBe($inactive->id);
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
