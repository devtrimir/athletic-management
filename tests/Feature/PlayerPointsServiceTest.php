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
use App\Services\Performance\PlayerPointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function ppOrg(): Organization
{
    return Organization::factory()->create();
}

/**
 * @return array{
 *     member: Member,
 *     participation: Participation,
 *     achievement: Achievement|null,
 *     tournament: Tournament,
 *     session: SportSession,
 *     sport: Sport
 * }
 */
function ppSetupParticipation(
    Organization $org,
    array $overrides = [],
): array {
    $unitId = $overrides['unit_id'] ?? null;
    $member = $overrides['member']
        ?? Member::factory()->create([
            'organization_id' => $org->id,
            'current_unit_id' => $unitId,
        ]);
    $session = $overrides['session']
        ?? SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = $overrides['sport']
        ?? Sport::factory()->create(['organization_id' => $org->id]);
    $tier = $overrides['tier']
        ?? TournamentTier::firstOrCreate(
            ['code' => 'NATIONAL'],
            ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
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

    $achievement = null;

    if (($overrides['with_achievement'] ?? true) === true) {
        $achievement = Achievement::factory()->create([
            'participation_id' => $participation->id,
            'medal_type' => $overrides['medal_type'] ?? 'GOLD',
            'position' => $overrides['position'] ?? 1,
        ]);
    }

    return compact(
        'member',
        'participation',
        'achievement',
        'tournament',
        'session',
        'sport',
    );
}

test('returns empty structures when no participations exist', function (): void {
    $result = app(PlayerPointsService::class)->run(ppOrg()->id);

    expect($result['rows'])->toBeEmpty()
        ->and($result['by_member'])->toBeEmpty()
        ->and($result['by_session'])->toBeEmpty()
        ->and($result['by_sport'])->toBeEmpty()
        ->and($result['by_tier'])->toBeEmpty()
        ->and($result['totals']['points'])->toBe(0)
        ->and($result['totals']['participation_count'])->toBe(0)
        ->and($result['totals']['achievement_count'])->toBe(0)
        ->and($result['totals']['award_count'])->toBe(0);
});

test('calculates line item points and member summaries from achievements and awards', function (): void {
    $org = ppOrg();
    $setup = ppSetupParticipation($org, ['medal_type' => 'GOLD']);
    ParticipationAward::factory()
        ->forParticipation($setup['participation'])
        ->create([
            'organization_id' => $org->id,
            'award_type' => 'BEST_PLAYER',
            'title' => 'Best Player',
            'points_override' => null,
        ]);

    $result = app(PlayerPointsService::class)->run($org->id);

    expect($result['rows'])->toHaveCount(1);
    expect($result['rows'][0]['scoring'])->toMatchArray([
        'participation_points' => 1,
        'medal_points' => 10,
        'tier_bonus_points' => 6,
        'award_points' => 8,
        'total_points' => 25,
    ]);

    expect($result['by_member'])->toHaveCount(1)
        ->and($result['by_member'][0]['points'])->toBe(25)
        ->and($result['by_member'][0]['participation_count'])->toBe(1)
        ->and($result['by_member'][0]['achievement_count'])->toBe(1)
        ->and($result['by_member'][0]['award_count'])->toBe(1)
        ->and($result['by_member'][0]['medals'])->toMatchArray([
            'GOLD' => 1,
            'SILVER' => 0,
            'BRONZE' => 0,
            'MERIT' => 0,
        ]);
});

test('award points override replaces configured award points', function (): void {
    $org = ppOrg();
    $setup = ppSetupParticipation($org, ['medal_type' => 'MERIT']);
    ParticipationAward::factory()
        ->forParticipation($setup['participation'])
        ->create([
            'organization_id' => $org->id,
            'award_type' => 'MAN_OF_THE_MATCH',
            'title' => 'Man of the Match',
            'points_override' => 11,
        ]);

    $result = app(PlayerPointsService::class)->run($org->id);

    expect($result['rows'][0]['scoring']['medal_points'])->toBe(3)
        ->and($result['rows'][0]['scoring']['tier_bonus_points'])->toBe(6)
        ->and($result['rows'][0]['scoring']['award_points'])->toBe(11)
        ->and($result['rows'][0]['scoring']['total_points'])->toBe(21);
});

test('filters by unit and session and excludes other organisations', function (): void {
    $org = ppOrg();
    $otherOrg = ppOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);

    ppSetupParticipation($org, [
        'unit_id' => $unit->id,
        'session' => $session,
        'medal_type' => 'SILVER',
    ]);
    ppSetupParticipation($org, [
        'unit_id' => null,
        'medal_type' => 'GOLD',
    ]);
    ppSetupParticipation($otherOrg, ['medal_type' => 'GOLD']);

    $result = app(PlayerPointsService::class)->run($org->id, [
        'unit_id' => $unit->id,
        'session_id' => $session->id,
    ]);

    expect($result['rows'])->toHaveCount(1)
        ->and($result['totals']['points'])->toBe(14)
        ->and($result['by_member'])->toHaveCount(1)
        ->and($result['by_member'][0]['medals']['SILVER'])->toBe(1);
});

test('member summaries are ordered by points then medal strength', function (): void {
    $org = ppOrg();

    $memberA = Member::factory()->create(['organization_id' => $org->id]);
    $memberB = Member::factory()->create(['organization_id' => $org->id]);

    ppSetupParticipation($org, ['member' => $memberA, 'medal_type' => 'BRONZE']);
    ppSetupParticipation($org, ['member' => $memberB, 'medal_type' => 'GOLD']);

    $result = app(PlayerPointsService::class)->run($org->id);

    expect($result['by_member'])->toHaveCount(2)
        ->and($result['by_member'][0]['member']['id'])->toBe($memberB->id)
        ->and($result['by_member'][1]['member']['id'])->toBe($memberA->id);
});
