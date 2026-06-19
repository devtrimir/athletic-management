<?php

use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\SportSeeder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Helper: bypass tenant scope — seeder tests have no authenticated user.
function allSports(): Collection
{
    return Sport::withoutGlobalScope(BelongsToOrganization::class)->get();
}

function sportsQuery(): Builder
{
    return Sport::withoutGlobalScope(BelongsToOrganization::class);
}

test('sport seeder inserts all 41 sports', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    expect(allSports()->count())->toBe(41);
});

test('sport seeder is idempotent', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);
    $this->seed(SportSeeder::class);

    expect(allSports()->count())->toBe(41);
});

test('all sports belong to the UPP organisation', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $org = Organization::where('code', 'UPP')->first();
    expect($org)->not->toBeNull()
        ->and(sportsQuery()->where('organization_id', $org->id)->count())->toBe(41);
});

test('all category values are valid', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $valid = ['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'];
    $invalid = sportsQuery()->whereNotIn('category', $valid)->count();
    expect($invalid)->toBe(0);
});

test('each category has the expected count', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    expect(sportsQuery()->where('category', 'INDIVIDUAL')->count())->toBe(14)
        ->and(sportsQuery()->where('category', 'COMBAT')->count())->toBe(10)
        ->and(sportsQuery()->where('category', 'TEAM')->count())->toBe(11)
        ->and(sportsQuery()->where('category', 'WATER')->count())->toBe(6);
});

test('known sports are present with correct data', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $hockey = sportsQuery()->where('code', 'HOCKEY')->first();
    expect($hockey)->not->toBeNull()
        ->and($hockey->name)->toBe('हॉकी')
        ->and($hockey->category)->toBe('TEAM');

    $boxing = sportsQuery()->where('code', 'BOXING')->first();
    expect($boxing)->not->toBeNull()
        ->and($boxing->name)->toBe('बॉक्सिंग')
        ->and($boxing->category)->toBe('COMBAT');
});
