<?php

use App\Models\TournamentTier;
use Database\Seeders\TournamentTierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('all six tournament tiers are seeded with correct data', function (): void {
    $this->seed(TournamentTierSeeder::class);

    expect(TournamentTier::count())->toBe(6);

    $expected = [
        ['code' => 'INTERNATIONAL', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL',      'label_en' => 'National',      'weight' => 80],
        ['code' => 'AIPSC',         'label_en' => 'AIPSC',         'weight' => 70],
        ['code' => 'STATE',         'label_en' => 'State',         'weight' => 60],
        ['code' => 'ZONAL',         'label_en' => 'Zonal',         'weight' => 40],
        ['code' => 'OTHER',         'label_en' => 'Other',         'weight' => 10],
    ];

    foreach ($expected as $row) {
        $tier = TournamentTier::where('code', $row['code'])->first();
        expect($tier)->not->toBeNull()
            ->and($tier->label_en)->toBe($row['label_en'])
            ->and($tier->weight)->toBe($row['weight'])
            ->and($tier->label_hi)->not->toBeEmpty();
    }
});

test('seeder is idempotent', function (): void {
    $this->seed(TournamentTierSeeder::class);
    $this->seed(TournamentTierSeeder::class);

    expect(TournamentTier::count())->toBe(6);
});

test('tiers are ordered by weight descending', function (): void {
    $this->seed(TournamentTierSeeder::class);

    $weights = TournamentTier::orderByDesc('weight')->pluck('weight')->all();

    expect($weights)->toBe([100, 80, 70, 60, 40, 10]);
});
