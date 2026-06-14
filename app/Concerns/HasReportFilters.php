<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Support\Reports\MedalsFilters;
use Illuminate\Http\Request;

trait HasReportFilters
{
    /**
     * Validation rules for the four standard report filter parameters.
     *
     * @return array<string, list<string>>
     */
    protected function reportFilterRules(): array
    {
        return MedalsFilters::rules();
    }

    /**
     * Extract filter values from the request as nullable ints/strings.
     *
     * @return array{year_from: int|null, year_to: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null, member_name: string|null, tournament_id: int|null, event_name: string|null}
     */
    protected function resolvedFilters(Request $request): array
    {
        return MedalsFilters::fromRequest($request);
    }
}
