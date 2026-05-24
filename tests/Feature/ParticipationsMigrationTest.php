<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Tournament;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('participations table is created by migration', function () {
    expect(Schema::hasTable('participations'))->toBeTrue();
});

test('participations table has all required columns', function () {
    $columns = [
        'id', 'event_id', 'member_id', 'team_id', 'session_id',
        'position', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('participations', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('position is nullable', function () {
    $participation = Participation::factory()->create(['position' => null]);

    expect($participation->position)->toBeNull();
});

test('team_id is nullable', function () {
    $participation = Participation::factory()->create(['team_id' => null]);

    expect($participation->team_id)->toBeNull();
});

test('duplicate event_id + member_id pair is rejected', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();
    $event = Event::factory()->forTournament($tournament)->create();
    $member = Member::factory()->create(['organization_id' => $org->id]);

    Participation::factory()->forEvent($event)->create(['member_id' => $member->id]);

    expect(fn () => Participation::factory()->forEvent($event)->create(['member_id' => $member->id]))
        ->toThrow(QueryException::class);
});

test('same member in different events is allowed', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();
    $eventA = Event::factory()->forTournament($tournament)->create();
    $eventB = Event::factory()->forTournament($tournament)->create();
    $member = Member::factory()->create(['organization_id' => $org->id]);

    Participation::factory()->forEvent($eventA)->create(['member_id' => $member->id]);
    Participation::factory()->forEvent($eventB)->create(['member_id' => $member->id]);

    expect(Participation::where('member_id', $member->id)->count())->toBe(2);
});

test('forEvent factory state links participation to the correct event', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();
    $event = Event::factory()->forTournament($tournament)->create();
    $participation = Participation::factory()->forEvent($event)->create();

    expect($participation->event_id)->toBe($event->id);
});
