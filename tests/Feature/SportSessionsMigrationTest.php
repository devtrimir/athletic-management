<?php

use App\Models\Organization;
use App\Models\SportSession;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('sport_sessions table has expected columns', function (): void {
    expect(Schema::hasColumns('sport_sessions', [
        'id', 'organization_id', 'name', 'start_year', 'end_year',
        'is_current', 'created_at', 'updated_at',
    ]))->toBeTrue();
});

test('sport session factory creates a record with correct attributes', function (): void {
    $session = SportSession::factory()->create([
        'name' => '2026-27',
        'start_year' => 2026,
        'end_year' => 2027,
        'is_current' => true,
    ]);

    expect($session->name)->toBe('2026-27')
        ->and($session->start_year)->toBe(2026)
        ->and($session->end_year)->toBe(2027)
        ->and($session->is_current)->toBeTrue();
});

test('session name must be unique per organisation', function (): void {
    $org = Organization::factory()->create();

    SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2026-27']);

    expect(fn () => SportSession::factory()->create(['organization_id' => $org->id, 'name' => '2026-27']))
        ->toThrow(QueryException::class);
});
