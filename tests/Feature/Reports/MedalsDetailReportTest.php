<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\MedalsDetailReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function detailTeamMedal(Organization $org, ?SportSession $session = null): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'NATIONAL', 'label_en' => 'National', 'weight' => 80],
    );
    $session ??= SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $members = Member::factory()->count(2)->create(['organization_id' => $org->id]);

    foreach ($members as $member) {
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $session->id,
        ]);
    }

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'team',
    ]);
    $participation = Participation::factory()->create([
        'member_id' => null,
        'team_id' => $team->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
        'lineup_member_ids' => $members->pluck('id')->all(),
    ]);
    $achievement = Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => 'GOLD',
    ]);

    return compact('team', 'members', 'achievement', 'event');
}

test('detail report expands team event medals to lineup members', function (): void {
    $org = Organization::factory()->create();
    $setup = detailTeamMedal($org);
    $report = app(MedalsDetailReport::class);

    $rows = collect($report->run($org->id, [], 25)->items());

    expect($rows)->toHaveCount(2);
    expect($rows->pluck('member.id')->all())->toEqualCanonicalizing($setup['members']->pluck('id')->all());
    expect($rows->pluck('member.team_name')->unique()->values()->all())->toBe([$setup['team']->name]);
    expect($rows->pluck('event.event_type')->unique()->values()->all())->toBe(['team']);
});

test('detail report keeps team event lineup rows grouped together', function (): void {
    $org = Organization::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $first = detailTeamMedal($org, $session);
    $second = detailTeamMedal($org, $session);
    $report = app(MedalsDetailReport::class);

    $first['members'][0]->update(['full_name' => 'Zara Singh']);
    $first['members'][1]->update(['full_name' => 'Aarav Singh']);
    $second['members'][0]->update(['full_name' => 'Mohan Singh']);
    $second['members'][1]->update(['full_name' => 'Nisha Singh']);

    $rows = collect($report->run($org->id, ['session_ids' => [$session->id]], 25)->items());

    expect($rows->pluck('event.id')->chunk(2)->map->unique()->map->count()->all())->toBe([1, 1]);
});

test('detail medal counts count a team event medal once', function (): void {
    $org = Organization::factory()->create();
    detailTeamMedal($org);
    $report = app(MedalsDetailReport::class);

    expect($report->countByType($org->id, []))->toMatchArray([
        'GOLD' => 1,
        'SILVER' => 0,
        'BRONZE' => 0,
        'MERIT' => 0,
    ]);
});

test('detail medal counts collapse duplicate team event medal rows', function (): void {
    $org = Organization::factory()->create();
    $setup = detailTeamMedal($org);
    $participation = Participation::findOrFail($setup['achievement']->participation_id);

    Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => 'GOLD',
    ]);

    $report = app(MedalsDetailReport::class);

    expect($report->countByType($org->id, []))->toMatchArray([
        'GOLD' => 1,
        'SILVER' => 0,
        'BRONZE' => 0,
        'MERIT' => 0,
    ]);
});

test('detail medal counts apply unit filter to team event lineup members', function (): void {
    $org = Organization::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $org->id]);
    $setup = detailTeamMedal($org);
    $setup['members']->first()->update(['current_unit_id' => $unit->id]);
    $report = app(MedalsDetailReport::class);

    expect($report->countByType($org->id, ['unit_id' => $unit->id]))->toMatchArray([
        'GOLD' => 1,
        'SILVER' => 0,
        'BRONZE' => 0,
        'MERIT' => 0,
    ]);
});
