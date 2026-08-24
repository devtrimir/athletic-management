<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
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
            'reason' => 'Retired from service',
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
        ->assertRedirect(route('members.status', $member));

    $history = MemberStatusHistory::where('member_id', $member->id)->latest()->first();
    expect($history)->not->toBeNull()
        ->and($history->status)->toBe('RETIRED')
        ->and($history->recorded_by)->toBe($user->id)
        ->and($history->reason)->toBe('सेवानिवृत्त');

    expect($member->fresh()->current_status)->toBe('RETIRED');
});

test('doping disqualification status can be recorded', function () {
    $user = statusUser('members.changeStatus');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'ACTIVE',
    ]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'DOPING_DISQUALIFIED',
            'effective_on' => '2026-06-30',
            'reason' => 'Positive doping test',
        ])
        ->assertRedirect(route('members.status', $member));

    $history = MemberStatusHistory::where('member_id', $member->id)->latest()->first();
    expect($history)->not->toBeNull()
        ->and($history->status)->toBe('DOPING_DISQUALIFIED')
        ->and($history->reason)->toBe('Positive doping test');

    expect($member->fresh()->current_status)->toBe('DOPING_DISQUALIFIED');
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

test('inactive status removes active team memberships with reason', function () {
    $user = statusUser('members.changeStatus');
    $organization = Organization::findOrFail($user->organization_id);
    $member = Member::factory()->create([
        'organization_id' => $organization->id,
        'current_status' => 'ACTIVE',
    ]);
    $team = Team::factory()->forOrganization($organization)->create();

    $teamMember = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
        'left_on' => null,
    ]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'INACTIVE',
            'effective_on' => '2026-06-30',
            'reason' => 'Not in current team',
        ])
        ->assertRedirect(route('members.status', $member));

    expect($teamMember->fresh()->left_on?->toDateString())->toBe('2026-06-30');
    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'team_member_id' => $teamMember->id,
        'action' => 'REMOVED',
        'reason' => 'Not in current team',
        'source' => 'member_status_change',
    ]);
    expect($member->fresh()->current_status)->toBe('INACTIVE');
});

test('retired status removes all active team memberships before updating status', function () {
    $user = statusUser('members.changeStatus');
    $organization = Organization::findOrFail($user->organization_id);
    $member = Member::factory()->create([
        'organization_id' => $organization->id,
        'current_status' => 'ACTIVE',
    ]);
    $firstTeam = Team::factory()->forOrganization($organization)->create();
    $secondSession = SportSession::factory()->create(['organization_id' => $organization->id]);
    $secondTeam = Team::factory()->forOrganization($organization)->create(['session_id' => $secondSession->id]);

    $firstRow = TeamMember::factory()->create([
        'team_id' => $firstTeam->id,
        'member_id' => $member->id,
        'session_id' => $firstTeam->session_id,
        'role' => 'PLAYER',
        'left_on' => null,
    ]);
    $secondRow = TeamMember::factory()->create([
        'team_id' => $secondTeam->id,
        'member_id' => $member->id,
        'session_id' => $secondTeam->session_id,
        'role' => 'CAPTAIN',
        'left_on' => null,
    ]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'RETIRED',
            'effective_on' => '2026-06-30',
            'reason' => 'Retired from service',
        ])
        ->assertRedirect(route('members.status', $member));

    expect($firstRow->fresh()->left_on?->toDateString())->toBe('2026-06-30')
        ->and($secondRow->fresh()->left_on?->toDateString())->toBe('2026-06-30')
        ->and($member->fresh()->current_status)->toBe('RETIRED');
});

test('toast reflects closed memberships count', function () {
    $user = statusUser('members.changeStatus');
    $organization = Organization::findOrFail($user->organization_id);
    $member = Member::factory()->create([
        'organization_id' => $organization->id,
        'current_status' => 'ACTIVE',
    ]);
    $team = Team::factory()->forOrganization($organization)->create();

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
        'left_on' => null,
    ]);

    $this->actingAs($user)
        ->post(route('members.status.store', $member), [
            'status' => 'INACTIVE',
            'effective_on' => '2026-06-30',
            'reason' => 'Not in current team',
        ])
        ->assertRedirect(route('members.status', $member))
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => __('Status updated and :count team membership(s) closed.', ['count' => 1]),
        ]);
});
