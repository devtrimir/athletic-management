<?php

declare(strict_types=1);

use App\Models\Event;
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

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function medalsPageUser(string ...$permissions): User
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
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request redirects to login', function (): void {
    $response = $this->get(route('reports.medals'));

    $response->assertRedirect(route('login'));
});

test('user without reports.view gets 403', function (): void {
    $user = medalsPageUser();

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertForbidden();
});

test('user with reports.view gets 200 with correct Inertia component', function (): void {
    $user = medalsPageUser('reports.view');

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page->component('reports/medals'));
});

test('page props include sessions, sports, tiers, tournaments, and events', function (): void {
    $user = medalsPageUser('reports.view');

    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'name' => '2024-25']);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'tier_id' => $tier->id,
    ]);
    Event::factory()->create(['tournament_id' => $tournament->id, 'sport_id' => $sport->id]);

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertInertia(fn ($page) => $page
        ->component('reports/medals')
        ->has('sessions', 1)
        ->has('sports', 1)
        ->has('tiers')
        ->has('tournaments', 1)
        ->has('events', 1)
    );
});

test('defaultSessionId is the current session id when one exists', function (): void {
    $user = medalsPageUser('reports.view');

    $current = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
    ]);
    SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => false,
    ]);

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertInertia(fn ($page) => $page
        ->component('reports/medals')
        ->where('defaultSessionId', $current->id)
    );
});

test('defaultSessionId is null when no current session', function (): void {
    $user = medalsPageUser('reports.view');

    SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => false,
    ]);

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertInertia(fn ($page) => $page
        ->component('reports/medals')
        ->where('defaultSessionId', null)
    );
});

test('sessions are scoped to the authenticated user organisation', function (): void {
    $user = medalsPageUser('reports.view');

    SportSession::factory()->create(['organization_id' => $user->organization_id]);

    $otherOrg = Organization::factory()->create();
    SportSession::factory()->create(['organization_id' => $otherOrg->id]);

    $response = $this->actingAs($user)->get(route('reports.medals'));

    $response->assertInertia(fn ($page) => $page
        ->component('reports/medals')
        ->has('sessions', 1)
    );
});
