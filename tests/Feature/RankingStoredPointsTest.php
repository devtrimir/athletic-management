<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Competition;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use App\Services\Performance\PlayerPointsService;
use Database\Seeders\PointSchemeSeeder;

it('ranks players by stored points, each result on the version it was scored with', function (): void {
    $org = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $comp = Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('name_en', 'National Games')->firstOrFail();
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $make = function (string $date, ?string $medal) use ($org, $comp, $member) {
        $tournament = Tournament::factory()->forOrganization($org)->create(['competition_id' => $comp->id, 'date_from' => $date]);
        $participation = Participation::factory()->forEvent(Event::factory()->forTournament($tournament)->create())->create(['member_id' => $member->id]);
        $medal && Achievement::factory()->forParticipation($participation)->create(['medal_type' => $medal]);
    };

    $make('2026-03-01', 'GOLD');           // Version 1: national gold 60

    $v2 = PointScheme::factory()->effectiveFrom('2027-01-01')->create(['organization_id' => $org->id, 'version_number' => 2, 'status' => 'active', 'published_at' => now()]);
    $v1Id = PointScheme::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('version_number', 1)->value('id');
    PointSchemeRow::where('point_scheme_id', $v1Id)->get()->each(fn ($row) => PointSchemeRow::create(['point_scheme_id' => $v2->id, 'game_level_id' => $row->game_level_id, 'result' => $row->result, 'points' => $row->points + 1]));

    $make('2027-02-01', null);             // Version 2: national participation 31
    $make('2027-03-01', 'SILVER');         // Version 2: national silver 51

    $result = app(PlayerPointsService::class)->run($org->id);

    expect($result['by_member'])->toHaveCount(1)
        ->and($result['by_member'][0]['points'])->toBe(60 + 31 + 51)
        ->and($result['rows']->pluck('scoring.version')->sort()->values()->all())->toBe([1, 2, 2]);

    // Changing Version 2 later does not touch what Version 1 already gave.
    PointSchemeRow::where('point_scheme_id', $v2->id)->update(['points' => 5]);
    expect(app(PlayerPointsService::class)->run($org->id)['rows']->firstWhere('scoring.version', 1)['scoring']['total_points'])->toBe(60);
});

it('gives no points to results of tournaments without a competition', function (): void {
    $org = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $tournament = Tournament::factory()->forOrganization($org)->create(['date_from' => '2026-03-01']);
    $participation = Participation::factory()->forEvent(Event::factory()->forTournament($tournament)->create())
        ->create(['member_id' => Member::factory()->create(['organization_id' => $org->id])->id]);
    Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'GOLD']);

    $row = app(PlayerPointsService::class)->run($org->id)['rows'][0];

    expect($row['scoring'])->toBe(['total_points' => 0, 'result' => null, 'game_level' => null, 'version' => null]);
});
