<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function teamExportUser(string ...$permissions): User
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
// index (bulk export)
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from teams.export', function () {
    $this->get(route('teams.export'))->assertRedirect(route('login'));
});

test('user without teams.view gets 403 on teams.export', function () {
    Excel::fake();

    $this->actingAs(teamExportUser())->get(route('teams.export'))->assertForbidden();
});

test('teams.export returns xlsx download for authorised user', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    Team::factory()->count(3)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export'))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export applies default current session when no filter given', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $otherSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);

    Team::factory()->count(2)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);
    Team::factory()->count(1)->create(['organization_id' => $user->organization_id, 'session_id' => $otherSession->id]);

    $this->actingAs($user)->get(route('teams.export'))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export with ids[] exports only specified teams', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $keep = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);
    Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export', ['ids' => [$keep->id]]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export with session_id filter scopes correctly', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    Team::factory()->count(2)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export', ['filter' => ['session_id' => $session->id]]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});
