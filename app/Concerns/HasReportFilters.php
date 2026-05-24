<?php

declare(strict_types=1);

namespace App\Concerns;

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
        return [
            'session_id' => ['nullable', 'integer', 'exists:sport_sessions,id'],
            'sport_id' => ['nullable', 'integer', 'exists:sports,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'tier_id' => ['nullable', 'integer', 'exists:tournament_tiers,id'],
        ];
    }

    /**
     * Extract the four filter values from the request as nullable ints.
     *
     * @return array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}
     */
    protected function resolvedFilters(Request $request): array
    {
        return [
            'session_id' => $request->integer('session_id') ?: null,
            'sport_id' => $request->integer('sport_id') ?: null,
            'unit_id' => $request->integer('unit_id') ?: null,
            'tier_id' => $request->integer('tier_id') ?: null,
        ];
    }
}
