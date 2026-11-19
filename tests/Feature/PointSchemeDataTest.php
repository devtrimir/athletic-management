<?php

declare(strict_types=1);

use App\Models\Competition;
use App\Models\GameLevel;
use App\Models\Organization;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Database\Seeders\PointSchemeSeeder;
use Illuminate\Database\QueryException;

function seededPoints(Organization $organization): array
{
    $scheme = PointScheme::withoutGlobalScope(BelongsToOrganization::class)
        ->where('organization_id', $organization->id)->where('version_number', 1)->firstOrFail();

    $codes = GameLevel::withoutGlobalScope(BelongsToOrganization::class)->pluck('code', 'id');

    return $scheme->rows()->get()
        ->groupBy(fn (PointSchemeRow $row) => $codes[$row->game_level_id])
        ->map(fn ($rows) => collect(PointScheme::RESULTS)->map(fn (string $result) => $rows->firstWhere('result', $result)->points)->all())
        ->all();
}

it('seeds Version 1 exactly as written on the points sheet', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);

    // Columns are Gold, Silver, Bronze, Participation.
    expect(seededPoints($organization))->toBe([
        'OLYMPIC' => [100, 90, 80, 70],
        'WORLD' => [90, 80, 70, 60],
        'SENIOR_CONTINENTAL' => [80, 70, 60, 50],
        'YOUTH_JUNIOR_UNIVERSITY' => [70, 60, 50, 40],
        'NATIONAL' => [60, 50, 40, 30],
        'FEDERATION' => [50, 40, 30, 20],
    ]);

    $scheme = PointScheme::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $organization->id)->firstOrFail();

    expect($scheme->version_number)->toBe(1)
        ->and($scheme->status)->toBe('active')
        ->and($scheme->effective_from)->toBeNull()
        ->and($scheme->rows)->toHaveCount(24);
});

it('groups the sheet\'s competitions under their game levels', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);

    $levels = GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $organization->id)->get();
    $byLevel = $levels->mapWithKeys(fn (GameLevel $level) => [
        $level->code => Competition::withoutGlobalScope(BelongsToOrganization::class)->where('game_level_id', $level->id)->orderBy('sort_order')->pluck('name_en')->all(),
    ]);

    expect($byLevel['OLYMPIC'])->toBe(['Olympic Games'])
        ->and($byLevel['WORLD'])->toBe(['World Cup', 'World Championship'])
        ->and($byLevel['SENIOR_CONTINENTAL'])->toBe(['Asian Games', 'Commonwealth Games', 'Commonwealth Championship', 'Asian Championship (Senior)', 'Asia Cup'])
        ->and($byLevel['YOUTH_JUNIOR_UNIVERSITY'])->toBe(['Youth Olympic Games', 'Asian Championship (Junior)', 'Commonwealth Youth Games', 'South Asian Games', 'World University Games', 'World University Championship'])
        ->and($byLevel['NATIONAL'])->toBe(['National Games', 'National Championship'])
        ->and($byLevel['FEDERATION'])->toHaveCount(5)
        ->and(Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $organization->id)->whereNull('name_hi')->count())->toBe(0);
});

it('never overwrites what an admin changed when the seeder runs again', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);

    $row = PointSchemeRow::query()->firstOrFail();
    $row->update(['points' => 999]);
    GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('code', 'NATIONAL')->update(['name_en' => 'Renamed']);

    $this->seed(PointSchemeSeeder::class);

    expect($row->fresh()->points)->toBe(999)
        ->and(GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('code', 'NATIONAL')->value('name_en'))->toBe('Renamed')
        ->and(PointScheme::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $organization->id)->count())->toBe(1)
        ->and(PointSchemeRow::count())->toBe(24);
});

it('seeds every organisation separately', function (): void {
    $first = Organization::factory()->create();
    $second = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);

    expect(seededPoints($first))->toBe(seededPoints($second))
        ->and(GameLevel::withoutGlobalScope(BelongsToOrganization::class)->count())->toBe(12)
        ->and(PointScheme::withoutGlobalScope(BelongsToOrganization::class)->count())->toBe(2);
});

it('lets Version 1 cover every date until a later version is published', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $inForce = fn (string $date) => PointScheme::withoutGlobalScope(BelongsToOrganization::class)
        ->where('organization_id', $organization->id)->inForceOn($date)->first()?->version_number;

    // Only Version 1 exists: it applies to old and future tournaments alike.
    expect($inForce('1990-01-01'))->toBe(1)
        ->and($inForce('2026-11-19'))->toBe(1)
        ->and($inForce('2035-06-30'))->toBe(1);

    $draft = PointScheme::factory()->draft()->effectiveFrom('2027-01-01')->create(['organization_id' => $organization->id, 'version_number' => 2]);

    // A draft is never used.
    expect($inForce('2028-01-01'))->toBe(1);

    $draft->update(['status' => 'active', 'published_at' => now()]);

    // Tournaments before the new version's start stay on Version 1; later ones follow Version 2.
    expect($inForce('2026-12-31'))->toBe(1)
        ->and($inForce('2027-01-01'))->toBe(2)
        ->and($inForce('2030-01-01'))->toBe(2);
});

it('keeps one row per level and result in a version, and protects levels in use', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $row = PointSchemeRow::query()->firstOrFail();

    expect(fn () => PointSchemeRow::create(['point_scheme_id' => $row->point_scheme_id, 'game_level_id' => $row->game_level_id, 'result' => $row->result, 'points' => 1]))
        ->toThrow(QueryException::class);

    // A level that a version (or competition) uses cannot be deleted, only deactivated.
    expect(fn () => GameLevel::withoutGlobalScope(BelongsToOrganization::class)->findOrFail($row->game_level_id)->delete())->toThrow(QueryException::class);
});

it('lets a tournament pick its competition and reach the level through it', function (): void {
    $organization = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $games = Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $organization->id)->where('name_en', 'Asian Games')->firstOrFail();

    $tournament = Tournament::factory()->create(['organization_id' => $organization->id, 'competition_id' => $games->id]);

    expect(GameLevel::withoutGlobalScope(BelongsToOrganization::class)->find(
        Competition::withoutGlobalScope(BelongsToOrganization::class)->find($tournament->competition_id)->game_level_id,
    )->code)->toBe('SENIOR_CONTINENTAL');

    // Deleting a competition leaves the tournament, just unclassified.
    $games->delete();

    expect($tournament->fresh()->competition_id)->toBeNull();
});
