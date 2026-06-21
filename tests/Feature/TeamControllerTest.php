<?php

declare(strict_types=1);

use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

uses(RefreshDatabase::class);

function teamIndexUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $permission = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );

            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $permission->id]);
        }
    }

    return $user;
}

function teamPayload(Organization $org, array $overrides = []): array
{
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $district = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $org->id,
        'district_id' => $district->id,
    ]);

    return array_merge([
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'location_type' => 'unit',
        'district_id' => null,
        'unit_id' => $unit->id,
        'name' => 'टीम परीक्षण',
        'in_charge' => 'प्रभारी',
        'is_active' => true,
    ], $overrides);
}

test('teams index includes roster role counts for software listing context', function (): void {
    $user = teamIndexUser('teams.view');
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create([
            'organization_id' => $user->organization_id,
            'gender' => 'M',
        ])->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->captain()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create([
            'organization_id' => $user->organization_id,
            'gender' => 'F',
        ])->id,
        'session_id' => $session->id,
    ]);
    TeamMember::factory()->reserve()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create([
            'organization_id' => $user->organization_id,
            'gender' => 'F',
        ])->id,
        'session_id' => $session->id,
    ]);
    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'full_name' => 'Inspector Meera Singh',
        'pno' => '1234567890',
        'rank' => 'Inspector',
        'designation' => 'Team Incharge',
    ]);

    $this->actingAs($user)
        ->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/index')
            ->where('teams.data.0.id', $team->id)
            ->where('teams.data.0.players_count', 3)
            ->where('teams.data.0.male_players_count', 1)
            ->where('teams.data.0.female_players_count', 2)
            ->where('teams.data.0.captains_count', 1)
            ->where('teams.data.0.reserves_count', 1)
            ->where('teams.data.0.current_incharge_assignment.full_name', 'Inspector Meera Singh')
            ->where('teams.data.0.current_incharge_assignment.pno', '1234567890')
            ->etc()
        );
});

test('teams index roster counts follow selected session without duplicating team rows', function (): void {
    $user = teamIndexUser('teams.view');
    $currentSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);
    $oldSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => false,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $oldSession->id,
    ]);

    TeamMember::factory()->count(2)->create([
        'team_id' => $team->id,
        'session_id' => $currentSession->id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'session_id' => $oldSession->id,
    ]);

    $this->actingAs($user)
        ->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSessionId', $currentSession->id)
            ->where('teams.data.0.id', $team->id)
            ->where('teams.data.0.players_count', 2)
            ->etc()
        );

    $this->actingAs($user)
        ->get(route('teams.index', ['filter' => ['session_id' => $oldSession->id]]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSessionId', $oldSession->id)
            ->where('teams.data.0.id', $team->id)
            ->where('teams.data.0.players_count', 1)
            ->etc()
        );
});

test('teams index marks only current session active teams as active for listing status', function (): void {
    $user = teamIndexUser('teams.view');
    $currentSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);
    $oldSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => false,
    ]);

    $currentTeam = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $currentSession->id,
        'is_active' => true,
        'name' => 'Current Session Team',
    ]);
    $oldTeam = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $oldSession->id,
        'is_active' => true,
        'name' => 'Old Session Team',
    ]);

    $this->actingAs($user)
        ->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teams.data.0.id', $currentTeam->id)
            ->where('teams.data.0.listing_is_active', true)
            ->where('teams.data.1.id', $oldTeam->id)
            ->where('teams.data.1.listing_is_active', false)
        );
});

test('teams export supports redesigned listing columns', function (): void {
    Excel::fake();

    $user = teamIndexUser('teams.view');
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create([
            'organization_id' => $user->organization_id,
            'gender' => 'M',
        ])->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create([
            'organization_id' => $user->organization_id,
            'gender' => 'F',
        ])->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);
    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'full_name' => 'Inspector Meera Singh',
        'pno' => '1234567890',
    ]);

    $this->actingAs($user)
        ->get(route('teams.export', [
            'columns' => [
                'posting',
                'in_charge',
                'incharge_pno',
                'male_players_count',
                'female_players_count',
            ],
        ]));

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('can create a district based team', function (): void {
    $user = teamIndexUser('teams.create', 'teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $district = District::factory()->create();
    $payload = teamPayload($org, [
        'location_type' => 'district',
        'district_id' => $district->id,
        'unit_id' => null,
        'name' => 'जिला हॉकी टीम',
    ]);

    $this->actingAs($user)
        ->post(route('teams.store'), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('teams', [
        'organization_id' => $org->id,
        'name' => 'जिला हॉकी टीम',
        'location_type' => 'district',
        'district_id' => $district->id,
        'unit_id' => null,
        'is_active' => true,
    ]);
});

test('unit based team derives district from the selected unit', function (): void {
    $user = teamIndexUser('teams.create', 'teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $district = District::factory()->create();
    $unit = Unit::factory()->create([
        'organization_id' => $org->id,
        'district_id' => $district->id,
    ]);
    $payload = teamPayload($org, [
        'district_id' => 999999,
        'unit_id' => $unit->id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.store'), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('teams', [
        'organization_id' => $org->id,
        'unit_id' => $unit->id,
        'district_id' => $district->id,
        'location_type' => 'unit',
    ]);
});

test('district based team requires district_id', function (): void {
    $user = teamIndexUser('teams.create');
    $org = Organization::findOrFail($user->organization_id);

    $this->actingAs($user)
        ->post(route('teams.store'), teamPayload($org, [
            'location_type' => 'district',
            'district_id' => null,
            'unit_id' => null,
        ]))
        ->assertSessionHasErrors(['district_id']);
});

test('unit based team requires unit_id', function (): void {
    $user = teamIndexUser('teams.create');
    $org = Organization::findOrFail($user->organization_id);

    $this->actingAs($user)
        ->post(route('teams.store'), teamPayload($org, [
            'unit_id' => null,
        ]))
        ->assertSessionHasErrors(['unit_id']);
});

test('inactive teams are hidden from the default index listing', function (): void {
    $user = teamIndexUser('teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $org->id,
        'is_current' => true,
    ]);

    $activeTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $session->id,
        'is_active' => true,
    ]);
    Team::factory()->forOrganization($org)->create([
        'session_id' => $session->id,
        'is_active' => false,
        'name' => 'निष्क्रिय टीम',
    ]);

    $this->actingAs($user)
        ->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teams.data.0.id', $activeTeam->id)
            ->missing('teams.data.1')
        );
});

test('inactive filter exposes inactive teams in the index', function (): void {
    $user = teamIndexUser('teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $org->id,
        'is_current' => true,
    ]);

    Team::factory()->forOrganization($org)->create([
        'session_id' => $session->id,
        'is_active' => false,
        'name' => 'निष्क्रिय टीम',
    ]);

    $this->actingAs($user)
        ->get(route('teams.index', ['filter' => ['is_active' => '0']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teams.data.0.name', 'निष्क्रिय टीम')
            ->where('teams.data.0.is_active', false)
            ->etc()
        );
});
