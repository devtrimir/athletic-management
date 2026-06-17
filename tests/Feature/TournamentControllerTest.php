<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
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

function tournamentUser(string ...$permissions): User
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

function makeTournament(User $user): Tournament
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

function validTournamentPayload(User $user): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);

    return [
        'name' => 'राष्ट्रीय प्रतियोगिता 2026',
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => null,
        'venue' => null,
        'date_from' => null,
        'date_to' => null,
    ];
}

// ---------------------------------------------------------------------------
// index
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from tournaments index', function () {
    $this->get(route('tournaments.index'))->assertRedirect(route('login'));
});

test('user without tournaments.view gets 403 on index', function () {
    $this->actingAs(tournamentUser())->get(route('tournaments.index'))->assertForbidden();
});

test('user with tournaments.view sees index', function () {
    $user = tournamentUser('tournaments.view');

    $this->actingAs($user)
        ->get(route('tournaments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/index')
            ->has('tournaments')
            ->has('sessions')
            ->has('tiers')
            ->has('sports')
        );
});

test('index only shows tournaments from own org', function () {
    $user = tournamentUser('tournaments.view');
    $other = Organization::factory()->create();
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    Tournament::factory()->create([
        'organization_id' => $other->id,
        'session_id' => SportSession::factory()->create(['organization_id' => $other->id])->id,
        'tier_id' => $tier->id,
    ]);

    $this->actingAs($user)
        ->get(route('tournaments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('tournaments.total', 0));
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from tournaments create', function () {
    $this->get(route('tournaments.create'))->assertRedirect(route('login'));
});

test('user without tournaments.create gets 403 on create', function () {
    $this->actingAs(tournamentUser())->get(route('tournaments.create'))->assertForbidden();
});

test('user with tournaments.create sees create form with options', function () {
    $this->actingAs(tournamentUser('tournaments.create'))
        ->get(route('tournaments.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/create')
            ->has('sessions')
            ->has('tiers')
            ->has('sports')
        );
});

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('user without tournaments.create gets 403 on store', function () {
    $user = tournamentUser();
    $payload = validTournamentPayload($user);

    $this->actingAs($user)
        ->post(route('tournaments.store'), $payload)
        ->assertForbidden();
});

test('store creates tournament and redirects to show', function () {
    $user = tournamentUser('tournaments.create');
    $payload = validTournamentPayload($user);

    $this->actingAs($user)
        ->post(route('tournaments.store'), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('tournaments', [
        'name' => $payload['name'],
        'organization_id' => $user->organization_id,
    ]);
});

test('store requires name', function () {
    $user = tournamentUser('tournaments.create');
    $payload = validTournamentPayload($user);
    unset($payload['name']);

    $this->actingAs($user)
        ->post(route('tournaments.store'), $payload)
        ->assertSessionHasErrors('name');
});

test('store requires session_id to belong to own org', function () {
    $user = tournamentUser('tournaments.create');
    $payload = validTournamentPayload($user);
    $otherSession = SportSession::factory()->create(['organization_id' => Organization::factory()->create()->id]);
    $payload['session_id'] = $otherSession->id;

    $this->actingAs($user)
        ->post(route('tournaments.store'), $payload)
        ->assertSessionHasErrors('session_id');
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from tournaments show', function () {
    $tournament = Tournament::factory()->create();
    $this->get(route('tournaments.show', $tournament))->assertRedirect(route('login'));
});

test('user without tournaments.view gets 403 on show', function () {
    $user = tournamentUser();
    $tournament = makeTournament($user);

    $this->actingAs($user)->get(route('tournaments.show', $tournament))->assertForbidden();
});

test('show returns tournament resource in Inertia props', function () {
    $user = tournamentUser('tournaments.view');
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->get(route('tournaments.show', $tournament))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/show')
            ->has('tournament', fn ($t) => $t
                ->has('id')
                ->has('name')
                ->has('venue')
                ->has('date_from')
                ->has('date_to')
                ->etc()
            )
        );
});

test('show is 404 for tournament belonging to another org', function () {
    $user = tournamentUser('tournaments.view');
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

    $this->actingAs($user)->get(route('tournaments.show', $tournament))->assertNotFound();
});

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from tournaments edit', function () {
    $tournament = Tournament::factory()->create();
    $this->get(route('tournaments.edit', $tournament))->assertRedirect(route('login'));
});

test('user without tournaments.update gets 403 on edit', function () {
    $user = tournamentUser();
    $tournament = makeTournament($user);

    $this->actingAs($user)->get(route('tournaments.edit', $tournament))->assertForbidden();
});

test('user with tournaments.update sees edit form', function () {
    $user = tournamentUser('tournaments.update');
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->get(route('tournaments.edit', $tournament))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tournaments/edit')
            ->has('tournament')
            ->has('sessions')
            ->has('tiers')
        );
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('user without tournaments.update gets 403 on update', function () {
    $user = tournamentUser();
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->patch(route('tournaments.update', $tournament), ['name' => 'नया नाम'])
        ->assertForbidden();
});

test('update patches tournament and redirects to show', function () {
    $user = tournamentUser('tournaments.update');
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->patch(route('tournaments.update', $tournament), ['name' => 'अद्यतन नाम'])
        ->assertRedirect(route('tournaments.show', $tournament));

    $this->assertDatabaseHas('tournaments', [
        'id' => $tournament->id,
        'name' => 'अद्यतन नाम',
    ]);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('user without tournaments.delete gets 403 on destroy', function () {
    $user = tournamentUser();
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->delete(route('tournaments.destroy', $tournament))
        ->assertForbidden();
});

test('destroy soft-deletes tournament and redirects to index', function () {
    $user = tournamentUser('tournaments.delete');
    $tournament = makeTournament($user);

    $this->actingAs($user)
        ->delete(route('tournaments.destroy', $tournament))
        ->assertRedirect(route('tournaments.index'));

    $this->assertSoftDeleted('tournaments', ['id' => $tournament->id]);
});
