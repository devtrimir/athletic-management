<?php

declare(strict_types=1);

namespace Tests\Feature;

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
use App\Models\Rank;
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

function syncTestUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $permissions = [
        'members.view',
        'members.manageBenefits',
        'coaches.view',
        'coaches.update',
        'coaches.managePromotions',
        'media.upload',
    ];

    foreach ($permissions as $code) {
        $permission = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );

        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $permission->id]);
    }

    return $user;
}

function syncTestRanks(): array
{
    $ct = Rank::firstOrCreate(['code' => 'CONSTABLE'], [
        'name' => 'कांस्टेबल',
        'short_name' => 'CT',
        'rank_order' => 1,
        'is_gazetted' => false,
        'aliases' => ['Constable'],
        'is_active' => true,
    ]);

    $hc = Rank::firstOrCreate(['code' => 'HEAD_CONSTABLE'], [
        'name' => 'हेड कांस्टेबल',
        'short_name' => 'HC',
        'rank_order' => 2,
        'is_gazetted' => false,
        'aliases' => ['Head Constable'],
        'is_active' => true,
    ]);

    $si = Rank::firstOrCreate(['code' => 'SUB_INSPECTOR'], [
        'name' => 'उप निरीक्षक',
        'short_name' => 'SI',
        'rank_order' => 3,
        'is_gazetted' => false,
        'aliases' => ['Sub Inspector'],
        'is_active' => true,
    ]);

    return [$ct, $hc, $si];
}

function syncTestFixtures(User $user, Member $member, Coach $coach): array
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

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);

    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
    ]);

    $achievement = Achievement::factory()->forParticipation($participation)->create([
        'medal_type' => 'GOLD',
    ]);

    return compact('session', 'sport', 'team', 'tournament', 'event', 'participation', 'achievement');
}

test('creating a promotion in member module automatically synchronizes to coach promotion and coach evidences', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
        'initial_rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'pno' => $member->pno,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    $response = $this->actingAs($user)->post(route('members.promotions.store', $member), [
        'promotion_date' => '2026-06-15',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'Outstanding national tournament performance.',
        'remarks' => 'Approved by sports board.',
        'evidences' => [
            ['type' => 'achievement', 'id' => $fixtures['achievement']->id],
        ],
    ]);

    $response->assertRedirect(route('members.promotions', $member));

    // Assert MemberPromotion created
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion)->not->toBeNull()
        ->and($memberPromotion->to_rank)->toBe('HEAD_CONSTABLE')
        ->and($memberPromotion->coach_promotion_id)->not->toBeNull();

    // Assert CoachPromotion automatically synchronized
    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    expect($coachPromotion)->not->toBeNull()
        ->and($coachPromotion->id)->toBe($memberPromotion->coach_promotion_id)
        ->and($coachPromotion->member_promotion_id)->toBe($memberPromotion->id)
        ->and($coachPromotion->to_rank)->toBe('HEAD_CONSTABLE')
        ->and($coachPromotion->promotion_date?->toDateString())->toBe('2026-06-15');

    // Assert CoachPromotionEvidence created
    $coachEvidence = CoachPromotionEvidence::where('coach_promotion_id', $coachPromotion->id)->first();
    expect($coachEvidence)->not->toBeNull()
        ->and($coachEvidence->achievement_id)->toBe($fixtures['achievement']->id)
        ->and($coachEvidence->tournament_id)->toBe($fixtures['tournament']->id);

    // Assert Member and Coach ranks updated in tandem
    expect($member->fresh()->rank)->toBe('HEAD_CONSTABLE')
        ->and($coach->fresh()->rank_master_id)->toBe($hc->id);
});

test('creating a promotion in coach module automatically synchronizes to member promotion and member evidences', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
        'initial_rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'pno' => $member->pno,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    $response = $this->actingAs($user)->post(route('coaches.promotions.store', $coach), [
        'promotion_date' => '2026-07-20',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'Exceptional coaching and team leadership.',
        'remarks' => 'Order issued.',
        'evidences' => [
            [
                'session_id' => $fixtures['session']->id,
                'tournament_id' => $fixtures['tournament']->id,
                'event_id' => $fixtures['event']->id,
                'team_id' => $fixtures['team']->id,
                'achievement_id' => $fixtures['achievement']->id,
            ],
        ],
    ]);

    $response->assertRedirect(route('coaches.promotions', $coach));

    // Assert CoachPromotion created
    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    expect($coachPromotion)->not->toBeNull()
        ->and($coachPromotion->to_rank)->toBe('HEAD_CONSTABLE')
        ->and($coachPromotion->member_promotion_id)->not->toBeNull();

    // Assert MemberPromotion automatically synchronized
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion)->not->toBeNull()
        ->and($memberPromotion->id)->toBe($coachPromotion->member_promotion_id)
        ->and($memberPromotion->coach_promotion_id)->toBe($coachPromotion->id)
        ->and($memberPromotion->to_rank)->toBe('HEAD_CONSTABLE')
        ->and($memberPromotion->promotion_date?->toDateString())->toBe('2026-07-20');

    // Assert Member PromotionEvidence created
    $memberEvidence = PromotionEvidence::where('member_promotion_id', $memberPromotion->id)->first();
    expect($memberEvidence)->not->toBeNull()
        ->and($memberEvidence->evidencable_type)->toBe('achievement')
        ->and($memberEvidence->evidencable_id)->toBe($fixtures['achievement']->id);

    // Assert ranks synchronized
    expect($member->fresh()->rank)->toBe('HEAD_CONSTABLE')
        ->and($coach->fresh()->rank_master_id)->toBe($hc->id);
});

test('updating a promotion in member module updates the linked coach promotion and its evidences', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    // Initial creation via member
    $this->actingAs($user)->post(route('members.promotions.store', $member), [
        'promotion_date' => '2026-06-15',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'First promotion.',
        'evidences' => [
            ['type' => 'achievement', 'id' => $fixtures['achievement']->id],
        ],
    ]);

    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    expect($coachPromotion->to_rank)->toBe('HEAD_CONSTABLE');

    // Update via member to SUB_INSPECTOR
    $response = $this->actingAs($user)->patch(route('members.promotions.update', [$member, $memberPromotion]), [
        'promotion_date' => '2026-08-01',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'SUB_INSPECTOR',
        'reason' => 'Updated to Sub Inspector rank.',
        'evidences' => [
            ['type' => 'participation', 'id' => $fixtures['participation']->id],
        ],
    ]);

    $response->assertRedirect(route('members.promotions', $member));

    // Assert CoachPromotion is updated
    expect($coachPromotion->fresh()->to_rank)->toBe('SUB_INSPECTOR')
        ->and($coachPromotion->fresh()->promotion_date?->toDateString())->toBe('2026-08-01')
        ->and($coachPromotion->fresh()->reason)->toBe('Updated to Sub Inspector rank.');

    // Assert ranks updated to SUB_INSPECTOR on both
    expect($member->fresh()->rank)->toBe('SUB_INSPECTOR')
        ->and($coach->fresh()->rank_master_id)->toBe($si->id);
});

test('updating a promotion in coach module updates the linked member promotion and its evidences', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    // Initial creation via coach
    $this->actingAs($user)->post(route('coaches.promotions.store', $coach), [
        'promotion_date' => '2026-07-20',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'First coach promotion.',
        'evidences' => [
            [
                'session_id' => $fixtures['session']->id,
                'tournament_id' => $fixtures['tournament']->id,
                'event_id' => $fixtures['event']->id,
                'team_id' => $fixtures['team']->id,
                'achievement_id' => $fixtures['achievement']->id,
            ],
        ],
    ]);

    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion->to_rank)->toBe('HEAD_CONSTABLE');

    // Update via coach to SUB_INSPECTOR
    $response = $this->actingAs($user)->patch(route('coaches.promotions.update', [$coach, $coachPromotion]), [
        'promotion_date' => '2026-09-01',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'SUB_INSPECTOR',
        'reason' => 'Elevated to SI.',
        'evidences' => [
            [
                'session_id' => $fixtures['session']->id,
                'tournament_id' => $fixtures['tournament']->id,
                'event_id' => $fixtures['event']->id,
                'team_id' => $fixtures['team']->id,
                'achievement_id' => $fixtures['achievement']->id,
            ],
        ],
    ]);

    $response->assertRedirect(route('coaches.promotions', $coach));

    // Assert MemberPromotion is updated
    expect($memberPromotion->fresh()->to_rank)->toBe('SUB_INSPECTOR')
        ->and($memberPromotion->fresh()->promotion_date?->toDateString())->toBe('2026-09-01')
        ->and($memberPromotion->fresh()->reason)->toBe('Elevated to SI.');

    // Assert ranks updated to SUB_INSPECTOR on both
    expect($member->fresh()->rank)->toBe('SUB_INSPECTOR')
        ->and($coach->fresh()->rank_master_id)->toBe($si->id);
});

test('deleting a promotion in member module deletes the linked coach promotion and reverts rank', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
        'initial_rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    $this->actingAs($user)->post(route('members.promotions.store', $member), [
        'promotion_date' => '2026-06-15',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'evidences' => [
            ['type' => 'achievement', 'id' => $fixtures['achievement']->id],
        ],
    ]);

    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    expect($coachPromotion)->not->toBeNull();

    // Delete from member
    $response = $this->actingAs($user)->delete(route('members.promotions.destroy', [$member, $memberPromotion]));
    $response->assertRedirect(route('members.promotions', $member));

    // Assert both promotions deleted
    expect(MemberPromotion::find($memberPromotion->id))->toBeNull()
        ->and(CoachPromotion::find($coachPromotion->id))->toBeNull();

    // Assert ranks reverted to initial CONSTABLE
    expect($member->fresh()->rank)->toBe('CONSTABLE')
        ->and($coach->fresh()->rank_master_id)->toBe($ct->id);
});

test('deleting a promotion in coach module deletes the linked member promotion and reverts rank', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
        'initial_rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    $this->actingAs($user)->post(route('coaches.promotions.store', $coach), [
        'promotion_date' => '2026-07-20',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'evidences' => [
            [
                'session_id' => $fixtures['session']->id,
                'tournament_id' => $fixtures['tournament']->id,
                'event_id' => $fixtures['event']->id,
                'team_id' => $fixtures['team']->id,
                'achievement_id' => $fixtures['achievement']->id,
            ],
        ],
    ]);

    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion)->not->toBeNull();

    // Delete from coach
    $response = $this->actingAs($user)->delete(route('coaches.promotions.destroy', [$coach, $coachPromotion]));
    $response->assertRedirect(route('coaches.promotions', $coach));

    // Assert both promotions deleted
    expect(CoachPromotion::find($coachPromotion->id))->toBeNull()
        ->and(MemberPromotion::find($memberPromotion->id))->toBeNull();

    // Assert ranks reverted to initial CONSTABLE
    expect($member->fresh()->rank)->toBe('CONSTABLE')
        ->and($coach->fresh()->rank_master_id)->toBe($ct->id);
});

test('cash reward only synchronizes between member and coach without altering promotion rank', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'CONSTABLE',
        'initial_rank' => 'CONSTABLE',
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'rank_master_id' => $ct->id,
    ]);

    $fixtures = syncTestFixtures($user, $member, $coach);

    $response = $this->actingAs($user)->post(route('members.promotions.store', $member), [
        'cash_reward_only' => true,
        'cash_reward_amount' => 50000,
        'cash_reward_date' => '2026-05-10',
        'cash_reward_reference' => 'REWARD-2026-01',
        'cash_reward_remarks' => 'National medal bonus.',
        'evidences' => [
            ['type' => 'achievement', 'id' => $fixtures['achievement']->id],
        ],
    ]);

    $response->assertRedirect(route('members.promotions', $member));

    // Assert MemberPromotion created
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion)->not->toBeNull()
        ->and((float) $memberPromotion->cash_reward_amount)->toBe(50000.0)
        ->and($memberPromotion->cash_reward_reference)->toBe('REWARD-2026-01');

    // Assert CoachPromotion synchronized
    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)->first();
    expect($coachPromotion)->not->toBeNull()
        ->and((float) $coachPromotion->cash_reward_amount)->toBe(50000.0)
        ->and($coachPromotion->cash_reward_reference)->toBe('REWARD-2026-01');

    // Assert ranks remain Constable
    expect($member->fresh()->rank)->toBe('CONSTABLE')
        ->and($coach->fresh()->rank_master_id)->toBe($ct->id);
});

test('generating athlete profile for an existing coach synchronizes all coach promotions to the new member', function () {
    $user = syncTestUser();
    [$ct, $hc, $si] = syncTestRanks();

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => null,
        'pno' => 'PNO998877',
        'rank_master_id' => $hc->id,
    ]);

    // Create a promotion on coach before athlete profile exists
    $coachPromotion = CoachPromotion::create([
        'organization_id' => $coach->organization_id,
        'coach_id' => $coach->id,
        'promotion_date' => '2026-04-10',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'Historic promotion.',
    ]);

    expect(Member::where('pno', 'PNO998877')->exists())->toBeFalse();

    // Generate athlete profile
    $response = $this->actingAs($user)->post(route('coaches.generate-athlete-profile', $coach));
    $response->assertRedirect();

    $member = Member::where('pno', 'PNO998877')->first();
    expect($member)->not->toBeNull()
        ->and($coach->fresh()->member_id)->toBe($member->id);

    // Assert promotion was synchronized to the new member
    $memberPromotion = MemberPromotion::where('member_id', $member->id)->first();
    expect($memberPromotion)->not->toBeNull()
        ->and($memberPromotion->to_rank)->toBe('HEAD_CONSTABLE')
        ->and($memberPromotion->promotion_date?->toDateString())->toBe('2026-04-10')
        ->and($member->rank)->toBe('HEAD_CONSTABLE');
});
