<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Organization;
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

function eventUser(string ...$permissions): User
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

function makeTournamentForUser(User $user): Tournament
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

function makeEventPayload(User $user): array
{
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    return [
        'sport_id' => $sport->id,
        'name_hi' => 'दौड़ 100 मीटर',
        'discipline' => null,
        'weight_category' => null,
        'gender_class' => 'M',
    ];
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from event store', function () {
    $tournament = Tournament::factory()->create();
    $this->post(route('tournaments.events.store', $tournament))->assertRedirect(route('login'));
});

test('user without tournaments.update gets 403 on event store', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertForbidden();
});

test('store creates event and redirects to event show', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('events', [
        'tournament_id' => $tournament->id,
        'name_hi' => 'दौड़ 100 मीटर',
        'gender_class' => 'M',
    ]);
});

test('store requires name_hi', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);
    unset($payload['name_hi']);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertSessionHasErrors('name_hi');
});

test('store requires valid gender_class', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);
    $payload['gender_class'] = 'INVALID';

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertSessionHasErrors('gender_class');
});

test('store rejects sport_id from another org', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);
    $otherSport = Sport::factory()->create(['organization_id' => Organization::factory()->create()->id]);
    $payload['sport_id'] = $otherSport->id;

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertSessionHasErrors('sport_id');
});

test('store returns 404 when tournament belongs to another org', function () {
    $user = eventUser('tournaments.update');
    $other = Organization::factory()->create();
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $tournament = Tournament::factory()->create([
        'organization_id' => $other->id,
        'session_id' => SportSession::factory()->create(['organization_id' => $other->id])->id,
        'tier_id' => $tier->id,
    ]);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), makeEventPayload($user))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from event show', function () {
    $tournament = Tournament::factory()->create();
    $event = Event::factory()->create(['tournament_id' => $tournament->id]);
    $this->get(route('tournaments.events.show', [$tournament, $event]))->assertRedirect(route('login'));
});

test('user without tournaments.view gets 403 on event show', function () {
    $user = eventUser();
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create();

    $this->actingAs($user)
        ->get(route('tournaments.events.show', [$tournament, $event]))
        ->assertForbidden();
});

test('show returns event in Inertia props', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create();

    $this->actingAs($user)
        ->get(route('tournaments.events.show', [$tournament, $event]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('events/show')
            ->has('tournament.id')
            ->has('event.id')
            ->has('event.name_hi')
            ->has('event.gender_class')
        );
});

test('show deferred participations prop is absent from initial response', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create();

    $this->actingAs($user)
        ->get(route('tournaments.events.show', [$tournament, $event]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->missing('participations'));
});

test('show returns 404 when event belongs to a different tournament', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $other = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($other)->create();

    $this->actingAs($user)
        ->get(route('tournaments.events.show', [$tournament, $event]))
        ->assertNotFound();
});
