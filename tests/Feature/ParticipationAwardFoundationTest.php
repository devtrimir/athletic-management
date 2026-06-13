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
