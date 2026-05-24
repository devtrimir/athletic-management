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

function medalsUser(string ...$permissions): User
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

function medalsSetup(User $user, string $tierCode = 'NATIONAL', string $medalType = 'GOLD'): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => $tierCode],
        ['label_hi' => $tierCode, 'label_en' => $tierCode, 'weight' => 80],
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
    $achievement = Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => $medalType,
    ]);

    return compact('tier', 'session', 'sport', 'tournament', 'achievement');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unauthenticated request to medals pivot returns 401', function () {
    $this->getJson(route('v1.reports.medals'))->assertUnauthorized();
});

test('user without reports.view gets 403 on medals pivot', function () {
    $user = medalsUser();

    $this->actingAs($user)->getJson(route('v1.reports.medals'))->assertForbidden();
});

test('medals pivot returns empty data when no achievements', function () {
    $user = medalsUser('reports.view');

    $response = $this->actingAs($user)->getJson(route('v1.reports.medals'))->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
    expect($response->json('filters'))->toBe(['session_id' => null, 'sport_id' => null, 'tier_id' => null]);
});

test('medals pivot returns correct tier row with GOLD count', function () {
    $user = medalsUser('reports.view');
    $setup = medalsSetup($user, 'NATIONAL', 'GOLD');

    $response = $this->actingAs($user)->getJson(route('v1.reports.medals'))->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['tier']['code'])->toBe('NATIONAL');
    expect($data[0]['GOLD'])->toBe(1);
    expect($data[0]['SILVER'])->toBe(0);
    expect($data[0]['BRONZE'])->toBe(0);
    expect($data[0]['MERIT'])->toBe(0);
});

test('medals pivot session_id filter scopes correctly', function () {
    $user = medalsUser('reports.view');
    $setup = medalsSetup($user, 'NATIONAL', 'SILVER');

    // Achievement in a different session
    $otherSession = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $otherTier = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'STATE', 'label_en' => 'State', 'weight' => 60],
    );
    $otherTournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $otherSession->id,
        'tier_id' => $otherTier->id,
    ]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $otherEvent = Event::factory()->create(['tournament_id' => $otherTournament->id, 'sport_id' => $sport->id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $otherPart = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $otherEvent->id,
        'session_id' => $otherSession->id,
    ]);
    Achievement::factory()->create(['participation_id' => $otherPart->id, 'medal_type' => 'GOLD']);

    // Filter to setup's session — should only see NATIONAL/SILVER, not STATE/GOLD
    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals', ['session_id' => $setup['session']->id]))
        ->assertOk();

    $codes = collect($response->json('data'))->pluck('tier.code')->all();
    expect($codes)->toContain('NATIONAL');
    expect($codes)->not->toContain('STATE');
    expect($response->json('filters.session_id'))->toBe($setup['session']->id);
});

test('medals pivot excludes other org achievements', function () {
    $user = medalsUser('reports.view');

    // Another org's data
    $otherUser = medalsUser('reports.view');
    medalsSetup($otherUser, 'NATIONAL', 'GOLD');

    $response = $this->actingAs($user)->getJson(route('v1.reports.medals'))->assertOk();

    // Our org has no achievements
    expect($response->json('data'))->toBeEmpty();
});
