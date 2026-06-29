<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
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

    return compact('tier', 'session', 'sport', 'tournament', 'event', 'participation', 'achievement');
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
    expect($response->json('filters.session_ids'))->toBe([])
        ->and($response->json('filters.sport_ids'))->toBe([])
        ->and($response->json('filters.unit_ids'))->toBe([])
        ->and($response->json('filters.tier_ids'))->toBe([]);
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
    expect($response->json('filters.session_ids'))->toBe([$setup['session']->id]);
});

test('medals pivot supports combined multi-select filters', function () {
    $user = medalsUser('reports.view');
    $goldSetup = medalsSetup($user, 'NATIONAL', 'GOLD');
    $silverSetup = medalsSetup($user, 'STATE', 'SILVER');

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals', [
            'sport_ids' => [$goldSetup['sport']->id, $silverSetup['sport']->id],
            'event_ids' => [$silverSetup['event']->id],
            'medal_types' => ['SILVER'],
        ]))
        ->assertOk();

    $data = collect($response->json('data'))->keyBy('tier.code');

    expect($data)->toHaveKey('STATE')
        ->and($data)->not->toHaveKey('NATIONAL')
        ->and($data['STATE']['SILVER'])->toBe(1)
        ->and($response->json('filters.sport_ids'))->toBe([
            $goldSetup['sport']->id,
            $silverSetup['sport']->id,
        ])
        ->and($response->json('filters.event_ids'))->toBe([$silverSetup['event']->id])
        ->and($response->json('filters.medal_types'))->toBe(['SILVER']);
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

test('pivot counts match seeded fixture ground truth', function () {
    $user = medalsUser('reports.view');
    $orgId = $user->organization_id;

    // Seed known fixture:
    // NATIONAL tier: 2 GOLD, 1 SILVER, 1 BRONZE, 0 MERIT
    // STATE tier:    0 GOLD, 0 SILVER, 0 BRONZE, 1 MERIT
    $national = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $state = TournamentTier::firstOrCreate(
        ['code' => 'STATE'],
        ['label_hi' => 'राज्य', 'label_en' => 'State', 'weight' => 60],
    );
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $sport = Sport::factory()->create(['organization_id' => $orgId]);

    $makeTournament = fn ($tier) => Tournament::factory()->create([
        'organization_id' => $orgId,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
        'sport_id' => $sport->id,
    ]);
    $makeAchievement = function (Tournament $tournament, string $medalType) use ($orgId, $sport) {
        $event = Event::factory()->create(['tournament_id' => $tournament->id, 'sport_id' => $sport->id]);
        $member = Member::factory()->create(['organization_id' => $orgId]);
        $part = Participation::factory()->create([
            'member_id' => $member->id,
            'event_id' => $event->id,
            'session_id' => $tournament->session_id,
        ]);
        Achievement::factory()->create(['participation_id' => $part->id, 'medal_type' => $medalType]);
    };

    $natTournament = $makeTournament($national);
    $makeAchievement($natTournament, 'GOLD');
    $makeAchievement($natTournament, 'GOLD');
    $makeAchievement($natTournament, 'SILVER');
    $makeAchievement($natTournament, 'BRONZE');

    $stateTournament = $makeTournament($state);
    $makeAchievement($stateTournament, 'MERIT');

    $response = $this->actingAs($user)->getJson(route('v1.reports.medals'))->assertOk();
    $data = collect($response->json('data'))->keyBy('tier.code');

    expect($data)->toHaveKey('NATIONAL')
        ->and($data['NATIONAL']['GOLD'])->toBe(2)
        ->and($data['NATIONAL']['SILVER'])->toBe(1)
        ->and($data['NATIONAL']['BRONZE'])->toBe(1)
        ->and($data['NATIONAL']['MERIT'])->toBe(0);

    expect($data)->toHaveKey('STATE')
        ->and($data['STATE']['GOLD'])->toBe(0)
        ->and($data['STATE']['SILVER'])->toBe(0)
        ->and($data['STATE']['BRONZE'])->toBe(0)
        ->and($data['STATE']['MERIT'])->toBe(1);
});

test('team medal tally groups medals by participation team', function () {
    $user = medalsUser('reports.view');
    $setup = medalsSetup($user, 'NATIONAL', 'GOLD');
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $setup['sport']->id,
        'session_id' => $setup['session']->id,
        'name' => 'Lucknow Athletics',
    ]);

    $setup['participation']->update(['team_id' => $team->id]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals', ['group_by' => 'team']))
        ->assertOk();

    expect($response->json('group_by'))->toBe('team');
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.team.name'))->toBe('Lucknow Athletics');
    expect($response->json('data.0.GOLD'))->toBe(1);
    expect($response->json('data.0.SILVER'))->toBe(0);
    expect($response->json('data.0.display_only'))->toBe(0);
    expect($response->json('data.0.players'))->toBe(1);
    expect($response->json('data.0.events'))->toBe(1);
});

test('team medal tally counts one team medal when multiple players medal in the same event', function () {
    $user = medalsUser('reports.view');
    $setup = medalsSetup($user, 'NATIONAL', 'GOLD');
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $setup['sport']->id,
        'session_id' => $setup['session']->id,
        'name' => 'Cricket XI',
    ]);
    $secondMember = Member::factory()->create(['organization_id' => $user->organization_id]);
    $secondParticipation = Participation::factory()->create([
        'member_id' => $secondMember->id,
        'event_id' => $setup['event']->id,
        'session_id' => $setup['session']->id,
        'team_id' => $team->id,
    ]);

    $setup['participation']->update(['team_id' => $team->id]);
    Achievement::factory()->create([
        'participation_id' => $secondParticipation->id,
        'medal_type' => 'GOLD',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals', ['group_by' => 'team']))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.team.name'))->toBe('Cricket XI');
    expect($response->json('data.0.GOLD'))->toBe(1);
    expect($response->json('data.0.players'))->toBe(2);
    expect($response->json('data.0.events'))->toBe(1);
});

test('team medal tally includes legacy medals from active team members in the same session', function () {
    $user = medalsUser('reports.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
        'name' => 'Legacy Team',
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    MemberLegacyAchievement::factory()->forMember($member)->create([
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'period' => 'POST_RECRUITMENT',
        'level' => 'INTERNATIONAL',
        'medal_type' => 'BRONZE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals', ['group_by' => 'team']))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.team.name'))->toBe('Legacy Team');
    expect($response->json('data.0.BRONZE'))->toBe(1);
    expect($response->json('data.0.players'))->toBe(1);
    expect($response->json('data.0.events'))->toBe(1);
});

test('medal detail includes live and legacy medals when drilling into a session tier', function () {
    $user = medalsUser('reports.view');
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'INTERNATIONAL'],
        ['label_hi' => 'International', 'label_en' => 'International', 'weight' => 100],
    );
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'tier_id' => $tier->id,
        'name' => 'International Tournament',
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id, 'sport_id' => $sport->id]);
    $participation = Participation::factory()->create([
        'member_id' => $member->id,
        'event_id' => $event->id,
        'session_id' => $session->id,
    ]);
    Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => 'GOLD',
    ]);

    MemberLegacyAchievement::factory()->forMember($member)->create([
        'session_id' => $session->id,
        'sport_id' => $sport->id,
        'period' => 'POST_RECRUITMENT',
        'level' => 'INTERNATIONAL',
        'competition_details' => 'Manual International Event',
        'event' => 'Relay',
        'event_date' => '2026-06-01',
        'medal_type' => 'GOLD',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('v1.reports.medals.detail', [
            'session_id' => $session->id,
            'tier_id' => $tier->id,
            'medal_type' => 'GOLD',
        ]))
        ->assertOk();

    expect($response->json('total'))->toBe(2);
    expect(collect($response->json('data'))->pluck('tournament.name')->all())
        ->toContain('International Tournament')
        ->toContain('Manual International Event');
    expect($response->json('medal_counts.GOLD'))->toBe(2);
});

test('other tier medals are shown as display only and excluded from calculated medal counts', function () {
    $user = medalsUser('reports.view');
    medalsSetup($user, 'OTHER', 'GOLD');

    $tierResponse = $this->actingAs($user)
        ->getJson(route('v1.reports.medals'))
        ->assertOk();

    expect($tierResponse->json('data'))->toHaveCount(1);
    expect($tierResponse->json('data.0.tier.code'))->toBe('OTHER');
    expect($tierResponse->json('data.0.GOLD'))->toBe(0);
    expect($tierResponse->json('data.0.display_only'))->toBe(1);
});

test('team medal tally export returns team rows', function () {
    $user = medalsUser('reports.view');
    $setup = medalsSetup($user, 'NATIONAL', 'SILVER');
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $setup['sport']->id,
        'session_id' => $setup['session']->id,
        'name' => 'Kanpur Team',
    ]);

    $setup['participation']->update(['team_id' => $team->id]);

    $response = $this->actingAs($user)
        ->get(route('reports.medals.export', ['group_by' => 'team']))
        ->assertOk();

    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    expect($response->streamedContent())
        ->toContain('Team')
        ->toContain('Kanpur Team')
        ->toContain('Gold,Silver,Bronze,Merit')
        ->toContain(',0,1,0,0,1,0,1,1');
});
