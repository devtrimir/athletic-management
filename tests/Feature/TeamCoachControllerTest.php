<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Organization;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function coachForTeam(Team $team): Coach
{
    $coach = Coach::factory()->create(['organization_id' => $team->organization_id]);
    DB::table('coach_sport')->insert([
        'coach_id' => $coach->id,
        'sport_id' => $team->sport_id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $coach;
}

// ---------------------------------------------------------------------------
// auth / authz
// ---------------------------------------------------------------------------

test('unauthenticated POST to teams.coaches.store redirects to login', function (): void {
    $org = Organization::factory()->create();
    $team = teamWithOrg($org);

    $this->post(route('teams.coaches.store', $team), [])
        ->assertRedirect(route('login'));
});

test('user without teams.update gets 403 on add coach', function (): void {
    $user = teamUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
            'session_id' => $team->session_id,
        ])
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// happy path
// ---------------------------------------------------------------------------

test('add coach inserts assignment and redirects to teams.show', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
            'session_id' => $team->session_id,
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);
});

test('add coach derives session from team when session is not submitted', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
        'is_current' => true,
    ]);
});

test('add coach rejects coaches without the team sport specialization', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
        ])
        ->assertSessionHasErrors(['coach_id']);

    $this->assertDatabaseMissing('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
    ]);
});

// ---------------------------------------------------------------------------
// T13 — duplicate-add (same coach + same role) returns session error
// ---------------------------------------------------------------------------

test('adding a coach with the same role twice returns a session error', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
            'session_id' => $team->session_id,
        ])
        ->assertSessionHasErrors(['coach_id']);
});

test('duplicate-add does not create a second coach_assignments row', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'HEAD',
            'session_id' => $team->session_id,
        ]);

    $this->assertDatabaseCount('coach_assignments', 1);
});

test('same coach can switch role in the same session and keeps previous row as historical', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    $existing = CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'ASSISTANT',
            'session_id' => $team->session_id,
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseCount('coach_assignments', 2);
    $this->assertDatabaseHas('coach_assignments', [
        'id' => $existing->id,
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
        'is_current' => false,
    ]);
    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'ASSISTANT',
        'session_id' => $team->session_id,
        'is_current' => true,
    ]);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('remove coach marks current assignment historical and redirects to teams.show', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = coachForTeam($team);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.coaches.destroy', [$team, $coach]))
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'is_current' => false,
    ]);
});

// ---------------------------------------------------------------------------
// cross-session uniqueness (new business rule)
// ---------------------------------------------------------------------------

test('adding a coach assigned to another team for same session migrates assignment to new team', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $coach = coachForTeam($team);

    $existing = CoachAssignment::factory()->create([
        'team_id' => $otherTeam->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'ASSISTANT',
            'session_id' => $team->session_id,
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('coach_assignments', [
        'id' => $existing->id,
        'team_id' => $otherTeam->id,
        'coach_id' => $coach->id,
        'is_current' => false,
    ]);
});

test('adding a coach to another team for the same session does not keep previous row active', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $coach = coachForTeam($team);

    CoachAssignment::factory()->create([
        'team_id' => $otherTeam->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'ASSISTANT',
            'session_id' => $team->session_id,
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseCount('coach_assignments', 2);
    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $otherTeam->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
        'is_current' => false,
    ]);
    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'ASSISTANT',
        'session_id' => $team->session_id,
        'is_current' => true,
    ]);
});
