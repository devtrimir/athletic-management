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

test('singular sport quota and variations normalize to sports quota', function (): void {
    expect(PlayerCategory::normalize('Sport Quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('sport quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('sport_quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('SPORT_QUOTA'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('Sports Quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('sports quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('sports_quota'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('SPORTS_QUOTA'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('Sport'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('Sports'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('कुशल खिलाड़ी'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('खेल कोटा'))->toBe(PlayerCategory::SPORTS_QUOTA)
        ->and(PlayerCategory::normalize('स्पोर्ट्स कोटा'))->toBe(PlayerCategory::SPORTS_QUOTA);

    expect(PlayerCategory::label('Sport Quota'))->toBe('Sports Quota')
        ->and(PlayerCategory::label('sport quota'))->toBe('Sports Quota')
        ->and(PlayerCategory::label('खेल कोटा'))->toBe('Sports Quota');
});

test('ground duty variations normalize to gd', function (): void {
    expect(PlayerCategory::normalize('Ground Duty'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('ground duty'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('ground_duty'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('GROUND_DUTY'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('General Duty'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('GD'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('gd'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('G.D.'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('जीडी'))->toBe(PlayerCategory::GD)
        ->and(PlayerCategory::normalize('सामान्य'))->toBe(PlayerCategory::GD);

    expect(PlayerCategory::label('ground duty'))->toBe('Ground Duty')
        ->and(PlayerCategory::label('जीडी'))->toBe('Ground Duty');
});

test('normalize handles empty and unknown values', function (): void {
    expect(PlayerCategory::normalize(null))->toBeNull();
    expect(PlayerCategory::normalize(''))->toBeNull();
    expect(PlayerCategory::normalize('   '))->toBeNull();
    expect(PlayerCategory::normalize('UNKNOWN'))->toBeNull();
});

test('label falls back to trimmed raw value for unknown codes', function (): void {
    expect(PlayerCategory::label(' something '))->toBe('something');
    expect(PlayerCategory::label(null))->toBeNull();
    expect(PlayerCategory::label(''))->toBeNull();
});
