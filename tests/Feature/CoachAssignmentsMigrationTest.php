<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('coach_assignments table is created by migration', function () {
    expect(Schema::hasTable('coach_assignments'))->toBeTrue();
});

test('coach_assignments table has all required columns', function () {
    $columns = [
        'id', 'team_id', 'coach_id', 'session_id',
        'role', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('coach_assignments', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('duplicate team_id + coach_id + role is rejected', function () {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
    ]);

    expect(fn () => CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
    ]))->toThrow(QueryException::class);
});

test('same coach can hold HEAD and ASSISTANT roles on same team', function () {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    CoachAssignment::factory()->create(['team_id' => $team->id, 'coach_id' => $coach->id, 'session_id' => $session->id, 'role' => 'HEAD']);
    CoachAssignment::factory()->create(['team_id' => $team->id, 'coach_id' => $coach->id, 'session_id' => $session->id, 'role' => 'ASSISTANT']);

    expect(CoachAssignment::where('coach_id', $coach->id)->count())->toBe(2);
});

test('cascade deletes coach_assignments when team is force deleted', function () {
    $team = Team::factory()->create();
    $assignment = CoachAssignment::factory()->create(['team_id' => $team->id]);

    $team->forceDelete();

    expect(CoachAssignment::find($assignment->id))->toBeNull();
});
