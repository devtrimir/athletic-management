<?php

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function dashboardUser(Organization $org): User
{
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );

    DB::table('role_permission')->insert([
        'role_id' => $role->id,
        'permission_id' => $perm->id,
    ]);

    return $user;
}

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard shows active member data only', function () {
    $org = Organization::factory()->create();
    $user = dashboardUser($org);
    Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RETIRED',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.members.active', 1)
            ->where('stats.members.by_status.ACTIVE', 1)
            ->missing('stats.members.by_status.RETIRED')
        );
});
