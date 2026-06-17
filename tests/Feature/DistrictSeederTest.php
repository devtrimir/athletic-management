<?php

use App\Models\District;
use Database\Seeders\DistrictSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('district seeder inserts all 75 UP districts', function (): void {
    $this->seed(DistrictSeeder::class);

    expect(District::count())->toBe(75);
});

test('district seeder is idempotent', function (): void {
    $this->seed(DistrictSeeder::class);

    expect(District::count())->toBe(75);
});

test('district seeder sets state to Uttar Pradesh for every row', function (): void {
    $this->seed(DistrictSeeder::class);

    expect(District::where('state', '!=', 'Uttar Pradesh')->count())->toBe(0);
});

test('lucknow and varanasi are present with correct data', function (): void {
    $this->seed(DistrictSeeder::class);

    $lucknow = District::where('code', 'LKO')->first();
    expect($lucknow)->not->toBeNull()
        ->and($lucknow->name)->toBe('लखनऊ')
        ->and($lucknow->name)->toBe('Lucknow');

    $varanasi = District::where('code', 'VNS')->first();
    expect($varanasi)->not->toBeNull()
        ->and($varanasi->name)->toBe('वाराणसी')
        ->and($varanasi->name)->toBe('Varanasi');
});

test('every district has non-empty name name code and state', function (): void {
    $this->seed(DistrictSeeder::class);

    $invalid = District::where('name', '')->orWhere('name', '')->orWhere('code', '')->orWhere('state', '')->count();
    expect($invalid)->toBe(0);
});
