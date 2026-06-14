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
use App\Services\Reports\AchievementHistoryReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ahOrg(): Organization
{
    return Organization::factory()->create();
}

function ahMember(Organization $org, ?int $unitId = null): Member
{
    return Member::factory()->create([
        'organization_id' => $org->id,
        'current_unit_id' => $unitId,
    ]);
}

/**
 * Create a full achievement chain for the given org.
 *
 * @return array{tier: TournamentTier, session: SportSession, sport: Sport, tournament: Tournament, member: Member, participation: Participation, achievement: Achievement}
 */
function ahSetup(
    Organization $org,
    string $tierCode = 'NATIONAL',
    string $medalType = 'GOLD',
    ?Member $member = null,
    ?string $dateFrom = null,
    ?SportSession $session = null,
    ?Sport $sport = null,
): array {
    $tier = TournamentTier::firstOrCreate(
        ['code' => $tierCode],
        ['label_hi' => $tierCode, 'label_en' => $tierCode, 'weight' => 80],
    );
    $session ??= SportSession::factory()->create(['organization_id' => $org->id]);
    $sport ??= Sport::factory()->create(['organization_id' => $org->id]);
    $member ??= ahMember($org);

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
        'date_from' => $dateFrom,
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
    $achievement = Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);

    return compact('tier', 'session', 'sport', 'tournament', 'member', 'participation', 'achievement');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns empty collection when no achievements exist', function (): void {
    $org = ahOrg();

    expect(app(AchievementHistoryReport::class)->run($org->id, []))->toBeEmpty();
});

test('returns achievement with correct shape', function (): void {
    $org = ahOrg();
    $setup = ahSetup($org, 'NATIONAL', 'GOLD');

    $result = app(AchievementHistoryReport::class)->run($org->id, []);

    expect($result)->toHaveCount(1);
    $row = $result[0];
    expect($row['member']['id'])->toBe($setup['member']->id);
    expect($row['medal_type'])->toBe('GOLD');
    expect($row['tournament']['id'])->toBe($setup['tournament']->id);
    expect(array_keys($row['event']))->toBe(['id', 'name', 'discipline']);
});

test('org isolation — other org achievements not returned', function (): void {
    $orgA = ahOrg();
    $orgB = ahOrg();
    ahSetup($orgB);

    expect(app(AchievementHistoryReport::class)->run($orgA->id, []))->toBeEmpty();
});

test('session_id filter scopes to that session', function (): void {
    $org = ahOrg();
    $sessionA = SportSession::factory()->create(['organization_id' => $org->id]);
    $sessionB = SportSession::factory()->create(['organization_id' => $org->id]);

    ahSetup($org, session: $sessionA);
    ahSetup($org, session: $sessionB);

    $result = app(AchievementHistoryReport::class)->run($org->id, ['session_id' => $sessionA->id]);

    expect($result)->toHaveCount(1);
});

test('sport_id filter scopes to that sport', function (): void {
    $org = ahOrg();
    $sportA = Sport::factory()->create(['organization_id' => $org->id]);
    $sportB = Sport::factory()->create(['organization_id' => $org->id]);

    ahSetup($org, sport: $sportA);
    ahSetup($org, sport: $sportB);

    $result = app(AchievementHistoryReport::class)->run($org->id, ['sport_id' => $sportA->id]);

    expect($result)->toHaveCount(1);
});

test('tier_id filter scopes to that tier', function (): void {
    $org = ahOrg();
    $national = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'राज्य', 'label_en' => 'State', 'weight' => 60],
    );

    ahSetup($org, 'NATIONAL');
    ahSetup($org, 'STATE');

    $result = app(AchievementHistoryReport::class)->run($org->id, ['tier_id' => $national->id]);

    expect($result)->toHaveCount(1);
    expect($result[0]['tournament']['tier_label_hi'])->toBe('राष्ट्रीय');
});

test('unit_id filter scopes to members in that unit', function (): void {
    $org = ahOrg();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $memberInUnit = ahMember($org, $unit->id);
    $memberNoUnit = ahMember($org);

    ahSetup($org, member: $memberInUnit);
    ahSetup($org, member: $memberNoUnit);

    $result = app(AchievementHistoryReport::class)->run($org->id, ['unit_id' => $unit->id]);

    expect($result)->toHaveCount(1);
    expect($result[0]['member']['id'])->toBe($memberInUnit->id);
});

test('excludes achievements for soft-deleted tournaments', function (): void {
    $org = ahOrg();
    $setup = ahSetup($org);
    $setup['tournament']->delete();

    expect(app(AchievementHistoryReport::class)->run($org->id, []))->toBeEmpty();
});

test('excludes achievements for soft-deleted members', function (): void {
    $org = ahOrg();
    $setup = ahSetup($org);
    $setup['member']->delete();

    expect(app(AchievementHistoryReport::class)->run($org->id, []))->toBeEmpty();
});

test('results ordered by date_from desc then full_name asc', function (): void {
    $org = ahOrg();

    ahSetup($org, dateFrom: '2025-06-01');
    ahSetup($org, dateFrom: '2026-01-01');

    $result = app(AchievementHistoryReport::class)->run($org->id, []);

    expect($result)->toHaveCount(2);
    expect($result[0]['tournament']['date_from'])->toBe('2026-01-01');
    expect($result[1]['tournament']['date_from'])->toBe('2025-06-01');
});
