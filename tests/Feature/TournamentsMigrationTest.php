<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('tournaments table is created by migration', function () {
    expect(Schema::hasTable('tournaments'))->toBeTrue();
});

test('tournaments table has all required columns', function () {
    $columns = [
        'id', 'organization_id', 'session_id', 'tier_id', 'sport_id',
        'name', 'venue', 'date_from', 'date_to', 'raw_date_text',
        'deleted_at', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('tournaments', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('sport_id is nullable', function () {
    $tournament = Tournament::factory()->create(['sport_id' => null]);

    expect($tournament->sport_id)->toBeNull();
});

test('optional text fields are nullable', function () {
    $tournament = Tournament::factory()->create([
        'venue' => null,
        'date_from' => null,
        'date_to' => null,
        'raw_date_text' => null,
    ]);

    expect($tournament->venue)->toBeNull()
        ->and($tournament->date_from)->toBeNull()
        ->and($tournament->date_to)->toBeNull()
        ->and($tournament->raw_date_text)->toBeNull();
});

test('tournament can be soft deleted and restored', function () {
    $tournament = Tournament::factory()->create();

    $tournament->delete();
    expect($tournament->trashed())->toBeTrue();

    $tournament->restore();
    expect($tournament->fresh()->trashed())->toBeFalse();
});

test('forOrganization factory state creates consistent related records', function () {
    $org = Organization::factory()->create();
    $tournament = Tournament::factory()->forOrganization($org)->create();

    expect($tournament->organization_id)->toBe($org->id);
    expect($tournament->session()->withoutGlobalScopes()->first()->organization_id)->toBe($org->id);
});

test('tenanted scope filters tournaments to authenticated user org', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $orgA->id]);

    Tournament::factory()->forOrganization($orgA)->create();
    Tournament::factory()->forOrganization($orgB)->create();

    $this->actingAs($user);

    expect(Tournament::count())->toBe(1);
});
