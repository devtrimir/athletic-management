<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function backfillMigration(): object
{
    return include database_path('migrations/2026_09_05_160000_backfill_team_id_on_individual_participations.php');
}

test('backfill fills team_id on member participations and is safe to re-run', function (): void {
    $org = Organization::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'individual',
    ]);

    $member = Member::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    $fillable = Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'team_id' => null,
        'session_id' => $session->id,
    ]);

    $unresolvedMember = Member::factory()->create(['organization_id' => $org->id]);
    $unresolved = Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $unresolvedMember->id,
        'team_id' => null,
        'session_id' => $session->id,
    ]);

    $teamEvent = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'team',
    ]);
    $teamRow = Participation::factory()->create([
        'event_id' => $teamEvent->id,
        'member_id' => null,
        'team_id' => $team->id,
        'session_id' => $session->id,
    ]);

    backfillMigration()->up();
    backfillMigration()->up();

    expect($fillable->refresh()->team_id)->toBe($team->id)
        ->and($unresolved->refresh()->team_id)->toBeNull()
        ->and($teamRow->refresh()->team_id)->toBe($team->id);
});
