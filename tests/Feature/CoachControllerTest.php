<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
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

test('user without coaches view gets 403 on coach profile tab', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.status', $coach))
        ->assertForbidden();
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

    expect($coach->fresh()->full_name)->toBe('नया नाम');
    expect($coach->fresh()->nis_certified)->toBeTrue();
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
