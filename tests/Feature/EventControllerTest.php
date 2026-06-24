<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\GenderCategory;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationFormat;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\SportEventVariant;
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
        'event_mode' => 'provisional',
        'sport_id' => $sport->id,
        'name' => 'दौड़ 100 मीटर',
        'discipline' => null,
        'weight_category' => null,
        'gender_class' => 'M',
        'provisional_reason' => 'Reference event not available in master data.',
    ];
}

function makeSportEventVariantForUser(User $user): SportEventVariant
{
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $event = SportEvent::create([
        'sport_id' => $sport->id,
        'name' => '100 मीटर',
        'code' => '100M',
        'discipline_type' => 'Track',
        'is_active' => true,
        'sort_order' => 10,
    ]);
    $gender = GenderCategory::create([
        'name' => 'Women',
        'code' => 'WOMEN',
        'is_active' => true,
        'sort_order' => 20,
    ]);
    $format = ParticipationFormat::create([
        'name' => 'Individual',
        'code' => 'INDIVIDUAL',
        'min_players' => 1,
        'max_players' => 1,
        'is_team_based' => false,
        'is_mixed' => false,
        'is_active' => true,
        'sort_order' => 10,
    ]);

    return SportEventVariant::create([
        'sport_id' => $sport->id,
        'sport_event_id' => $event->id,
        'participation_format_id' => $format->id,
        'gender_category_id' => $gender->id,
        'name' => '100 मीटर - Women',
        'code' => 'ATH_100M_WOMEN',
        'is_team_based' => false,
        'is_medal_event' => true,
        'is_active' => true,
        'sort_order' => 10,
    ]);
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
        'name' => 'दौड़ 100 मीटर',
        'gender_class' => 'M',
        'event_source' => 'manual',
        'provisional_reason' => 'Reference event not available in master data.',
    ]);
});

test('store creates official event from sport master variant', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $variant = makeSportEventVariantForUser($user);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), [
            'event_mode' => 'official',
            'sport_event_variant_id' => $variant->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('events', [
        'tournament_id' => $tournament->id,
        'sport_id' => $variant->sport_id,
        'sport_event_variant_id' => $variant->id,
        'name' => '100 मीटर',
        'discipline' => 'Track',
        'gender_class' => 'F',
        'event_source' => 'official',
        'provisional_reason' => null,
    ]);
});

test('store requires name', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);
    unset($payload['name']);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertSessionHasErrors('name');
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

test('store requires reason for provisional event', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $payload = makeEventPayload($user);
    unset($payload['provisional_reason']);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), $payload)
        ->assertSessionHasErrors('provisional_reason');
});

test('update can remap event to official sport master variant', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create([
        'event_source' => 'manual',
        'provisional_reason' => 'Old manual entry.',
    ]);
    $variant = makeSportEventVariantForUser($user);

    $this->actingAs($user)
        ->patch(route('tournaments.events.update', [$tournament, $event]), [
            'event_mode' => 'official',
            'sport_event_variant_id' => $variant->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'sport_id' => $variant->sport_id,
        'sport_event_variant_id' => $variant->id,
        'name' => '100 मीटर',
        'discipline' => 'Track',
        'gender_class' => 'F',
        'event_source' => 'official',
        'provisional_reason' => null,
    ]);
});

test('update can convert official event to provisional with reason', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $variant = makeSportEventVariantForUser($user);
    $event = Event::factory()->forTournament($tournament)->create([
        'sport_id' => $variant->sport_id,
        'sport_event_variant_id' => $variant->id,
        'event_source' => 'official',
        'provisional_reason' => null,
    ]);

    $this->actingAs($user)
        ->patch(route('tournaments.events.update', [$tournament, $event]), [
            'event_mode' => 'provisional',
            'sport_id' => $variant->sport_id,
            'name' => 'Manual relay trial',
            'discipline' => 'Track',
            'weight_category' => null,
            'gender_class' => 'MIXED',
            'provisional_reason' => 'Special trial event not available in master data.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'sport_id' => $variant->sport_id,
        'sport_event_variant_id' => null,
        'name' => 'Manual relay trial',
        'discipline' => 'Track',
        'gender_class' => 'MIXED',
        'event_source' => 'manual',
        'provisional_reason' => 'Special trial event not available in master data.',
    ]);
});

test('update rejects event once participants exist', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create([
        'name' => 'Locked event',
        'event_source' => 'manual',
        'provisional_reason' => 'Old manual entry.',
    ]);

    Participation::factory()->create([
        'event_id' => $event->id,
        'session_id' => $tournament->session_id,
    ]);

    $this->actingAs($user)
        ->patch(route('tournaments.events.update', [$tournament, $event]), [
            'event_mode' => 'provisional',
            'sport_id' => $event->sport_id,
            'name' => 'Changed event',
            'discipline' => null,
            'weight_category' => null,
            'gender_class' => 'M',
            'provisional_reason' => 'Reference event not available in master data.',
        ])
        ->assertSessionHasErrors('event');

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'name' => 'Locked event',
    ]);
});

test('update allows event sport outside tournament reference sport', function () {
    $user = eventUser('tournaments.update');
    $tournamentSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $otherSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = makeTournamentForUser($user);
    $tournament->update(['sport_id' => $tournamentSport->id]);
    $event = Event::factory()->forTournament($tournament)->create([
        'sport_id' => $tournamentSport->id,
        'event_source' => 'manual',
        'provisional_reason' => 'Old manual entry.',
    ]);

    $this->actingAs($user)
        ->patch(route('tournaments.events.update', [$tournament, $event]), [
            'event_mode' => 'provisional',
            'sport_id' => $otherSport->id,
            'name' => 'Reference sport override event',
            'discipline' => null,
            'weight_category' => null,
            'gender_class' => 'M',
            'provisional_reason' => 'Reference event not available in master data.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'sport_id' => $otherSport->id,
        'name' => 'Reference sport override event',
    ]);
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
            ->has('event.name')
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

test('show deferred participations include pno but not member code', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create();
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'member_code' => 'UPP-2026-000001',
        'pno' => 'PNO-100',
    ]);

    Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
    ]);

    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $response = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participations',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    expect($response->json('props.participations'))->toHaveCount(1)
        ->and($response->json('props.participations.0.member.pno'))->toBe('PNO-100')
        ->and($response->json('props.participations.0.member'))->not->toHaveKey('member_code');
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
