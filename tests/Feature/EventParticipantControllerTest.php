<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function epUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

function epTournament(User $user): Tournament
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);

    return Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
    ]);
}

function epEvent(Tournament $tournament, User $user): Event
{
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    return Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
    ]);
}

function epMember(User $user): Member
{
    return Member::factory()->create(['organization_id' => $user->organization_id]);
}

function epTeam(Tournament $tournament, Event $event): Team
{
    return Team::factory()->create([
        'organization_id' => $tournament->organization_id,
        'sport_id' => $event->sport_id,
        'session_id' => $tournament->session_id,
        'is_active' => true,
    ]);
}

function epRosterMember(Tournament $tournament, Event $event, User $user): array
{
    $team = epTeam($tournament, $event);
    $member = epMember($user);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'left_on' => null,
    ]);

    return [$member, $team];
}

function epRoute(Tournament $tournament, Event $event): string
{
    return route('tournaments.events.participants.store', [$tournament, $event]);
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from participants store', function () {
    $tournament = Tournament::factory()->create();
    $event = Event::factory()->create(['tournament_id' => $tournament->id]);

    $this->post(epRoute($tournament, $event))->assertRedirect(route('login'));
});

test('user without tournaments.update gets 403 on participants store', function () {
    $user = epUser('tournaments.view');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id],
            ],
        ])
        ->assertForbidden();
});

test('store creates participation and achievement', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                [
                    'member_id' => $member->id,
                    'team_id' => $team->id,
                    'position' => 1,
                    'medal_type' => 'GOLD',
                    'medal_position' => 1,
                    'remarks' => 'उत्कृष्ट',
                ],
            ],
        ])
        ->assertRedirect(route('tournaments.events.show', [$tournament, $event]));

    $participation = Participation::where('event_id', $event->id)
        ->where('member_id', $member->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation->position)->toBe(1)
        ->and($participation->team_id)->toBe($team->id)
        ->and($participation->session_id)->toBe($tournament->session_id);

    $achievement = Achievement::where('participation_id', $participation->id)->first();

    expect($achievement)->not->toBeNull()
        ->and($achievement->medal_type)->toBe('GOLD')
        ->and($achievement->position)->toBe(1)
        ->and($achievement->remarks)->toBe('उत्कृष्ट');
});

test('store without medal creates participation but no achievement', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id, 'position' => 2],
            ],
        ])
        ->assertRedirect();

    $participation = Participation::where('event_id', $event->id)
        ->where('member_id', $member->id)
        ->first();

    expect($participation)->not->toBeNull();
    expect(Achievement::where('participation_id', $participation->id)->exists())->toBeFalse();
});

test('re-submitting same member updates participation and achievement', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $payload = fn (string $medal, int $pos) => [
        'participants' => [
            ['member_id' => $member->id, 'team_id' => $team->id, 'position' => $pos, 'medal_type' => $medal],
        ],
    ];

    $this->actingAs($user)->post(epRoute($tournament, $event), $payload('SILVER', 2));
    $this->actingAs($user)->post(epRoute($tournament, $event), $payload('GOLD', 1));

    expect(Participation::where('event_id', $event->id)->where('member_id', $member->id)->count())->toBe(1);

    $participation = Participation::where('event_id', $event->id)->where('member_id', $member->id)->first();
    expect($participation->position)->toBe(1);

    expect(Achievement::where('participation_id', $participation->id)->count())->toBe(1);
    expect(Achievement::where('participation_id', $participation->id)->value('medal_type'))->toBe('GOLD');
});

test('update stores medal position on existing achievement', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    $member = epMember($user);

    $participation = Participation::create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'position' => 2,
    ]);

    Achievement::create([
        'participation_id' => $participation->id,
        'medal_type' => 'SILVER',
        'position' => 2,
    ]);

    $this->actingAs($user)
        ->patch(route('tournaments.events.participants.update', [$tournament, $event, $participation]), [
            'position' => 1,
            'medal_type' => 'GOLD',
            'medal_position' => 1,
            'remarks' => 'Updated',
        ])
        ->assertRedirect();

    expect($participation->refresh()->position)->toBe(1);
    expect($participation->achievement?->refresh()->position)->toBe(1);
    expect($participation->achievement?->medal_type)->toBe('GOLD');
});

test('store requires participants array', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [])
        ->assertSessionHasErrors('participants');
});

test('store requires member_id on each row', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [['position' => 1]],
        ])
        ->assertSessionHasErrors('participants.0.member_id');
});

test('store rejects member from another org', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);

    $otherMember = Member::factory()->create(); // different org

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [['member_id' => $otherMember->id]],
        ])
        ->assertSessionHasErrors('participants.0.member_id');
});

test('store rejects invalid medal_type', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id, 'medal_type' => 'PLATINUM'],
            ],
        ])
        ->assertSessionHasErrors('participants.0.medal_type');
});

test('store rejects member outside active event roster', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    $member = epMember($user);
    $team = epTeam($tournament, $event);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id],
            ],
        ])
        ->assertSessionHasErrors('participants.0.member_id');

    expect(Participation::where('event_id', $event->id)->count())->toBe(0);
});

test('store accepts multiple eligible roster members and persists team ids', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$firstMember, $firstTeam] = epRosterMember($tournament, $event, $user);
    [$secondMember, $secondTeam] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $firstMember->id, 'team_id' => $firstTeam->id],
                ['member_id' => $secondMember->id, 'team_id' => $secondTeam->id],
            ],
        ])
        ->assertRedirect(route('tournaments.events.show', [$tournament, $event]));

    expect(Participation::where('event_id', $event->id)->count())->toBe(2)
        ->and(Participation::where('member_id', $firstMember->id)->value('team_id'))->toBe($firstTeam->id)
        ->and(Participation::where('member_id', $secondMember->id)->value('team_id'))->toBe($secondTeam->id);
});

test('store returns 404 when event belongs to a different tournament', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    // Use a completely separate tournament (different org) to avoid duplicate session names
    $otherTournament = Tournament::factory()->create();
    $eventOfOther = Event::factory()->create(['tournament_id' => $otherTournament->id]);
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $eventOfOther), [
            'participants' => [['member_id' => $member->id]],
        ])
        ->assertNotFound();
});

test('store resolves participation team from the membership matching the event sport', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    $member = epMember($user);

    $otherSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $otherTeam = Team::factory()->create([
        'organization_id' => $tournament->organization_id,
        'sport_id' => $otherSport->id,
        'session_id' => $tournament->session_id,
        'is_active' => true,
    ]);
    $sportTeam = epTeam($tournament, $event);

    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'left_on' => null,
        'joined_on' => '2025-01-01',
    ]);
    TeamMember::factory()->create([
        'team_id' => $sportTeam->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'left_on' => null,
        'joined_on' => '2025-06-01',
    ]);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $sportTeam->id, 'medal_type' => 'GOLD'],
            ],
        ])
        ->assertRedirect(route('tournaments.events.show', [$tournament, $event]));

    $participation = Participation::where('event_id', $event->id)
        ->where('member_id', $member->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation->team_id)->toBe($sportTeam->id);
});

test('duplicate member_id in same batch returns 422', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id, 'position' => 1],
                ['member_id' => $member->id, 'team_id' => $team->id, 'position' => 2],
            ],
        ])
        ->assertSessionHasErrors('participants.0.member_id');

    expect(Participation::where('event_id', $event->id)->count())->toBe(0);
});

test('team event appends players to existing lineup instead of replacing', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => Sport::factory()->create(['organization_id' => $user->organization_id])->id,
        'event_type' => 'team',
    ]);

    $team = Team::factory()->create([
        'organization_id' => $tournament->organization_id,
        'sport_id' => $event->sport_id,
        'session_id' => $tournament->session_id,
        'is_active' => true,
    ]);

    $firstPlayer = Member::factory()->create(['organization_id' => $user->organization_id]);
    $secondPlayer = Member::factory()->create(['organization_id' => $user->organization_id]);

    TeamMember::factory()->create(['team_id' => $team->id, 'member_id' => $firstPlayer->id, 'session_id' => $tournament->session_id, 'left_on' => null]);
    TeamMember::factory()->create(['team_id' => $team->id, 'member_id' => $secondPlayer->id, 'session_id' => $tournament->session_id, 'left_on' => null]);

    $route = route('tournaments.events.participants.store', [$tournament, $event]);

    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['team_id' => $team->id, 'player_ids' => [$firstPlayer->id]],
            ],
        ])
        ->assertRedirect();

    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['team_id' => $team->id, 'player_ids' => [$secondPlayer->id]],
            ],
        ])
        ->assertRedirect();

    $participation = Participation::where('event_id', $event->id)->where('team_id', $team->id)->first();

    expect($participation)->not->toBeNull()
        ->and($participation->lineup_member_ids)->toContain($firstPlayer->id, $secondPlayer->id);
});

test('re-saving individual participation updates team_id without duplicate', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    [$member, $team] = epRosterMember($tournament, $event, $user);

    Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'team_id' => null,
    ]);

    $this->actingAs($user)
        ->post(route('tournaments.events.participants.store', [$tournament, $event]), [
            'participants' => [
                ['member_id' => $member->id, 'team_id' => $team->id],
            ],
        ])
        ->assertRedirect();

    expect(Participation::where('event_id', $event->id)->where('member_id', $member->id)->count())->toBe(1);

    $participation = Participation::where('event_id', $event->id)->where('member_id', $member->id)->first();

    expect($participation->team_id)->toBe($team->id);
});
