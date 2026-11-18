<?php

declare(strict_types=1);

namespace App\Actions\TrainingVenues;

use App\Models\ExternalCoach;
use App\Models\Sport;
use App\Models\TrainingVenue;
use App\Support\TrainingVenues\VenueFilters;

class GetVenuePrintData
{
    private const MAX_ROWS = 2000;

    /**
     * @return array{venues: list<array<string, mixed>>, filters: array<string, mixed>}
     */
    public function __invoke(VenueFilters $filters, int $organizationId): array
    {
        $venues = TrainingVenue::query()
            ->filter($filters)
            ->orderBy('name')
            ->limit(self::MAX_ROWS)
            ->get()
            ->map(fn (TrainingVenue $venue): array => [
                'id' => $venue->id,
                'name' => $venue->name,
                'code' => $venue->code,
                'city' => $venue->city,
                'allowed_radius_meters' => $venue->allowed_radius_meters,
                'status' => $venue->status,
            ])
            ->all();

        return [
            'venues' => $venues,
            // The printed heading names the coach and sport instead of showing ids.
            'filters' => [
                'q' => $filters->search,
                'status' => $filters->status,
                'city' => $filters->city,
                'state' => $filters->state,
                'coach' => $filters->coachId === null ? null : ExternalCoach::query()->where('organization_id', $organizationId)->whereKey($filters->coachId)->value('name'),
                'sport' => $filters->sportId === null ? null : Sport::query()->where('organization_id', $organizationId)->whereKey($filters->sportId)->value('name'),
            ],
        ];
    }
}
