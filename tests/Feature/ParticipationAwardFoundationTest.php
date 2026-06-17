<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Participation;
use App\Models\ParticipationAward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('participation_awards table is created by migration', function (): void {
    expect(Schema::hasTable('participation_awards'))->toBeTrue();
});

test('participation_awards table has all required columns', function (): void {
    $columns = [
        'id',
        'organization_id',
        'participation_id',
        'award_type',
        'title',
        'points_override',
        'remarks',
        'created_at',
        'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('participation_awards', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('participation can own awards', function (): void {
    $participation = Participation::factory()->create();
    $award = ParticipationAward::factory()->forParticipation($participation)->create([
        'award_type' => 'BEST_PLAYER',
        'title' => 'Best Player',
        'points_override' => 12,
    ]);

    $participation->refresh();
    $awards = $participation->participationAwards()->withoutGlobalScopes()->get();
    $memberOrganizationId = Member::withoutGlobalScopes()
        ->findOrFail($participation->member_id)
        ->organization_id;

    expect($awards)->toHaveCount(1)
        ->and($awards->first()?->is($award))->toBeTrue()
        ->and($award->organization_id)->toBe($memberOrganizationId);
});

test('player points config exposes initial scoring buckets', function (): void {
    expect(config('player_points.participation.base_points'))->toBe(1)
        ->and(config('player_points.medals.GOLD'))->toBe(10)
        ->and(config('player_points.medals.MERIT'))->toBe(3)
        ->and(config('player_points.tier_bonus.NATIONAL'))->toBe(6)
        ->and(config('player_points.awards.BEST_PLAYER'))->toBe(8);
});

test('player points client confirmation data mirrors config values', function (): void {
    $rows = collect(array_map('str_getcsv', file(database_path('data/player_points.csv'))));
    $header = $rows->shift();

    $dataRows = $rows
        ->map(fn (array $row): array => array_combine($header, $row))
        ->values();

    $points = $dataRows
        ->mapWithKeys(fn (array $row): array => [
            $row['category'].'.'.$row['code'] => (int) $row['points'],
        ]);

    expect($points->all())->toBe([
        'participation.base_points' => config('player_points.participation.base_points'),
        'medal.GOLD' => config('player_points.medals.GOLD'),
        'medal.SILVER' => config('player_points.medals.SILVER'),
        'medal.BRONZE' => config('player_points.medals.BRONZE'),
        'medal.MERIT' => config('player_points.medals.MERIT'),
        'tier_bonus.INTERNATIONAL' => config('player_points.tier_bonus.INTERNATIONAL'),
        'tier_bonus.NATIONAL' => config('player_points.tier_bonus.NATIONAL'),
        'tier_bonus.AIPSC' => config('player_points.tier_bonus.AIPSC'),
        'tier_bonus.STATE' => config('player_points.tier_bonus.STATE'),
        'tier_bonus.ZONAL' => config('player_points.tier_bonus.ZONAL'),
        'tier_bonus.OTHER' => config('player_points.tier_bonus.OTHER'),
        'award.BEST_PLAYER' => config('player_points.awards.BEST_PLAYER'),
        'award.BEST_ATHLETE' => config('player_points.awards.BEST_ATHLETE'),
        'award.BEST_GOALKEEPER' => config('player_points.awards.BEST_GOALKEEPER'),
        'award.MAN_OF_THE_MATCH' => config('player_points.awards.MAN_OF_THE_MATCH'),
        'award.COMMENDATION' => config('player_points.awards.COMMENDATION'),
        'award.OTHER' => config('player_points.awards.OTHER'),
    ]);

    expect($dataRows)
        ->each
        ->toHaveKey('client_status', 'pending_client_confirmation');
});
