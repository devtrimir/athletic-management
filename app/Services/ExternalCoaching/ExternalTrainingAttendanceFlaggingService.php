<?php

declare(strict_types=1);

namespace App\Services\ExternalCoaching;

use App\Models\ExternalCoachingAssignment;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class ExternalTrainingAttendanceFlaggingService
{
    // ponytail: global 100m accuracy threshold; move to venue/config policy when calibration differs by site.
    private const int MaximumGpsAccuracyMeters = 100;

    /**
     * @return array{geo_status: string, flag_reason: string|null}
     */
    public function flag(
        ExternalCoachingAssignment $assignment,
        ?float $latitude,
        ?float $longitude,
        ?int $gpsAccuracy,
        ?float $distanceMeters,
        CarbonInterface $submittedAt,
        ?int $allowedRadiusMeters,
    ): array {
        if ($latitude === null || $longitude === null) {
            return ['geo_status' => 'location_missing', 'flag_reason' => 'Location coordinates were not submitted.'];
        }

        if ($gpsAccuracy !== null && $gpsAccuracy > self::MaximumGpsAccuracyMeters) {
            return ['geo_status' => 'low_accuracy', 'flag_reason' => "GPS accuracy was {$gpsAccuracy} meters."];
        }

        if ($allowedRadiusMeters !== null && $distanceMeters !== null && $distanceMeters > $allowedRadiusMeters) {
            return ['geo_status' => 'outside_radius', 'flag_reason' => "Submission was {$distanceMeters} meters from the venue."];
        }

        if ($assignment->training_start_time !== null && $assignment->training_end_time !== null) {
            $trainingStart = Carbon::parse($submittedAt->toDateString().' '.$assignment->training_start_time);
            $trainingEnd = Carbon::parse($submittedAt->toDateString().' '.$assignment->training_end_time);

            if ($submittedAt->lt($trainingStart) || $submittedAt->gt($trainingEnd)) {
                return ['geo_status' => 'outside_training_time', 'flag_reason' => 'Submission was outside the approved training time.'];
            }
        }

        return ['geo_status' => 'valid', 'flag_reason' => null];
    }
}
