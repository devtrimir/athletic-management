<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function dashboardUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($permissions !== []) {
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

test('dashboard coach count includes only active current-session team assignments', function (): void {
    $user = dashboardUser('coaches.view');
    $currentSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $activeTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => true]);
    $inactiveTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => false]);
    $oldSessionTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $oldSession->id, 'is_active' => true]);
    $activeCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $inactiveCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $inactiveTeamCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $oldSessionCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);

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
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.coaches.active', 1)
        );
});
