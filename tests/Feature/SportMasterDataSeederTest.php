<?php

declare(strict_types=1);

use App\Models\GenderCategory;
use App\Models\Organization;
use App\Models\ParticipationFormat;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\SportEventVariant;
use App\Models\WeightCategory;
use Database\Seeders\AgeCategorySeeder;
use Database\Seeders\GenderCategorySeeder;
use Database\Seeders\MeasurementUnitSeeder;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\ParticipationFormatSeeder;
use Database\Seeders\ResultTypeSeeder;
use Database\Seeders\SportEventSeeder;
use Database\Seeders\SportEventVariantSeeder;
use Database\Seeders\SportSeeder;
use Database\Seeders\WeightCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function seedSportMasterData(): void
{
    test()->seed(OrganizationSeeder::class);
    test()->seed(SportSeeder::class);
    test()->seed(ParticipationFormatSeeder::class);
    test()->seed(GenderCategorySeeder::class);
    test()->seed(AgeCategorySeeder::class);
    test()->seed(MeasurementUnitSeeder::class);
    test()->seed(ResultTypeSeeder::class);
    test()->seed(SportEventSeeder::class);
    test()->seed(WeightCategorySeeder::class);
    test()->seed(SportEventVariantSeeder::class);
}

test('sport master data seeders are idempotent', function (): void {
    seedSportMasterData();

    $counts = [
        'sports' => Sport::withoutGlobalScopes()->count(),
        'formats' => ParticipationFormat::count(),
        'genders' => GenderCategory::count(),
        'events' => SportEvent::count(),
        'weights' => WeightCategory::count(),
        'variants' => SportEventVariant::count(),
    ];

    seedSportMasterData();

    expect(Sport::withoutGlobalScopes()->count())->toBe($counts['sports'])
        ->and(ParticipationFormat::count())->toBe($counts['formats'])
        ->and(GenderCategory::count())->toBe($counts['genders'])
        ->and(SportEvent::count())->toBe($counts['events'])
        ->and(WeightCategory::count())->toBe($counts['weights'])
        ->and(SportEventVariant::count())->toBe($counts['variants']);
});

test('every seeded sport has at least one sport event and final variant', function (): void {
    seedSportMasterData();

    $sports = Sport::withoutGlobalScopes()->withCount(['sportEvents', 'eventVariants'])->get();

    expect($sports)->toHaveCount(41)
        ->and($sports->whereNull('code'))->toHaveCount(0)
        ->and($sports->filter(fn (Sport $sport): bool => $sport->sport_events_count < 1))->toHaveCount(0)
        ->and($sports->filter(fn (Sport $sport): bool => $sport->event_variants_count < 1))->toHaveCount(0);
});

test('representative event variants include rules and composition data', function (): void {
    seedSportMasterData();

    $athleticsMixedRelay = SportEventVariant::query()
        ->where('code', 'ATHLETICS_4X400M_RELAY_MIXED')
        ->firstOrFail();

    $badmintonMixedDoubles = SportEventVariant::query()
        ->where('code', 'BADMINTON_MIXED_DOUBLES_MIXED')
        ->firstOrFail();

    $footballMen = SportEventVariant::query()
        ->where('code', 'FOOTBALL_MATCH_MEN')
        ->firstOrFail();

    expect($athleticsMixedRelay->min_participants)->toBe(4)
        ->and($athleticsMixedRelay->max_participants)->toBe(4)
        ->and($athleticsMixedRelay->min_male_participants)->toBe(2)
        ->and($athleticsMixedRelay->min_female_participants)->toBe(2)
        ->and($athleticsMixedRelay->substitute_limit)->toBe(2)
        ->and($badmintonMixedDoubles->min_participants)->toBe(2)
        ->and($badmintonMixedDoubles->min_male_participants)->toBe(1)
        ->and($badmintonMixedDoubles->min_female_participants)->toBe(1)
        ->and($footballMen->is_team_based)->toBeTrue()
        ->and($footballMen->min_participants)->toBe(11)
        ->and($footballMen->max_participants)->toBe(18)
        ->and($footballMen->substitute_allowed)->toBeTrue();
});

test('combat and lifting sports seed practical weight categories', function (): void {
    seedSportMasterData();

    $org = Organization::where('code', 'UPP')->firstOrFail();
    $boxing = Sport::withoutGlobalScopes()
        ->where('organization_id', $org->id)
        ->where('code', 'BOXING')
        ->firstOrFail();

    $wrestling = Sport::withoutGlobalScopes()
        ->where('organization_id', $org->id)
        ->where('code', 'WRESTLING')
        ->firstOrFail();

    expect(WeightCategory::where('sport_id', $boxing->id)->count())->toBeGreaterThan(15)
        ->and(WeightCategory::where('sport_id', $wrestling->id)->count())->toBeGreaterThan(15)
        ->and(SportEventVariant::where('code', 'BOXING_BOUT_MEN_U51KG_MEN')->exists())->toBeTrue()
        ->and(SportEventVariant::where('code', 'WRESTLING_FREESTYLE_WOMEN_U53KG_WOMEN')->exists())->toBeTrue();
});
