<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\GenderCategory;
use App\Models\MeasurementUnit;
use App\Models\ParticipationFormat;
use App\Models\ResultType;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\SportEventVariant;
use App\Models\WeightCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class SportEventVariantSeeder extends Seeder
{
    public function run(): void
    {
        $sports = Sport::withoutGlobalScopes()->get()->keyBy('code');
        $formats = ParticipationFormat::all()->keyBy('code');
        $genders = GenderCategory::all()->keyBy('code');
        $units = MeasurementUnit::all()->keyBy('code');
        $resultTypes = ResultType::all()->keyBy('code');
        $sportEvents = SportEvent::all()->groupBy('sport_id');
        $weightCategories = WeightCategory::all()->groupBy('sport_id');

        foreach (SportMasterDataCatalog::sportEvents() as $sportCode => $events) {
            $sport = $sports->get($sportCode);

            if ($sport === null) {
                continue;
            }

            foreach ($events as $eventIndex => $event) {
                $sportEvent = $this->findSportEvent($sportEvents, $sport->id, $event['code']);

                if ($sportEvent === null) {
                    continue;
                }

                foreach ($event['genders'] as $genderCode) {
                    $gender = $genders->get($genderCode);

                    if ($gender === null) {
                        continue;
                    }

                    $matchingWeights = $event['format'] === 'WEIGHT_CATEGORY'
                        ? $this->matchingWeights($weightCategories, $sport->id, $gender->id)
                        : collect();

                    if ($matchingWeights->isNotEmpty()) {
                        foreach ($matchingWeights as $weightIndex => $weightCategory) {
                            $this->seedVariant(
                                sport: $sport,
                                sportEvent: $sportEvent,
                                event: $event,
                                gender: $gender,
                                format: $formats->get($event['format']),
                                unit: $units->get($event['unit']),
                                resultType: $resultTypes->get($event['result']),
                                sortOrder: ($eventIndex + 1) * 100 + $weightIndex + 1,
                                weightCategory: $weightCategory,
                            );
                        }

                        continue;
                    }

                    $this->seedVariant(
                        sport: $sport,
                        sportEvent: $sportEvent,
                        event: $event,
                        gender: $gender,
                        format: $formats->get($event['format']),
                        unit: $units->get($event['unit']),
                        resultType: $resultTypes->get($event['result']),
                        sortOrder: ($eventIndex + 1) * 100,
                    );
                }
            }
        }
    }

    /**
     * @param  Collection<int, Collection<int, SportEvent>>  $sportEvents
     */
    private function findSportEvent(Collection $sportEvents, int $sportId, string $code): ?SportEvent
    {
        return $sportEvents
            ->get($sportId, collect())
            ->first(fn (SportEvent $event): bool => $event->code === $code);
    }

    /**
     * @param  Collection<int, Collection<int, WeightCategory>>  $weightCategories
     * @return Collection<int, WeightCategory>
     */
    private function matchingWeights(Collection $weightCategories, int $sportId, int $genderCategoryId): Collection
    {
        return $weightCategories
            ->get($sportId, collect())
            ->filter(fn (WeightCategory $category): bool => $category->gender_category_id === $genderCategoryId)
            ->values();
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function seedVariant(
        Sport $sport,
        SportEvent $sportEvent,
        array $event,
        GenderCategory $gender,
        ?ParticipationFormat $format,
        ?MeasurementUnit $unit,
        ?ResultType $resultType,
        int $sortOrder,
        ?WeightCategory $weightCategory = null,
    ): void {
        if ($format === null) {
            $this->command?->warn("SportEventVariantSeeder: missing format {$event['format']}.");

            return;
        }

        $codeParts = [$sport->code, $event['code'], $gender->code];
        $nameParts = [$sportEvent->name, $gender->name];

        if ($weightCategory !== null) {
            $codeParts[] = $weightCategory->code;
            $nameParts[] = $weightCategory->name;
        }

        $mixed = $event['mixed'] ?? null;

        SportEventVariant::updateOrCreate(
            [
                'sport_id' => $sport->id,
                'code' => implode('_', $codeParts),
            ],
            [
                'sport_event_id' => $sportEvent->id,
                'participation_format_id' => $format->id,
                'gender_category_id' => $gender->id,
                'age_category_id' => null,
                'weight_category_id' => $weightCategory?->id,
                'measurement_unit_id' => $unit?->id,
                'result_type_id' => $resultType?->id,
                'name' => implode(' - ', $nameParts),
                'min_participants' => $event['min'] ?? $format->min_players,
                'max_participants' => $event['max'] ?? $format->max_players,
                'min_male_participants' => is_array($mixed) ? $mixed[0] : null,
                'max_male_participants' => is_array($mixed) ? $mixed[0] : null,
                'min_female_participants' => is_array($mixed) ? $mixed[1] : null,
                'max_female_participants' => is_array($mixed) ? $mixed[1] : null,
                'substitute_allowed' => ($event['substitutes'] ?? null) !== null,
                'substitute_limit' => $event['substitutes'] ?? null,
                'is_team_based' => $format->is_team_based,
                'is_medal_event' => true,
                'is_active' => true,
                'sort_order' => $sortOrder,
            ],
        );
    }
}
