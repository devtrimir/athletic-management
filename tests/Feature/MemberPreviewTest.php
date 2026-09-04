<?php

declare(strict_types=1);

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

function memberPreviewUser(): User
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

test('unauthenticated user cannot access member preview', function () {
    $member = Member::factory()->create();

    $this->getJson(route('v1.members.preview', $member))
        ->assertUnauthorized();
});

test('user without permission cannot access member preview', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->getJson(route('v1.members.preview', $member))
        ->assertForbidden();
});

test('authorized user can view member preview', function () {
    $user = memberPreviewUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('v1.members.preview', $member))
        ->assertOk()
        ->assertJsonStructure(['id', 'full_name', 'pno', 'initial_rank', 'playable_sports']);
});

test('member preview includes posting unit fallback and sport details', function () {
    $user = memberPreviewUser();
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'posting_district_id' => null,
        'home_address' => 'Test address',
    ]);
    $member->playableSports()->sync([
        $sport->id => [
            'role' => 'Batsman',
            'position' => '3',
            'weight' => '55 kg',
            'notes' => 'Top order',
        ],
    ]);

    $this->actingAs($user)
        ->getJson(route('v1.members.preview', $member))
        ->assertOk()
        ->assertJsonPath('current_unit.name', $unit->name)
        ->assertJsonPath('posting_district', null)
        ->assertJsonPath('home_address', 'Test address')
        ->assertJsonPath('playable_sports.0.id', $sport->id)
        ->assertJsonPath('playable_sports.0.role', 'Batsman')
        ->assertJsonPath('playable_sports.0.position', '3')
        ->assertJsonPath('playable_sports.0.weight', '55 kg')
        ->assertJsonPath('playable_sports.0.notes', 'Top order');
});

test('user cannot preview member from another organization', function () {
    $user = memberPreviewUser();
    $other = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->getJson(route('v1.members.preview', $member))
        ->assertNotFound();
});
