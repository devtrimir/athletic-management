<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

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
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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

// ---------------------------------------------------------------------------
// T13 — duplicate-add (same coach + same role) returns session error
// ---------------------------------------------------------------------------

test('adding a coach with the same role twice returns a session error', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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

test('same coach with a different role in the same session is now blocked by the cross-session rule', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    // Same coach, different role but same session — blocked by (coach_id, session_id) unique rule.
    $this->actingAs($user)
        ->post(route('teams.coaches.store', $team), [
            'coach_id' => $coach->id,
            'role' => 'ASSISTANT',
            'session_id' => $team->session_id,
        ])
        ->assertSessionHasErrors(['coach_id']);

    $this->assertDatabaseCount('coach_assignments', 1);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('remove coach deletes assignment and redirects to teams.show', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'role' => 'HEAD',
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.coaches.destroy', [$team, $coach]))
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseMissing('coach_assignments', [
        'team_id' => $team->id,
        'coach_id' => $coach->id,
    ]);
});

// ---------------------------------------------------------------------------
// cross-session uniqueness (new business rule)
// ---------------------------------------------------------------------------

test('adding a coach already assigned to another team for the same session returns error', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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
        ->assertSessionHasErrors(['coach_id']);
});

test('cross-team coach conflict does not insert a row', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

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
        ]);

    $this->assertDatabaseCount('coach_assignments', 1);
    $this->assertDatabaseMissing('coach_assignments', ['team_id' => $team->id]);
});
