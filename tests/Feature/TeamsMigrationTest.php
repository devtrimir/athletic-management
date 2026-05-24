<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('teams table is created by migration', function () {
    expect(Schema::hasTable('teams'))->toBeTrue();
});

test('teams table has all required columns', function () {
    $columns = [
        'id', 'organization_id', 'sport_id', 'session_id', 'unit_id',
        'name_hi', 'in_charge_hi', 'deleted_at', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('teams', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('in_charge_hi is nullable', function () {
    $team = Team::factory()->create(['in_charge_hi' => null]);

    expect($team->in_charge_hi)->toBeNull();
});

test('team can be soft deleted and restored', function () {
    $team = Team::factory()->create();

    $team->delete();
    expect($team->trashed())->toBeTrue();

    $team->restore();
    expect($team->fresh()->trashed())->toBeFalse();
});

test('duplicate org-sport-session-unit-name combination is rejected', function () {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $unit = Unit::factory()->create(['organization_id' => $org->id]);

    Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
        'name_hi' => 'टीम एक',
    ]);

    expect(fn () => Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
        'name_hi' => 'टीम एक',
    ]))->toThrow(QueryException::class);
});

test('same name in different units within same org-sport-session is allowed', function () {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $unitA = Unit::factory()->create(['organization_id' => $org->id]);
    $unitB = Unit::factory()->create(['organization_id' => $org->id]);

    Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unitA->id,
        'name_hi' => 'टीम ए',
    ]);

    Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unitB->id,
        'name_hi' => 'टीम ए',
    ]);

    expect(Team::withoutGlobalScopes()->where('name_hi', 'टीम ए')->count())->toBe(2);
});

test('factory forOrganization state creates consistent related records', function () {
    $org = Organization::factory()->create();
    $team = Team::factory()->forOrganization($org)->create();

    expect($team->organization_id)->toBe($org->id)
        ->and($team->sport()->withoutGlobalScopes()->first()->organization_id)->toBe($org->id)
        ->and($team->session()->withoutGlobalScopes()->first()->organization_id)->toBe($org->id)
        ->and($team->unit()->withoutGlobalScopes()->first()->organization_id)->toBe($org->id);
});
