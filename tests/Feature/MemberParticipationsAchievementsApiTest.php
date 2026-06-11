<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\AchievementBenefit;
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

function paApiUser(string ...$permissions): User
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

function paApiSetup(User $user): array
{
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
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
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
    ]);
    $participation = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
        'position' => 1,
    ]);

    return compact('member', 'session', 'tournament', 'event', 'participation');
}

// ---------------------------------------------------------------------------
// GET /api/v1/members/{member}/participations
// ---------------------------------------------------------------------------

test('unauthenticated request to participations API returns 401', function () {
    $member = Member::factory()->create();

    $this->getJson(route('v1.members.participations.index', $member))
        ->assertUnauthorized();
});

test('user without members.view gets 403 on participations API', function () {
    $user = paApiUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $member))
        ->assertForbidden();
});

test('participations API returns empty data when member has no participations', function () {
    $user = paApiUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $member))
        ->assertOk();

    expect($response->json('data'))->toBeArray()->toBeEmpty();
});

test('participations API returns data grouped by session', function () {
    $user = paApiUser('members.view');
    $setup = paApiSetup($user);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $setup['member']))
        ->assertOk();

    $data = $response->json('data');

    expect($data)->toHaveCount(1);
    expect($data[0]['session']['id'])->toBe($setup['session']->id);
    expect($data[0]['participations'])->toHaveCount(1);
    expect($data[0]['participations'][0]['id'])->toBe($setup['participation']->id);
    expect($data[0]['participations'][0]['tournament']['id'])->toBe($setup['tournament']->id);
    expect($data[0]['participations'][0]['tournament']['tier_code'])->toBe('NATIONAL');
    expect($data[0]['participations'][0]['event']['id'])->toBe($setup['event']->id);
    expect($data[0]['participations'][0]['achievement'])->toBeNull();
});

test('participations API includes achievement when present', function () {
    $user = paApiUser('members.view');
    $setup = paApiSetup($user);

    Achievement::factory()->create([
        'participation_id' => $setup['participation']->id,
        'medal_type' => 'GOLD',
        'position' => 1,
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $setup['member']))
        ->assertOk();

    $achievement = $response->json('data.0.participations.0.achievement');

    expect($achievement['medal_type'])->toBe('GOLD')
        ->and($achievement['position'])->toBe(1);
});

test('participations API marks achievements that already have a benefit', function () {
    $user = paApiUser('members.view');
    $setup = paApiSetup($user);

    $achievement = Achievement::factory()->create([
        'participation_id' => $setup['participation']->id,
        'medal_type' => 'GOLD',
        'position' => 1,
    ]);

    AchievementBenefit::create([
        'organization_id' => $user->organization_id,
        'benefitable_type' => 'achievement',
        'benefitable_id' => $achievement->id,
        'benefit_type' => 'CASH_AWARD',
        'cash_amount' => 2500,
        'benefit_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $setup['member']))
        ->assertOk();

    expect($response->json('data.0.participations.0.achievement.benefits.0.benefit_type'))->toBe('CASH_AWARD');
});

test('participations API returns 404 for member from another org', function () {
    $user = paApiUser('members.view');
    $otherMember = Member::factory()->create(); // different org

    $this->actingAs($user)
        ->getJson(route('v1.members.participations.index', $otherMember))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// GET /api/v1/members/{member}/achievements
// ---------------------------------------------------------------------------

test('unauthenticated request to achievements API returns 401', function () {
    $member = Member::factory()->create();

    $this->getJson(route('v1.members.achievements.index', $member))
        ->assertUnauthorized();
});

test('user without members.view gets 403 on achievements API', function () {
    $user = paApiUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('v1.members.achievements.index', $member))
        ->assertForbidden();
});

test('achievements API returns zero summary and empty list when no achievements', function () {
    $user = paApiUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.achievements.index', $member))
        ->assertOk();

    expect($response->json('data.summary'))->toBe(['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0]);
    expect($response->json('data.achievements'))->toBeEmpty();
});

test('achievements API returns correct summary counts and list', function () {
    $user = paApiUser('members.view');
    $setup = paApiSetup($user);

    Achievement::factory()->create([
        'participation_id' => $setup['participation']->id,
        'medal_type' => 'GOLD',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.achievements.index', $setup['member']))
        ->assertOk();

    expect($response->json('data.summary.GOLD'))->toBe(1);
    expect($response->json('data.summary.SILVER'))->toBe(0);
    expect($response->json('data.achievements'))->toHaveCount(1);
    expect($response->json('data.achievements.0.medal_type'))->toBe('GOLD');
    expect($response->json('data.achievements.0.tournament.tier_code'))->toBe('NATIONAL');
    expect($response->json('data.achievements.0.session.id'))->toBe($setup['session']->id);
});

test('achievements API returns 404 for member from another org', function () {
    $user = paApiUser('members.view');
    $otherMember = Member::factory()->create();

    $this->actingAs($user)
        ->getJson(route('v1.members.achievements.index', $otherMember))
        ->assertNotFound();
});
