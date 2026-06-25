<?php

declare(strict_types=1);

namespace App\Support\Reports;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class MedalsFilters
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        return [
            'year_from' => ['nullable', 'integer', 'min:1900', 'max:2099'],
            'year_to' => ['nullable', 'integer', 'min:1900', 'max:2099'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'sport_id' => ['nullable', 'integer', 'exists:sports,id'],
            'sport_ids' => ['nullable', 'array'],
            'sport_ids.*' => ['integer', 'exists:sports,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'unit_ids' => ['nullable', 'array'],
            'unit_ids.*' => ['integer', 'exists:units,id'],
            'tier_id' => ['nullable', 'integer', 'exists:tournament_tiers,id'],
            'tier_ids' => ['nullable', 'array'],
            'tier_ids.*' => ['integer', 'exists:tournament_tiers,id'],
            'session_id' => ['nullable', 'integer', 'exists:sport_sessions,id'],
            'session_ids' => ['nullable', 'array'],
            'session_ids.*' => ['integer', 'exists:sport_sessions,id'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', 'exists:members,id'],
            'district_ids' => ['nullable', 'array'],
            'district_ids.*' => ['integer', 'exists:districts,id'],
            'rank_codes' => ['nullable', 'array'],
            'rank_codes.*' => ['string', 'max:100'],
            'designations' => ['nullable', 'array'],
            'designations.*' => ['string', 'max:100'],
            'player_categories' => ['nullable', 'array'],
            'player_categories.*' => ['string', 'in:GD,SPORTS_QUOTA'],
            'player_levels' => ['nullable', 'array'],
            'player_levels.*' => ['string', 'in:ZONAL,NATIONAL,INTERNATIONAL,AIPSC'],
            'statuses' => ['nullable', 'array'],
            'statuses.*' => ['string', 'in:ACTIVE,RESIGNED,DISMISSED,DECEASED,RETIRED'],
            'member_name' => ['nullable', 'string', 'max:100'],
            'pno' => ['nullable', 'string', 'max:20'],
            'tournament_id' => ['nullable', 'integer'],
            'tournament_ids' => ['nullable', 'array'],
            'tournament_ids.*' => ['integer'],
            'tournament_name' => ['nullable', 'string', 'max:150'],
            'venue' => ['nullable', 'string', 'max:150'],
            'event_name' => ['nullable', 'string', 'max:100'],
            'event_id' => ['nullable', 'integer'],
            'event_ids' => ['nullable', 'array'],
            'event_ids.*' => ['integer'],
            'disciplines' => ['nullable', 'array'],
            'disciplines.*' => ['string', 'max:100'],
            'weight_categories' => ['nullable', 'array'],
            'weight_categories.*' => ['string', 'max:100'],
            'event_gender_classes' => ['nullable', 'array'],
            'event_gender_classes.*' => ['string', 'in:M,F,MIXED,OPEN'],
            'medal_type' => ['nullable', 'string', 'in:GOLD,SILVER,BRONZE,MERIT'],
            'medal_types' => ['nullable', 'array'],
            'medal_types.*' => ['string', 'in:GOLD,SILVER,BRONZE,MERIT'],
            'gender' => ['nullable', 'string', 'in:M,F,O'],
            'genders' => ['nullable', 'array'],
            'genders.*' => ['string', 'in:M,F,O'],
            'position_from' => ['nullable', 'integer', 'min:1', 'max:999'],
            'position_to' => ['nullable', 'integer', 'min:1', 'max:999'],
            'has_remarks' => ['nullable', 'boolean'],
            'benefit_types' => ['nullable', 'array'],
            'benefit_types.*' => ['string', 'in:PROMOTION,OUT_OF_TURN_PROMOTION,CASH_AWARD,COMMENDATION,NONE,OTHER'],
            'benefit_date_from' => ['nullable', 'date'],
            'benefit_date_to' => ['nullable', 'date'],
            'order_reference' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromRequest(Request $request): array
    {
        return [
            'year_from' => $request->integer('year_from') ?: null,
            'year_to' => $request->integer('year_to') ?: null,
            'date_from' => self::stringOrNull($request, 'date_from'),
            'date_to' => self::stringOrNull($request, 'date_to'),
            'sport_ids' => self::ids($request, 'sport_ids', 'sport_id'),
            'unit_ids' => self::ids($request, 'unit_ids', 'unit_id'),
            'tier_ids' => self::ids($request, 'tier_ids', 'tier_id'),
            'session_ids' => self::ids($request, 'session_ids', 'session_id'),
            'member_ids' => self::ids($request, 'member_ids'),
            'district_ids' => self::ids($request, 'district_ids'),
            'rank_codes' => self::strings($request, 'rank_codes'),
            'designations' => self::strings($request, 'designations'),
            'player_categories' => self::strings($request, 'player_categories'),
            'player_levels' => self::strings($request, 'player_levels'),
            'statuses' => self::strings($request, 'statuses'),
            'member_name' => self::stringOrNull($request, 'member_name'),
            'pno' => self::stringOrNull($request, 'pno'),
            'tournament_ids' => self::ids($request, 'tournament_ids', 'tournament_id'),
            'tournament_name' => self::stringOrNull($request, 'tournament_name'),
            'venue' => self::stringOrNull($request, 'venue'),
            'event_name' => self::stringOrNull($request, 'event_name'),
            'event_ids' => self::ids($request, 'event_ids', 'event_id'),
            'disciplines' => self::strings($request, 'disciplines'),
            'weight_categories' => self::strings($request, 'weight_categories'),
            'event_gender_classes' => self::strings($request, 'event_gender_classes'),
            'medal_types' => self::strings($request, 'medal_types', 'medal_type'),
            'genders' => self::strings($request, 'genders', 'gender'),
            'position_from' => $request->integer('position_from') ?: null,
            'position_to' => $request->integer('position_to') ?: null,
            'has_remarks' => $request->has('has_remarks') ? $request->boolean('has_remarks') : null,
            'benefit_types' => self::strings($request, 'benefit_types'),
            'benefit_date_from' => self::stringOrNull($request, 'benefit_date_from'),
            'benefit_date_to' => self::stringOrNull($request, 'benefit_date_to'),
            'order_reference' => self::stringOrNull($request, 'order_reference'),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        $filters = self::withLegacyKeys($filters);

        return $query
            ->when($filters['year_from'] ?? null, fn (Builder $query, int $year): Builder => $query->whereYear('t.date_from', '>=', $year))
            ->when($filters['year_to'] ?? null, fn (Builder $query, int $year): Builder => $query->whereYear('t.date_from', '<=', $year))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('t.date_from', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('t.date_from', '<=', $date))
            ->when($filters['sport_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('e.sport_id', $ids))
            ->when($filters['tier_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('t.tier_id', $ids))
            ->when($filters['session_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('t.session_id', $ids))
            ->when($filters['unit_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('m.current_unit_id', $ids))
            ->when($filters['member_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('m.id', $ids))
            ->when($filters['district_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('m.posting_district_id', $ids))
            ->when($filters['rank_codes'] ?? [], fn (Builder $query, array $codes): Builder => $query->whereIn('m.rank', $codes))
            ->when($filters['designations'] ?? [], fn (Builder $query, array $codes): Builder => $query->whereIn('m.designation', $codes))
            ->when($filters['player_categories'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.player_category', $values))
            ->when($filters['player_levels'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.player_level', $values))
            ->when($filters['statuses'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.current_status', $values))
            ->when($filters['member_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('m.full_name', 'like', "%{$value}%"))
            ->when($filters['pno'] ?? null, fn (Builder $query, string $value): Builder => $query->where('m.pno', 'like', "%{$value}%"))
            ->when($filters['tournament_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('t.id', $ids))
            ->when($filters['tournament_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('t.name', 'like', "%{$value}%"))
            ->when($filters['venue'] ?? null, fn (Builder $query, string $value): Builder => $query->where('t.venue', 'like', "%{$value}%"))
            ->when($filters['event_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('e.name', 'like', "%{$value}%"))
            ->when($filters['event_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('e.id', $ids))
            ->when($filters['disciplines'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('e.discipline', $values))
            ->when($filters['weight_categories'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('e.weight_category', $values))
            ->when($filters['event_gender_classes'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('e.gender_class', $values))
            ->when($filters['medal_types'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('a.medal_type', $values))
            ->when($filters['genders'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.gender', $values))
            ->when($filters['position_from'] ?? null, fn (Builder $query, int $position): Builder => $query->where('a.position', '>=', $position))
            ->when($filters['position_to'] ?? null, fn (Builder $query, int $position): Builder => $query->where('a.position', '<=', $position))
            ->when(($filters['has_remarks'] ?? null) !== null, fn (Builder $query): Builder => $filters['has_remarks']
                ? $query->whereNotNull('a.remarks')->where('a.remarks', '<>', '')
                : $query->where(fn (Builder $query): Builder => $query->whereNull('a.remarks')->orWhere('a.remarks', '')))
            ->when($filters['benefit_types'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('ab.benefit_type', $values))
            ->when($filters['benefit_date_from'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('ab.benefit_date', '>=', $date))
            ->when($filters['benefit_date_to'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('ab.benefit_date', '<=', $date))
            ->when($filters['order_reference'] ?? null, fn (Builder $query, string $value): Builder => $query->where('ab.order_reference', 'like', "%{$value}%"));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private static function withLegacyKeys(array $filters): array
    {
        foreach ([
            'sport_ids' => 'sport_id',
            'unit_ids' => 'unit_id',
            'tier_ids' => 'tier_id',
            'session_ids' => 'session_id',
            'tournament_ids' => 'tournament_id',
            'event_ids' => 'event_id',
            'medal_types' => 'medal_type',
            'genders' => 'gender',
        ] as $arrayKey => $legacyKey) {
            if (($filters[$arrayKey] ?? []) === [] && ($filters[$legacyKey] ?? null) !== null) {
                $filters[$arrayKey] = [$filters[$legacyKey]];
            }
        }

        return $filters;
    }

    private static function stringOrNull(Request $request, string $key): ?string
    {
        $value = trim((string) $request->input($key, ''));

        return $value === '' ? null : $value;
    }

    /**
     * @return list<int>
     */
    private static function ids(Request $request, string $key, ?string $legacyKey = null): array
    {
        return array_values(array_unique(array_map(
            intval(...),
            self::values($request, $key, $legacyKey),
        )));
    }

    /**
     * @return list<string>
     */
    private static function strings(Request $request, string $key, ?string $legacyKey = null): array
    {
        return array_values(array_unique(array_filter(
            array_map(fn (mixed $value): string => trim((string) $value), self::values($request, $key, $legacyKey)),
            fn (string $value): bool => $value !== '',
        )));
    }

    /**
     * @return list<mixed>
     */
    private static function values(Request $request, string $key, ?string $legacyKey = null): array
    {
        $value = $request->input($key);

        if ($value === null && $legacyKey !== null) {
            $value = $request->input($legacyKey);
        }

        if ($value === null || $value === '') {
            return [];
        }

        if (is_string($value)) {
            return array_filter(explode(',', $value), fn (string $item): bool => trim($item) !== '');
        }

        return Arr::wrap($value);
    }
}
