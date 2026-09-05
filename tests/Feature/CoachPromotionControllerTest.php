<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPromotion;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Rank;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use App\Services\AuditLogBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function promotionUser(string ...$permissions): User
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

function promotionRank(string $code, int $order): Rank
{
    return Rank::create([
        'code' => $code,
        'name' => str($code)->replace('_', ' ')->title()->toString(),
        'short_name' => $code,
        'rank_order' => $order,
        'is_gazetted' => false,
        'is_active' => true,
    ]);
}

/**
 * @return array{session: SportSession, tournament: Tournament, team: Team, achievement: Achievement}
 */
function promotionEvidence(User $user): array
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

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
    ]);

    $achievement = Achievement::factory()->forParticipation($participation)->create([
        'medal_type' => 'GOLD',
    ]);

    return compact('session', 'tournament', 'team', 'achievement');
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

test('store requires managePromotions or update permission', function (): void {
    $user = promotionUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $evidence = promotionEvidence($user);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $evidence['team']->id,
        'session_id' => $evidence['session']->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.promotions.store', $coach), [
            'to_rank' => 'CONSTABLE',
            'promotion_date' => '2026-09-05',
            'evidences' => [
                [
                    'session_id' => $evidence['session']->id,
                    'tournament_id' => $evidence['tournament']->id,
                    'team_id' => $evidence['team']->id,
                ],
            ],
        ])
        ->assertStatus(403);
});

// ---------------------------------------------------------------------------
// Store validation
// ---------------------------------------------------------------------------

test('store rejects a promotion without promotion date and to rank', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.promotions', $coach))
        ->post(route('coaches.promotions.store', $coach), [
            'from_rank' => 'CONSTABLE',
            'reason' => 'Test reason',
        ])
        ->assertRedirect(route('coaches.promotions', $coach))
        ->assertSessionHasErrors(['promotion_date', 'to_rank']);
});

test('store rejects a reward without cash reward amount', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.promotions', $coach))
        ->post(route('coaches.promotions.store', $coach), [
            'cash_reward_date' => '2026-09-05',
            'cash_reward_reference' => 'REF-001',
        ])
        ->assertRedirect(route('coaches.promotions', $coach))
        ->assertSessionHasErrors(['cash_reward_amount']);
});

test('store persists a promotion and falls back to coach current rank', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $fromRank = promotionRank('CONSTABLE', 10);
    $toRank = promotionRank('HEAD_CONSTABLE', 20);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'rank_master_id' => $fromRank->id,
    ]);
    $evidence = promotionEvidence($user);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $evidence['team']->id,
        'session_id' => $evidence['session']->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.promotions.store', $coach), [
            'promotion_date' => '2026-09-05',
            'to_rank' => $toRank->code,
            'reason' => 'Medal tally promotion',
            'evidences' => [
                [
                    'session_id' => $evidence['session']->id,
                    'tournament_id' => $evidence['tournament']->id,
                    'team_id' => $evidence['team']->id,
                ],
            ],
        ])
        ->assertRedirect(route('coaches.promotions', $coach));

    $promotion = CoachPromotion::query()->where('coach_id', $coach->id)->firstOrFail();

    expect($promotion->from_rank)->toBe($fromRank->code)
        ->and($promotion->to_rank)->toBe($toRank->code)
        ->and($promotion->promotion_date->toDateString())->toBe('2026-09-05');
});

test('store persists a cash reward with evidence', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $evidence = promotionEvidence($user);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $evidence['team']->id,
        'session_id' => $evidence['session']->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.promotions.store', $coach), [
            'cash_reward_amount' => '50000',
            'cash_reward_date' => '2026-09-05',
            'cash_reward_reference' => 'REF-001',
            'evidences' => [
                [
                    'session_id' => $evidence['session']->id,
                    'tournament_id' => $evidence['tournament']->id,
                    'team_id' => $evidence['team']->id,
                ],
            ],
        ])
        ->assertRedirect(route('coaches.promotions', $coach));

    $promotion = CoachPromotion::query()->where('coach_id', $coach->id)->firstOrFail();

    expect((float) $promotion->cash_reward_amount)->toBe(50000.0)
        ->and($promotion->evidences)->toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Update validation
// ---------------------------------------------------------------------------

test('update rejects clearing required promotion fields', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $rank = promotionRank('CONSTABLE', 10);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'from_rank' => $rank->code,
        'to_rank' => $rank->code,
        'promotion_date' => '2026-09-01',
    ]);

    $this->actingAs($user)
        ->from(route('coaches.promotions', $coach))
        ->patch(route('coaches.promotions.update', [$coach, $promotion]), [
            'to_rank' => '',
            'promotion_date' => '',
        ])
        ->assertRedirect(route('coaches.promotions', $coach))
        ->assertSessionHasErrors(['promotion_date', 'to_rank']);
});

test('update rejects clearing required reward fields', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $promotion = CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'cash_reward_amount' => '25000',
        'cash_reward_date' => '2026-09-01',
    ]);

    $this->actingAs($user)
        ->from(route('coaches.promotions', $coach))
        ->patch(route('coaches.promotions.update', [$coach, $promotion]), [
            'cash_reward_amount' => '',
        ])
        ->assertRedirect(route('coaches.promotions', $coach))
        ->assertSessionHasErrors(['cash_reward_amount']);
});

// ---------------------------------------------------------------------------
// Audit log subject
// ---------------------------------------------------------------------------

test('audit log labels promotion records as Promotion and reward records as Reward', function (): void {
    $user = promotionUser('coaches.view', 'coaches.managePromotions');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'promotion_date' => '2026-09-01',
        'cash_reward_amount' => null,
        'cash_reward_date' => null,
        'cash_reward_reference' => null,
        'cash_reward_remarks' => null,
    ]);

    CoachPromotion::factory()->create([
        'coach_id' => $coach->id,
        'organization_id' => $user->organization_id,
        'promotion_date' => null,
        'from_rank' => null,
        'to_rank' => null,
        'reason' => null,
        'remarks' => null,
        'cash_reward_amount' => '10000',
        'cash_reward_date' => '2026-09-02',
    ]);

    $log = app(AuditLogBuilder::class)->forCoach($coach);
    $subjects = collect($log)->pluck('subject')->all();

    expect($subjects)->toContain('Promotion')
        ->and($subjects)->toContain('Reward');
});
