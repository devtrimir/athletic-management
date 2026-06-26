<?php

declare(strict_types=1);

namespace App\Services\ExternalCoaching;

class GeoDistanceService
{
    public function metersBetween(?float $fromLatitude, ?float $fromLongitude, ?float $toLatitude, ?float $toLongitude): ?float
    {
        if ($fromLatitude === null || $fromLongitude === null || $toLatitude === null || $toLongitude === null) {
            return null;
        }

        if (! $this->validCoordinate($fromLatitude, $fromLongitude) || ! $this->validCoordinate($toLatitude, $toLongitude)) {
            return null;
        }

        $earthRadiusMeters = 6371000;
        $latitudeDelta = deg2rad($toLatitude - $fromLatitude);
        $longitudeDelta = deg2rad($toLongitude - $fromLongitude);
        $fromLatitudeRadians = deg2rad($fromLatitude);
        $toLatitudeRadians = deg2rad($toLatitude);

        $haversine = sin($latitudeDelta / 2) ** 2
            + cos($fromLatitudeRadians) * cos($toLatitudeRadians) * sin($longitudeDelta / 2) ** 2;

        return round($earthRadiusMeters * 2 * atan2(sqrt($haversine), sqrt(1 - $haversine)), 2);
    }

    private function validCoordinate(float $latitude, float $longitude): bool
    {
        return $latitude >= -90.0
            && $latitude <= 90.0
            && $longitude >= -180.0
            && $longitude <= 180.0;
    }
}
