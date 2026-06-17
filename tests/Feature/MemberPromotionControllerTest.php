<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\AchievementBenefit;
use App\Models\Event;
use App\Models\MediaFile;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\MemberPromotion;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Rank;
use App\Models\Role;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function promotionUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach (['members.view', 'members.manageBenefits', 'media.upload'] as $code) {
        $permission = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );

        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $permission->id]);
    }

    return $user;
}

function promotionFixtures(Member $member): array
{
    $legacy = MemberLegacyAchievement::factory()->forMember($member)->create();

    $tournament = Tournament::factory()->forOrganization($member->organization)->create();
    $event = Event::factory()->forTournament($tournament)->create();
    $participation = Participation::factory()->for($member)->forEvent($event)->create();
    $achievement = Achievement::factory()->forParticipation($participation)->create();

    return [$legacy, $participation, $achievement];
}

function promotionRanks(Organization $organization): array
{
    $fromRank = Rank::create([
        'code' => 'CONSTABLE',
        'name' => 'कांस्टेबल',
        'short_name' => 'CT',
        'rank_order' => 1,
        'cadre_type' => null,
        'is_gazetted' => false,
        'aliases' => ['Constable'],
        'is_active' => true,
    ]);

    $toRank = Rank::create([
        'code' => 'HEAD_CONSTABLE',
        'name' => 'हेड कांस्टेबल',
        'short_name' => 'HC',
        'rank_order' => 2,
        'cadre_type' => null,
        'is_gazetted' => false,
        'aliases' => ['Head Constable'],
        'is_active' => true,
    ]);

    return [$fromRank, $toRank];
}

test('member show exposes promotions tab data', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    promotionRanks($member->organization);
    [$legacy, $achievement] = promotionFixtures($member);

    $promotion = MemberPromotion::create([
        'organization_id' => $member->organization_id,
        'member_id' => $member->id,
        'promotion_date' => now()->toDateString(),
        'from_rank' => 'Constable',
        'to_rank' => 'Head Constable',
        'reason' => 'Outstanding tournament performance across multiple events.',
        'remarks' => 'Reviewed by committee.',
        'recorded_by' => $user->id,
    ]);

    $promotion->evidences()->createMany([
        [
            'organization_id' => $member->organization_id,
            'evidencable_type' => 'member_legacy_achievement',
            'evidencable_id' => $legacy->id,
        ],
        [
            'organization_id' => $member->organization_id,
            'evidencable_type' => 'achievement',
            'evidencable_id' => $achievement->id,
        ],
    ]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('members/show'));
});

test('member preview promotion rows include event evidence details', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    promotionRanks($member->organization);

    $tournament = Tournament::factory()
        ->forOrganization($member->organization)
        ->create([
            'name' => 'Police Athletics Championship',
            'date_from' => '2026-01-10',
            'venue' => 'Lucknow',
        ]);
    $event = Event::factory()
        ->forTournament($tournament)
        ->create([
            'name' => '100m Sprint',
            'gender_class' => 'OPEN',
        ]);
    $participation = Participation::factory()
        ->for($member)
        ->forEvent($event)
        ->create(['position' => 1]);
    $achievement = Achievement::factory()
        ->forParticipation($participation)
        ->create([
            'medal_type' => 'GOLD',
            'position' => 1,
        ]);
    AchievementBenefit::create([
        'organization_id' => $member->organization_id,
        'benefitable_type' => 'achievement',
        'benefitable_id' => $achievement->id,
        'benefit_type' => 'PROMOTION',
        'promoted_from_rank' => 'CONSTABLE',
        'promoted_to_rank' => 'HEAD_CONSTABLE',
        'benefit_date' => '2026-02-01',
        'order_reference' => 'PROMO-100',
    ]);

    $promotion = MemberPromotion::create([
        'organization_id' => $member->organization_id,
        'member_id' => $member->id,
        'promotion_date' => '2026-02-01',
        'from_rank' => 'CONSTABLE',
        'to_rank' => 'HEAD_CONSTABLE',
        'reason' => 'Promotion after championship result.',
        'recorded_by' => $user->id,
    ]);
    $promotion->evidences()->create([
        'organization_id' => $member->organization_id,
        'evidencable_type' => 'achievement',
        'evidencable_id' => $achievement->id,
    ]);

    $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null;

    $response = $this->actingAs($user)
        ->getJson(route('members.preview', $member), [
            'X-Inertia' => 'true',
            'X-Inertia-Partial-Component' => 'members/print-preview',
            'X-Inertia-Partial-Data' => 'promotions',
            'X-Inertia-Version' => $version,
        ])
        ->assertOk();

    $promotionRow = $response->json('props.promotions.0');
    $evidence = $promotionRow['evidences'][0];

    expect($promotionRow['to_rank'])->toBe('HEAD_CONSTABLE')
        ->and($evidence['type'])->toBe('achievement')
        ->and($evidence['tournament']['name'])->toBe('Police Athletics Championship')
        ->and($evidence['event']['name'])->toBe('100m Sprint')
        ->and($evidence['achievement']['medal_type'])->toBe('GOLD')
        ->and($evidence['achievement']['benefits'][0]['order_reference'])->toBe('PROMO-100');
});

test('member promotion records evidence and appears in database', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    [$fromRank, $toRank] = promotionRanks($member->organization);
    $member->update(['rank' => $fromRank->code]);
    [$legacy, $participation, $achievement] = promotionFixtures($member);

    $response = $this->actingAs($user)->post(route('members.promotions.store', $member), [
        'promotion_date' => now()->toDateString(),
        'from_rank' => $fromRank->code,
        'to_rank' => $toRank->code,
        'cash_reward_amount' => '5000.00',
        'cash_reward_date' => now()->toDateString(),
        'cash_reward_reference' => 'ORDER-42',
        'cash_reward_remarks' => 'Reward for tournament performance.',
        'reason' => 'Promoted after sustained tournament performance.',
        'remarks' => 'Multiple events reviewed.',
        'evidences' => [
            ['type' => 'participation', 'id' => $participation->id],
            ['type' => 'member_legacy_achievement', 'id' => $legacy->id],
            ['type' => 'achievement', 'id' => $achievement->id],
        ],
    ]);

    $response->assertRedirect(route('members.show', $member));

    $promotion = MemberPromotion::query()->where('member_id', $member->id)->first();
    expect($promotion)->not->toBeNull();
    expect($promotion?->to_rank)->toBe($toRank->code);
    expect($promotion?->cash_reward_amount)->toBe('5000.00');
    expect($promotion?->cash_reward_reference)->toBe('ORDER-42');
    expect($member->refresh()->rank)->toBe($toRank->code);
    expect($member->refresh()->promotion_date?->toDateString())->toBe(now()->toDateString());
    expect($promotion?->evidences()->count())->toBe(3);
});

test('member promotion created from coach page redirects back to coach', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    [, $toRank] = promotionRanks($member->organization);

    $this->from('/coaches/123')
        ->actingAs($user)
        ->post(route('members.promotions.store', $member), [
            'promotion_date' => now()->toDateString(),
            'to_rank' => $toRank->code,
            'reason' => 'Promoted from coach profile.',
        ])
        ->assertRedirect('/coaches/123');
});

test('member promotion updates cash reward fields', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    [$fromRank, $toRank] = promotionRanks($member->organization);
    $member->update(['rank' => $fromRank->code]);
    [, $participation, $achievement] = promotionFixtures($member);

    $promotion = MemberPromotion::create([
        'organization_id' => $member->organization_id,
        'member_id' => $member->id,
        'promotion_date' => now()->toDateString(),
        'from_rank' => $fromRank->code,
        'to_rank' => $toRank->code,
        'cash_reward_amount' => '1000.00',
        'cash_reward_date' => now()->toDateString(),
        'cash_reward_reference' => 'OLD-REF',
        'cash_reward_remarks' => 'Old remarks.',
        'recorded_by' => $user->id,
    ]);

    $promotion->evidences()->createMany([
        [
            'organization_id' => $member->organization_id,
            'evidencable_type' => 'participation',
            'evidencable_id' => $participation->id,
        ],
        [
            'organization_id' => $member->organization_id,
            'evidencable_type' => 'achievement',
            'evidencable_id' => $achievement->id,
        ],
    ]);

    $response = $this->actingAs($user)->patch(route('members.promotions.update', [$member, $promotion]), [
        'to_rank' => $toRank->code,
        'cash_reward_amount' => '7500.00',
        'cash_reward_date' => now()->addDay()->toDateString(),
        'cash_reward_reference' => 'NEW-REF',
        'cash_reward_remarks' => 'Updated reward.',
        'evidences' => [
            ['type' => 'participation', 'id' => $participation->id],
            ['type' => 'achievement', 'id' => $achievement->id],
        ],
    ]);

    $response->assertRedirect(route('members.show', $member));

    $promotion->refresh();

    expect($promotion->cash_reward_amount)->toBe('7500.00');
    expect($promotion->cash_reward_reference)->toBe('NEW-REF');
    expect($promotion->cash_reward_remarks)->toBe('Updated reward.');
});

test('cash reward validation explains when selected event has no achievement', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = Tournament::factory()->forOrganization($member->organization)->create();
    $event = Event::factory()->forTournament($tournament)->create();
    $participation = Participation::factory()->for($member)->forEvent($event)->create();

    $response = $this->actingAs($user)->postJson(route('achievement-benefits.store'), [
        'benefitable_type' => 'participation',
        'benefitable_id' => $participation->id,
        'benefit_type' => 'CASH_AWARD',
        'cash_amount' => '5000.00',
    ]);

    $response->assertInvalid([
        'benefitable_type' => 'Cash reward can only be added for an event that has a recorded achievement.',
    ]);
});

test('achievement benefit created from coach page redirects back to coach', function () {
    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    [$legacy] = promotionFixtures($member);

    $this->from('/coaches/123')
        ->actingAs($user)
        ->post(route('achievement-benefits.store'), [
            'benefitable_type' => 'member_legacy_achievement',
            'benefitable_id' => $legacy->id,
            'benefit_type' => 'CASH_AWARD',
            'cash_amount' => '5000.00',
            'benefit_date' => '2026-02-01',
            'order_reference' => 'REWARD-100',
        ])
        ->assertRedirect('/coaches/123');
});

test('member promotion accepts uploaded order documents', function () {
    Storage::fake('public');

    $user = promotionUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    [$fromRank, $toRank] = promotionRanks($member->organization);
    $member->update(['rank' => $fromRank->code]);
    [, , $achievement] = promotionFixtures($member);

    $promotion = MemberPromotion::create([
        'organization_id' => $member->organization_id,
        'member_id' => $member->id,
        'promotion_date' => now()->toDateString(),
        'from_rank' => $fromRank->code,
        'to_rank' => $toRank->code,
        'recorded_by' => $user->id,
    ]);

    $file = UploadedFile::fake()->create('promotion-order.pdf', 200, 'application/pdf');

    $response = $this->actingAs($user)->postJson(route('members.promotions.media.store', [$member, $promotion]), [
        'file' => $file,
    ]);

    $response->assertCreated();

    $this->assertDatabaseHas('media_files', [
        'organization_id' => $member->organization_id,
        'mediable_type' => MemberPromotion::class,
        'mediable_id' => $promotion->id,
        'uploaded_by' => $user->id,
    ]);

    expect(MediaFile::query()->where('mediable_id', $promotion->id)->count())->toBe(1);
});
