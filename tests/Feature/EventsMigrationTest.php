<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Organization;
use App\Models\Tournament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('events table is created by migration', function () {
    expect(Schema::hasTable('events'))->toBeTrue();
});

test('events table has all required columns', function () {
    $columns = [
        'id', 'tournament_id', 'sport_id', 'name_hi',
        'discipline', 'weight_category', 'gender_class',
        'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('events', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('discipline and weight_category are nullable', function () {
    $event = Event::factory()->create([
        'discipline' => null,
        'weight_category' => null,
    ]);

    expect($event->discipline)->toBeNull()
        ->and($event->weight_category)->toBeNull();
});

test('deleting a tournament cascades to its events', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();
    $event = Event::factory()->forTournament($tournament)->create();

    $eventId = $event->id;

    // Hard-delete via DB to trigger the cascade without Eloquent global scope interference.
    DB::table('tournaments')->where('id', $tournament->id)->delete();

    expect(DB::table('events')->find($eventId))->toBeNull();
});

test('forTournament factory state links event to the given tournament', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();
    $event = Event::factory()->forTournament($tournament)->create();

    expect($event->tournament_id)->toBe($tournament->id);
});
