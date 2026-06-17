<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationAward;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\PlayerPerformanceReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pprOrg(): Organization
{
    return Organization::factory()->create();
}

/**
 * @return array{member: Member, participation: Participation, session: SportSession, sport: Sport, tier: TournamentTier, tournament: Tournament}
 */
function pprSeedParticipation(
    Organization $org,
    array $overrides = [],
): array {
    $member = $overrides['member']
        ?? Member::factory()->create([
            'organization_id' => $org->id,
            'current_unit_id' => $overrides['unit_id'] ?? null,
        ]);
    $session = $overrides['session']
        ?? SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = $overrides['sport']
        ?? Sport::factory()->create(['organization_id' => $org->id]);
    $tier = $overrides['tier']
        ?? TournamentTier::firstOrCreate(
            ['code' => $overrides['tier_code'] ?? 'NATIONAL'],
            [
                'label_hi' => $overrides['tier_code'] ?? 'NATIONAL',
                'label_en' => $overrides['tier_code'] ?? 'NATIONAL',
                'weight' => 80,
            ],
        );

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
    ]);
    $participation = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
    ]);

    if (($overrides['with_achievement'] ?? true) === true) {
        Achievement::factory()->create([
            'participation_id' => $participation->id,
            'medal_type' => $overrides['medal_type'] ?? 'GOLD',
        ]);
    }

    if (($overrides['award_type'] ?? null) !== null) {
        ParticipationAward::factory()->forParticipation($participation)->create([
            'organization_id' => $org->id,
            'award_type' => $overrides['award_type'],
            'title' => $overrides['award_title'] ?? 'Best Player',
            'points_override' => $overrides['award_points_override'] ?? null,
        ]);
    }

    return compact('member', 'participation', 'session', 'sport', 'tier', 'tournament');
}

function pprNoFilters(): array
{
    return [
        'session_id' => null,
        'sport_id' => null,
        'unit_id' => null,
        'tier_id' => null,
        'member_name' => null,
        'pno' => null,
        'from_date' => null,
        'to_date' => null,
    ];
}

test('returns ranked rows with totals and medal counts', function (): void {
    $org = pprOrg();
    $setup = pprSeedParticipation($org, [
        'medal_type' => 'GOLD',
        'award_type' => 'BEST_PLAYER',
    ]);

    $rows = app(PlayerPerformanceReport::class)->run($org->id, pprNoFilters());

    expect($rows)->toHaveCount(1)
        ->and($rows[0])->toMatchArray([
            'rank' => 1,
            'participation_count' => 1,
            'achievement_count' => 1,
            'award_count' => 1,
            'GOLD' => 1,
            'SILVER' => 0,
            'BRONZE' => 0,
            'MERIT' => 0,
            'total_points' => 25,
        ])
        ->and($rows[0]['member']['id'])->toBe($setup['member']->id);
});

test('limit truncates the ranking', function (): void {
    $org = pprOrg();

    foreach (range(1, 4) as $index) {
        pprSeedParticipation($org, ['medal_type' => $index === 1 ? 'GOLD' : 'BRONZE']);
    }

    $rows = app(PlayerPerformanceReport::class)->run($org->id, pprNoFilters(), limit: 2);

    expect($rows)->toHaveCount(2)
        ->and($rows[0]['rank'])->toBe(1)
        ->and($rows[1]['rank'])->toBe(2);
});

test('filters by session sport tier and unit', function (): void {
    $org = pprOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'राज्य', 'label_en' => 'State', 'weight' => 60],
    );

    $matching = pprSeedParticipation($org, [
        'unit_id' => $unit->id,
        'session' => $session,
        'sport' => $sport,
        'tier' => $tier,
        'medal_type' => 'SILVER',
    ]);

    pprSeedParticipation($org, ['medal_type' => 'GOLD']);

    $rows = app(PlayerPerformanceReport::class)->run($org->id, [
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'unit_id' => $unit->id,
        'tier_id' => $tier->id,
    ]);

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['member']['id'])->toBe($matching['member']->id)
        ->and($rows[0]['SILVER'])->toBe(1);
});

test('filters by member name pno and tournament date range', function (): void {
    $org = pprOrg();

    $member = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'Amit Kumar',
        'pno' => 'PNO-101',
    ]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'राज्य', 'label_en' => 'State', 'weight' => 60],
    );

    $matching = pprSeedParticipation($org, [
        'member' => $member,
        'session' => $session,
        'sport' => $sport,
        'tier' => $tier,
        'medal_type' => 'MERIT',
    ]);
    $matching['tournament']->update([
        'date_from' => '2026-01-15',
    ]);

    $other = pprSeedParticipation($org, [
        'medal_type' => 'GOLD',
    ]);
    $other['tournament']->update([
        'date_from' => '2025-01-15',
    ]);

    $rows = app(PlayerPerformanceReport::class)->run($org->id, [
        ...pprNoFilters(),
        'member_name' => 'Amit',
        'pno' => '101',
        'from_date' => '2026-01-01',
        'to_date' => '2026-12-31',
    ]);

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['member']['id'])->toBe($member->id)
        ->and($rows[0]['MERIT'])->toBe(1);
});

test('excludes participations from other organisations', function (): void {
    $org = pprOrg();
    $other = pprOrg();

    pprSeedParticipation($other, ['medal_type' => 'GOLD']);

    expect(app(PlayerPerformanceReport::class)->run($org->id, pprNoFilters()))
        ->toBeEmpty();
});

test('report controller serves the player performance report', function (): void {
    $user = rcUser('reports.view');
    $org = Organization::findOrFail($user->organization_id);
    pprSeedParticipation($org, ['medal_type' => 'GOLD']);

    $response = $this->actingAs($user)->get(route('reports.show', 'player-performance-ranking'));

    $response->assertSuccessful();
    $response->assertInertia(
        fn ($page) => $page
            ->component('reports/player-performance-ranking')
            ->where('report.key', 'player-performance-ranking')
            ->has('data.summary')
            ->has('data.groups', 1)
            ->where('filters.limit', 50)
    );
});
