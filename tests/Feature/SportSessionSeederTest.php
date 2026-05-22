<?php

use App\Models\SportSession;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\SportSessionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('session seeder inserts 8 sessions', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(SportSession::count())->toBe(8);
});

test('session seeder is idempotent', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(SportSession::count())->toBe(8);
});

test('exactly one session is current and it is 2026-27', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(SportSession::where('is_current', true)->count())->toBe(1)
        ->and(SportSession::where('is_current', true)->value('name'))->toBe('2026-27');
});

test('first and last session names are correct', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(SportSession::orderBy('start_year')->value('name'))->toBe('2019-20')
        ->and(SportSession::orderByDesc('start_year')->value('name'))->toBe('2026-27');
});

test('every session has correct start and end years', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    SportSession::all()->each(function ($session): void {
        expect($session->end_year)->toBe($session->start_year + 1);
    });
});
