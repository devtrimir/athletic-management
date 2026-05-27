<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function tournamentExportUser(string ...$permissions): User
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

test('unauthenticated user is redirected from tournaments.export', function () {
    $this->get(route('tournaments.export'))->assertRedirect(route('login'));
});

test('user without tournaments.view gets 403 on tournaments.export', function () {
    Excel::fake();

    $this->actingAs(tournamentExportUser())->get(route('tournaments.export'))->assertForbidden();
});

test('tournaments.export returns xlsx download for authorised user', function () {
    Excel::fake();

    $user = tournamentExportUser('tournaments.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $tier = TournamentTier::factory()->create();
    $sport = Sport::factory()->create();

    Tournament::factory()->count(3)->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)->get(route('tournaments.export'))->assertOk();

    Excel::assertDownloaded('tournaments-'.now()->format('Y-m-d').'.xlsx');
});

test('tournaments.export applies default current session when no filter given', function () {
    Excel::fake();

    $user = tournamentExportUser('tournaments.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $other = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $tier = TournamentTier::factory()->create();
    $sport = Sport::factory()->create();

    Tournament::factory()->count(2)->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    Tournament::factory()->count(1)->create([
        'organization_id' => $user->organization_id,
        'session_id' => $other->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)->get(route('tournaments.export'))->assertOk();

    Excel::assertDownloaded('tournaments-'.now()->format('Y-m-d').'.xlsx');
});

test('tournaments.export with ids[] exports only specified tournaments', function () {
    Excel::fake();

    $user = tournamentExportUser('tournaments.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $tier = TournamentTier::factory()->create();
    $sport = Sport::factory()->create();

    $keep = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)->get(route('tournaments.export', ['ids' => [$keep->id]]))->assertOk();

    Excel::assertDownloaded('tournaments-'.now()->format('Y-m-d').'.xlsx');
});

test('tournaments.export with tier_id filter scopes correctly', function () {
    Excel::fake();

    $user = tournamentExportUser('tournaments.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $tier = TournamentTier::factory()->create();
    $sport = Sport::factory()->create();

    Tournament::factory()->count(2)->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);

    $this->actingAs($user)
        ->get(route('tournaments.export', ['filter' => ['session_id' => $session->id, 'tier_id' => $tier->id]]))
        ->assertOk();

    Excel::assertDownloaded('tournaments-'.now()->format('Y-m-d').'.xlsx');
});
