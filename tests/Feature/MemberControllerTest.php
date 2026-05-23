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

    $response = $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name_hi' => 'राम कुमार',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
        ]);

    $member = Member::withoutGlobalScopes()->latest()->first();
    expect($member)->not->toBeNull()
        ->and($member->full_name_hi)->toBe('राम कुमार')
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

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('update changes member and redirects to show', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['full_name_hi' => 'नया नाम'])
        ->assertRedirect(route('members.show', $member));

    expect($member->fresh()->full_name_hi)->toBe('नया नाम');
});

test('update with invalid payload returns validation errors', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['gender' => 'X'])
        ->assertSessionHasErrors(['gender']);
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
