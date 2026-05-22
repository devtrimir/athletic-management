<?php

use App\Models\Scopes\BelongsToOrganization;
use App\Models\SportSession;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\SportSessionSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Helper: bypass tenant scope — seeder tests have no authenticated user.
function allSessions(): Collection
{
    return SportSession::withoutGlobalScope(BelongsToOrganization::class)->get();
}

test('session seeder inserts 8 sessions', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(allSessions()->count())->toBe(8);
});

test('session seeder is idempotent', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);
    $this->seed(SportSessionSeeder::class);

    expect(allSessions()->count())->toBe(8);
});

test('exactly one session is current and it is 2026-27', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    $current = allSessions()->where('is_current', true);

    expect($current->count())->toBe(1)
        ->and($current->first()->name)->toBe('2026-27');
});

test('first and last session names are correct', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    $sessions = allSessions()->sortBy('start_year')->values();

    expect($sessions->first()->name)->toBe('2019-20')
        ->and($sessions->last()->name)->toBe('2026-27');
});

test('every session has correct start and end years', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSessionSeeder::class);

    allSessions()->each(function ($session): void {
        expect($session->end_year)->toBe($session->start_year + 1);
    });
});
