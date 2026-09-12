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
