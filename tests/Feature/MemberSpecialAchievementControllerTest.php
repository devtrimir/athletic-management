<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberSpecialAchievement;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function specialAchievementUser(string ...$permissions)
{
    $user = rcUser(...$permissions);
    $user->update(['email_verified_at' => now()]);

    return $user;
}

beforeEach(function (): void {
    Storage::fake('local');
});

test('unauthenticated user is redirected', function (): void {
    $member = Member::factory()->create();

    $this->post(route('members.special-achievements.store', $member), [
        'achievement_type' => 'COMMENDATION_DISC',
        'title' => 'Test',
    ])->assertRedirect(route('login'));
});

test('user without members.manageSpecialAchievements cannot store', function (): void {
    $user = specialAchievementUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Test',
            'awarded_on' => '2026-08-25',
        ])
        ->assertForbidden();
});

test('user with members.manageSpecialAchievements can store a record', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-08-25',
            'issuing_authority' => 'DGP UP',
            'order_reference' => 'UPP/SA/1234',
            'place' => 'Lucknow',
            'remarks' => 'Excellent service',
        ])
        ->assertRedirect(route('members.special-achievements', $member));

    expect(MemberSpecialAchievement::where('member_id', $member->id)->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [])
        ->assertSessionHasErrors(['achievement_type', 'title']);
});

test('update requires members.manageSpecialAchievements', function (): void {
    $user = specialAchievementUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()->forMember($member)->create();

    $this->actingAs($user)
        ->patch(route('members.special-achievements.update', [$member, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertForbidden();
});

test('update modifies the record and redirects', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()->forMember($member)->create([
        'title' => 'Original',
    ]);

    $this->actingAs($user)
        ->patch(route('members.special-achievements.update', [$member, $achievement]), [
            'title' => 'Updated Title',
            'awarded_on' => '2025-01-15',
        ])
        ->assertRedirect(route('members.special-achievements', $member));

    expect($achievement->fresh()->title)->toBe('Updated Title');
});

test('update returns 404 for achievement belonging to another member', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $otherMember = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()->forMember($otherMember)->create();

    $this->actingAs($user)
        ->patch(route('members.special-achievements.update', [$member, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertNotFound();
});

test('destroy requires members.manageSpecialAchievements', function (): void {
    $user = specialAchievementUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()->forMember($member)->create();

    $this->actingAs($user)
        ->delete(route('members.special-achievements.destroy', [$member, $achievement]))
        ->assertForbidden();
});

test('destroy removes the record and redirects', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()->forMember($member)->create();

    $this->actingAs($user)
        ->delete(route('members.special-achievements.destroy', [$member, $achievement]))
        ->assertRedirect(route('members.special-achievements', $member));

    expect(MemberSpecialAchievement::find($achievement->id))->toBeNull();
});

test('member from another organization returns 404', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $otherOrg = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Test',
        ])
        ->assertNotFound();
});

test('store accepts an order document', function (): void {
    $user = specialAchievementUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $file = UploadedFile::fake()->create('order.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'With document',
            'order_document' => $file,
        ])
        ->assertRedirect(route('members.special-achievements', $member));

    $achievement = MemberSpecialAchievement::where('member_id', $member->id)->first();
    expect($achievement)->not->toBeNull()
        ->and($achievement->order_document_path)->not->toBeNull()
        ->and($achievement->order_document_original_name)->toBe('order.pdf')
        ->and($achievement->order_document_mime_type)->toBe('application/pdf');
});
