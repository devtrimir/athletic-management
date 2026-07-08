<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tallyOrg(): Organization
{
    return Organization::factory()->create();
}

function tallySetup(Organization $org, string $tierCode = 'NATIONAL', string $medalType = 'GOLD', ?int $unitId = null): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => $tierCode],
        ['label_hi' => $tierCode, 'label_en' => $tierCode, 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create([
        'organization_id' => $org->id,
        'current_unit_id' => $unitId,
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id, 'sport_id' => $sport->id]);
    $participation = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
    ]);
    $achievement = Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);

    return compact('tier', 'session', 'sport', 'tournament', 'member', 'achievement');
}

function tallyTeamSetup(Organization $org, string $tierCode = 'NATIONAL', string $medalType = 'GOLD'): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => $tierCode],
        ['label_hi' => $tierCode, 'label_en' => $tierCode, 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $members = Member::factory()->count(2)->create(['organization_id' => $org->id]);

    foreach ($members as $member) {
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $session->id,
        ]);
    }

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'team',
    ]);
    $participation = Participation::factory()->create([
        'member_id' => null,
        'team_id' => $team->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
        'lineup_member_ids' => $members->pluck('id')->all(),
    ]);
    $achievement = Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);

    return compact('tier', 'session', 'sport', 'tournament', 'event', 'team', 'members', 'achievement');
}

function noFilters(): array
{
    return ['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns empty collection when no achievements exist', function (): void {
    $org = tallyOrg();
    $report = app(MedalTallyReport::class);

    expect($report->run($org->id, noFilters()))->toBeEmpty();
});

test('returns correct tier row with GOLD count', function (): void {
    $org = tallyOrg();
    tallySetup($org, 'NATIONAL', 'GOLD');
    $report = app(MedalTallyReport::class);

    $rows = $report->run($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['GOLD'])->toBe(1);
    expect($rows[0]['SILVER'])->toBe(0);
    expect($rows[0]['BRONZE'])->toBe(0);
    expect($rows[0]['MERIT'])->toBe(0);
});

test('tier tally counts a team event medal once', function (): void {
    $org = tallyOrg();
    tallyTeamSetup($org, medalType: 'GOLD');
    $report = app(MedalTallyReport::class);

    $rows = $report->run($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['GOLD'])->toBe(1);
});

test('team tally groups team event medals by tier', function (): void {
    $org = tallyOrg();
    tallyTeamSetup($org, medalType: 'SILVER');
    $report = app(MedalTallyReport::class);

    $rows = $report->runTeams($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['SILVER'])->toBe(1);
    expect($rows[0])->not->toHaveKey('event');
    expect($rows[0])->not->toHaveKey('players');
});

test('team tally athlete search matches lineup pno', function (): void {
    $org = tallyOrg();
    $setup = tallyTeamSetup($org, medalType: 'GOLD');
    $setup['members']->first()->update([
        'pno' => 'PNO-9001',
        'full_name' => 'Lineup Player',
    ]);
    $report = app(MedalTallyReport::class);

    $rows = $report->runTeams($org->id, ['member_name' => '9001']);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['GOLD'])->toBe(1);
});

test('team tally counts duplicate lineup medals once per event medal type', function (): void {
    $org = tallyOrg();
    $setup = tallyTeamSetup($org, medalType: 'GOLD');
    $secondParticipation = Participation::factory()->create([
        'member_id' => null,
        'team_id' => $setup['team']->id,
        'event_id' => $setup['event']->id,
        'session_id' => $setup['session']->id,
        'lineup_member_ids' => [$setup['members']->last()->id],
    ]);
    Achievement::factory()->create([
        'participation_id' => $secondParticipation->id,
        'medal_type' => 'GOLD',
    ]);

    $report = app(MedalTallyReport::class);
    $rows = $report->runTeams($org->id, noFilters());
    $tierRows = $report->run($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['GOLD'])->toBe(1);
    expect($rows[0]['SILVER'])->toBe(0);
    expect($rows[0]['BRONZE'])->toBe(0);
    expect($rows[0]['MERIT'])->toBe(0);
    expect($tierRows[0]['GOLD'])->toBe(1);
});

test('tier tally applies unit filter to team event lineup members', function (): void {
    $org = tallyOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $setup = tallyTeamSetup($org, medalType: 'GOLD');
    $setup['members']->first()->update(['current_unit_id' => $unit->id]);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, ['unit_id' => $unit->id]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['GOLD'])->toBe(1);
});

test('team event tally applies unit filter before tier counting', function (): void {
    $org = tallyOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $setup = tallyTeamSetup($org, medalType: 'GOLD');
    $setup['members']->first()->update(['current_unit_id' => $unit->id]);

    $report = app(MedalTallyReport::class);
    $rows = $report->runTeams($org->id, ['unit_id' => $unit->id]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['GOLD'])->toBe(1);
    expect($rows[0])->not->toHaveKey('players');
});

test('session_id filter scopes to correct session', function (): void {
    $org = tallyOrg();
    $setup = tallySetup($org, 'NATIONAL', 'SILVER');

    // Achievement in a different session
    $otherSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $otherTier = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'STATE', 'label_en' => 'State', 'weight' => 60],
    );
    $otherTournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $otherSession->id,
        'tier_id' => $otherTier->id,
    ]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $event = Event::factory()->create(['tournament_id' => $otherTournament->id, 'sport_id' => $sport->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $part = Participation::factory()->create(['member_id' => $member->id, 'event_id' => $event->id, 'session_id' => $otherSession->id]);
    Achievement::factory()->create(['participation_id' => $part->id, 'medal_type' => 'GOLD']);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, ['session_id' => $setup['session']->id, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);

    $codes = collect($rows)->pluck('tier.code')->all();
    expect($codes)->toContain('NATIONAL');
    expect($codes)->not->toContain('STATE');
});

test('unit_id filter counts only achievements by members of that unit', function (): void {
    $org = tallyOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);

    // Achievement for member IN the unit
    tallySetup($org, 'NATIONAL', 'GOLD', $unit->id);

    // Achievement for member NOT in the unit (no unit)
    tallySetup($org, 'NATIONAL', 'SILVER', null);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, ['session_id' => null, 'sport_id' => null, 'unit_id' => $unit->id, 'tier_id' => null]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['GOLD'])->toBe(1);
    expect($rows[0]['SILVER'])->toBe(0);
});

test('excludes achievements from other organisations', function (): void {
    $org = tallyOrg();
    $otherOrg = tallyOrg();
    tallySetup($otherOrg, 'NATIONAL', 'GOLD');

    $report = app(MedalTallyReport::class);

    expect($report->run($org->id, noFilters()))->toBeEmpty();
});

test('tier_id filter scopes to correct tier', function (): void {
    $org = tallyOrg();
    tallySetup($org, 'NATIONAL', 'GOLD');

    $state = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'STATE', 'label_en' => 'State', 'weight' => 60],
    );

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, ['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => $state->id]);

    expect($rows)->toBeEmpty();
});
