<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Services\Reports\TeamRosterReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rosterOrg(): Organization
{
    return Organization::factory()->create();
}

function rosterNoFilters(): array
{
    return ['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null];
}

/**
 * Create a team in the given org, optionally sharing an existing session/sport/unit.
 */
function rosterTeam(
    Organization $org,
    ?SportSession $session = null,
    ?Sport $sport = null,
    ?Unit $unit = null,
): Team {
    $session = $session ?? SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = $sport ?? Sport::factory()->create(['organization_id' => $org->id]);
    $unit = $unit ?? Unit::factory()->create(['organization_id' => $org->id]);

    return Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'unit_id' => $unit->id,
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns empty collection when no teams exist', function (): void {
    $org = rosterOrg();
    $report = app(TeamRosterReport::class);

    expect($report->run($org->id, rosterNoFilters()))->toBeEmpty();
});

test('returns team with nested member list', function (): void {
    $org = rosterOrg();
    $team = rosterTeam($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'role' => 'PLAYER',
    ]);

    $report = app(TeamRosterReport::class);
    $rows = $report->run($org->id, rosterNoFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['team']['id'])->toBe($team->id);
    expect($rows[0]['members'])->toHaveCount(1);
    expect($rows[0]['members'][0]['member']['id'])->toBe($member->id);
    expect($rows[0]['members'][0]['role'])->toBe('PLAYER');
});

test('team with no members returns empty members array', function (): void {
    $org = rosterOrg();
    rosterTeam($org);

    $report = app(TeamRosterReport::class);
    $rows = $report->run($org->id, rosterNoFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['members'])->toBeEmpty();
});

test('captain appears before players in members list', function (): void {
    $org = rosterOrg();
    $team = rosterTeam($org);
    $player = Member::factory()->create(['organization_id' => $org->id]);
    $captain = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create(['team_id' => $team->id, 'member_id' => $player->id,  'role' => 'PLAYER']);
    TeamMember::factory()->create(['team_id' => $team->id, 'member_id' => $captain->id, 'role' => 'CAPTAIN']);

    $report = app(TeamRosterReport::class);
    $members = $report->run($org->id, rosterNoFilters())[0]['members'];

    expect($members[0]['role'])->toBe('CAPTAIN');
    expect($members[1]['role'])->toBe('PLAYER');
});

test('session_id filter scopes to correct session', function (): void {
    $org = rosterOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $teamInSession = rosterTeam($org, session: $session);
    $teamOutSession = rosterTeam($org); // different session

    $report = app(TeamRosterReport::class);
    $rows = $report->run($org->id, ['session_id' => $session->id, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);

    $ids = collect($rows)->pluck('team.id')->all();
    expect($ids)->toContain($teamInSession->id);
    expect($ids)->not->toContain($teamOutSession->id);
});

test('sport_id filter scopes to correct sport', function (): void {
    $org = rosterOrg();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $teamIn = rosterTeam($org, sport: $sport);
    $teamOut = rosterTeam($org); // different sport

    $report = app(TeamRosterReport::class);
    $rows = $report->run($org->id, ['session_id' => null, 'sport_id' => $sport->id, 'unit_id' => null, 'tier_id' => null]);

    $ids = collect($rows)->pluck('team.id')->all();
    expect($ids)->toContain($teamIn->id);
    expect($ids)->not->toContain($teamOut->id);
});

test('unit_id filter scopes to correct unit', function (): void {
    $org = rosterOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $teamIn = rosterTeam($org, unit: $unit);
    $teamOut = rosterTeam($org); // different unit

    $report = app(TeamRosterReport::class);
    $rows = $report->run($org->id, ['session_id' => null, 'sport_id' => null, 'unit_id' => $unit->id, 'tier_id' => null]);

    $ids = collect($rows)->pluck('team.id')->all();
    expect($ids)->toContain($teamIn->id);
    expect($ids)->not->toContain($teamOut->id);
});

test('excludes teams from other organisations', function (): void {
    $org = rosterOrg();
    $otherOrg = rosterOrg();
    rosterTeam($otherOrg);

    $report = app(TeamRosterReport::class);

    expect($report->run($org->id, rosterNoFilters()))->toBeEmpty();
});
