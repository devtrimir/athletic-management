<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Incharge;
use App\Models\Member;
use App\Models\Organization;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;

test('team overview route returns a focused profile shell without heavy tab props', function (): void {
    $user = rcUser('teams.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $organization->id,
        'is_current' => true,
    ]);
    $team = Team::factory()->forOrganization($organization)->create([
        'session_id' => $session->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'session_id' => $session->id,
        'member_id' => Member::factory()->create(['organization_id' => $organization->id])->id,
    ]);

    $this->actingAs($user)
        ->get(route('teams.show', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/show')
            ->where('activeTab', 'overview')
            ->where('team.id', $team->id)
            ->where('selectedSessionId', $session->id)
            ->has('counts')
            ->missing('members')
            ->missing('removedMembers')
            ->missing('memberMovements')
            ->missing('coaches')
            ->missing('inchargeHistory')
            ->missing('auditLog')
        );
});

test('team players tab returns player roster payload only', function (): void {
    $user = rcUser('teams.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $organization->id,
        'is_current' => true,
    ]);
    $team = Team::factory()->forOrganization($organization)->create([
        'session_id' => $session->id,
    ]);
    $member = Member::factory()->create(['organization_id' => $organization->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'session_id' => $session->id,
        'member_id' => $member->id,
    ]);
    TeamMemberMovement::create([
        'team_id' => $team->id,
        'session_id' => $session->id,
        'member_id' => $member->id,
        'action' => 'ADDED',
        'role' => 'PLAYER',
        'effective_on' => now()->toDateString(),
        'source' => 'manual',
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get(route('teams.players', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/show')
            ->where('activeTab', 'players')
            ->has('members', 1)
            ->has('removedMembers')
            ->has('memberMovements', 1)
            ->missing('coaches')
            ->missing('inchargeHistory')
            ->missing('auditLog')
        );
});

test('team coaches tab returns coach assignment payload only', function (): void {
    $user = rcUser('teams.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $organization->id,
        'is_current' => true,
    ]);
    $team = Team::factory()->forOrganization($organization)->create([
        'session_id' => $session->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $session->id,
        'assigned_at' => '2024-06-15',
    ]);
    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => Coach::factory()->create(['organization_id' => $organization->id])->id,
        'session_id' => $session->id,
        'is_current' => false,
        'removed_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('teams.coaches', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/show')
            ->where('activeTab', 'coaches')
            ->has('coaches', 1)
            ->where('coaches.0.assigned_at', '2024-06-15')
            ->where('counts.coaches_count', 1)
            ->missing('members')
            ->missing('memberMovements')
            ->missing('inchargeHistory')
            ->missing('auditLog')
        );
});

test('team prabhari tab returns incharge history and selection payload only', function (): void {
    $user = rcUser('teams.view');
    $organization = Organization::findOrFail($user->organization_id);
    $team = Team::factory()->forOrganization($organization)->create();
    $incharge = Incharge::factory()->create(['organization_id' => $organization->id]);

    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => $incharge->id,
        'full_name' => $incharge->full_name,
        'pno' => $incharge->pno,
    ]);

    $this->actingAs($user)
        ->get(route('teams.incharge', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/show')
            ->where('activeTab', 'incharge')
            ->has('inchargeHistory', 1)
            ->has('incharges', 1)
            ->missing('members')
            ->missing('coaches')
            ->missing('auditLog')
        );
});

test('team changelog tab returns audit payload only', function (): void {
    $user = rcUser('teams.view');
    $organization = Organization::findOrFail($user->organization_id);
    $team = Team::factory()->forOrganization($organization)->create();

    $this->actingAs($user)
        ->get(route('teams.changelog', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/show')
            ->where('activeTab', 'changelog')
            ->has('auditLog')
            ->missing('members')
            ->missing('coaches')
            ->missing('inchargeHistory')
        );
});

test('team profile tab routes require team view permission', function (): void {
    $user = rcUser();
    $team = Team::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('teams.players', $team))
        ->assertForbidden();
});

test('team profile tab routes do not expose another organization team', function (): void {
    $user = rcUser('teams.view');
    $otherOrganization = Organization::factory()->create();
    $team = Team::factory()->create(['organization_id' => $otherOrganization->id]);

    $this->actingAs($user)
        ->get(route('teams.players', $team))
        ->assertNotFound();
});
