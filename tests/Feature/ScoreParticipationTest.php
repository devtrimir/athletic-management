<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Competition;
use App\Models\Event;
use App\Models\GameLevel;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationScore;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Team;
use App\Models\Tournament;
use Database\Seeders\PointSchemeSeeder;

function scoreSetup(string $competition = 'Asian Games', ?string $date = '2026-03-01'): array
{
    $org = Organization::factory()->create();
    test()->seed(PointSchemeSeeder::class);
    $comp = Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('name_en', $competition)->firstOrFail();
    $tournament = Tournament::factory()->forOrganization($org)->create(['competition_id' => $comp->id, 'date_from' => $date]);
    $event = Event::factory()->forTournament($tournament)->create();

    return [$org, $comp, $tournament, $event];
}

function scores(Participation $participation): array
{
    return ParticipationScore::where('participation_id', $participation->id)->orderBy('member_id')->get()->map(fn ($s) => [$s->member_id, $s->result, $s->points])->all();
}

it('scores a medal and participation from the version in force', function (): void {
    [$org, , , $event] = scoreSetup();
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $gold = Participation::factory()->forEvent($event)->create(['member_id' => $member->id]);
    $played = Participation::factory()->forEvent($event)->create();

    expect(scores($played))->toBe([[$played->member_id, 'PARTICIPATION', 50]]);

    Achievement::factory()->forParticipation($gold)->create(['medal_type' => 'GOLD']);

    // Senior continental: gold 80.
    expect(scores($gold))->toBe([[$member->id, 'GOLD', 80]]);

    Achievement::where('participation_id', $gold->id)->update(['medal_type' => 'BRONZE']);
    Achievement::where('participation_id', $gold->id)->first()->save();

    expect(scores($gold))->toBe([[$member->id, 'BRONZE', 60]]);

    Achievement::where('participation_id', $gold->id)->first()->delete();

    expect(scores($gold))->toBe([[$member->id, 'PARTICIPATION', 50]]);
});

it('gives every player of a team the full points', function (): void {
    [$org, , , $event] = scoreSetup();
    $team = Team::factory()->create(['organization_id' => $org->id]);
    $players = collect(Member::factory()->count(3)->create(['organization_id' => $org->id]))->map(function ($member) use ($event, $team) {
        $participation = Participation::factory()->forEvent($event)->create(['member_id' => $member->id, 'team_id' => $team->id]);
        Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'SILVER']);

        return $participation;
    });

    expect(ParticipationScore::whereIn('participation_id', $players->pluck('id'))->pluck('points')->all())->toBe([70, 70, 70]);
});

it('scores nothing until a competition is attached, then reprocesses', function (): void {
    [$org, $comp, $tournament, $event] = scoreSetup();
    $tournament->update(['competition_id' => null]);
    $participation = Participation::factory()->forEvent($event)->create();

    expect(scores($participation))->toBe([]);

    $tournament->update(['competition_id' => $comp->id]);

    expect(scores($participation))->toBe([[$participation->member_id, 'PARTICIPATION', 50]]);

    $tournament->update(['competition_id' => null]);

    expect(scores($participation))->toBe([]);
});

it('keeps old results on their version when a new one is published', function (): void {
    [$org, , $tournament, $event] = scoreSetup(date: '2026-03-01');
    $old = Participation::factory()->forEvent($event)->create();

    $v2 = PointScheme::factory()->effectiveFrom('2027-01-01')->create(['organization_id' => $org->id, 'version_number' => 2, 'status' => 'active', 'published_at' => now()]);
    foreach (PointSchemeRow::where('point_scheme_id', PointScheme::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('version_number', 1)->value('id'))->get() as $row) {
        PointSchemeRow::create(['point_scheme_id' => $v2->id, 'game_level_id' => $row->game_level_id, 'result' => $row->result, 'points' => $row->points * 2]);
    }

    $newTournament = Tournament::factory()->forOrganization($org)->create(['competition_id' => $tournament->competition_id, 'date_from' => '2027-02-01']);
    $new = Participation::factory()->forEvent(Event::factory()->forTournament($newTournament)->create())->create();

    expect(scores($old))->toBe([[$old->member_id, 'PARTICIPATION', 50]])
        ->and(scores($new))->toBe([[$new->member_id, 'PARTICIPATION', 100]])
        ->and(ParticipationScore::where('participation_id', $old->id)->value('point_scheme_id'))->not->toBe($v2->id);
});

it('backfills existing participations with the points:score command', function (): void {
    [, , , $event] = scoreSetup();
    $participation = Participation::factory()->forEvent($event)->create();
    ParticipationScore::query()->delete();

    $this->artisan('points:score')->assertSuccessful();

    expect(scores($participation))->toHaveCount(1);
});

it('scores from the tournament\'s game level directly, and the level wins over an old competition link', function (): void {
    $org = Organization::factory()->create();
    $this->seed(PointSchemeSeeder::class);
    $level = fn (string $code) => GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('code', $code)->firstOrFail();
    $asianGames = Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('name_en', 'Asian Games')->firstOrFail();

    $tournament = Tournament::factory()->forOrganization($org)->create(['game_level_id' => $level('NATIONAL')->id, 'competition_id' => $asianGames->id, 'date_from' => '2026-03-01']);
    $participation = Participation::factory()->forEvent(Event::factory()->forTournament($tournament)->create())->create();
    Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'GOLD']);

    // National gold is 60; the Asian Games competition (senior continental, 80) is ignored.
    expect(scores($participation))->toBe([[$participation->member_id, 'GOLD', 60]]);

    $tournament->update(['game_level_id' => $level('OLYMPIC')->id]);

    expect(scores($participation))->toBe([[$participation->member_id, 'GOLD', 100]]);

    $tournament->update(['game_level_id' => null, 'competition_id' => null]);

    expect(scores($participation))->toBe([]);
});
