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

function medalsMemberUser(string ...$permissions): User
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

function medalsMemberSetup(User $user, string $medalType = 'GOLD'): Member
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'NATIONAL', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
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
    Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);

    return $member;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request returns 401', function (): void {
    $this->getJson(route('v1.reports.medals-by-member'))->assertUnauthorized();
});

test('user without reports.view gets 403', function (): void {
    $user = medalsMemberUser();

    $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member'))
        ->assertForbidden();
});

test('returns 200 with correct structure when authorised', function (): void {
    $user = medalsMemberUser('reports.view');
    $member = medalsMemberSetup($user, 'GOLD');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member'))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.member.id'))->toBe($member->id);
    expect($response->json('data.0.GOLD'))->toBe(1);
    expect($response->json('data.0.total'))->toBe(1);
    expect($response->json('filters.session_ids'))->toBe([])
        ->and($response->json('filters.sport_ids'))->toBe([])
        ->and($response->json('filters.unit_ids'))->toBe([])
        ->and($response->json('filters.tier_ids'))->toBe([]);
    expect($response->json('limit'))->toBe(50);
});

test('empty data when no achievements', function (): void {
    $user = medalsMemberUser('reports.view');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member'))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
    expect($response->json('limit'))->toBe(50);
});

test('limit param is respected', function (): void {
    $user = medalsMemberUser('reports.view');

    foreach (range(1, 5) as $_) {
        medalsMemberSetup($user);
    }

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member', ['limit' => 2]))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(2);
    expect($response->json('limit'))->toBe(2);
});

test('limit=0 returns 422', function (): void {
    $user = medalsMemberUser('reports.view');

    $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member', ['limit' => 0]))
        ->assertUnprocessable();
});

test('limit=501 returns 422', function (): void {
    $user = medalsMemberUser('reports.view');

    $this->actingAs($user)
        ->getJson(route('v1.reports.medals-by-member', ['limit' => 501]))
        ->assertUnprocessable();
});
