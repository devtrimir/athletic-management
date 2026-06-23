<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
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

function sessionClosureUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($permissions === []) {
        return $user;
    }

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    foreach ($permissions as $code) {
        $permission = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );

        DB::table('role_permission')->insert([
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ]);
    }

    return $user;
}

function sessionClosureTeam(Organization $org): Team
{
    return Team::factory()->forOrganization($org)->create();
}

test('unauthenticated users cannot close a team session', function (): void {
    $org = Organization::factory()->create();
    $team = sessionClosureTeam($org);

    $this->patch(route('teams.session-status.close', $team), [
        'session_id' => $team->session_id,
        'closed_on' => '2026-06-23',
        'reason' => 'Session ended',
        'remove_coaches' => false,
    ])->assertRedirect(route('login'));
});

test('user without teams update permission cannot close a team session', function (): void {
    $user = sessionClosureUser('teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $team = sessionClosureTeam($org);

    $this->actingAs($user)
        ->patch(route('teams.session-status.close', $team), [
            'session_id' => $team->session_id,
            'closed_on' => '2026-06-23',
            'reason' => 'Session ended',
            'remove_coaches' => false,
        ])
        ->assertForbidden();
});

test('closing a team session ends active members and marks them inactive', function (): void {
    $user = sessionClosureUser('teams.update');
    $org = Organization::findOrFail($user->organization_id);
    $team = sessionClosureTeam($org);

    $activeMember = Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'ACTIVE']);
    $alreadyRemovedMember = Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'ACTIVE']);

    $activeRow = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $activeMember->id,
        'session_id' => $team->session_id,
        'role' => 'CAPTAIN',
        'left_on' => null,
    ]);
    $removedRow = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $alreadyRemovedMember->id,
        'session_id' => $team->session_id,
        'left_on' => '2026-05-01',
    ]);

    $this->actingAs($user)
        ->patch(route('teams.session-status.close', $team), [
            'session_id' => $team->session_id,
            'closed_on' => '2026-06-23',
            'reason' => 'Session ended',
            'remove_coaches' => false,
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_session_statuses', [
        'team_id' => $team->id,
        'session_id' => $team->session_id,
        'status' => 'inactive',
        'closed_reason' => 'Session ended',
    ]);
    expect($activeRow->fresh()->left_on?->toDateString())->toBe('2026-06-23');
    expect($removedRow->fresh()->left_on?->toDateString())->toBe('2026-05-01');
    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $activeMember->id,
        'session_id' => $team->session_id,
        'team_member_id' => $activeRow->id,
        'action' => 'REMOVED',
        'source' => 'session_closure',
        'reason' => 'Session ended',
    ]);
    $statusHistory = MemberStatusHistory::where('member_id', $activeMember->id)->firstOrFail();
    expect($statusHistory->status)->toBe('INACTIVE')
        ->and($statusHistory->effective_on->toDateString())->toBe('2026-06-23')
        ->and($statusHistory->reason)->toBe('Session ended')
        ->and($statusHistory->recorded_by)->toBe($user->id);
    $this->assertDatabaseHas('members', [
        'id' => $activeMember->id,
        'current_status' => 'INACTIVE',
    ]);
    $this->assertDatabaseHas('members', [
        'id' => $alreadyRemovedMember->id,
        'current_status' => 'ACTIVE',
    ]);
    $this->assertDatabaseHas('teams', [
        'id' => $team->id,
        'is_active' => true,
    ]);
});

test('closing can optionally remove current coaches for the selected session', function (): void {
    $user = sessionClosureUser('teams.update');
    $org = Organization::findOrFail($user->organization_id);
    $team = sessionClosureTeam($org);
    $otherSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    $currentCoach = CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $team->session_id,
        'is_current' => true,
    ]);
    $otherSessionCoach = CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $otherSession->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.session-status.close', $team), [
            'session_id' => $team->session_id,
            'closed_on' => '2026-06-23',
            'reason' => 'Coaches also closed',
            'remove_coaches' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coach_assignments', [
        'id' => $currentCoach->id,
        'is_current' => false,
        'notes' => 'Coaches also closed',
    ]);
    expect($currentCoach->fresh()->removed_at?->toDateString())->toBe('2026-06-23');

    $this->assertDatabaseHas('coach_assignments', [
        'id' => $otherSessionCoach->id,
        'is_current' => true,
    ]);
});

test('closing leaves coaches current when remove coaches is false', function (): void {
    $user = sessionClosureUser('teams.update');
    $org = Organization::findOrFail($user->organization_id);
    $team = sessionClosureTeam($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    $assignment = CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $team->session_id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.session-status.close', $team), [
            'session_id' => $team->session_id,
            'closed_on' => '2026-06-23',
            'reason' => 'Players closed only',
            'remove_coaches' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coach_assignments', [
        'id' => $assignment->id,
        'is_current' => true,
        'removed_at' => null,
    ]);
});

test('closure validates session date reason and remove coaches flag', function (): void {
    $user = sessionClosureUser('teams.update');
    $org = Organization::findOrFail($user->organization_id);
    $team = sessionClosureTeam($org);
    $otherOrg = Organization::factory()->create();
    $otherSession = SportSession::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->patch(route('teams.session-status.close', $team), [
            'session_id' => $otherSession->id,
            'closed_on' => 'not-a-date',
            'reason' => '',
            'remove_coaches' => 'sometimes',
        ])
        ->assertSessionHasErrors(['session_id', 'closed_on', 'reason', 'remove_coaches']);
});
