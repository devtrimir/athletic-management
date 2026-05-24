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
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id],
            ],
        ])
        ->assertForbidden();
});

test('store creates participation and achievement', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                [
                    'member_id' => $member->id,
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
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'position' => 2],
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
    $member = epMember($user);

    $payload = fn (string $medal, int $pos) => [
        'participants' => [
            ['member_id' => $member->id, 'position' => $pos, 'medal_type' => $medal],
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
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'medal_type' => 'PLATINUM'],
            ],
        ])
        ->assertSessionHasErrors('participants.0.medal_type');
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

test('duplicate member_id in same batch returns 422', function () {
    $user = epUser('tournaments.update');
    $tournament = epTournament($user);
    $event = epEvent($tournament, $user);
    $member = epMember($user);

    $this->actingAs($user)
        ->post(epRoute($tournament, $event), [
            'participants' => [
                ['member_id' => $member->id, 'position' => 1],
                ['member_id' => $member->id, 'position' => 2],
            ],
        ])
        ->assertSessionHasErrors('participants.0.member_id');

    expect(Participation::where('event_id', $event->id)->count())->toBe(0);
});
