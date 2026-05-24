<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rosterUser(string ...$permissions): User
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

function rosterApiTeam(User $user): Team
{
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    return Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'unit_id' => $unit->id,
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request returns 401', function (): void {
    $this->getJson(route('v1.reports.team-roster'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = rosterUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.team-roster'))
        ->assertForbidden();
});

test('returns 200 with correct structure', function (): void {
    $user = rosterUser('reports.view');
    $team = rosterApiTeam($user);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'role' => 'CAPTAIN',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.team-roster'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.team.id'))->toBe($team->id);
    expect($response->json('data.0.members.0.role'))->toBe('CAPTAIN');
    expect($response->json('filters'))->toBe(['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null]);
});

test('returns empty data when no teams exist', function (): void {
    $user = rosterUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.team-roster'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});
