<?php

use App\Models\District;
use App\Models\Unit;
use App\Models\UnitType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('units table has expected columns', function (): void {
    expect(Schema::hasColumns('units', [
        'id', 'organization_id', 'name', 'name',
        'unit_type_id', 'commandant', 'district_id',
        'created_at', 'updated_at',
    ]))->toBeTrue();
});

test('unit factory creates a record with correct attributes', function (): void {
    $unit = Unit::factory()->create();

    expect($unit->name)->toBeString()->not->toBeEmpty()
        ->and(UnitType::whereKey($unit->unit_type_id)->exists())->toBeTrue()
        ->and($unit->commandant)->toBeNull()
        ->and($unit->district_id)->toBeNull();
});

test('unit district_id is nullable and links to districts', function (): void {
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['district_id' => $district->id]);

    expect($unit->district_id)->toBe($district->id)
        ->and($unit->district->id)->toBe($district->id);
});
