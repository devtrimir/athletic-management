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
// Helper
// ---------------------------------------------------------------------------

function aliasUser(string ...$permissions): User
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
// store
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected on store', function () {
    $member = Member::factory()->create();

    $this->post(route('members.aliases.store', $member), [
        'alias_hi' => 'राम',
        'source' => 'manual',
    ])->assertRedirect(route('login'));
});

test('user without members.manageAlias gets 403 on store', function () {
    $user = aliasUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.aliases.store', $member), [
            'alias_hi' => 'राम',
            'source' => 'manual',
        ])
        ->assertForbidden();
});

test('valid store creates alias and redirects to show', function () {
    $user = aliasUser('members.manageAlias');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.aliases.store', $member), [
            'alias_hi' => 'राम कुमार',
            'source' => 'manual',
        ])
        ->assertRedirect(route('members.show', $member));

    $alias = NameAlias::where('member_id', $member->id)->latest()->first();
    expect($alias)->not->toBeNull()
        ->and($alias->alias_hi)->toBe('राम कुमार')
        ->and($alias->source)->toBe('manual');
});

test('invalid store payload returns validation errors', function () {
    $user = aliasUser('members.manageAlias');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.aliases.store', $member), [])
        ->assertSessionHasErrors(['alias_hi', 'source']);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('destroy deletes alias and redirects to show', function () {
    $user = aliasUser('members.manageAlias');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $alias = NameAlias::factory()->create(['member_id' => $member->id]);

    $this->actingAs($user)
        ->delete(route('members.aliases.destroy', [$member, $alias]))
        ->assertRedirect(route('members.show', $member));

    $this->assertModelMissing($alias);
});

test('destroy alias belonging to different member returns 404', function () {
    $user = aliasUser('members.manageAlias');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $other = Member::factory()->create(['organization_id' => $user->organization_id]);
    $alias = NameAlias::factory()->create(['member_id' => $other->id]);

    $this->actingAs($user)
        ->delete(route('members.aliases.destroy', [$member, $alias]))
        ->assertNotFound();
});

test('member from other org returns 404 on store', function () {
    $user = aliasUser('members.manageAlias');
    $otherOrg = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->post(route('members.aliases.store', $member), [
            'alias_hi' => 'राम',
            'source' => 'manual',
        ])
        ->assertNotFound();
});
