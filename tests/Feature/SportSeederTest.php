<?php

use App\Models\Organization;
use App\Models\Sport;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\SportSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('sport seeder inserts all 38 sports', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    expect(Sport::count())->toBe(38);
});

test('sport seeder is idempotent', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);
    $this->seed(SportSeeder::class);

    expect(Sport::count())->toBe(38);
});

test('all sports belong to the UPP organisation', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $org = Organization::where('code', 'UPP')->first();
    expect($org)->not->toBeNull()
        ->and(Sport::where('organization_id', $org->id)->count())->toBe(38);
});

test('all category values are valid', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $valid = ['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'];
    $invalid = Sport::whereNotIn('category', $valid)->count();
    expect($invalid)->toBe(0);
});

test('each category has the expected count', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    expect(Sport::where('category', 'INDIVIDUAL')->count())->toBe(14)
        ->and(Sport::where('category', 'COMBAT')->count())->toBe(9)
        ->and(Sport::where('category', 'TEAM')->count())->toBe(10)
        ->and(Sport::where('category', 'WATER')->count())->toBe(5);
});

test('known sports are present with correct data', function (): void {
    $this->seed(OrganizationSeeder::class);
    $this->seed(SportSeeder::class);

    $hockey = Sport::where('slug', 'hockey')->first();
    expect($hockey)->not->toBeNull()
        ->and($hockey->name_hi)->toBe('हॉकी')
        ->and($hockey->category)->toBe('TEAM');

    $boxing = Sport::where('slug', 'boxing')->first();
    expect($boxing)->not->toBeNull()
        ->and($boxing->name_hi)->toBe('बॉक्सिंग')
        ->and($boxing->category)->toBe('COMBAT');
});
