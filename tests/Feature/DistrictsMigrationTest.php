<?php

use App\Models\District;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('districts table has expected columns', function (): void {
    expect(Schema::hasColumns('districts', [
        'id', 'name_hi', 'name_en', 'state', 'code',
        'created_at', 'updated_at',
    ]))->toBeTrue();
});

test('district factory creates a record with correct attributes', function (): void {
    $district = District::factory()->create();

    expect($district->name_hi)->toBeString()->not->toBeEmpty()
        ->and($district->name_en)->toBeString()->not->toBeEmpty()
        ->and($district->state)->toBe('Uttar Pradesh')
        ->and($district->code)->toBeString()->not->toBeEmpty();
});

test('district code must be unique', function (): void {
    District::factory()->create(['code' => 'LKO']);

    expect(fn () => District::factory()->create(['code' => 'LKO']))
        ->toThrow(QueryException::class);
});
