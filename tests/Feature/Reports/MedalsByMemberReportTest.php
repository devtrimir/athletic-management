<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\MedalsByMemberReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function memberOrg(): Organization
{
    return Organization::factory()->create();
}

/**
 * Create one achievement for the given member in the given org.
 */
function memberAchievement(
    Organization $org,
    Member $member,
    string $tierCode = 'NATIONAL',
    string $medalType = 'GOLD',
    ?SportSession $session = null,
): Achievement {
    $tier = TournamentTier::firstOrCreate(
        ['code' => $tierCode],
        ['label_hi' => $tierCode, 'label_en' => $tierCode, 'weight' => 80],
    );
    $session = $session ?? SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
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

    return Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);
}

function memberNoFilters(): array
{
    return ['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns empty collection when no achievements exist', function (): void {
    $org = memberOrg();
    $report = app(MedalsByMemberReport::class);

    expect($report->run($org->id, memberNoFilters()))->toBeEmpty();
});

test('returns correct medal counts for a single member', function (): void {
    $org = memberOrg();
    $member = Member::factory()->create(['organization_id' => $org->id]);
    memberAchievement($org, $member, medalType: 'GOLD');
    memberAchievement($org, $member, medalType: 'GOLD');
    memberAchievement($org, $member, medalType: 'SILVER');

    $report = app(MedalsByMemberReport::class);
    $rows = $report->run($org->id, memberNoFilters());

    expect($rows)->toHaveCount(1);
    expect($rows[0]['GOLD'])->toBe(2);
    expect($rows[0]['SILVER'])->toBe(1);
    expect($rows[0]['BRONZE'])->toBe(0);
    expect($rows[0]['MERIT'])->toBe(0);
    expect($rows[0]['total'])->toBe(3);
    expect($rows[0]['member']['id'])->toBe($member->id);
});

test('limit truncates result to top-N', function (): void {
    $org = memberOrg();
    foreach (range(1, 5) as $_) {
        $m = Member::factory()->create(['organization_id' => $org->id]);
        memberAchievement($org, $m);
    }

    $report = app(MedalsByMemberReport::class);
    $rows = $report->run($org->id, memberNoFilters(), limit: 3);

    expect($rows)->toHaveCount(3);
});

test('orders by total desc then GOLD desc', function (): void {
    $org = memberOrg();
    $alpha = Member::factory()->create(['organization_id' => $org->id]);
    $beta = Member::factory()->create(['organization_id' => $org->id]);

    // beta: 1 GOLD, alpha: 1 BRONZE — same total but beta wins on GOLD
    memberAchievement($org, $beta, medalType: 'GOLD');
    memberAchievement($org, $alpha, medalType: 'BRONZE');

    $report = app(MedalsByMemberReport::class);
    $rows = $report->run($org->id, memberNoFilters());

    expect($rows[0]['member']['id'])->toBe($beta->id);
    expect($rows[1]['member']['id'])->toBe($alpha->id);
});

test('unit_id filter excludes members from other units', function (): void {
    $org = memberOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $inUnit = Member::factory()->create(['organization_id' => $org->id, 'current_unit_id' => $unit->id]);
    $outUnit = Member::factory()->create(['organization_id' => $org->id, 'current_unit_id' => null]);

    memberAchievement($org, $inUnit);
    memberAchievement($org, $outUnit);

    $report = app(MedalsByMemberReport::class);
    $rows = $report->run($org->id, ['session_id' => null, 'sport_id' => null, 'unit_id' => $unit->id, 'tier_id' => null]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['member']['id'])->toBe($inUnit->id);
});

test('excludes achievements from other organisations', function (): void {
    $org = memberOrg();
    $otherOrg = memberOrg();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);
    memberAchievement($otherOrg, $member);

    $report = app(MedalsByMemberReport::class);

    expect($report->run($org->id, memberNoFilters()))->toBeEmpty();
});

test('session_id filter scopes to correct session', function (): void {
    $org = memberOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $memberA = Member::factory()->create(['organization_id' => $org->id]);
    $memberB = Member::factory()->create(['organization_id' => $org->id]);

    memberAchievement($org, $memberA, session: $session);
    // memberB's achievement is in a different session (factory creates a new one)
    memberAchievement($org, $memberB);

    $report = app(MedalsByMemberReport::class);
    $rows = $report->run($org->id, ['session_id' => $session->id, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['member']['id'])->toBe($memberA->id);
});
