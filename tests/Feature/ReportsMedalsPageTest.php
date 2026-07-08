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

test('page props include report reference data without preloading tournaments or events', function (): void {
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
        ->missing('tournaments')
        ->missing('events')
    );
});

test('tournament search requires an applied year or session filter', function (): void {
    $user = medalsPageUser('reports.view');

    Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'National Games',
        'date_from' => '2026-01-10',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.tournaments', ['q' => 'National']))
        ->assertOk();

    expect($response->json('data'))->toBe([]);
});

test('tournament search is scoped by organisation and applied year', function (): void {
    $user = medalsPageUser('reports.view');
    $otherOrg = Organization::factory()->create();

    $match = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'National Police Games',
        'date_from' => '2026-01-10',
    ]);
    Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'National Old Games',
        'date_from' => '2025-01-10',
    ]);
    Tournament::factory()->create([
        'organization_id' => $otherOrg->id,
        'name' => 'National Police Games',
        'date_from' => '2026-01-10',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.tournaments', [
            'q' => 'Police',
            'year_from' => 2026,
            'year_to' => 2026,
        ]))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.id'))->toBe($match->id);
});

test('tournament search is scoped by applied session', function (): void {
    $user = medalsPageUser('reports.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $otherSession = SportSession::factory()->create(['organization_id' => $user->organization_id]);

    $match = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'name' => 'Session Police Games',
        'date_from' => '2026-01-10',
    ]);
    Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $otherSession->id,
        'name' => 'Session Police Games',
        'date_from' => '2026-01-10',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.tournaments', [
            'q' => 'Police',
            'session_ids' => [$session->id],
        ]))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.id'))->toBe($match->id);
});

test('event search requires sport or tournament context', function (): void {
    $user = medalsPageUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.events', ['q' => 'Final']))
        ->assertOk();

    expect($response->json('data'))->toBe([]);
});

test('event search is scoped by tournament sport year and organisation', function (): void {
    $user = medalsPageUser('reports.view');
    $otherOrg = Organization::factory()->create();
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $otherSport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'date_from' => '2026-01-10',
    ]);
    $match = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'name' => 'Freestyle Final',
    ]);
    Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $otherSport->id,
        'name' => 'Freestyle Final',
    ]);
    $oldTournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'date_from' => '2025-01-10',
    ]);
    Event::factory()->create([
        'tournament_id' => $oldTournament->id,
        'sport_id' => $sport->id,
        'name' => 'Freestyle Final',
    ]);
    $otherTournament = Tournament::factory()->create([
        'organization_id' => $otherOrg->id,
        'date_from' => '2026-01-10',
    ]);
    Event::factory()->create([
        'tournament_id' => $otherTournament->id,
        'sport_id' => $sport->id,
        'name' => 'Freestyle Final',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.search.events', [
            'q' => 'Final',
            'tournament_ids' => [$tournament->id],
            'sport_ids' => [$sport->id],
            'year_from' => 2026,
            'year_to' => 2026,
        ]))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.id'))->toBe($match->id);
});

test('medals page does not auto-apply the current session filter', function (): void {
    $user = medalsPageUser('reports.view');

    SportSession::factory()->create([
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
        ->where('defaultSessionId', null)
        ->where('defaultYearFrom', null)
        ->where('defaultYearTo', null)
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
