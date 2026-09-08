<?php

declare(strict_types=1);

use App\Support\Members\PlayerCategory;
use Tests\TestCase;

uses(TestCase::class);

test('gd resolves to ground duty label', function (): void {
    expect(PlayerCategory::label('GD'))->toBe('Ground Duty');
});

test('sports quota resolves to its label', function (): void {
    expect(PlayerCategory::label('SPORTS_QUOTA'))->toBe('Sports Quota');
});

test('legacy skilled code normalizes to sports quota', function (): void {
    expect(PlayerCategory::normalize('SKILLED'))->toBe(PlayerCategory::SPORTS_QUOTA);
    expect(PlayerCategory::label('SKILLED'))->toBe('Sports Quota');
});

test('normalize handles empty and unknown values', function (): void {
    expect(PlayerCategory::normalize(null))->toBeNull();
    expect(PlayerCategory::normalize(''))->toBeNull();
    expect(PlayerCategory::normalize('UNKNOWN'))->toBeNull();
});

test('label falls back to trimmed raw value for unknown codes', function (): void {
    expect(PlayerCategory::label(' something '))->toBe('something');
    expect(PlayerCategory::label(null))->toBeNull();
    expect(PlayerCategory::label(''))->toBeNull();
});
