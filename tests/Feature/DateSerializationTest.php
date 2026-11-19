<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('serialises date-only fields on the same calendar day in IST, not the day before', function (): void {
    $member = Member::factory()->create([
        'organization_id' => Organization::factory()->create()->id,
        'joining_date' => '2023-08-26',
        'dob' => '1996-12-24',
    ]);

    $array = $member->fresh()->toArray();

    expect($array['joining_date'])->toBe('2023-08-26')
        ->and($array['dob'])->toBe('1996-12-24');
});

it('never uses a plain date cast on a model, which would send the previous day to the browser', function (): void {
    $offenders = collect(glob(app_path('Models/*.php')))
        ->filter(fn (string $file) => str_contains(file_get_contents($file), "=> 'date',"))
        ->map(fn (string $file) => basename($file))
        ->values()->all();

    expect($offenders)->toBe([]);
});
