<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function sportFilterUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

function sportMemberUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach ($permissions as $code) {
        $perm = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    return $user;
}

test('filter by sport_id uses playable sports instead of legacy direct sport column', function () {
    $user = sportFilterUser();
    $org = $user->organization;

    $sportA = Sport::factory()->create(['organization_id' => $org->id]);
    $sportB = Sport::factory()->create(['organization_id' => $org->id]);

    $inSport = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportB->id]);
    $inSport->playableSports()->sync([$sportA->id]);

    $legacyDirectSportOnly = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportA->id]);
    $legacyDirectSportOnly->playableSports()->sync([$sportB->id]);

    Member::factory()->create(['organization_id' => $org->id, 'sport_id' => null]);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['sport_id' => $sportA->id]]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.id', $inSport->id)
        );
});

test('filter by sport_ids supports multiple playable sports', function () {
    $user = sportFilterUser();
    $org = $user->organization;

    $sportA = Sport::factory()->create(['organization_id' => $org->id]);
    $sportB = Sport::factory()->create(['organization_id' => $org->id]);
    $sportC = Sport::factory()->create(['organization_id' => $org->id]);

    $firstMatch = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportC->id]);
    $firstMatch->playableSports()->sync([$sportA->id]);

    $secondMatch = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => null]);
    $secondMatch->playableSports()->sync([$sportB->id]);

    $legacyDirectSportOnly = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportA->id]);
    $legacyDirectSportOnly->playableSports()->sync([$sportC->id]);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['sport_ids' => [$sportA->id, $sportB->id]]]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 2)
            ->where('filters.sport_ids', [(string) $sportA->id, (string) $sportB->id])
            ->where('members.data', fn ($members) => collect($members)
                ->pluck('id')
                ->sort()
                ->values()
                ->all() === collect([$firstMatch->id, $secondMatch->id])->sort()->values()->all())
        );
});

test('member can be created without sport entries', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach (['members.view', 'members.create'] as $code) {
        $perm = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
        );
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'परीक्षण सदस्य',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
        ])
        ->assertRedirect();

    expect(Member::where('organization_id', $org->id)->first()->playableSports()->count())->toBe(0);
});

test('playable sports entries must exist in sports table', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach (['members.view', 'members.create'] as $code) {
        $perm = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
        );
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'परीक्षण',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'playable_sports' => [[
                'sport_id' => 99999,
                'role' => '',
                'position' => '',
                'sport_event' => '',
                'notes' => '',
            ]],
        ])
        ->assertSessionHasErrors('playable_sports.0.sport_id');
});

test('store saves playable sports with metadata', function () {
    $user = sportMemberUser('members.view', 'members.create');
    $sportA = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $additionalSport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'परीक्षण सदस्य',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'playable_sports' => [
                ['sport_id' => $sportA->id, 'role' => 'Batsman', 'position' => '3', 'sport_event' => 'Cricket', 'notes' => 'Top order'],
                ['sport_id' => $additionalSport->id, 'role' => 'Wing', 'position' => 'Left', 'sport_event' => 'Football', 'notes' => 'Fast runner'],
            ],
        ])
        ->assertRedirect();

    $member = Member::where('organization_id', $user->organization_id)->firstOrFail();

    expect($member->playableSports()->pluck('sports.id')->sort()->values()->all())->toBe(collect([$sportA->id, $additionalSport->id])->sort()->values()->all());
});

test('update replaces playable sports', function () {
    $user = sportMemberUser('members.update');
    $oldSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $newSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $member->playableSports()->sync([$oldSport->id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), [
            'playable_sports' => [
                ['sport_id' => $newSport->id, 'role' => 'Keeper', 'position' => '1', 'sport_event' => 'Hockey', 'notes' => ''],
            ],
        ])
        ->assertRedirect(route('members.show', $member));

    expect($member->fresh()->playableSports()->pluck('sports.id')->all())->toBe([$newSport->id]);
});
