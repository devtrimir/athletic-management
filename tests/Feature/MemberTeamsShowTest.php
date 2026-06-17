<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// T14 — MemberController::show() deferred memberTeams prop
// ---------------------------------------------------------------------------

test('memberTeams is absent from the initial Inertia show response', function (): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->missing('memberTeams')
        );
});

test('deferred memberTeams returns empty array when member has no team memberships', function (): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    expect($response->json('props.memberTeams'))->toBeArray()->toBeEmpty();
});

test('deferred memberTeams returns a row for a single-session membership', function (): void {
    $user = rcUser('members.view');
    $org = Organization::find($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2024-2025', 'start_year' => 2024, 'end_year' => 2025]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => Unit::factory()->create(['organization_id' => $org->id])->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'role' => 'CAPTAIN',
    ]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $rows = $response->json('props.memberTeams');
    expect($rows)->toHaveCount(1);
    expect($rows[0]['role'])->toBe('CAPTAIN');
    expect($rows[0]['team']['id'])->toBe($team->id);
    expect($rows[0]['sport']['id'])->toBe($sport->id);
    expect($rows[0]['session']['id'])->toBe($session->id);
});

test('cross-session memberships all appear in deferred memberTeams', function (): void {
    $user = rcUser('members.view');
    $org = Organization::find($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $unitId = Unit::factory()->create(['organization_id' => $org->id])->id;

    $sessionA = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2023-2024', 'start_year' => 2023, 'end_year' => 2024]);
    $sessionB = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2024-2025', 'start_year' => 2024, 'end_year' => 2025]);

    $teamA = Team::factory()->create(['organization_id' => $org->id, 'sport_id' => $sport->id, 'session_id' => $sessionA->id, 'unit_id' => $unitId]);
    $teamB = Team::factory()->create(['organization_id' => $org->id, 'sport_id' => $sport->id, 'session_id' => $sessionB->id, 'unit_id' => $unitId]);

    TeamMember::factory()->create(['team_id' => $teamA->id, 'member_id' => $member->id, 'session_id' => $sessionA->id]);
    TeamMember::factory()->create(['team_id' => $teamB->id, 'member_id' => $member->id, 'session_id' => $sessionB->id]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $rows = $response->json('props.memberTeams');
    expect($rows)->toHaveCount(2);

    $rowSessionIds = array_column(array_column($rows, 'session'), 'id');
    expect($rowSessionIds)->toContain($sessionA->id);
    expect($rowSessionIds)->toContain($sessionB->id);
});

test('removed team memberships remain visible in deferred memberTeams', function (): void {
    $user = rcUser('members.view');
    $org = Organization::find($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2024-2025', 'start_year' => 2024, 'end_year' => 2025]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => Unit::factory()->create(['organization_id' => $org->id])->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'joined_on' => '2024-07-01',
        'left_on' => '2025-02-15',
    ]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $rows = $response->json('props.memberTeams');
    expect($rows)->toHaveCount(1);
    expect($rows[0]['team']['id'])->toBe($team->id);
    expect($rows[0]['session']['id'])->toBe($session->id);
    expect($rows[0]['left_on'])->toBe('2025-02-15');
});

test('cross-session rows are ordered by id descending', function (): void {
    $user = rcUser('members.view');
    $org = Organization::find($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $unitId = Unit::factory()->create(['organization_id' => $org->id])->id;
    $sessionA = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2023-2024', 'start_year' => 2023, 'end_year' => 2024]);
    $sessionB = SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2024-2025', 'start_year' => 2024, 'end_year' => 2025]);

    $teamA = Team::factory()->create(['organization_id' => $org->id, 'sport_id' => $sport->id, 'session_id' => $sessionA->id, 'unit_id' => $unitId]);
    $teamB = Team::factory()->create(['organization_id' => $org->id, 'sport_id' => $sport->id, 'session_id' => $sessionB->id, 'unit_id' => $unitId]);

    TeamMember::factory()->create(['team_id' => $teamA->id, 'member_id' => $member->id, 'session_id' => $sessionA->id]);
    TeamMember::factory()->create(['team_id' => $teamB->id, 'member_id' => $member->id, 'session_id' => $sessionB->id]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $rows = $response->json('props.memberTeams');
    expect($rows[0]['id'])->toBeGreaterThan($rows[1]['id']);
});

test('memberTeams only contains memberships for the requested member', function (): void {
    $user = rcUser('members.view');
    $org = Organization::find($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $other = Member::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => Sport::factory()->create(['organization_id' => $org->id])->id,
        'session_id' => $session->id,
        'unit_id' => Unit::factory()->create(['organization_id' => $org->id])->id,
    ]);

    TeamMember::factory()->create(['team_id' => $team->id, 'member_id' => $other->id, 'session_id' => $session->id]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/show',
            'X-Inertia-Partial-Data' => 'memberTeams',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    expect($response->json('props.memberTeams'))->toBeEmpty();
});
