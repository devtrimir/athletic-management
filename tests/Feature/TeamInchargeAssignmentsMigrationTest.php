<?php

declare(strict_types=1);

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('team incharge assignments table has required columns', function (): void {
    $columns = [
        'team_id',
        'incharge_id',
        'full_name',
        'pno',
        'rank',
        'designation',
        'mobile',
        'email',
        'assigned_at',
        'removed_at',
        'assigned_by',
        'removed_by',
        'assignment_reason',
        'removal_reason',
        'remarks',
        'is_current',
        'deleted_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('team_incharge_assignments', $column))->toBeTrue();
    }
});

test('a team can only have one current incharge row', function (): void {
    $team = Team::factory()->create();

    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'assigned_by' => null,
        'pno' => '1111111111',
        'current_team_id' => $team->id,
    ]);

    expect(fn () => TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'assigned_by' => null,
        'pno' => '2222222222',
        'current_team_id' => $team->id,
    ]))->toThrow(QueryException::class);
});

test('historical rows can coexist for the same team', function (): void {
    $team = Team::factory()->create();

    TeamInchargeAssignment::factory()->history()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'pno' => '1111111111',
        'assigned_by' => null,
        'removed_by' => null,
    ]);

    TeamInchargeAssignment::factory()->history()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'pno' => '2222222222',
        'assigned_by' => null,
        'removed_by' => null,
    ]);

    expect(TeamInchargeAssignment::query()->where('team_id', $team->id)->count())->toBe(2);
});

test('team incharge assignment can be stored without a member link', function (): void {
    $assignment = TeamInchargeAssignment::factory()->create([
        'incharge_id' => null,
    ]);

    expect($assignment->incharge_id)->toBeNull();
});
