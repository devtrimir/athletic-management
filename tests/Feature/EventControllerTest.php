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

function makeSportEventVariantForUser(User $user, string $suffix = ''): SportEventVariant
{
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $event = SportEvent::create([
        'sport_id' => $sport->id,
        'name' => $suffix === '' ? '100 मीटर' : "100 मीटर {$suffix}",
        'code' => $suffix === '' ? '100M' : "100M_{$suffix}",
        'discipline_type' => 'Track',
        'is_active' => true,
        'sort_order' => 10,
    ]);
    $gender = GenderCategory::firstOrCreate(
        ['code' => 'WOMEN'],
        ['name' => 'Women', 'is_active' => true, 'sort_order' => 20],
    );
    $format = ParticipationFormat::firstOrCreate(
        ['code' => 'INDIVIDUAL'],
        [
            'name' => 'Individual',
            'min_players' => 1,
            'max_players' => 1,
            'is_team_based' => false,
            'is_mixed' => false,
            'is_active' => true,
            'sort_order' => 10,
        ],
    );

    return SportEventVariant::create([
        'sport_id' => $sport->id,
        'sport_event_id' => $event->id,
        'participation_format_id' => $format->id,
        'gender_category_id' => $gender->id,
        'name' => $suffix === '' ? '100 मीटर - Women' : "100 मीटर {$suffix} - Women",
        'code' => $suffix === '' ? 'ATH_100M_WOMEN' : "ATH_100M_{$suffix}_WOMEN",
        'is_team_based' => false,
        'is_medal_event' => true,
        'is_active' => true,
        'sort_order' => 10,
    ]);
}

function makeEventRosterMember(Tournament $tournament, Event $event, array $memberState = [], array $teamState = []): array
{
    $team = Team::factory()->create(array_merge([
        'organization_id' => $tournament->organization_id,
        'sport_id' => $event->sport_id,
        'session_id' => $tournament->session_id,
        'is_active' => true,
    ], $teamState));
    $member = Member::factory()->create(array_merge([
        'organization_id' => $tournament->organization_id,
    ], $memberState));

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $tournament->session_id,
        'left_on' => null,
    ]);

    return [$member, $team];
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

test('store creates multiple official events from sport master variants', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $firstVariant = makeSportEventVariantForUser($user, 'A');
    $secondVariant = makeSportEventVariantForUser($user, 'B');

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), [
            'event_mode' => 'official',
            'sport_event_variant_ids' => [
                $firstVariant->id,
                $secondVariant->id,
            ],
        ])
        ->assertRedirect(route('tournaments.events', $tournament));

    $this->assertDatabaseHas('events', [
        'tournament_id' => $tournament->id,
        'sport_event_variant_id' => $firstVariant->id,
        'event_source' => 'official',
    ]);
    $this->assertDatabaseHas('events', [
        'tournament_id' => $tournament->id,
        'sport_event_variant_id' => $secondVariant->id,
        'event_source' => 'official',
    ]);
});

test('store rejects official event variant already added to tournament', function () {
    $user = eventUser('tournaments.update');
    $tournament = makeTournamentForUser($user);
    $variant = makeSportEventVariantForUser($user);

    Event::factory()->forTournament($tournament)->create([
        'sport_id' => $variant->sport_id,
        'sport_event_variant_id' => $variant->id,
        'event_source' => 'official',
    ]);

    $this->actingAs($user)
        ->post(route('tournaments.events.store', $tournament), [
            'event_mode' => 'official',
            'sport_event_variant_ids' => [$variant->id],
        ])
        ->assertSessionHasErrors('sport_event_variant_ids');

    expect(Event::query()
        ->where('tournament_id', $tournament->id)
        ->where('sport_event_variant_id', $variant->id)
        ->count())->toBe(1);
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

test('show returns participant level filters from tier master data', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create();
    TournamentTier::firstOrCreate(
        ['code' => 'AIPSC'],
        ['label_hi' => 'एआईपीएससी', 'label_en' => 'AIPSC', 'weight' => 70],
    );

    $this->actingAs($user)
        ->get(route('tournaments.events.show', [$tournament, $event]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('participantFilterOptions.levels.0.value', 'NATIONAL')
            ->has('participantFilterOptions.levels', fn ($levels) => $levels
                ->where('1.value', 'AIPSC')
                ->where('1.label', 'एआईपीएससी')
                ->etc()
            )
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

test('show deferred participant candidates returns active event roster only', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create(['gender_class' => 'OPEN']);
    [$eligibleMember, $eligibleTeam] = makeEventRosterMember($tournament, $event);
    $eligibleMember->playableSports()->attach($event->sport_id, [
        'sport_event' => 'Long jump',
    ]);
    $fallbackOnlyMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_event' => 'Default sprint',
    ]);
    TeamMember::factory()->create([
        'team_id' => $eligibleTeam->id,
        'member_id' => $fallbackOnlyMember->id,
        'session_id' => $tournament->session_id,
        'left_on' => null,
    ]);
    makeEventRosterMember($tournament, $event, ['full_name' => 'Inactive Team Player'], ['is_active' => false]);
    makeEventRosterMember($tournament, $event, ['full_name' => 'Other Sport Player'], [
        'sport_id' => Sport::factory()->create(['organization_id' => $user->organization_id])->id,
    ]);

    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $response = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participantCandidates',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $membersById = collect($response->json('props.participantCandidates.0.members'))->keyBy('id');

    expect($response->json('props.participantCandidates'))->toHaveCount(1)
        ->and($response->json('props.participantCandidates.0.id'))->toBe($eligibleTeam->id)
        ->and($response->json('props.participantCandidates.0.members'))->toHaveCount(2)
        ->and($membersById->get($eligibleMember->id)['sport_event'])->toBe('Long jump')
        ->and($membersById->get($fallbackOnlyMember->id)['sport_event'])->toBeNull();
});

test('show deferred participant candidates exclude existing participants', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create(['gender_class' => 'OPEN']);
    [$existingMember] = makeEventRosterMember($tournament, $event);
    [$availableMember] = makeEventRosterMember($tournament, $event);
    Participation::factory()->forEvent($event)->create(['member_id' => $existingMember->id]);

    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $response = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participantCandidates',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $memberIds = collect($response->json('props.participantCandidates'))->flatMap(fn (array $team): array => $team['members'])->pluck('id');

    expect($memberIds)->toContain($availableMember->id)
        ->and($memberIds)->not->toContain($existingMember->id);
});

test('show deferred participant candidates filter men and women but not open events', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create(['gender_class' => 'F']);
    [$maleMember] = makeEventRosterMember($tournament, $event, ['gender' => 'M']);
    [$femaleMember] = makeEventRosterMember($tournament, $event, ['gender' => 'F']);

    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $womenResponse = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participantCandidates',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $womenIds = collect($womenResponse->json('props.participantCandidates'))->flatMap(fn (array $team): array => $team['members'])->pluck('id');

    $event->update(['gender_class' => 'OPEN']);

    $openResponse = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participantCandidates',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $openIds = collect($openResponse->json('props.participantCandidates'))->flatMap(fn (array $team): array => $team['members'])->pluck('id');

    expect($womenIds)->toContain($femaleMember->id)
        ->and($womenIds)->not->toContain($maleMember->id)
        ->and($openIds)->toContain($femaleMember->id)
        ->and($openIds)->toContain($maleMember->id);
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

test('show deferred participant candidates exclude existing team lineup members', function () {
    $user = eventUser('tournaments.view');
    $tournament = makeTournamentForUser($user);
    $event = Event::factory()->forTournament($tournament)->create([
        'gender_class' => 'OPEN',
        'event_type' => 'team',
    ]);
    [$existingMember, $existingTeam] = makeEventRosterMember($tournament, $event);
    [$availableMember] = makeEventRosterMember($tournament, $event);

    Participation::factory()->forEvent($event)->create([
        'member_id' => null,
        'team_id' => $existingTeam->id,
        'lineup_member_ids' => [$existingMember->id],
    ]);

    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $response = $this->actingAs($user)
        ->getJson(route('tournaments.events.show', [$tournament, $event]), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'events/show',
            'X-Inertia-Partial-Data' => 'participantCandidates',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $memberIds = collect($response->json('props.participantCandidates'))->flatMap(fn (array $team): array => $team['members'])->pluck('id');

    expect($memberIds)->toContain($availableMember->id)
        ->and($memberIds)->not->toContain($existingMember->id);
});
