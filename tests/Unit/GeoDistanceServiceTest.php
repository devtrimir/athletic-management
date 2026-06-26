<?php

declare(strict_types=1);

use App\Services\ExternalCoaching\GeoDistanceService;

test('geo distance service calculates meters between valid coordinates', function (): void {
    $distance = (new GeoDistanceService)->metersBetween(26.8467, 80.9462, 26.8477, 80.9462);

    expect($distance)->toBeGreaterThan(100.0)
        ->and($distance)->toBeLessThan(120.0);
});

test('geo distance service returns null for missing or invalid coordinates', function (): void {
    $service = new GeoDistanceService;

    expect($service->metersBetween(null, 80.9462, 26.8477, 80.9462))->toBeNull()
        ->and($service->metersBetween(126.8467, 80.9462, 26.8477, 80.9462))->toBeNull();
});

test('example', function () {
    expect(true)->toBeTrue();
});
