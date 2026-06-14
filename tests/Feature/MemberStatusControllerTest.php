<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberStatusHistory;
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

function statusUser(string ...$permissions): User
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
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected', function () {
    $member = Member::factory()->create();

    $this->post(route('members.status.store', $member), [
        'status' => 'RETIRED',
        'effective_on' => '2026-05-23',
    ])->assertRedirect(route('login'));
});

test('user without members.changeStatus gets 403', function () {
    $user = statusUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'RETIRED',
            'effective_on' => '2026-05-23',
        ])
        ->assertForbidden();
});

test('valid status change writes history and updates member', function () {
    $user = statusUser('members.changeStatus');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'ACTIVE',
    ]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'RETIRED',
            'effective_on' => '2026-05-23',
            'reason' => 'सेवानिवृत्त',
        ])
        ->assertRedirect(route('members.show', $member));

    $history = MemberStatusHistory::where('member_id', $member->id)->latest()->first();
    expect($history)->not->toBeNull()
        ->and($history->status)->toBe('RETIRED')
        ->and($history->recorded_by)->toBe($user->id)
        ->and($history->reason)->toBe('सेवानिवृत्त');

    expect($member->fresh()->current_status)->toBe('RETIRED');
});

test('invalid payload returns validation errors', function () {
    $user = statusUser('members.changeStatus');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [])
        ->assertSessionHasErrors(['status', 'effective_on']);
});

test('member from other org returns 404', function () {
    $user = statusUser('members.changeStatus');
    $otherOrg = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'RETIRED',
            'effective_on' => '2026-05-23',
        ])
        ->assertNotFound();
});
