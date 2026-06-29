<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
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

test('includes member legacy achievement medals in tier tally', function (): void {
    $org = tallyOrg();
    tallySetup($org, 'NATIONAL', 'SILVER');
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'NATIONAL', 'label_en' => 'National', 'weight' => 80],
    );

    MemberLegacyAchievement::factory()->forMember($member)->create([
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'period' => 'POST_RECRUITMENT',
        'level' => 'NATIONAL',
        'event_date' => '2026-02-10',
        'medal_type' => 'SILVER',
    ]);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('NATIONAL');
    expect($rows[0]['GOLD'])->toBe(0);
    expect($rows[0]['SILVER'])->toBe(2);
    expect($rows[0]['BRONZE'])->toBe(0);
    expect($rows[0]['MERIT'])->toBe(0);
});

test('legacy international medal appears even without a matching tournament tier row', function (): void {
    $org = tallyOrg();
    $member = Member::factory()->create(['organization_id' => $org->id]);

    MemberLegacyAchievement::factory()->forMember($member)->create([
        'period' => 'POST_RECRUITMENT',
        'level' => 'INTERNATIONAL',
        'event_date' => '2026-02-10',
        'medal_type' => 'GOLD',
    ]);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, noFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['tier']['code'])->toBe('INTERNATIONAL');
    expect($rows[0]['GOLD'])->toBe(1);
    expect($rows[0]['display_only'])->toBe(0);
});

test('legacy medal tally respects session and sport filters', function (): void {
    $org = tallyOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'NATIONAL', 'label_en' => 'National', 'weight' => 80],
    );

    MemberLegacyAchievement::factory()->forMember($member)->create([
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'level' => 'NATIONAL',
        'event_date' => '2026-02-10',
        'medal_type' => 'BRONZE',
    ]);

    $report = app(MedalTallyReport::class);
    $rows = $report->run($org->id, [
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'unit_id' => null,
        'tier_id' => null,
    ]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['BRONZE'])->toBe(1);
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
