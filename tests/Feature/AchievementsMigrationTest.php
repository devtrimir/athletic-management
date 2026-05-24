<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Participation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('achievements table is created by migration', function () {
    expect(Schema::hasTable('achievements'))->toBeTrue();
});

test('achievements table has all required columns', function () {
    $columns = [
        'id', 'participation_id', 'medal_type', 'position', 'remarks',
        'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('achievements', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('position and remarks are nullable', function () {
    $achievement = Achievement::factory()->create([
        'position' => null,
        'remarks' => null,
    ]);

    expect($achievement->position)->toBeNull()
        ->and($achievement->remarks)->toBeNull();
});

test('deleting a participation cascades to its achievement', function () {
    $participation = Participation::factory()->create();
    $achievement = Achievement::factory()->forParticipation($participation)->create();

    $achievementId = $achievement->id;

    // Hard-delete via DB to trigger the cascade without ORM interference.
    DB::table('participations')->where('id', $participation->id)->delete();

    expect(DB::table('achievements')->find($achievementId))->toBeNull();
});

test('forParticipation factory state links achievement to the correct participation', function () {
    $participation = Participation::factory()->create();
    $achievement = Achievement::factory()->forParticipation($participation)->create();

    expect($achievement->participation_id)->toBe($participation->id);
});
