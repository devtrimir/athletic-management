<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
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

function ahApiUser(string ...$permissions): User
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

/**
 * Seed one achievement for the given user's organisation.
 */
function ahApiSeed(User $user, string $medalType = 'GOLD'): void
{
    $org = Organization::withoutGlobalScopes()->find($user->organization_id);
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id, 'sport_id' => $sport->id]);
    $participation = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
    ]);
    Achievement::factory()->create(['participation_id' => $participation->id, 'medal_type' => $medalType]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request returns 401', function (): void {
    $this->getJson(route('v1.reports.achievement-history'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = ahApiUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.achievement-history'))
        ->assertForbidden();
});

test('returns 200 with correct structure', function (): void {
    $user = ahApiUser('reports.view');
    ahApiSeed($user, 'GOLD');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.achievement-history'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0'))->toHaveKeys(['member', 'tournament', 'event', 'medal_type', 'position']);
    expect($response->json('data.0.medal_type'))->toBe('GOLD');
    expect($response->json('filters'))->toBe(['session_id' => null, 'sport_id' => null, 'unit_id' => null, 'tier_id' => null, 'member_name' => null, 'pno' => null, 'tournament_id' => null, 'event_name' => null]);
});

test('returns empty data when no achievements exist', function (): void {
    $user = ahApiUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.achievement-history'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});
