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
            'member_name' => ['nullable', 'string', 'max:100'],
            'pno' => ['nullable', 'string', 'max:20'],
            'tournament_id' => ['nullable', 'integer'],
            'event_name' => ['nullable', 'string', 'max:100'],
            'medal_type' => ['nullable', 'string', 'in:GOLD,SILVER,BRONZE,MERIT'],
            'gender' => ['nullable', 'string', 'in:M,F,O'],
        ];
    }

    /**
     * Extract filter values from the request as nullable ints/strings.
     *
     * @return array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null, member_name: string|null, tournament_id: int|null, event_name: string|null}
     */
    protected function resolvedFilters(Request $request): array
    {
        return [
            'session_id' => $request->integer('session_id') ?: null,
            'sport_id' => $request->integer('sport_id') ?: null,
            'unit_id' => $request->integer('unit_id') ?: null,
            'tier_id' => $request->integer('tier_id') ?: null,
            'member_name' => $request->input('member_name') ?: null,
            'pno' => $request->input('pno') ?: null,
            'tournament_id' => $request->integer('tournament_id') ?: null,
            'event_name' => $request->input('event_name') ?: null,
            'medal_type' => $request->input('medal_type') ?: null,
            'gender' => $request->input('gender') ?: null,
        ];
    }
}
