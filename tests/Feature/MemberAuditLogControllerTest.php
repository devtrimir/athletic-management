<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function malUser(): User
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

test('member audit log endpoint returns paged data and meta', function (): void {
    $user = malUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    AuditLog::create([
        'user_id' => $user->id,
        'organization_id' => $user->organization_id,
        'entity' => 'Member',
        'entity_id' => $member->id,
        'action' => 'updated',
        'diff' => ['rank' => ['old' => 'A', 'new' => 'B']],
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.audit-log.index', $member))
        ->assertOk();

    expect($response->json('data'))->not->toBeEmpty();
    expect($response->json('meta.page'))->toBe(1);
    expect($response->json('meta.has_more'))->toBeFalse();
});
