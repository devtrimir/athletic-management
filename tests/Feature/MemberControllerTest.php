<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\AuditLog;
use App\Models\District;
use App\Models\Event;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\MemberSpecialAchievement;
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
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Mirror production: the tournament tier master is always seeded.
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'AIPSC', 'label_hi' => 'अखिल भारतीय पुलिस खेल', 'label_en' => 'AIPSC', 'weight' => 70],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
        ['code' => 'ZONAL', 'label_hi' => 'क्षेत्रीय', 'label_en' => 'Zonal', 'weight' => 40],
        ['code' => 'OTHER', 'label_hi' => 'अन्य', 'label_en' => 'Other', 'weight' => 10],
    ], uniqueBy: ['code']);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function memberUser(string ...$permissions): User
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

function connectMemberToActiveTeam(Member $member): Team
{
    $session = SportSession::factory()->create(['organization_id' => $member->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $member->organization_id,
        'session_id' => $session->id,
        'is_active' => true,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    return $team;
}

// ---------------------------------------------------------------------------
// index
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from index', function () {
    $this->get(route('members.index'))->assertRedirect(route('login'));
});

test('user with members.view sees index', function () {
    $user = memberUser('members.view');

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->has('members')
        );
});

test('user without members.view gets 403', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertForbidden();
});

test('index filters by current_status', function () {
    $user = memberUser('members.view');
    $connected = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    connectMemberToActiveTeam($connected);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['current_status' => 'ACTIVE']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.id', $connected->id)
            ->where('members.data', fn ($data) => collect($data)->every(fn ($m) => $m['current_status'] === 'ACTIVE'))
        );
});

test('index defaults to active members', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.current_status', 'ACTIVE')
            ->where('members.total', 1)
            ->where('members.data', fn ($data) => collect($data)->every(fn ($m) => $m['current_status'] === 'ACTIVE'))
        );
});

test('index treats active status member without active team as inactive', function () {
    $user = memberUser('members.view');
    $connected = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    $unassigned = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    $removed = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    $inactiveTeam = Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);

    connectMemberToActiveTeam($connected);
    $removedTeam = connectMemberToActiveTeam($removed);
    TeamMember::query()
        ->where('team_id', $removedTeam->id)
        ->where('member_id', $removed->id)
        ->update(['left_on' => '2026-01-01']);
    $inactiveTeamModel = connectMemberToActiveTeam($inactiveTeam);
    $inactiveTeamModel->update(['is_active' => false]);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.id', $connected->id)
        );

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['status_scope' => 'inactive']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 3)
            ->where('members.data', fn ($data) => collect($data)->pluck('id')->sort()->values()->all() === collect([
                $unassigned->id,
                $removed->id,
                $inactiveTeam->id,
            ])->sort()->values()->all())
        );
});

test('index allows explicit inactive status filter', function () {
    $user = memberUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['current_status' => 'RETIRED']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.current_status', 'RETIRED')
            ->where('members.total', 1)
            ->where('members.data.0.current_status', 'RETIRED')
        );
});

test('index inactive status scope includes every non active member', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'ACTIVE']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'RETIRED']);
    Member::factory()->create(['organization_id' => $user->organization_id, 'current_status' => 'DISMISSED']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['status_scope' => 'inactive']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.status_scope', 'inactive')
            ->where('members.total', 2)
            ->where('members.data', fn ($data) => collect($data)->every(fn ($m) => $m['current_status'] !== 'ACTIVE'))
        );
});

test('index inactive status scope keeps existing filters', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'ACTIVE',
        'player_category' => 'SPORTS_QUOTA',
    ]));
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RETIRED',
        'player_category' => 'SPORTS_QUOTA',
    ]);
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'DISMISSED',
        'player_category' => 'GD',
    ]);

    $this->actingAs($user)
        ->get(route('members.index', [
            'filter' => [
                'status_scope' => 'inactive',
                'player_category' => 'SPORTS_QUOTA',
            ],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.status_scope', 'inactive')
            ->where('filters.player_category', 'SPORTS_QUOTA')
            ->where('members.total', 1)
            ->where('members.data.0.current_status', 'RETIRED')
            ->where('members.data.0.player_category', 'SPORTS_QUOTA')
        );
});

test('index filters by sports quota category', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'SPORTS_QUOTA']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'GD']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['player_category' => 'SPORTS_QUOTA']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.player_category', 'SPORTS_QUOTA')
            ->where('members.total', 1)
            ->where('members.data.0.player_category', 'SPORTS_QUOTA')
        );
});

test('index normalizes legacy skilled category as sports quota', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $member->forceFill(['player_category' => 'SKILLED'])->saveQuietly();
    connectMemberToActiveTeam($member);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['player_category' => 'SPORTS_QUOTA']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.player_category', 'SPORTS_QUOTA')
        );
});

test('index includes posting district independently from current unit district', function () {
    $user = memberUser('members.view');
    $unitDistrict = District::factory()->create();
    $postingDistrict = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $user->organization_id,
        'district_id' => $unitDistrict->id,
    ]);

    connectMemberToActiveTeam(Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'posting_district_id' => $postingDistrict->id,
    ]));

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data.0.current_unit.name', $unit->name)
            ->where('members.data.0.posting_district.name', $postingDistrict->name)
        );
});

test('index exposes current unit when posting district is missing', function () {
    $user = memberUser('members.view');
    $unitDistrict = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $user->organization_id,
        'district_id' => $unitDistrict->id,
    ]);

    connectMemberToActiveTeam(Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'posting_district_id' => null,
    ]));

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data.0.current_unit.name', $unit->name)
            ->where('members.data.0.posting_district', null)
        );
});

test('index includes primary and playable sports', function () {
    $user = memberUser('members.view');
    $primarySport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $playableSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $primarySport->id,
    ]);
    connectMemberToActiveTeam($member);
    $member->playableSports()->sync([
        $playableSport->id => [
            'role' => 'Batsman',
            'position' => '3',
            'weight' => '55 kg',
            'notes' => 'Top order',
        ],
    ]);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.data.0.sport.id', $primarySport->id)
            ->where('members.data.0.playable_sports.0.id', $playableSport->id)
            ->where('members.data.0.playable_sports.0.role', 'Batsman')
            ->where('members.data.0.playable_sports.0.position', '3')
            ->where('members.data.0.playable_sports.0.weight', '55 kg')
            ->where('members.data.0.playable_sports.0.notes', 'Top order')
        );
});

test('member export uses posting district fallback from current unit', function () {
    $user = memberUser('members.view');
    $unitDistrict = District::factory()->create();
    $postingDistrict = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $user->organization_id,
        'district_id' => $unitDistrict->id,
    ]);
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_unit_id' => $unit->id,
        'posting_district_id' => $postingDistrict->id,
    ]);

    $this->actingAs($user)
        ->get(route('members.export.show', $member, [
            'columns' => ['posting_district', 'promotion_date'],
        ]))
        ->assertOk()
        ->assertHeader('content-disposition');
});

test('index filters by rank', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'rank' => 'Inspector']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'rank' => 'Constable']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['rank' => 'Inspector']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.rank', 'Inspector')
            ->where('members.total', 1)
            ->where('members.data.0.rank', 'Inspector')
        );
});

test('index filters by designation', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'designation' => 'Station House Officer']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'designation' => 'Inspector']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['designation' => 'Station House Officer']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('filters.designation', 'Station House Officer')
            ->where('members.total', 1)
            ->where('members.data.0.designation', 'Station House Officer')
        );
});

test('index q filter searches by full_name', function () {
    $user = memberUser('members.view');
    connectMemberToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'राम कुमार']));
    Member::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'श्याम लाल']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['q' => 'राम']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.full_name', 'राम कुमार')
        );
});

test('index q filter searches by pno', function () {
    $user = memberUser('members.view');
    $target = Member::factory()->create(['organization_id' => $user->organization_id, 'pno' => '1234567890']);
    connectMemberToActiveTeam($target);
    Member::factory()->create(['organization_id' => $user->organization_id, 'pno' => '9999999999']);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['q' => '1234567890']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.pno', '1234567890')
        );
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('user with members.create sees create form', function () {
    $user = memberUser('members.create');

    $this->actingAs($user)
        ->get(route('members.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/create')
            ->has('districts')
            ->has('units')
            ->has('ranks')
            ->has('designations')
        );
});

test('user without members.create gets 403 on create', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->get(route('members.create'))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('user without members.create gets 403 on store', function () {
    $user = memberUser();

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'राम',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
        ])
        ->assertForbidden();
});

test('store with invalid payload returns validation errors', function () {
    $user = memberUser('members.create');

    $this->actingAs($user)
        ->post(route('members.store'), [])
        ->assertSessionHasErrors(['full_name', 'gender', 'player_category', 'player_level']);
});

test('store creates member and redirects to show', function () {
    $user = memberUser('members.create');
    $postingDistrict = District::factory()->create();
    $primarySport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $otherSport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $response = $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'राम कुमार',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'posting_district_id' => $postingDistrict->id,
            'playable_sports' => [
                ['sport_id' => $primarySport->id, 'role' => 'Batsman', 'position' => '3', 'sport_event' => 'Cricket', 'weight' => '55 kg', 'notes' => ''],
                ['sport_id' => $otherSport->id, 'role' => 'Bowler', 'position' => '1', 'sport_event' => 'Baseball', 'weight' => '70 kg', 'notes' => ''],
            ],
        ]);

    $member = Member::withoutGlobalScopes()->latest()->first();
    expect($member)->not->toBeNull()
        ->and($member->full_name)->toBe('राम कुमार')
        ->and($member->posting_district_id)->toBe($postingDistrict->id)
        ->and($member->member_code)->toStartWith('UPP-');

    $response->assertRedirect(route('members.show', $member));

    expect(AuditLog::where('entity', 'MemberSport')->where('entity_id', $member->id)->where('action', 'created')->count())->toBe(2);
    $this->assertDatabaseHas('member_sport', [
        'member_id' => $member->id,
        'sport_id' => $primarySport->id,
        'weight' => '55 kg',
    ]);
});

test('store backfills sport event into playable sports when row event is empty', function () {
    $user = memberUser('members.create');
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name' => 'राम कुमार',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'sport_event' => 'Cricket',
            'playable_sports' => [
                ['sport_id' => $sport->id, 'role' => 'Batsman', 'position' => '3', 'position' => '', 'notes' => ''],
            ],
        ])
        ->assertRedirect();

    $member = Member::withoutGlobalScopes()->latest()->first();
    $member?->load('playableSports');

    expect($member)->not->toBeNull();
    expect($member?->playableSports)->toHaveCount(1);
    expect($member?->playableSports->first()?->id)->toBe($sport->id);
    expect($member?->playableSports->first()?->pivot?->sport_event)->toBe('Cricket');
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('show returns member data', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->has('member')
            ->missing('auditLog')
        );
});

test('preview returns member print preview page', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'photo_path' => 'members/test-photo.jpg',
    ]);

    $this->actingAs($user)
        ->get(route('members.preview', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print-preview')
            ->has('member')
            ->where('member.photo_path', 'members/test-photo.jpg')
            ->has('achievements')
            ->has('auditLog')
        );
});

test('preview includes achievement data for the member record', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $organization = Organization::findOrFail($user->organization_id);
    $tournament = Tournament::factory()->forOrganization($organization)->create([
        'name' => 'राष्ट्रीय खेल',
        'date_from' => '2025-03-10',
        'date_to' => '2025-03-12',
    ]);
    $event = Event::factory()->forTournament($tournament)->create([
        'name' => '100 मीटर दौड़',
    ]);
    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
    ]);
    Achievement::factory()->forParticipation($participation)->create([
        'medal_type' => 'GOLD',
        'position' => 1,
    ]);

    $this->actingAs($user)
        ->get(route('members.preview', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print-preview')
            ->where('achievements.0.medal_type', 'GOLD')
            ->where('achievements.0.position', 1)
            ->where('achievements.0.participation_position', null)
            ->where('achievements.0.tournament.name', 'राष्ट्रीय खेल')
            ->where('achievements.0.event.name', '100 मीटर दौड़')
        );
});

test('preview includes special achievement and external coaching tab data', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    MemberSpecialAchievement::factory()->forMember($member)->create([
        'achievement_type' => 'COMMENDATION_DISC',
        'title' => 'Commendation Disc',
        'awarded_on' => '2026-02-01',
        'issuing_authority' => 'DGP UP',
        'order_reference' => 'DISC-100',
        'place' => 'Lucknow',
        'remarks' => 'Special departmental recognition.',
    ]);

    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'sport_id' => $sport->id,
        'start_date' => '2026-01-10',
        'end_date' => '2026-03-10',
        'status' => 'active',
        'attendance_mode' => 'single_mark',
    ]);

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $user->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $assignment->external_coach_id,
        'training_venue_id' => $assignment->training_venue_id,
        'attendance_date' => '2026-01-11',
        'attendance_status' => 'present',
        'geo_status' => 'valid',
        'review_status' => 'approved',
    ]);

    ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $user->organization_id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $assignment->external_coach_id,
        'sport_id' => $sport->id,
        'update_date' => '2026-01-20',
        'performance_level' => 'excellent',
        'performance_score' => 9,
        'review_status' => 'approved',
        'training_summary' => 'Sprint drills improved.',
    ]);

    $this->actingAs($user)
        ->get(route('members.preview', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print-preview')
            ->where('specialAchievements.summary.total', 1)
            ->where('specialAchievements.records.0.title', 'Commendation Disc')
            ->where('externalCoaching.assignments.0.start_date', '2026-01-10')
            ->where('externalCoaching.attendances.0.attendance_status', 'present')
            ->where('externalCoaching.performanceUpdates.0.performance_score', 9)
        );
});

test('preview keeps timeline entries without user attribution in the preview payload', function () {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.preview', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print-preview')
            ->where('auditLog.0.by', null)
        );
});

test('show returns 404 for member in other org', function () {
    $user = memberUser('members.view');
    $otherOrg = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test('edit returns member and selects', function () {
    $user = memberUser('members.update');
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $member->playableSports()->sync([
        $sport->id => [
            'role' => 'Batsman',
            'position' => '3',
            'weight' => '55 kg',
            'notes' => 'Top order',
        ],
    ]);

    $this->actingAs($user)
        ->get(route('members.edit', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/edit')
            ->has('member')
            ->where('member.playable_sports.0.id', $sport->id)
            ->where('member.playable_sports.0.pivot.role', 'Batsman')
            ->where('member.playable_sports.0.pivot.position', '3')
            ->where('member.playable_sports.0.pivot.weight', '55 kg')
            ->where('member.playable_sports.0.pivot.notes', 'Top order')
            ->has('districts')
            ->has('units')
            ->has('ranks')
            ->has('designations')
        );
});

test('edit returns 403 without members.update', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.edit', $member))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('update changes member and redirects to show', function () {
    $user = memberUser('members.update');
    $primarySport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $removedSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $addedSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $member->playableSports()->sync([$removedSport->id]);
    $postingDistrict = District::factory()->create();

    $this->actingAs($user)
        ->put(route('members.update', $member), [
            'full_name' => 'नया नाम',
            'posting_district_id' => $postingDistrict->id,
            'playable_sports' => [
                ['sport_id' => $addedSport->id, 'role' => 'Keeper', 'position' => '1', 'sport_event' => 'Hockey', 'weight' => '61 kg', 'notes' => ''],
            ],
        ])
        ->assertRedirect(route('members.show', $member));

    $member->refresh();

    expect($member->full_name)->toBe('नया नाम')
        ->and($member->posting_district_id)->toBe($postingDistrict->id);

    $memberSportLogs = AuditLog::where('entity', 'MemberSport')
        ->where('entity_id', $member->id)
        ->get();

    expect($memberSportLogs->contains(fn (AuditLog $log) => $log->action === 'created' && (int) ($log->diff['sport_id'] ?? 0) === $addedSport->id))->toBeTrue();
    expect($memberSportLogs->contains(fn (AuditLog $log) => $log->action === 'deleted' && (int) ($log->diff['sport_id'] ?? 0) === $removedSport->id))->toBeTrue();
});

test('update with invalid payload returns validation errors', function () {
    $user = memberUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['gender' => 'X'])
        ->assertSessionHasErrors(['gender']);
});

test('update returns 403 without members.update', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), ['full_name' => 'नया नाम'])
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('destroy soft-deletes member and redirects to index', function () {
    $user = memberUser('members.delete');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('members.destroy', $member))
        ->assertRedirect(route('members.index'));

    $this->assertSoftDeleted($member);
});

test('destroy returns 403 without permission', function () {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('members.destroy', $member))
        ->assertForbidden();
});
