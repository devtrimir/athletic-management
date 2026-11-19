<?php

declare(strict_types=1);

use App\Actions\Points\PublishPointScheme;
use App\Actions\Points\ScoreTournament;
use App\Events\TournamentScoringFinished;
use App\Jobs\ScoreTournamentJob;
use App\Models\Achievement;
use App\Models\Event;
use App\Models\GameLevel;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationScore;
use App\Models\PointScheme;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Database\Seeders\PointSchemeSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event as EventBus;
use Illuminate\Support\Facades\Queue;

function bigTournament(int $players): array
{
    $org = Organization::factory()->create();
    test()->seed(PointSchemeSeeder::class);
    $level = GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('code', 'NATIONAL')->firstOrFail();
    $tournament = Tournament::factory()->forOrganization($org)->create(['date_from' => '2026-03-01']);
    $event = Event::factory()->forTournament($tournament)->create();
    $members = Member::factory()->count($players)->create(['organization_id' => $org->id]);
    $now = now();

    DB::table('participations')->insert($members->map(fn ($member) => [
        'event_id' => $event->id, 'member_id' => $member->id, 'session_id' => $tournament->session_id, 'created_at' => $now, 'updated_at' => $now,
    ])->all());

    return [$org, $level, $tournament, $event];
}

it('scores a large tournament in bulk with a small, fixed number of queries', function (): void {
    [, $level, $tournament] = bigTournament(1200);
    Queue::fake();
    $tournament->update(['game_level_id' => $level->id]);

    // 3 medallists among 1,200 players.
    Participation::orderBy('id')->limit(3)->get()->each(fn ($participation, $i) => Achievement::query()->insert([
        'participation_id' => $participation->id, 'medal_type' => ['GOLD', 'SILVER', 'BRONZE'][$i], 'created_at' => now(), 'updated_at' => now(),
    ]));

    DB::enableQueryLog();
    $scored = app(ScoreTournament::class)($tournament->fresh());
    $queries = count(DB::getQueryLog());

    expect($scored)->toBe(1200)
        ->and($queries)->toBeLessThan(40)
        ->and(ParticipationScore::count())->toBe(1200)
        ->and(ParticipationScore::where('result', 'GOLD')->value('points'))->toBe(60)
        ->and(ParticipationScore::where('result', 'SILVER')->value('points'))->toBe(50)
        ->and(ParticipationScore::where('result', 'BRONZE')->value('points'))->toBe(40)
        ->and(ParticipationScore::where('result', 'PARTICIPATION')->count())->toBe(1197)
        ->and(ParticipationScore::where('result', 'PARTICIPATION')->value('points'))->toBe(30);

    // Running it again changes nothing and adds no duplicates.
    app(ScoreTournament::class)($tournament->fresh());
    expect(ParticipationScore::count())->toBe(1200);
});

it('queues a single pending background job when a tournament\'s game level or date changes, instead of scoring in the request', function (): void {
    [, $level, $tournament] = bigTournament(5);
    Queue::fake();

    $tournament->update(['venue' => 'Somewhere']);
    Queue::assertNothingPushed();

    // Two quick saves of the same tournament collapse into one pending run.
    $tournament->update(['game_level_id' => $level->id]);
    $tournament->update(['date_from' => '2026-04-01']);

    Queue::assertPushed(ScoreTournamentJob::class, 1);
    Queue::assertPushed(ScoreTournamentJob::class, fn (ScoreTournamentJob $job) => $job->tournamentId === $tournament->id);
    expect(ParticipationScore::count())->toBe(0);
});

it('the job scores the tournament and tells the organisation\'s pages when it is done', function (): void {
    [, $level, $tournament] = bigTournament(10);
    Queue::fake();
    $tournament->update(['game_level_id' => $level->id]);
    EventBus::fake([TournamentScoringFinished::class]);

    app()->call([new ScoreTournamentJob($tournament->id), 'handle']);

    expect(ParticipationScore::count())->toBe(10);
    EventBus::assertDispatched(TournamentScoringFinished::class, fn (TournamentScoringFinished $event) => $event->tournament->is($tournament) && $event->resultsScored === 10
        && $event->broadcastOn()->name === 'private-organization.'.$tournament->organization_id);
});

it('a job for a deleted tournament does nothing', function (): void {
    EventBus::fake([TournamentScoringFinished::class]);

    app()->call([new ScoreTournamentJob(999999), 'handle']);

    EventBus::assertNotDispatched(TournamentScoringFinished::class);
});

it('publishing a version queues jobs only for tournaments from its start date', function (): void {
    [$org, $level, $early] = bigTournament(2);
    $early->forceFill(['game_level_id' => $level->id, 'date_from' => now()->addDays(5)->toDateString()])->saveQuietly();
    $late = Tournament::factory()->forOrganization($org)->create(['game_level_id' => $level->id, 'date_from' => now()->addMonths(3)->toDateString()]);
    $unlevelled = Tournament::factory()->forOrganization($org)->create(['date_from' => now()->addMonths(3)->toDateString()]);
    $v2 = PointScheme::factory()->draft()->create(['organization_id' => $org->id, 'version_number' => 2]);
    Queue::fake();

    app(PublishPointScheme::class)($v2, now()->addMonth()->toDateString());

    Queue::assertPushed(ScoreTournamentJob::class, 1);
    Queue::assertPushed(ScoreTournamentJob::class, fn (ScoreTournamentJob $job) => $job->tournamentId === $late->id);
    Queue::assertNotPushed(ScoreTournamentJob::class, fn (ScoreTournamentJob $job) => in_array($job->tournamentId, [$early->id, $unlevelled->id], true));
});
