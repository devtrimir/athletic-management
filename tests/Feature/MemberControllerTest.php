<?php

declare(strict_types=1);

use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function memberUser(string ...$permissions): User
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
// index
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from index', function () {
    $this->get(route('members.index'))->assertRedirect(route('login'));
});

test('user with members.view sees index', function () {
    $user = memberUser('members.view');

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->has('members')
        );
});

test('user without members.view gets 403', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertForbidden();
});

test('index filters by current_status', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['current_status' => 'ACTIVE']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data', fn ($data) => collect($data)->every(fn ($m) => $m['current_status'] === 'ACTIVE'))
        );
});

test('index defaults to active members', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.current_status', 'ACTIVE')
            ->where('members.total', 1)
            ->where('members.data', fn ($data) => collect($data)->every(fn ($m) => $m['current_status'] === 'ACTIVE'))
        );
});

test('index allows explicit inactive status filter', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['current_status' => 'RETIRED']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.current_status', 'RETIRED')
            ->where('members.total', 1)
            ->where('members.data.0.current_status', 'RETIRED')
        );
});

test('index filters by sports quota category', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'SPORTS_QUOTA']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'GD']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['player_category' => 'SPORTS_QUOTA']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.player_category', 'SPORTS_QUOTA')
            ->where('members.total', 1)
            ->where('members.data.0.player_category', 'SPORTS_QUOTA')
        );
});

test('index normalizes legacy skilled category as sports quota', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $member->forceFill(['player_category' => 'SKILLED'])->saveQuietly();

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['player_category' => 'SPORTS_QUOTA']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.player_category', 'SPORTS_QUOTA')
        );
});

test('index includes posting district independently from current unit district', function () {
    $user = memberUser('members.view');
    $unitDistrict = District::factory()->create();
    $postingDistrict = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $user->organization_id,
        'district_id' => $unitDistrict->id,
    ]);

    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'posting_district_id' => $postingDistrict->id,
    ]);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data.0.current_unit.name_hi', $unit->name_hi)
            ->where('members.data.0.posting_district.name_hi', $postingDistrict->name_hi)
        );
});

test('index includes primary and playable sports', function () {
    $user = memberUser('members.view');
    $primarySport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $playableSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $primarySport->id,
    ]);
    $member->playableSports()->sync([$playableSport->id]);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data.0.sport.id', $primarySport->id)
            ->where('members.data.0.playable_sports.0.id', $playableSport->id)
        );
});

test('index q filter searches by full_name_hi', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'full_name_hi' => 'राम कुमार']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'full_name_hi' => 'श्याम लाल']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['q' => 'राम']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.full_name_hi', 'राम कुमार')
        );
});

test('index q filter searches by pno', function () {
    $user = memberUser('members.view');
    $target = Member::factory()->create(['organization_id' => $user->organization_id, 'pno' => '1234567890']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'pno' => '9999999999']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['q' => '1234567890']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.pno', '1234567890')
        );
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('user with members.create sees create form', function () {
    $user = memberUser('members.create');

    $this->actingAs($user)
        ->get(route('members.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/create')
            ->has('districts')
            ->has('units')
        );
});

test('user without members.create gets 403 on create', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->get(route('members.create'))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('user without members.create gets 403 on store', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name_hi' => 'राम',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
        ])
        ->assertForbidden();
});

test('store with invalid payload returns validation errors', function () {
    $user = memberUser('members.create');

    $this->actingAs($user)
        ->post(route('members.store'), [])
        ->assertSessionHasErrors(['full_name_hi', 'gender', 'player_category', 'player_level']);
});

test('store creates member and redirects to show', function () {
    $user = memberUser('members.create');
    $postingDistrict = District::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name_hi' => 'राम कुमार',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'posting_district_id' => $postingDistrict->id,
        ]);

    $member = Member::withoutGlobalScopes()->latest()->first();
    expect($member)->not->toBeNull()
        ->and($member->full_name_hi)->toBe('राम कुमार')
        ->and($member->posting_district_id)->toBe($postingDistrict->id)
        ->and($member->member_code)->toStartWith('UPP-');

    $response->assertRedirect(route('members.show', $member));
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('show returns member data', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->has('member')
        );
});

test('show returns 404 for member in other org', function () {
    $user = memberUser('members.view');
    $otherOrg = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test('edit returns member and selects', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.edit', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/edit')
            ->has('member')
            ->has('districts')
            ->has('units')
        );
});

test('edit returns 403 without members.update', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.edit', $member))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('update changes member and redirects to show', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $postingDistrict = District::factory()->create();

    $this->actingAs($user)
        ->put(route('members.update', $member), [
            'full_name_hi' => 'नया नाम',
            'posting_district_id' => $postingDistrict->id,
        ])
        ->assertRedirect(route('members.show', $member));

    $member->refresh();

    expect($member->full_name_hi)->toBe('नया नाम')
        ->and($member->posting_district_id)->toBe($postingDistrict->id);
});

test('update with invalid payload returns validation errors', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['gender' => 'X'])
        ->assertSessionHasErrors(['gender']);
});

test('update returns 403 without members.update', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['full_name_hi' => 'नया नाम'])
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('destroy soft-deletes member and redirects to index', function () {
    $user = memberUser('members.delete');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('members.destroy', $member))
        ->assertRedirect(route('members.index'));

    $this->assertSoftDeleted($member);
});

test('destroy returns 403 without permission', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('members.destroy', $member))
        ->assertForbidden();
});
