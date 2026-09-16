<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPlayingAchievement;
use App\Models\District;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Rank;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Models\User;
use App\Support\Coaches\CoachProfileData;
use App\Support\Teams\TeamProfileData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

function lifecycleUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'organization_id' => $org->id,
        ]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert([
                'role_id' => $role->id,
                'permission_id' => $perm->id,
            ]);
        }
    }

    return $user;
}

function lifecycleRank(string $code = 'CONSTABLE', int $order = 1): Rank
{
    return Rank::firstOrCreate(['code' => $code], [
        'name' => 'Constable',
        'short_name' => 'Ct',
        'rank_order' => $order,
        'is_gazetted' => false,
        'is_active' => true,
    ]);
}

test('unique pno rule permits coach to share pno with linked member profile', function () {
    $user = lifecycleUser('coaches.create');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO998877',
        'full_name' => 'Athlete Turned Coach',
    ]);

    // Linking to member with identical PNO succeeds
    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'member_id' => $member->id,
        'full_name' => 'Athlete Turned Coach',
        'pno' => 'PNO998877',
        'coach_status' => 'ACTIVE',
    ]);

    $coach = Coach::latest('id')->first();
    $response->assertRedirect(route('coaches.show', $coach));
    $this->assertDatabaseHas('coaches', [
        'pno' => 'PNO998877',
        'member_id' => $member->id,
    ]);
});

test('store coach clears a stale member_id link from an archived coach that still holds it', function () {
    $user = lifecycleUser('coaches.create');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO665544',
        'full_name' => 'Repeat Registration Athlete',
    ]);

    // An older coach linked to this member was archived directly (not via
    // member deletion), so its member_id was never cleared — reproducing
    // the "Proceed as New Coach" scenario from the PNO conflict notice.
    $staleCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO665544',
        'member_id' => $member->id,
    ]);
    $staleCoach->delete();

    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'member_id' => $member->id,
        'full_name' => 'Repeat Registration Athlete',
        'pno' => 'PNO665544',
        'coach_status' => 'ACTIVE',
    ]);

    $newCoach = Coach::latest('id')->first();
    $response->assertRedirect(route('coaches.show', $newCoach));

    expect($newCoach->id)->not->toBe($staleCoach->id)
        ->and($newCoach->member_id)->toBe($member->id)
        ->and($staleCoach->fresh()->member_id)->toBeNull()
        ->and($member->fresh()->coach->id)->toBe($newCoach->id);
});

test('unique pno rule rejects unlinked coach reusing an existing member pno', function () {
    $user = lifecycleUser('coaches.create');
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO112233',
    ]);

    // Unlinked coach attempting to use that PNO is rejected
    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'full_name' => 'Unrelated Coach',
        'pno' => 'PNO112233',
        'coach_status' => 'ACTIVE',
    ]);

    $response->assertSessionHasErrors('pno');
});

test('store coach rejects pno mismatch when member_id is supplied', function () {
    $user = lifecycleUser('coaches.create');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO777777',
    ]);

    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'member_id' => $member->id,
        'full_name' => 'Mismatch Coach',
        'pno' => 'PNO888888',
        'coach_status' => 'ACTIVE',
    ]);

    $response->assertSessionHasErrors('pno');
});

test('store coach syncs the linked members playable sports when the form submits none', function () {
    $user = lifecycleUser('coaches.create');
    $sportA = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $sportB = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO554433',
        'sport_id' => $sportB->id,
    ]);
    $member->playableSports()->sync([
        $sportA->id => ['sport_event' => '100m'],
        $sportB->id => ['sport_event' => 'Long Jump'],
    ]);

    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'member_id' => $member->id,
        'full_name' => 'Athlete Turned Coach',
        'pno' => 'PNO554433',
        'coach_status' => 'ACTIVE',
    ]);

    $coach = Coach::latest('id')->first();
    $response->assertRedirect(route('coaches.show', $coach));

    $coachSports = $coach->sports()->withPivot(['is_primary', 'sport_event'])->get()->keyBy('id');

    expect($coachSports)->toHaveCount(2)
        ->and($coachSports[$sportA->id]->pivot->sport_event)->toBe('100m')
        ->and($coachSports[$sportB->id]->pivot->sport_event)->toBe('Long Jump')
        ->and($coachSports[$sportB->id]->pivot->is_primary)->toBeTrue()
        ->and($coachSports[$sportA->id]->pivot->is_primary)->toBeFalse();
});

test('store coach does not override an explicit sports selection with the members playable sports', function () {
    $user = lifecycleUser('coaches.create');
    $memberSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $formSport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO554455',
    ]);
    $member->playableSports()->sync([$memberSport->id => ['sport_event' => 'Sprint']]);

    $response = $this->actingAs($user)->post(route('coaches.store'), [
        'member_id' => $member->id,
        'full_name' => 'Explicit Sports Coach',
        'pno' => 'PNO554455',
        'coach_status' => 'ACTIVE',
        'sports' => [
            ['sport_id' => $formSport->id, 'is_primary' => true],
        ],
    ]);

    $coach = Coach::latest('id')->first();
    $response->assertRedirect(route('coaches.show', $coach));

    $coachSports = $coach->sports;
    expect($coachSports)->toHaveCount(1)
        ->and($coachSports->first()->id)->toBe($formSport->id);
});

test('coach create page delivers prefill data when member_id query parameter is provided', function () {
    $user = lifecycleUser('coaches.create');
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['district_id' => $district->id]);
    $rank = lifecycleRank();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Dhyan Chand',
        'pno' => 'PNO193600',
        'mobile' => '9876543210',
        'gender' => 'M',
        'rank' => $rank->name,
        'current_unit_id' => $unit->id,
        'posting_district_id' => $district->id,
    ]);

    $response = $this->actingAs($user)->get(route('coaches.create', ['member_id' => $member->id]));

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('coaches/create')
        ->has('prefill', fn (AssertableInertia $prefill) => $prefill
            ->where('member_id', $member->id)
            ->where('full_name', 'Dhyan Chand')
            ->where('pno', 'PNO193600')
            ->where('mobile', '9876543210')
            ->where('rank_master_id', $rank->id)
            ->where('unit_id', $unit->id)
            ->where('district_id', $district->id)
            ->where('gender', 'M')
            ->etc()
        )
    );
});

test('generate athlete profile creates and links member for unlinked coach', function () {
    $user = lifecycleUser('coaches.update', 'members.create');
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['district_id' => $district->id]);
    $rank = lifecycleRank();

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Prakash Padukone',
        'pno' => 'PNO198000',
        'mobile' => '9123456780',
        'gender' => 'M',
        'district_id' => $district->id,
        'unit_id' => $unit->id,
        'rank_master_id' => $rank->id,
        'member_id' => null,
    ]);

    $response = $this->actingAs($user)->post(route('coaches.generate-athlete-profile', $coach));

    $response->assertRedirect();
    $coach->refresh();

    expect($coach->member_id)->not->toBeNull();

    $member = Member::find($coach->member_id);
    expect($member)->not->toBeNull()
        ->and($member->full_name)->toBe('Prakash Padukone')
        ->and($member->pno)->toBe('PNO198000')
        ->and($member->rank)->toBe($rank->code)
        ->and($member->home_district_id)->toBe($district->id)
        ->and($member->current_unit_id)->toBe($unit->id);

    // Re-invoking when already linked warns and does not duplicate
    $secondResponse = $this->actingAs($user)->post(route('coaches.generate-athlete-profile', $coach));
    $secondResponse->assertRedirect();
    expect(Member::where('pno', 'PNO198000')->count())->toBe(1);
});

test('team profile data flags is_player_coach true when personnel is both player and coach', function () {
    $user = lifecycleUser('teams.view');
    $this->actingAs($user);

    $orgId = $user->organization_id;
    $session = SportSession::factory()->create(['organization_id' => $orgId, 'is_current' => true]);
    $sport = Sport::factory()->create(['organization_id' => $orgId]);
    $team = Team::factory()->create([
        'organization_id' => $orgId,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);

    $member = Member::factory()->create([
        'organization_id' => $orgId,
        'pno' => 'PNO555444',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
        'pno' => 'PNO555444',
    ]);

    // Add as player
    TeamMember::create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
        'joined_on' => now()->toDateString(),
    ]);

    // Add as coach
    CoachAssignment::create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
        'is_current' => true,
        'assigned_at' => now(),
    ]);

    $teamProfileData = app(TeamProfileData::class);
    $overview = $teamProfileData->overview($team, $team->organization_id);

    $memberRow = collect($overview['members'])->firstWhere('member.id', $member->id);
    expect($memberRow)->not->toBeNull()
        ->and($memberRow['is_player_coach'])->toBeTrue();

    $coachRow = collect($overview['coaches'])->firstWhere('coach.id', $coach->id);
    expect($coachRow)->not->toBeNull()
        ->and($coachRow['is_player_coach'])->toBeTrue();
});

test('coach achievements tab delivers hybrid payload with tournament medals and pre-recruitment records', function () {
    $user = lifecycleUser('coaches.view');
    $this->actingAs($user);

    $orgId = $user->organization_id;
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $sport = Sport::factory()->create(['organization_id' => $orgId]);
    $tier = TournamentTier::factory()->create();

    $member = Member::factory()->create([
        'organization_id' => $orgId,
        'pno' => 'PNO333222',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
        'pno' => 'PNO333222',
    ]);

    // 1. Tournament medal won as a player
    $tournament = Tournament::factory()->create([
        'organization_id' => $orgId,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'tier_id' => $tier->id,
    ]);

    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'individual',
    ]);

    $participation = Participation::factory()->create([
        'event_id' => $event->id,
        'session_id' => $session->id,
        'member_id' => $member->id,
        'team_id' => null,
    ]);

    Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => 'GOLD',
        'position' => 1,
    ]);

    // 2. Pre-recruitment achievement recorded directly for coach
    CoachPlayingAchievement::create([
        'organization_id' => $orgId,
        'coach_id' => $coach->id,
        'sport_id' => $sport->id,
        'period' => 'PRE_RECRUITMENT',
        'title' => 'Junior State Championship',
        'level' => 'STATE',
        'medal_type' => 'SILVER',
        'position' => 2,
    ]);

    $coachProfileData = app(CoachProfileData::class);
    $payload = $coachProfileData->achievements($coach);

    $playingAchievements = $payload['playingAchievements'];

    expect($playingAchievements['source'])->toBe('member')
        ->and($playingAchievements['records'])->toHaveCount(1)
        ->and($playingAchievements['pre_recruitment_records'])->toHaveCount(1)
        ->and($playingAchievements['summary']['tournament_medals'])->toBe(1)
        ->and($playingAchievements['summary']['pre_recruitment_medals'])->toBe(1)
        ->and($playingAchievements['summary']['total'])->toBe(2)
        ->and($playingAchievements['summary']['medals'])->toBe(2);
});

test('team assigned coach appears in participantCandidates and can participate in tournament event', function () {
    $user = lifecycleUser('tournaments.view', 'tournaments.update');
    $orgId = $user->organization_id;

    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $sport = Sport::factory()->create();
    $tier = TournamentTier::firstOrCreate(['code' => 'STATE'], ['label_hi' => 'राज्य', 'label_en' => 'State', 'weight' => 50]);

    $team = Team::factory()->create([
        'organization_id' => $orgId,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'is_active' => true,
    ]);

    // Create player on team
    $player = Member::factory()->create([
        'organization_id' => $orgId,
        'full_name' => 'Regular Player',
        'gender' => 'M',
    ]);
    TeamMember::create([
        'team_id' => $team->id,
        'member_id' => $player->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);

    // Create coach assigned to team (starts unlinked)
    $coach = Coach::factory()->create([
        'organization_id' => $orgId,
        'full_name' => 'Coach Participant',
        'pno' => 'PNO889900',
        'gender' => 'M',
        'member_id' => null,
    ]);
    CoachAssignment::create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $orgId,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'tier_id' => $tier->id,
    ]);

    // 1. Team event
    $teamEvent = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'team',
        'gender_class' => 'men',
    ]);

    // Check show page with deferred participantCandidates prop
    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    $response = $this->actingAs($user)->getJson(route('tournaments.events.show', [$tournament, $teamEvent]), [
        'X-Inertia' => 'true',
        'X-Inertia-Partial-Component' => 'events/show',
        'X-Inertia-Partial-Data' => 'participantCandidates',
        'X-Inertia-Version' => $version,
    ])->assertOk();

    // Verify coach was automatically linked and included in candidates
    $coach->refresh();
    expect($coach->member_id)->not->toBeNull();

    $candidates = $response->json('props.participantCandidates.0.members');
    $coachCandidate = collect($candidates)->firstWhere('id', $coach->member_id);
    expect($coachCandidate)->not->toBeNull()
        ->and($coachCandidate['is_coach'])->toBeTrue();

    // Store team event participants with both player and coach in lineup
    $storeResponse = $this->actingAs($user)->post(
        route('tournaments.events.participants.store', [$tournament, $teamEvent]),
        [
            'participants' => [
                [
                    'team_id' => $team->id,
                    'player_ids' => [$player->id, $coach->member_id],
                    'medal_type' => 'GOLD',
                    'position' => 1,
                ],
            ],
        ],
    );

    $storeResponse->assertRedirect(route('tournaments.events.show', [$tournament, $teamEvent]));

    $participations = Participation::where('event_id', $teamEvent->id)->get();
    expect($participations)->toHaveCount(2)
        ->and($participations->pluck('member_id')->all())->toContain($player->id, $coach->member_id);

    expect(Participation::where('member_id', $coach->member_id)->exists())->toBeTrue()
        ->and(Achievement::whereHas('participation', fn ($q) => $q->where('member_id', $coach->member_id))->exists())->toBeTrue();

    // 2. Individual event
    $indEvent = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'individual',
        'gender_class' => 'men',
    ]);

    $indStoreResponse = $this->actingAs($user)->post(
        route('tournaments.events.participants.store', [$tournament, $indEvent]),
        [
            'participants' => [
                [
                    'team_id' => $team->id,
                    'member_id' => $coach->member_id,
                    'medal_type' => 'SILVER',
                    'position' => 2,
                ],
            ],
        ],
    );

    $indStoreResponse->assertRedirect(route('tournaments.events.show', [$tournament, $indEvent]));

    $indParticipation = Participation::where('event_id', $indEvent->id)->where('member_id', $coach->member_id)->first();
    expect($indParticipation)->not->toBeNull()
        ->and($indParticipation->team_id)->toBe($team->id)
        ->and($indParticipation->position)->toBe(2);
});

test('coaches index supports status_scope=player_coaches filter and provides playerCoachCount', function () {
    $user = lifecycleUser('coaches.view');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO112233',
        'full_name' => 'Linked Player Coach Athlete',
    ]);

    $playerCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'full_name' => 'Coach Who Plays',
        'pno' => 'PNO112233',
    ]);

    $regularCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => null,
        'full_name' => 'Regular Coach Only',
        'pno' => 'PNO445566',
    ]);

    // Index default page has counts
    $response = $this->actingAs($user)->get(route('coaches.index'));
    $response->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('coaches/index')
            ->has('playerCoachCount')
            ->where('playerCoachCount', 1)
        );

    // Filtering by player_coaches returns only coaches linked to a member
    $filterResponse = $this->actingAs($user)->get(route('coaches.index', [
        'filter' => ['status_scope' => 'player_coaches'],
    ]));

    $filterResponse->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('coaches/index')
            ->where('filters.status_scope', 'player_coaches')
            ->has('coaches.data', 1)
            ->where('coaches.data.0.id', $playerCoach->id)
            ->where('coaches.data.0.member_id', $member->id)
            ->where('coaches.data.0.member.full_name', 'Linked Player Coach Athlete')
            ->where('coaches.data.0.member.pno', 'PNO112233')
        );
});

test('coach profile overview includes linked member identity with pno and current_status', function () {
    $user = lifecycleUser('coaches.view');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO556677',
        'full_name' => 'Dual Identity Member',
        'current_status' => 'ACTIVE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'full_name' => 'Dual Identity Coach',
        'pno' => 'PNO556677',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('coaches/show')
            ->where('coach.id', $coach->id)
            ->where('coach.linked_member.id', $member->id)
            ->where('coach.linked_member.full_name', 'Dual Identity Member')
            ->where('coach.linked_member.pno', 'PNO556677')
            ->where('coach.linked_member.current_status', 'ACTIVE')
        );
});

test('team event medals show for both regular member and coach in member events tab and coach departmental tournament medals', function () {
    $user = lifecycleUser('members.view', 'coaches.view', 'tournaments.view', 'tournaments.update');

    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);

    $sport = Sport::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Volleyball',
    ]);

    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'name' => 'Police Volleyball Team',
    ]);

    $regularMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Regular Player Athlete',
        'pno' => 'PNO889901',
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $regularMember->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);

    $coachMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Coach Player Athlete',
        'pno' => 'PNO889902',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $coachMember->id,
        'full_name' => 'Coach Player Athlete',
        'pno' => 'PNO889902',
    ]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'name' => 'All India Police Games',
    ]);

    $teamEvent = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'team',
        'gender_class' => 'men',
        'name' => 'Volleyball Championship',
    ]);

    // Store team event participants with both regular player and coach in relational participations
    $regularParticipation = Participation::create([
        'event_id' => $teamEvent->id,
        'session_id' => $session->id,
        'team_id' => $team->id,
        'member_id' => $regularMember->id,
        'position' => 1,
    ]);

    Achievement::create([
        'participation_id' => $regularParticipation->id,
        'medal_type' => 'GOLD',
        'position' => 1,
        'remarks' => 'Gold Medal in Team Event',
    ]);

    $coachParticipation = Participation::create([
        'event_id' => $teamEvent->id,
        'session_id' => $session->id,
        'team_id' => $team->id,
        'member_id' => $coachMember->id,
        'position' => 1,
    ]);

    Achievement::create([
        'participation_id' => $coachParticipation->id,
        'medal_type' => 'GOLD',
        'position' => 1,
        'remarks' => 'Gold Medal in Team Event',
    ]);

    // 1. Eloquent scopes
    expect(Participation::forMember($regularMember)->count())->toBe(1)
        ->and(Participation::forMember($coachMember)->count())->toBe(1)
        ->and(Achievement::forMember($regularMember)->count())->toBe(1)
        ->and(Achievement::forMember($coachMember)->count())->toBe(1);

    // 2. Member profile Events tab for the coach's linked member profile
    $coachMemberEventsResponse = $this->actingAs($user)->get(route('members.events', $coachMember));
    $coachMemberEventsResponse->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('members/show')
            ->where('activeTab', 'events')
            ->where('achievementsData.summary.GOLD', 1)
            ->where('achievementsData.achievements.0.medal_type', 'GOLD')
            ->where('achievementsData.achievements.0.event.name', 'Volleyball Championship')
            ->has('participations', 1)
        );

    // 3. Member profile Events tab for the regular player
    $regularMemberEventsResponse = $this->actingAs($user)->get(route('members.events', $regularMember));
    $regularMemberEventsResponse->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('members/show')
            ->where('activeTab', 'events')
            ->where('achievementsData.summary.GOLD', 1)
            ->where('achievementsData.achievements.0.medal_type', 'GOLD')
        );

    // 4. Coach profile Playing Achievements (Departmental Tournament Medals) and Coached Achievements
    $coachProfileResponse = $this->actingAs($user)->get(route('coaches.achievements', $coach));
    $coachProfileResponse->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'achievements')
            ->where('playingAchievements.summary.tournament_medals', 1)
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.medal_type', 'GOLD')
            ->where('playingAchievements.records.0.event_kind', 'team')
            ->where('playingAchievements.records.0.event.name', 'Volleyball Championship')
            ->where('coachAchievements.summary.GOLD', 1)
            ->where('coachAchievements.summary.total_events', 1)
            ->where('coachAchievements.summary.medal_winning_players', 2)
            ->has('coachAchievements.groups', 1)
            ->where('coachAchievements.groups.0.event.name', 'Volleyball Championship')
            ->has('coachAchievements.groups.0.players', 2)
        );
});
