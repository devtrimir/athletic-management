<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('members:sync-sport-events backfills pivot sport event data from a csv source', function (): void {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create([
        'organization_id' => $org->id,
        'name_hi' => 'आर्चरी',
        'name_en' => 'Archery',
    ]);

    $member = Member::factory()->create([
        'organization_id' => $org->id,
        'pno' => '1234567890',
        'sport_id' => $sport->id,
        'sport_event' => null,
    ]);

    $csvPath = tempnam(sys_get_temp_dir(), 'member-sport-');
    file_put_contents($csvPath, implode("\n", [
        'उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ',
        'क्र.सं.,क्र.सं.,क्र.सं.,क्र.सं.',
        '1,10 मीटर,1234567890,आरक्षी अक्षत,मेरठ',
    ]));

    $this->artisan('members:sync-sport-events', ['--source' => $csvPath])
        ->assertExitCode(0);

    $pivot = DB::table('member_sport')
        ->where('member_id', $member->id)
        ->where('sport_id', $sport->id)
        ->first();

    expect($pivot)->not->toBeNull();
    expect($pivot?->sport_event)->toBe('10 मीटर');

    unlink($csvPath);
});

test('members:sync-sport-events preserves existing pivot values while syncing from csv source', function (): void {
    $org = Organization::factory()->create();
    $sport = Sport::factory()->create([
        'organization_id' => $org->id,
        'name_hi' => 'आर्चरी',
        'name_en' => 'Archery',
    ]);

    $member = Member::factory()->create([
        'organization_id' => $org->id,
        'pno' => '9988776655',
        'sport_id' => $sport->id,
        'sport_event' => 'Legacy row text',
    ]);

    $member->playableSports()->attach($sport->id, [
        'role' => 'Batsman',
        'position' => '3',
        'sport_event' => 'Cricket',
        'notes' => 'Top order',
    ]);

    $csvPath = tempnam(sys_get_temp_dir(), 'member-sport-');
    file_put_contents($csvPath, implode("\n", [
        'उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ,उ.प्र. पुलिस आर्चरी टीम मेरठ',
        'क्र.सं.,क्र.सं.,क्र.सं.,क्र.सं.',
        '1,रिकर्व,9988776655,आरक्षी सुनील,मेरठ',
    ]));

    $this->artisan('members:sync-sport-events', ['--source' => $csvPath])
        ->assertExitCode(0);

    $pivot = DB::table('member_sport')
        ->where('member_id', $member->id)
        ->where('sport_id', $sport->id)
        ->first();

    expect($pivot)->not->toBeNull();
    expect($pivot?->sport_event)->toBe('Cricket');
    expect($pivot?->role)->toBe('Batsman');
    expect($pivot?->position)->toBe('3');

    unlink($csvPath);
});
