<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationAward;
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

function memberPerformanceUser(string ...$permissions): User
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

/**
 * @return array<string, string|null>
 */
function memberPerformanceHeaders(): array
{
    $version = file_exists(public_path('build/manifest.json'))
        ? hash_file('xxh128', public_path('build/manifest.json'))
        : null;

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Partial-Component' => 'members/show',
        'X-Inertia-Partial-Data' => 'performance',
        'X-Inertia-Version' => $version,
    ];
}

/**
 * @param  array{
 *     sport?: Sport,
 *     tier?: TournamentTier,
 *     tier_code?: string,
 *     medal_type?: string,
 *     with_achievement?: bool,
 *     award_type?: string|null
 * }  $overrides
 */
function memberPerformanceSeedParticipation(
    Organization $org,
    Member $member,
    SportSession $session,
    array $overrides = [],
): Participation {
    $sport = $overrides['sport']
        ?? Sport::factory()->create(['organization_id' => $org->id]);
    $tier = $overrides['tier']
        ?? TournamentTier::firstOrCreate(
            ['code' => $overrides['tier_code'] ?? 'NATIONAL'],
            [
                'label_hi' => $overrides['tier_code'] ?? 'NATIONAL',
                'label_en' => $overrides['tier_code'] ?? 'NATIONAL',
                'weight' => 80,
            ],
        );

    $tournament = Tournament::factory()->create([
        'organization_id' => $org->id,
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
    ]);

    if (($overrides['with_achievement'] ?? true) === true) {
        Achievement::factory()->create([
            'participation_id' => $participation->id,
            'medal_type' => $overrides['medal_type'] ?? 'GOLD',
        ]);
    }

    if (($overrides['award_type'] ?? null) !== null) {
        ParticipationAward::factory()->forParticipation($participation)->create([
            'organization_id' => $org->id,
            'award_type' => $overrides['award_type'],
            'title' => 'Best Player',
        ]);
    }

    return $participation;
}

test('performance is absent from the initial member show response', function (): void {
    $user = memberPerformanceUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->missing('performance')
        );
});

test('deferred performance returns summary session totals and ledger', function (): void {
    $user = memberPerformanceUser('members.view');
    $org = Organization::findOrFail($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $pastSession = SportSession::factory()->create([
        'organization_id' => $org->id,
        'name' => '2024-25',
        'is_current' => false,
    ]);
    $currentSession = SportSession::factory()->create([
        'organization_id' => $org->id,
        'name' => '2025-26',
        'is_current' => true,
    ]);

    memberPerformanceSeedParticipation($org, $member, $currentSession, [
        'medal_type' => 'GOLD',
        'award_type' => 'BEST_PLAYER',
        'tier_code' => 'NATIONAL',
    ]);
    memberPerformanceSeedParticipation($org, $member, $pastSession, [
        'medal_type' => 'BRONZE',
        'tier_code' => 'STATE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), memberPerformanceHeaders())
        ->assertOk();

    $summary = $response->json('props.performance.summary');
    $sessions = $response->json('props.performance.sessions');
    $ledger = $response->json('props.performance.ledger');

    expect($summary)->toMatchArray([
        'overall_rank' => 1,
        'current_session_rank' => 1,
        'participation_count' => 2,
        'achievement_count' => 2,
        'award_count' => 1,
        'current_session' => [
            'id' => $currentSession->id,
            'name' => '2025-26',
        ],
    ]);
    expect($summary['overall_points'])->toBe(array_sum(array_column($sessions, 'points')));
    expect($summary['overall_points'])->toBe(array_sum(array_column(array_column($ledger, 'scoring'), 'total_points')));
    expect($summary['current_session_points'])->toBe(
        collect($sessions)->firstWhere('session.id', $currentSession->id)['points']
    );

    expect($response->json('props.performance.summary.medals'))->toMatchArray([
        'GOLD' => 1,
        'SILVER' => 0,
        'BRONZE' => 1,
        'MERIT' => 0,
    ]);

    expect($sessions)->toHaveCount(2);
    expect($sessions[0]['session']['id'])->toBe($currentSession->id);
    expect($sessions[0]['points'])->toBe(25);
    expect($sessions[1]['session']['id'])->toBe($pastSession->id);

    expect($ledger)->toHaveCount(2);
    expect($ledger[0]['scoring']['total_points'])->toBe(25);
    expect($ledger[0]['awards'][0]['title'])->toBe('Best Player');
    expect($ledger[1]['session']['id'])->toBe($pastSession->id);
});

test('deferred performance returns empty scoring structures for a member without participations', function (): void {
    $user = memberPerformanceUser('members.view');
    $org = Organization::findOrFail($user->organization_id);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    SportSession::factory()->create([
        'organization_id' => $org->id,
        'name' => '2025-26',
        'is_current' => true,
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.show', $member), memberPerformanceHeaders())
        ->assertOk();

    expect($response->json('props.performance.summary.overall_points'))->toBe(0);
    expect($response->json('props.performance.summary.current_session_points'))->toBe(0);
    expect($response->json('props.performance.summary.overall_rank'))->toBeNull();
    expect($response->json('props.performance.summary.current_session_rank'))->toBeNull();
    expect($response->json('props.performance.sessions'))->toBeArray()->toBeEmpty();
    expect($response->json('props.performance.ledger'))->toBeArray()->toBeEmpty();
});
