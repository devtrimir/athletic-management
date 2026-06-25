<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\AchievementBenefit;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachCertification;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\CoachSport;
use App\Models\Event;
use App\Models\Member;
use App\Models\NisMaster;
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
use App\Models\User;
use App\Services\AuditLogBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function coachUser(string ...$permissions): User
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

function coachRank(string $code, int $order): Rank
{
    return Rank::create([
        'code' => $code,
        'name' => str($code)->replace('_', ' ')->title()->toString(),
        'short_name' => $code,
        'rank_order' => $order,
        'is_gazetted' => false,
        'is_active' => true,
    ]);
}

function coachedMedal(array $overrides = []): Achievement
{
    $organization = $overrides['organization'] ?? Organization::factory()->create();
    $session = $overrides['session'] ?? SportSession::factory()->create(['organization_id' => $organization->id]);
    $sport = $overrides['sport'] ?? Sport::factory()->create(['organization_id' => $organization->id]);
    $team = $overrides['team'] ?? Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $member = $overrides['member'] ?? Member::factory()->create([
        'organization_id' => $organization->id,
        'full_name' => $overrides['member_name'] ?? 'Medal Player',
    ]);
    $tier = $overrides['tier'] ?? TournamentTier::firstOrCreate(
        ['code' => $overrides['tier_code'] ?? 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $tournament = $overrides['tournament'] ?? Tournament::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'tier_id' => $tier->id,
        'name' => $overrides['tournament_name'] ?? 'National Police Games',
        'date_from' => $overrides['date_from'] ?? '2026-02-10',
    ]);
    $event = $overrides['event'] ?? Event::factory()->forTournament($tournament)->create([
        'name' => $overrides['event_name'] ?? '100m Sprint',
        'gender_class' => $overrides['gender_class'] ?? 'M',
    ]);

    if (($overrides['create_membership'] ?? true) === true) {
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $session->id,
        ]);
    }

    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'position' => $overrides['participation_position'] ?? 1,
    ]);

    return Achievement::factory()->forParticipation($participation)->create([
        'medal_type' => $overrides['medal_type'] ?? 'GOLD',
        'position' => $overrides['position'] ?? 1,
        'remarks' => $overrides['remarks'] ?? null,
    ]);
}

// ---------------------------------------------------------------------------
// index
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches index', function () {
    $this->get(route('coaches.index'))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on index', function () {
    $this->actingAs(coachUser())->get(route('coaches.index'))->assertForbidden();
});

test('user with coaches.view sees index', function () {
    $user = coachUser('coaches.view');

    $this->actingAs($user)
        ->get(route('coaches.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/index')
            ->has('coaches')
        );
});

test('index only shows coaches from own org', function () {
    $user = coachUser('coaches.view');
    $other = Organization::factory()->create();
    Coach::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->get(route('coaches.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 0));
});

test('index filter nis_certified=1 returns only certified coaches', function () {
    $user = coachUser('coaches.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $team = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id, 'is_active' => true]);
    $coach = Coach::factory()->nisCertified()->create(['organization_id' => $user->organization_id]);
    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);
    Coach::factory()->create(['organization_id' => $user->organization_id, 'nis_certified' => false]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['nis_certified' => '1']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 1));
});

test('index defaults to active coaches assigned to active team in current session', function () {
    $user = coachUser('coaches.view');
    $currentSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $activeTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => true]);
    $inactiveTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => false]);
    $oldSessionTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $oldSession->id, 'is_active' => true]);
    $activeCoach = Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'Active Coach']);
    $inactiveCoach = Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'Inactive Coach']);
    $inactiveTeamCoach = Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'Inactive Team Coach']);
    $oldSessionCoach = Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'Old Session Coach']);

    CoachAssignment::factory()->create([
        'coach_id' => $activeCoach->id,
        'team_id' => $activeTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => true,
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $inactiveCoach->id,
        'team_id' => $activeTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => false,
        'removed_at' => now(),
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $inactiveTeamCoach->id,
        'team_id' => $inactiveTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => true,
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $oldSessionCoach->id,
        'team_id' => $oldSessionTeam->id,
        'session_id' => $oldSession->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.status_scope', 'active')
            ->where('coaches.total', 1)
            ->where('coaches.data.0.full_name', 'Active Coach')
            ->where('activeCoachCount', 1)
            ->where('inactiveCoachCount', 3)
        );
});

test('index inactive tab shows coaches without active current-session team assignment', function () {
    $user = coachUser('coaches.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $team = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id, 'is_active' => true]);
    $activeCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $inactiveCoach = Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'Available Coach']);

    CoachAssignment::factory()->create([
        'coach_id' => $activeCoach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['status_scope' => 'inactive']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.status_scope', 'inactive')
            ->where('coaches.total', 1)
            ->where('coaches.data.0.full_name', 'Available Coach')
        );
});

test('index includes own organization certificate type filter values', function () {
    $user = coachUser('coaches.view');
    $other = Organization::factory()->create();

    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherCoach = Coach::factory()->create(['organization_id' => $other->id]);

    CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'certificate_type' => 'NIS',
    ]);
    CoachCertification::factory()->create([
        'coach_id' => $otherCoach->id,
        'certificate_type' => 'FITNESS',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['status_scope' => 'active']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('certificateTypes.0', 'NIS')
            ->missing('certificateTypes.1')
        );
});

test('index includes active nis master names as certificate type filter values', function () {
    $user = coachUser('coaches.view');

    NisMaster::query()->create([
        'kind' => 'nis',
        'code' => 'NIS_DIPLOMA',
        'name' => 'NIS diploma',
        'short_name' => 'Diploma',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['status_scope' => 'active']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('certificateTypes.0', 'NIS diploma')
        );
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches create', function () {
    $this->get(route('coaches.create'))->assertRedirect(route('login'));
});

test('user without coaches.create gets 403 on create', function () {
    $this->actingAs(coachUser())->get(route('coaches.create'))->assertForbidden();
});

test('user with coaches.create sees create form', function () {
    $this->actingAs(coachUser('coaches.create'))
        ->get(route('coaches.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('coaches/create'));
});

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('user without coaches.create gets 403 on store', function () {
    $this->actingAs(coachUser())
        ->post(route('coaches.store'), ['full_name' => 'राम'])
        ->assertForbidden();
});

test('store creates a standalone coach', function () {
    $user = coachUser('coaches.create');

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name' => 'राम प्रसाद',
            'nis_certified' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coaches', [
        'full_name' => 'राम प्रसाद',
        'display_name' => 'राम प्रसाद',
        'member_id' => null,
        'organization_id' => $user->organization_id,
    ]);
});

test('store ignores submitted member_id because coach members come from team assignments', function () {
    $user = coachUser('coaches.create');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name' => 'राम प्रसाद',
            'nis_certified' => false,
            'member_id' => $member->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coaches', [
        'full_name' => 'राम प्रसाद',
        'member_id' => null,
        'organization_id' => $user->organization_id,
    ]);
});

test('store requires full_name', function () {
    $this->actingAs(coachUser('coaches.create'))
        ->post(route('coaches.store'), [])
        ->assertSessionHasErrors('full_name');
});

test('store rejects duplicate pno within the same org', function () {
    $user = coachUser('coaches.create');
    Coach::factory()->create(['organization_id' => $user->organization_id, 'pno' => '1234567890']);

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name' => 'राम',
            'pno' => '1234567890',
        ])
        ->assertSessionHasErrors('pno');
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches show', function () {
    $coach = Coach::factory()->create();
    $this->get(route('coaches.show', $coach))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on show', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->get(route('coaches.show', $coach))->assertForbidden();
});

test('show returns coach resource in Inertia props', function () {
    $user = coachUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'overview')
            ->has('coach', fn ($c) => $c
                ->has('id')
                ->has('full_name')
                ->has('pno')
                ->has('mobile')
                ->has('nis_certified')
                ->where('team_activity_status', 'inactive')
                ->etc()
            )
        );
});

test('show marks coach active only when assigned to active team in current session', function () {
    $user = coachUser('coaches.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $team = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id, 'is_active' => true]);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('coach.team_activity_status', 'active')
        );
});

test('show does not expose member achievement or promotion props on coach profile', function () {
    $user = coachUser('coaches.view');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->missing('coachedMembers')
            ->missing('coachedMemberHistory')
            ->missing('coachTeams')
            ->missing('auditLog')
            ->missing('statusHistory')
            ->missing('aliases')
            ->missing('ranks')
            ->missing('sessions')
        );
});

test('coach assignment tab returns assignment data only on assignments route', function () {
    $user = coachUser('coaches.view');
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'name' => 'Athletics North',
    ]);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.assignments', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'assignments')
            ->has('coachTeams', 1)
            ->where('coachTeams.0.team.name', 'Athletics North')
            ->where('coachTeams.0.role', 'HEAD')
        );
});

test('coach sports tab returns sport rows and form options', function () {
    $user = coachUser('coaches.view');
    $sport = Sport::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Athletics',
    ]);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachSport::factory()->create([
        'coach_id' => $coach->id,
        'sport_id' => $sport->id,
        'is_primary' => true,
        'sport_event' => '100m',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.sports', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'sports')
            ->where('coach.sports.0.name', 'Athletics')
            ->where('coach.sports.0.sport_event', '100m')
            ->has('coach.sports.0.coach_sport_id')
            ->where('sports.0.name', 'Athletics')
            ->has('tiers')
        );
});

test('user without coaches view gets 403 on coach profile tab', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.status', $coach))
        ->assertForbidden();
});

test('user with coach sports permission can add sport from profile tab', function () {
    $user = coachUser('coaches.manageSports', 'coaches.view');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Original Coach Name',
    ]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.sports.store', $coach), [
            'sport_id' => $sport->id,
            'sport_event' => 'Freestyle',
            'level' => 'State',
            'is_primary' => true,
            'effective_from' => '2026-01-01',
        ])
        ->assertRedirect(route('coaches.sports', $coach));

    $this->assertDatabaseHas('coach_sport', [
        'coach_id' => $coach->id,
        'sport_id' => $sport->id,
        'sport_event' => 'Freestyle',
        'level' => 'State',
        'is_primary' => true,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'entity' => 'CoachSport',
        'action' => 'created',
    ]);
    expect($coach->fresh()->full_name)->toBe('Original Coach Name');

    expect(collect(app(AuditLogBuilder::class)->forCoach($coach))
        ->contains(fn (array $entry): bool => $entry['subject'] === 'Sport specialization'))
        ->toBeTrue();
});

test('user with coach sports permission can remove sport from profile tab', function () {
    $user = coachUser('coaches.manageSports');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $coachSport = CoachSport::factory()->create([
        'coach_id' => $coach->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)
        ->delete(route('coaches.sports.destroy', [$coach, $coachSport]))
        ->assertRedirect(route('coaches.sports', $coach));

    $this->assertDatabaseMissing('coach_sport', ['id' => $coachSport->id]);
    $this->assertDatabaseHas('audit_logs', [
        'entity' => 'CoachSport',
        'action' => 'deleted',
    ]);
});

test('user with coach certification permission can save certification from profile tab', function () {
    $user = coachUser('coaches.manageCertifications', 'coaches.view');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Original Coach Name',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'name' => 'NIS Diploma',
            'certificate_type' => 'NIS',
            'issuer' => 'SAI',
            'issued_at' => '2026-01-01',
            'expired_at' => '2026-12-31',
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    $certification = CoachCertification::query()->where('coach_id', $coach->id)->firstOrFail();

    expect($certification)
        ->name->toBe('NIS Diploma')
        ->certificate_type->toBe('NIS');
    expect($coach->fresh()->full_name)->toBe('Original Coach Name');
    expect(collect(app(AuditLogBuilder::class)->forCoach($coach))
        ->contains(fn (array $entry): bool => $entry['subject'] === 'Certification'))
        ->toBeTrue();
});

test('user with coach certification permission can update certification from profile tab', function () {
    $user = coachUser('coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'name' => 'Old Certificate',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'id' => $certification->id,
            'name' => 'Updated Certificate',
            'certificate_type' => 'Federation',
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    expect($certification->fresh())
        ->name->toBe('Updated Certificate')
        ->certificate_type->toBe('Federation');
});

test('user with coach certification permission can remove certification from profile tab', function () {
    $user = coachUser('coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create(['coach_id' => $coach->id]);

    $this->actingAs($user)
        ->delete(route('coaches.certifications.destroy', [$coach, $certification]))
        ->assertRedirect(route('coaches.certifications', $coach));

    $this->assertSoftDeleted('coach_certifications', ['id' => $certification->id]);
    $this->assertDatabaseHas('audit_logs', [
        'entity' => 'CoachCertification',
        'action' => 'deleted',
    ]);
});

test('coach achievements tab returns medals from coached team members', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create(['organization_id' => $organization->id, 'name' => '2026-2027']);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'name' => 'Athletics']);
    $team = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'name' => 'Athletics Team',
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->head()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'assigned_at' => '2026-01-01 00:00:00',
    ]);
    $achievement = coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'Winning Player',
        'medal_type' => 'GOLD',
        'event_name' => 'Long Jump',
    ]);
    AchievementBenefit::factory()->create([
        'organization_id' => $organization->id,
        'benefitable_type' => 'achievement',
        'benefitable_id' => $achievement->id,
        'benefit_type' => 'CASH_AWARD',
        'cash_amount' => 5000,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'achievements')
            ->where('coachAchievements.summary.GOLD', 1)
            ->where('coachAchievements.summary.total_events', 1)
            ->where('coachAchievements.summary.medal_winning_players', 1)
            ->where('coachAchievements.groups.0.team.name', 'Athletics Team')
            ->where('coachAchievements.groups.0.event.name', 'Long Jump')
            ->where('coachAchievements.groups.0.players.0.member.full_name', 'Winning Player')
            ->where('coachAchievements.groups.0.players.0.benefits.0.cash_amount', '5000.00')
            ->etc()
        );
});

test('coach achievements show other tier rows without counting medals', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);
    $team = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->head()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'assigned_at' => '2026-01-01 00:00:00',
    ]);

    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'tier_code' => 'OTHER',
        'member_name' => 'Other Tier Player',
        'medal_type' => 'GOLD',
        'event_name' => 'Invitation Event',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('coachAchievements.summary.GOLD', 0)
            ->where('coachAchievements.summary.total_events', 0)
            ->where('coachAchievements.summary.medal_winning_players', 0)
            ->where('coachAchievements.groups.0.tournament.tier_code', 'OTHER')
            ->where('coachAchievements.groups.0.event.name', 'Invitation Event')
            ->where('coachAchievements.groups.0.medal_counts.GOLD', 0)
            ->where('coachAchievements.groups.0.players.0.member.full_name', 'Other Tier Player')
            ->where('coachAchievements.groups.0.players.0.medal_type', 'GOLD')
            ->etc()
        );
});

test('coach achievements exclude unassigned teams sessions organizations and missing memberships', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $otherOrganization = Organization::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);
    $otherSession = SportSession::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);
    $team = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $otherTeam = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'assigned_at' => '2026-01-01 00:00:00',
    ]);

    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'Visible Player',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $otherTeam,
        'member_name' => 'Other Team Player',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $otherSession,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'Other Session Player',
    ]);
    coachedMedal([
        'organization' => $otherOrganization,
        'member_name' => 'Other Org Player',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'No Membership Player',
        'create_membership' => false,
    ]);

    $players = $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->inertiaProps('coachAchievements.groups.0.players');

    expect($players)->toHaveCount(1)
        ->and($players[0]['member']['full_name'])->toBe('Visible Player');
});

test('assistant coach receives team medal credit', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);
    $team = Team::factory()->create(['organization_id' => $organization->id, 'session_id' => $session->id]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->assistant()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'assigned_at' => '2026-01-01 00:00:00',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'team' => $team,
        'member_name' => 'Assistant Coached Player',
        'medal_type' => 'SILVER',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('coachAchievements.summary.SILVER', 1)
            ->where('coachAchievements.groups.0.players.0.member.full_name', 'Assistant Coached Player')
            ->etc()
        );
});

test('coach achievements respect assignment date window when tournament date exists', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);
    $team = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'assigned_at' => '2026-02-01 00:00:00',
        'removed_at' => '2026-02-28 23:59:59',
        'is_current' => false,
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'Inside Window',
        'date_from' => '2026-02-10',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'Before Window',
        'date_from' => '2026-01-10',
    ]);
    coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
        'member_name' => 'After Window',
        'date_from' => '2026-03-10',
    ]);

    $players = $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->inertiaProps('coachAchievements.groups.0.players');

    expect($players)->toHaveCount(1)
        ->and($players[0]['member']['full_name'])->toBe('Inside Window');
});

test('coach promotions tab returns promotion rows and rank options', function () {
    $user = coachUser('coaches.view');
    $fromRank = coachRank('CONSTABLE', 1);
    $toRank = coachRank('HEAD_CONSTABLE', 2);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'rank_master_id' => $fromRank->id,
    ]);
    CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'promotion_date' => '2026-02-01',
        'from_rank' => $fromRank->code,
        'to_rank' => $toRank->code,
        'cash_reward_amount' => '5000.00',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.promotions', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'promotions')
            ->where('coach.promotions.0.to_rank', $toRank->code)
            ->where('coach.promotions.0.cash_reward_amount', '5000.00')
            ->where('ranks.0.code', $fromRank->code)
        );
});

test('user with coach promotions permission can add promotion and reward from profile tab', function () {
    $user = coachUser('coaches.managePromotions', 'coaches.view');
    $fromRank = coachRank('CONSTABLE', 1);
    $toRank = coachRank('HEAD_CONSTABLE', 2);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'rank_master_id' => $fromRank->id,
    ]);
    $achievement = coachedMedal([
        'organization' => Organization::findOrFail($user->organization_id),
        'team' => Team::factory()->create(['organization_id' => $user->organization_id]),
    ]);
    $teamId = $achievement->participation->team_id;
    $sessionId = $achievement->participation->session_id;
    CoachAssignment::factory()->head()->create([
        'coach_id' => $coach->id,
        'team_id' => $teamId,
        'session_id' => $sessionId,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.promotions.store', $coach), [
            'promotion_date' => '2026-02-01',
            'from_rank' => $fromRank->code,
            'to_rank' => $toRank->code,
            'cash_reward_amount' => '5000.00',
            'cash_reward_date' => '2026-02-02',
            'cash_reward_reference' => 'ORDER-42',
            'reason' => 'Outstanding coaching performance.',
            'evidences' => [[
                'session_id' => $sessionId,
                'tournament_id' => $achievement->participation->event->tournament_id,
                'event_id' => $achievement->participation->event_id,
                'team_id' => $teamId,
            ]],
        ])
        ->assertRedirect(route('coaches.promotions', $coach));

    $this->assertDatabaseHas('coach_promotions', [
        'coach_id' => $coach->id,
        'to_rank' => $toRank->code,
        'cash_reward_reference' => 'ORDER-42',
    ]);
    $promotion = CoachPromotion::where('coach_id', $coach->id)->firstOrFail();
    $this->assertDatabaseHas('coach_promotion_evidence', [
        'coach_promotion_id' => $promotion->id,
        'session_id' => $sessionId,
        'event_id' => $achievement->participation->event_id,
        'team_id' => $teamId,
    ]);
    expect($coach->fresh()->rank_master_id)->toBe($toRank->id);
    expect(collect(app(AuditLogBuilder::class)->forCoach($coach))
        ->contains(fn (array $entry): bool => $entry['subject'] === 'Promotion'))
        ->toBeTrue();
    expect(collect(app(AuditLogBuilder::class)->forCoach($coach))
        ->contains(fn (array $entry): bool => $entry['subject'] === 'Reward event'))
        ->toBeTrue();
});

test('coach promotion can be reward only', function () {
    $user = coachUser('coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = coachedMedal([
        'organization' => Organization::findOrFail($user->organization_id),
        'team' => Team::factory()->create(['organization_id' => $user->organization_id]),
    ]);
    $teamId = $achievement->participation->team_id;
    $sessionId = $achievement->participation->session_id;
    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $teamId,
        'session_id' => $sessionId,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.promotions.store', $coach), [
            'cash_reward_amount' => '7500.00',
            'cash_reward_reference' => 'REWARD-1',
            'evidences' => [[
                'session_id' => $sessionId,
                'tournament_id' => $achievement->participation->event->tournament_id,
                'event_id' => $achievement->participation->event_id,
                'team_id' => $teamId,
            ]],
        ])
        ->assertRedirect(route('coaches.promotions', $coach));

    $this->assertDatabaseHas('coach_promotions', [
        'coach_id' => $coach->id,
        'to_rank' => null,
        'cash_reward_amount' => '7500.00',
        'cash_reward_reference' => 'REWARD-1',
    ]);
});

test('coach reward evidence options exclude already rewarded events', function () {
    $user = coachUser('coaches.view');
    $organization = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);
    $team = Team::factory()->create([
        'organization_id' => $organization->id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
    $coach = Coach::factory()->create(['organization_id' => $organization->id]);
    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
    ]);
    $achievement = coachedMedal([
        'organization' => $organization,
        'session' => $session,
        'sport' => $sport,
        'team' => $team,
    ]);
    $promotion = CoachPromotion::factory()->create([
        'organization_id' => $organization->id,
        'coach_id' => $coach->id,
        'cash_reward_amount' => '7500.00',
        'to_rank' => null,
    ]);
    CoachPromotionEvidence::factory()->create([
        'organization_id' => $organization->id,
        'coach_promotion_id' => $promotion->id,
        'session_id' => $session->id,
        'tournament_id' => $achievement->participation->event->tournament_id,
        'event_id' => $achievement->participation->event_id,
        'team_id' => $team->id,
        'achievement_id' => null,
    ]);

    $this->actingAs($user)
        ->get(route('coaches.promotions', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('rewardEvidenceOptions', [])
            ->where('coach.promotions.0.evidences.0.event_id', $achievement->participation->event_id)
        );
});

test('coach promotion requires rank or reward amount', function () {
    $user = coachUser('coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.promotions', $coach))
        ->post(route('coaches.promotions.store', $coach), [
            'reason' => 'Empty record',
        ])
        ->assertRedirect(route('coaches.promotions', $coach))
        ->assertSessionHasErrors('to_rank');

    $this->assertDatabaseMissing('coach_promotions', [
        'coach_id' => $coach->id,
        'reason' => 'Empty record',
    ]);
});

test('user with coach promotions permission can update promotion from profile tab', function () {
    $user = coachUser('coaches.managePromotions');
    $fromRank = coachRank('CONSTABLE', 1);
    $toRank = coachRank('HEAD_CONSTABLE', 2);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'rank_master_id' => $fromRank->id,
    ]);
    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'from_rank' => $fromRank->code,
        'to_rank' => $toRank->code,
        'cash_reward_amount' => '1000.00',
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.promotions.update', [$coach, $promotion]), [
            'from_rank' => $fromRank->code,
            'to_rank' => $toRank->code,
            'cash_reward_amount' => '2500.00',
            'cash_reward_reference' => 'UPDATED',
        ])
        ->assertRedirect(route('coaches.promotions', $coach));

    expect($promotion->fresh())
        ->cash_reward_amount->toBe('2500.00')
        ->cash_reward_reference->toBe('UPDATED');
});

test('user with coach promotions permission can remove promotion from profile tab', function () {
    $user = coachUser('coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
    ]);

    $this->actingAs($user)
        ->delete(route('coaches.promotions.destroy', [$coach, $promotion]))
        ->assertRedirect(route('coaches.promotions', $coach));

    $this->assertDatabaseMissing('coach_promotions', ['id' => $promotion->id]);
    $this->assertDatabaseHas('audit_logs', [
        'entity' => 'CoachPromotion',
        'action' => 'deleted',
    ]);
});

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches edit', function () {
    $coach = Coach::factory()->create();
    $this->get(route('coaches.edit', $coach))->assertRedirect(route('login'));
});

test('user without coaches.update gets 403 on edit', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->get(route('coaches.edit', $coach))->assertForbidden();
});

test('user with coaches.update sees edit form', function () {
    $user = coachUser('coaches.update');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.edit', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/edit')
            ->has('coach')
        );
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('user without coaches.update gets 403 on update', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), ['full_name' => 'नया नाम'])
        ->assertForbidden();
});

test('update persists changed fields and redirects', function () {
    $user = coachUser('coaches.update');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'पुराना नाम',
        'nis_certified' => false,
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), [
            'full_name' => 'नया नाम',
            'nis_certified' => true,
        ])
        ->assertRedirect(route('coaches.show', $coach));

    expect($coach->fresh())
        ->full_name->toBe('नया नाम')
        ->display_name->toBe('नया नाम')
        ->nis_certified->toBeTrue();
});

test('update ignores submitted member_id because coach members come from team assignments', function () {
    $user = coachUser('coaches.update');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
    ]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => null,
        'full_name' => 'पुराना नाम',
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), [
            'full_name' => 'नया नाम',
            'member_id' => $member->id,
        ])
        ->assertRedirect(route('coaches.show', $coach));

    expect($coach->fresh())
        ->full_name->toBe('नया नाम')
        ->member_id->toBeNull();
});

test('profile update keeps existing certifications and sports when tab data is omitted', function () {
    $user = coachUser('coaches.update');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'पुराना नाम',
    ]);
    $certification = CoachCertification::factory()->create(['coach_id' => $coach->id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $coachSport = CoachSport::factory()->create([
        'coach_id' => $coach->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), ['full_name' => 'नया नाम'])
        ->assertRedirect(route('coaches.show', $coach));

    expect($coach->fresh()->full_name)->toBe('नया नाम');
    $this->assertDatabaseHas('coach_certifications', [
        'id' => $certification->id,
        'deleted_at' => null,
    ]);
    $this->assertDatabaseHas('coach_sport', ['id' => $coachSport->id]);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('user without coaches.delete gets 403 on destroy', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->delete(route('coaches.destroy', $coach))->assertForbidden();
});

test('destroy soft-deletes coach and redirects to index', function () {
    $user = coachUser('coaches.delete');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('coaches.destroy', $coach))
        ->assertRedirect(route('coaches.index'));

    $this->assertSoftDeleted('coaches', ['id' => $coach->id]);
});
