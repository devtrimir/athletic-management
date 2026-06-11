<?php

declare(strict_types=1);

use App\Models\Achievement;
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
        'name_en' => 'Constable',
        'name_hi' => 'कांस्टेबल',
        'short_name' => 'CT',
        'rank_order' => 1,
        'cadre_type' => null,
        'is_gazetted' => false,
        'aliases' => ['Constable'],
        'is_active' => true,
    ]);

    $toRank = Rank::create([
        'code' => 'HEAD_CONSTABLE',
        'name_en' => 'Head Constable',
        'name_hi' => 'हेड कांस्टेबल',
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
    expect($promotion?->evidences()->count())->toBe(3);
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
