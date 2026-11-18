<?php

declare(strict_types=1);

namespace App\Actions\TrainingVenues;

use App\Models\TrainingVenue;
use App\Support\TrainingVenues\VenueFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListTrainingVenues
{
    /**
     * @return LengthAwarePaginator<int, TrainingVenue>
     */
    public function __invoke(VenueFilters $filters, int $perPage): LengthAwarePaginator
    {
        return TrainingVenue::query()
            ->filter($filters)
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();
    }
}
