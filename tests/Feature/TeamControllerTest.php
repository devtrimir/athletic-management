<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

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
        'member_id' => Member::factory()->create(['organization_id' => $user->organization_id])->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->captain()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create(['organization_id' => $user->organization_id])->id,
        'session_id' => $session->id,
    ]);
    TeamMember::factory()->reserve()->create([
        'team_id' => $team->id,
        'member_id' => Member::factory()->create(['organization_id' => $user->organization_id])->id,
        'session_id' => $session->id,
    ]);

    $this->actingAs($user)
        ->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/index')
            ->where('teams.data.0.id', $team->id)
            ->where('teams.data.0.players_count', 3)
            ->where('teams.data.0.captains_count', 1)
            ->where('teams.data.0.reserves_count', 1)
            ->etc()
        );
});
