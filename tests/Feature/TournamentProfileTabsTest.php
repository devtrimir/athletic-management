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
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;

function tournamentProfileForUser(User $user): Tournament
{
    $organization = Organization::findOrFail($user->organization_id);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);

    return Tournament::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
    ]);
}

test('tournament overview route returns profile shell without event rows', function (): void {
    $user = rcUser('tournaments.view');
    $tournament = tournamentProfileForUser($user);

    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => Sport::factory()->create(['organization_id' => $user->organization_id])->id,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $tournament->session_id,
        'sport_id' => $event->sport_id,
    ]);
    $participation = Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => Member::factory()->create(['organization_id' => $user->organization_id])->id,
        'team_id' => $team->id,
        'session_id' => $tournament->session_id,
    ]);
    Achievement::factory()->create(['participation_id' => $participation->id]);

    $this->actingAs($user)
        ->get(route('tournaments.show', $tournament))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/show')
            ->where('activeTab', 'overview')
            ->where('tournament.id', $tournament->id)
            ->where('tournament.events_count', 1)
            ->where('tournament.participants_count', 1)
            ->where('tournament.teams_count', 1)
            ->where('tournament.medals_count', 1)
            ->has('sports')
            ->missing('events')
        );
});

test('tournament events tab returns event rows only when requested', function (): void {
    $user = rcUser('tournaments.view');
    $tournament = tournamentProfileForUser($user);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'name' => '100m Sprint',
    ]);

    $this->actingAs($user)
        ->get(route('tournaments.events', $tournament))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/show')
            ->where('activeTab', 'events')
            ->where('tournament.id', $tournament->id)
            ->has('sports')
            ->has('events', 1)
            ->where('events.0.name', '100m Sprint')
        );
});

test('tournament events tab filters by search sport gender and participation status', function (): void {
    $user = rcUser('tournaments.view');
    $tournament = tournamentProfileForUser($user);
    $athletics = Sport::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Athletics']);
    $boxing = Sport::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Boxing']);

    $sprint = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $athletics->id,
        'name' => '100m Sprint',
        'gender_class' => 'M',
    ]);
    Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $boxing->id,
        'name' => 'Boxing Final',
        'gender_class' => 'F',
    ]);

    Participation::factory()->create([
        'event_id' => $sprint->id,
        'member_id' => Member::factory()->create(['organization_id' => $user->organization_id])->id,
        'session_id' => $tournament->session_id,
    ]);

    $this->actingAs($user)
        ->get(route('tournaments.events', [
            'tournament' => $tournament,
            'filter' => [
                'q' => 'Sprint',
                'sport_id' => $athletics->id,
                'gender_class' => 'M',
                'participation_status' => 'with',
            ],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('activeTab', 'events')
            ->where('eventFilters.q', 'Sprint')
            ->where('eventFilters.sport_id', (string) $athletics->id)
            ->where('eventFilters.gender', 'M')
            ->where('eventFilters.participation_status', 'with')
            ->has('events', 1)
            ->where('events.0.name', '100m Sprint')
            ->where('events.0.participations_count', 1)
            ->where('events.0.teams_count', 0)
            ->where('events.0.medals_count', 0)
        );
});

test('tournament profile tab routes require tournament view permission', function (): void {
    $user = rcUser();
    $tournament = tournamentProfileForUser($user);

    $this->actingAs($user)
        ->get(route('tournaments.events', $tournament))
        ->assertForbidden();
});

test('tournament profile tab routes do not expose another organization tournament', function (): void {
    $user = rcUser('tournaments.view');
    $otherOrganization = Organization::factory()->create();
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $tournament = Tournament::factory()->create([
        'organization_id' => $otherOrganization->id,
        'session_id' => SportSession::factory()->create(['organization_id' => $otherOrganization->id])->id,
        'tier_id' => $tier->id,
    ]);

    $this->actingAs($user)
        ->get(route('tournaments.events', $tournament))
        ->assertNotFound();
});
