<?php

use App\Models\TournamentTier;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('tournament_tiers table has expected columns', function (): void {
    expect(Schema::hasColumns('tournament_tiers', [
        'id', 'code', 'label_hi', 'label_en', 'weight',
        'created_at', 'updated_at',
    ]))->toBeTrue();
});

test('tournament tier factory creates a record with correct attributes', function (): void {
    $tier = TournamentTier::factory()->create();

    expect($tier->code)->toBeIn(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER'])
        ->and($tier->label_hi)->toBeString()->not->toBeEmpty()
        ->and($tier->label_en)->toBeString()->not->toBeEmpty()
        ->and($tier->weight)->toBeInt();
});

test('tournament tier code must be unique', function (): void {
    TournamentTier::factory()->create(['code' => 'NATIONAL']);

    expect(fn () => TournamentTier::factory()->create(['code' => 'NATIONAL']))
        ->toThrow(QueryException::class);
});
