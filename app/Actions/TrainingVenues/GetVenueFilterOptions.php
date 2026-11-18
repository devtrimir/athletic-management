<?php

declare(strict_types=1);

namespace App\Actions\TrainingVenues;

use App\Models\ExternalCoach;
use App\Models\Sport;
use App\Models\TrainingVenue;

class GetVenueFilterOptions
{
    /**
     * Only values that can actually match something: cities and states that
     * are filled in, coaches linked to a venue, and sports of such coaches.
     *
     * @return array{statuses: list<string>, cities: list<string>, states: list<string>, coaches: mixed, sports: mixed}
     */
    public function __invoke(int $organizationId): array
    {
        return [
            'statuses' => TrainingVenue::STATUSES,
            'cities' => $this->distinctValues('city'),
            'states' => $this->distinctValues('state'),
            'coaches' => ExternalCoach::query()
                ->where('organization_id', $organizationId)
                ->whereHas('trainingVenues')
                ->orderBy('name')
                ->get(['id', 'name']),
            'sports' => Sport::query()
                ->where('organization_id', $organizationId)
                ->whereHas('externalCoaches.trainingVenues')
                ->orderBy('name')
                ->get(['id', 'name']),
        ];
    }

    /**
     * @return list<string>
     */
    private function distinctValues(string $column): array
    {
        return TrainingVenue::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->all();
    }
}
