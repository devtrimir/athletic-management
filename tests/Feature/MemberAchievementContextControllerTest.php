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

function achievementContextUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    foreach ($permissions as $code) {
        $permission = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );
        DB::table('role_permission')->insert([
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ]);
    }

    return $user;
}

function achievementContextTournamentSetup(
    User $user,
    array $overrides = [],
): array {
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $defaults = [
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
        'name' => 'National Police Athletics Championship',
        'venue' => 'Lucknow',
        'date_from' => '2026-01-01',
        'date_to' => '2026-01-02',
    ];

    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'is_active' => true,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    $payload = array_merge($defaults, $overrides);

    $tournament = Tournament::factory()->create($payload);

    return compact('member', 'team', 'session', 'sport', 'tournament');
}

function achievementContextPayload(array $overrides = []): array
{
    return array_merge([
        'tournament_id' => null,
        'event_id' => null,
        'session_id' => 0,
        'tier_id' => 0,
        'sport_id' => 0,
        'venue' => '',
        'date_from' => '2026-01-01',
        'date_to' => '2026-01-02',
        'tournament_name' => 'National Police Athletics Championship',
        'event_name' => '100m dash',
        'event_sport_id' => 0,
        'event_type' => 'individual',
        'participants_required' => '',
        'discipline' => 'Track',
        'weight_category' => '',
        'gender_class' => 'OPEN',
        'provisional_reason' => 'Added from member profile quick add.',
        'position' => '',
        'medal_type' => 'GOLD',
        'medal_position' => '',
        'remarks' => '',
        'team_id' => '0',
        'reuse_mode' => 'auto',
    ], $overrides);
}

test('reuses existing tournament and event by exact context', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user);
    $event = Event::factory()->create([
        'tournament_id' => $setup['tournament']->id,
        'sport_id' => $setup['sport']->id,
        'name' => '100m dash',
        'gender_class' => 'OPEN',
        'discipline' => 'Track',
        'weight_category' => null,
        'event_type' => 'individual',
        'participants_required' => null,
    ]);

    $payload = achievementContextPayload([
        'tournament_id' => (string) $setup['tournament']->id,
        'event_id' => (string) $event->id,
        'sport_id' => (string) $setup['sport']->id,
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => (string) $setup['team']->id,
        'session_id' => (string) $setup['session']->id,
        'tier_id' => (string) $setup['tournament']->tier_id,
    ]);

    $beforeTournaments = Tournament::withoutGlobalScopes()->count();
    $beforeEvents = Event::withoutGlobalScopes()->count();

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertRedirect(route('members.events', $setup['member']));

    expect(Tournament::withoutGlobalScopes()->count())->toBe($beforeTournaments)
        ->and(Event::withoutGlobalScopes()->count())->toBe($beforeEvents)
        ->and(Participation::withoutGlobalScopes()->count())->toBe(1)
        ->and(Achievement::withoutGlobalScopes()->count())->toBe(1);

    $participation = Participation::withoutGlobalScopes()
        ->where('member_id', $setup['member']->id)
        ->where('event_id', $event->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation?->position)->toBe(1)
        ->and($participation?->achievement?->medal_type)->toBe('GOLD');
});

test('creates new event when same tournament has no matching exact event', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user);

    $existingEvent = Event::factory()->create([
        'tournament_id' => $setup['tournament']->id,
        'sport_id' => $setup['sport']->id,
        'name' => '200m dash',
        'gender_class' => 'OPEN',
        'discipline' => 'Track',
        'event_type' => 'individual',
    ]);

    $payload = achievementContextPayload([
        'tournament_id' => (string) $setup['tournament']->id,
        'event_name' => '100m sprint',
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => (string) $setup['team']->id,
        'session_id' => (string) $setup['session']->id,
        'tier_id' => (string) $setup['tournament']->tier_id,
        'sport_id' => (string) $setup['sport']->id,
    ]);

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertRedirect(route('members.events', $setup['member']));

    expect(Event::withoutGlobalScopes()
        ->where('tournament_id', $setup['tournament']->id)
        ->where('name', '100m sprint')
        ->exists())
        ->toBeTrue()
        ->and(Event::withoutGlobalScopes()
            ->where('tournament_id', $setup['tournament']->id)
            ->count())->toBe(2)
        ->and(Participation::withoutGlobalScopes()->where('member_id', $setup['member']->id)->count())->toBe(1)
        ->and($existingEvent->id)->not->toBeNull();
});

test('creates new tournament and event when no exact context exists', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user, ['name' => 'State Championship']);

    $payload = achievementContextPayload([
        'tournament_name' => 'National Championship 2026',
        'session_id' => (string) $setup['session']->id,
        'tier_id' => (string) $setup['tournament']->tier_id,
        'sport_id' => (string) $setup['sport']->id,
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => (string) $setup['team']->id,
        'event_name' => '100m dash',
    ]);

    $beforeTournamentCount = Tournament::withoutGlobalScopes()->count();

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertRedirect(route('members.events', $setup['member']));

    $newTournament = Tournament::withoutGlobalScopes()->firstWhere('name', 'National Championship 2026');

    expect(Tournament::withoutGlobalScopes()->count())->toBe($beforeTournamentCount + 1)
        ->and($newTournament)->not->toBeNull()
        ->and(Event::withoutGlobalScopes()->where('tournament_id', $newTournament?->id)->exists())->toBeTrue();
});

test('reuses same context on repeated submit instead of duplicating participation', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user);

    $payload = achievementContextPayload([
        'session_id' => (string) $setup['session']->id,
        'tier_id' => (string) $setup['tournament']->tier_id,
        'sport_id' => (string) $setup['sport']->id,
        'venue' => 'Lucknow',
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => (string) $setup['team']->id,
        'event_name' => '100m sprint',
    ]);

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertRedirect(route('members.events', $setup['member']));

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('members.events', $setup['member']));

    $tournament = Tournament::withoutGlobalScopes()->find($setup['tournament']->id);
    $event = Event::withoutGlobalScopes()->where('tournament_id', $tournament?->id)->where('name', '100m sprint')->first();

    expect($event)->not->toBeNull()
        ->and(Participation::withoutGlobalScopes()->where('event_id', $event->id)->where('member_id', $setup['member']->id)->count())->toBe(1)
        ->and(Event::withoutGlobalScopes()->where('tournament_id', $tournament?->id)->count())->toBe(1);
});

test('rejects new context when manual mode is selected and nothing matches', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user, ['name' => 'State Level Trophy']);

    $payload = achievementContextPayload([
        'tournament_name' => 'State Level Trophy',
        'session_id' => (string) $setup['session']->id,
        'tier_id' => (string) $setup['tournament']->tier_id,
        'sport_id' => (string) $setup['sport']->id,
        'event_sport_id' => (string) $setup['sport']->id,
        'venue' => 'Lucknow',
        'team_id' => (string) $setup['team']->id,
        'reuse_mode' => 'manual',
        'event_name' => 'No Match Event',
    ]);

    $response = $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload);

    $response->assertSessionHasErrors(['event_id'])
        ->assertRedirect();

    expect(Tournament::withoutGlobalScopes()->find($setup['tournament']->id))->not->toBeNull()
        ->and(Event::withoutGlobalScopes()->where('tournament_id', $setup['tournament']->id)->count())->toBe(0)
        ->and(Participation::withoutGlobalScopes()->count())->toBe(0);
});

test('falls back to member membership when several teams match the sport', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user);

    // A second active team for the same sport and session makes the
    // context-based guess ambiguous; the member's own membership decides.
    Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $setup['sport']->id,
        'session_id' => $setup['session']->id,
        'is_active' => true,
    ]);

    $payload = achievementContextPayload([
        'tournament_id' => (string) $setup['tournament']->id,
        'sport_id' => (string) $setup['sport']->id,
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => '0',
        'event_name' => '100m dash',
    ]);

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('members.events', $setup['member']));

    $participation = Participation::withoutGlobalScopes()
        ->where('member_id', $setup['member']->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation?->team_id)->toBe($setup['team']->id);
});

test('leaves team_id null when member has no active team membership', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
        'name' => 'National Police Athletics Championship',
        'date_from' => '2026-01-01',
        'date_to' => '2026-01-02',
    ]);

    $payload = achievementContextPayload([
        'tournament_id' => (string) $tournament->id,
        'sport_id' => (string) $sport->id,
        'event_sport_id' => (string) $sport->id,
        'session_id' => (string) $session->id,
        'tier_id' => (string) $tier->id,
        'team_id' => '0',
        'event_name' => '100m dash',
    ]);

    $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $member), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('members.events', $member));

    $participation = Participation::withoutGlobalScopes()
        ->where('member_id', $member->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation?->team_id)->toBeNull();
});

test('auto assigns matching team for member achievement entries', function (): void {
    $user = achievementContextUser('members.manageBenefits');
    $setup = achievementContextTournamentSetup($user);

    $payload = achievementContextPayload([
        'tournament_id' => (string) $setup['tournament']->id,
        'sport_id' => (string) $setup['sport']->id,
        'event_sport_id' => (string) $setup['sport']->id,
        'team_id' => '0',
        'event_name' => '100m dash',
    ]);

    $response = $this->actingAs($user)
        ->post(route('members.achievements.resolve-and-store', $setup['member']), $payload);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('members.events', $setup['member']));

    $participation = Participation::withoutGlobalScopes()
        ->where('member_id', $setup['member']->id)
        ->first();

    expect($participation)->not->toBeNull()
        ->and($participation?->team_id)->toBe($setup['team']->id)
        ->and(Achievement::withoutGlobalScopes()->count())->toBe(1);
});
