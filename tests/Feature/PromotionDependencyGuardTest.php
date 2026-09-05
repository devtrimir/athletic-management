<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\Event;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\PromotionEvidence;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use App\Services\PromotionDependencyGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guardUser(string ...$permissions): User
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
 * @return array{tournament: Tournament, event: Event, team: Team, session: SportSession, achievement: Achievement}
 */
function guardTournamentFixture(User $user): array
{
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'sport_id' => $sport->id,
    ]);
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
    $event = Event::factory()->forTournament($tournament)->create();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
    ]);

    $achievement = Achievement::factory()->forParticipation($participation)->create([
        'medal_type' => 'GOLD',
    ]);

    return compact('tournament', 'event', 'team', 'session', 'achievement');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

test('guard detects coach promotion evidence for tournament', function (): void {
    $user = guardUser();
    $fixture = guardTournamentFixture($user);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $fixture['team']->id,
        'session_id' => $fixture['session']->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
    ]);

    CoachPromotionEvidence::create([
        'coach_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'session_id' => $fixture['session']->id,
        'tournament_id' => $fixture['tournament']->id,
        'event_id' => null,
        'team_id' => $fixture['team']->id,
        'achievement_id' => null,
    ]);

    $this->actingAs($user);

    $dependents = app(PromotionDependencyGuard::class)->forTournament($fixture['tournament']);

    expect($dependents)->toHaveCount(1)
        ->and($dependents->first()['type'])->toBe('coach_promotion')
        ->and($dependents->first()['name'])->toBe($coach->full_name);
});

test('guard detects member promotion evidence for achievement', function (): void {
    $user = guardUser();
    $fixture = guardTournamentFixture($user);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $promotion = MemberPromotion::factory()->create([
        'member_id' => $member->id,
        'organization_id' => $user->organization_id,
    ]);

    PromotionEvidence::factory()->create([
        'member_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'evidencable_type' => Achievement::class,
        'evidencable_id' => $fixture['achievement']->id,
    ]);

    $this->actingAs($user);

    $dependents = app(PromotionDependencyGuard::class)->forAchievement($fixture['achievement']);

    expect($dependents)->toHaveCount(1)
        ->and($dependents->first()['type'])->toBe('member_promotion')
        ->and($dependents->first()['name'])->toBe($member->full_name);
});

test('guard returns empty when no dependencies exist', function (): void {
    $user = guardUser();
    $fixture = guardTournamentFixture($user);

    $dependents = app(PromotionDependencyGuard::class)->forTournament($fixture['tournament']);

    expect($dependents)->toBeEmpty();
});

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

test('tournament delete is blocked when coach reward evidence exists', function (): void {
    $user = guardUser('tournaments.delete');
    $fixture = guardTournamentFixture($user);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $fixture['team']->id,
        'session_id' => $fixture['session']->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
    ]);

    CoachPromotionEvidence::create([
        'coach_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'session_id' => $fixture['session']->id,
        'tournament_id' => $fixture['tournament']->id,
        'event_id' => null,
        'team_id' => $fixture['team']->id,
        'achievement_id' => null,
    ]);

    $this->actingAs($user)
        ->delete(route('tournaments.destroy', $fixture['tournament']))
        ->assertRedirect(route('tournaments.index'));

    $this->assertModelExists($fixture['tournament']);
});

test('event delete is blocked when member promotion evidence exists', function (): void {
    $user = guardUser('tournaments.update');
    $fixture = guardTournamentFixture($user);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $promotion = MemberPromotion::factory()->create([
        'member_id' => $member->id,
        'organization_id' => $user->organization_id,
    ]);

    PromotionEvidence::factory()->create([
        'member_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'evidencable_type' => Achievement::class,
        'evidencable_id' => $fixture['achievement']->id,
    ]);

    $this->actingAs($user)
        ->delete(route('tournaments.events.destroy', [$fixture['tournament'], $fixture['event']]))
        ->assertRedirect(route('tournaments.events', $fixture['tournament']));

    $this->assertModelExists($fixture['event']);
});

test('participant delete is blocked when used as member promotion evidence', function (): void {
    $user = guardUser('tournaments.update');
    $fixture = guardTournamentFixture($user);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $promotion = MemberPromotion::factory()->create([
        'member_id' => $member->id,
        'organization_id' => $user->organization_id,
    ]);

    PromotionEvidence::factory()->create([
        'member_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'evidencable_type' => Participation::class,
        'evidencable_id' => $fixture['achievement']->participation_id,
    ]);

    $this->actingAs($user)
        ->delete(route('tournaments.events.participants.destroy', [
            $fixture['tournament'],
            $fixture['event'],
            $fixture['achievement']->participation,
        ]))
        ->assertRedirect();

    $this->assertModelExists($fixture['achievement']->participation);
});

test('removing medal is blocked when achievement is member promotion evidence', function (): void {
    $user = guardUser('tournaments.update');
    $fixture = guardTournamentFixture($user);
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $promotion = MemberPromotion::factory()->create([
        'member_id' => $member->id,
        'organization_id' => $user->organization_id,
    ]);

    PromotionEvidence::factory()->create([
        'member_promotion_id' => $promotion->id,
        'organization_id' => $user->organization_id,
        'evidencable_type' => Achievement::class,
        'evidencable_id' => $fixture['achievement']->id,
    ]);

    $this->actingAs($user)
        ->patch(route('tournaments.events.participants.update', [
            $fixture['tournament'],
            $fixture['event'],
            $fixture['achievement']->participation,
        ]), [
            'medal_type' => '',
            'position' => null,
        ])
        ->assertRedirect();

    $this->assertModelExists($fixture['achievement']);
});
