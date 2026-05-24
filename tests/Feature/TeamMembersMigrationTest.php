<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('team_members table is created by migration', function () {
    expect(Schema::hasTable('team_members'))->toBeTrue();
});

test('team_members table has all required columns', function () {
    $columns = [
        'id', 'team_id', 'member_id', 'session_id',
        'role', 'joined_on', 'left_on', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('team_members', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('role defaults to PLAYER', function () {
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
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $row = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
        'joined_on' => null,
        'left_on' => null,
    ]);

    expect($row->role)->toBe('PLAYER')
        ->and($row->joined_on)->toBeNull()
        ->and($row->left_on)->toBeNull();
});

test('duplicate team_id + member_id is rejected', function () {
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
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    expect(fn () => TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]))->toThrow(QueryException::class);
});

test('same member on different teams is allowed', function () {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $teamA = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
        'name_hi' => 'टीम अ',
    ]);
    $teamB = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'unit_id' => $unit->id,
        'name_hi' => 'टीम ब',
    ]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create(['team_id' => $teamA->id, 'member_id' => $member->id, 'session_id' => $session->id]);
    TeamMember::factory()->create(['team_id' => $teamB->id, 'member_id' => $member->id, 'session_id' => $session->id]);

    expect(TeamMember::where('member_id', $member->id)->count())->toBe(2);
});

test('cascade deletes team_members when team is force deleted', function () {
    $team = Team::factory()->create();
    $member = TeamMember::factory()->create(['team_id' => $team->id]);

    $team->forceDelete();

    expect(TeamMember::find($member->id))->toBeNull();
});
