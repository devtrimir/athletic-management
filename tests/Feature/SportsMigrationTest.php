<?php

use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('sports table has expected columns', function (): void {
    expect(Schema::hasColumns('sports', [
        'id', 'organization_id', 'name', 'name',
        'category', 'slug', 'created_at', 'updated_at',
    ]))->toBeTrue();
});

test('sport factory creates a record with correct attributes', function (): void {
    $sport = Sport::factory()->create();

    expect($sport->name)->toBeString()->not->toBeEmpty()
        ->and($sport->name)->toBeString()->not->toBeEmpty()
        ->and($sport->category)->toBeIn(['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'])
        ->and($sport->slug)->toBeString()->not->toBeEmpty();
});

test('sport slug must be unique per organisation', function (): void {
    $org = Organization::factory()->create();

    Sport::factory()->create(['organization_id' => $org->id, 'slug' => 'hockey']);

    expect(fn () => Sport::factory()->create(['organization_id' => $org->id, 'slug' => 'hockey']))
        ->toThrow(QueryException::class);
});
