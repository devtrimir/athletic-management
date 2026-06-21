<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberSpecialAchievement;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('member overview omits tab payloads on initial response', function (): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->where('activeTab', 'overview')
            ->missing('memberTeams')
            ->missing('participations')
            ->missing('achievementsData')
            ->missing('legacyAchievements')
            ->missing('promotions')
            ->missing('specialAchievements')
            ->missing('performance')
            ->missing('auditLog')
            ->missing('media')
            ->missing('statusHistory')
            ->missing('aliases')
        );
});

test('member profile tab routes return their focused inertia payloads', function (string $routeName, string $tab, string $prop): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route($routeName, $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->where('activeTab', $tab)
            ->has('member')
            ->has($prop)
        );
})->with([
    'teams' => ['members.teams', 'teams', 'memberTeams'],
    'events' => ['members.events', 'events', 'participations'],
    'performance' => ['members.performance', 'performance', 'performance'],
    'special achievements' => ['members.special-achievements', 'special-achievements', 'specialAchievements'],
    'promotions' => ['members.promotions', 'promotions', 'promotions'],
    'changelog' => ['members.changelog', 'changelog', 'auditLog'],
    'media' => ['members.media', 'media', 'media'],
    'status' => ['members.status', 'status', 'statusHistory'],
]);

test('member profile tab routes require members view permission', function (string $routeName): void {
    $user = rcUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route($routeName, $member))
        ->assertForbidden();
})->with([
    'members.teams',
    'members.events',
    'members.performance',
    'members.special-achievements',
    'members.promotions',
    'members.changelog',
    'members.media',
    'members.status',
]);

test('member profile tab routes do not expose members from another organization', function (string $routeName): void {
    $user = rcUser('members.view');
    $otherOrg = Organization::factory()->create();
    $member = Member::withoutGlobalScopes()->create(
        Member::factory()->make(['organization_id' => $otherOrg->id])->getAttributes()
    );

    $this->actingAs($user)
        ->get(route($routeName, $member))
        ->assertNotFound();
})->with([
    'members.teams',
    'members.events',
    'members.performance',
    'members.special-achievements',
    'members.promotions',
    'members.changelog',
    'members.media',
    'members.status',
]);

test('special achievements tab exposes standalone special achievement rows without heavy event payloads', function (): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    MemberSpecialAchievement::factory()
        ->forMember($member)
        ->commendationDisc()
        ->create([
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-01-15',
            'order_reference' => 'DISC-101',
        ]);

    $this->actingAs($user)
        ->get(route('members.special-achievements', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->where('activeTab', 'special-achievements')
            ->has('specialAchievements.records', 1)
            ->where('specialAchievements.records.0.order_reference', 'DISC-101')
            ->where('specialAchievements.summary.commendation_discs', 1)
            ->missing('participations')
            ->missing('achievementsData')
            ->missing('promotions')
            ->missing('auditLog')
            ->missing('media')
        );
});

test('special achievement mutations return to the special achievements tab', function (): void {
    Storage::fake('local');

    $user = rcUser('members.view', 'members.manageSpecialAchievements');
    $viewer = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $document = UploadedFile::fake()->create('commendation-order.pdf', 200, 'application/pdf');

    $response = $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-02-01',
            'issuing_authority' => 'DGP UP',
            'order_reference' => 'DISC-100',
            'order_document' => $document,
            'place' => 'Lucknow',
            'remarks' => 'Special departmental recognition.',
        ]);

    $response->assertRedirect(route('members.special-achievements', $member));

    $achievement = MemberSpecialAchievement::query()
        ->where('member_id', $member->id)
        ->firstOrFail();

    expect($achievement->order_document_path)->not->toBeNull()
        ->and($achievement->order_document_original_name)->toBe('commendation-order.pdf');
    Storage::disk('local')->assertExists($achievement->order_document_path);
    $storedDocumentPath = $achievement->order_document_path;

    $this->actingAs($user)
        ->get(route('members.special-achievements', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('specialAchievements.records.0.order_document.original_name', 'commendation-order.pdf')
            ->where('specialAchievements.records.0.order_document.mime_type', 'application/pdf')
            ->where('specialAchievements.records.0.order_document.url', route('members.special-achievements.order-document.preview', [$member, $achievement]))
            ->where('specialAchievements.records.0.order_document.preview_url', route('members.special-achievements.order-document.preview', [$member, $achievement]))
            ->where('specialAchievements.records.0.order_document.download_url', route('members.special-achievements.order-document', [$member, $achievement]))
        );

    expect(route('members.special-achievements.order-document', [$member, $achievement]))
        ->not->toContain('/storage/');
    expect(route('members.special-achievements.order-document.preview', [$member, $achievement]))
        ->not->toContain('/storage/');

    $this->actingAs($user)
        ->get(route('members.special-achievements.order-document.preview', [$member, $achievement]))
        ->assertOk()
        ->assertHeader('content-disposition', 'inline; filename=commendation-order.pdf');

    $this->actingAs($user)
        ->get(route('members.special-achievements.order-document', [$member, $achievement]))
        ->assertOk()
        ->assertDownload('commendation-order.pdf');

    $this->actingAs($viewer)
        ->get(route('members.special-achievements.order-document.preview', [$member, $achievement]))
        ->assertNotFound();

    $this->actingAs($viewer)
        ->get(route('members.special-achievements.order-document', [$member, $achievement]))
        ->assertNotFound();

    $this->actingAs($user)
        ->patch(route('members.special-achievements.update', [$member, $achievement]), [
            'achievement_type' => 'SPECIAL_RECOGNITION',
            'title' => 'Special Recognition',
            'awarded_on' => '2026-02-02',
            'issuing_authority' => 'ADG Sports',
            'order_reference' => 'SA-101',
            'place' => 'Kanpur',
            'remarks' => 'Updated.',
        ])
        ->assertRedirect(route('members.special-achievements', $member));

    expect($achievement->refresh()->achievement_type)->toBe('SPECIAL_RECOGNITION');

    $this->actingAs($user)
        ->delete(route('members.special-achievements.destroy', [$member, $achievement]))
        ->assertRedirect(route('members.special-achievements', $member));

    $this->assertModelMissing($achievement);
    Storage::disk('local')->assertMissing($storedDocumentPath);
});

test('special achievement store validates required fields and document type', function (): void {
    Storage::fake('local');

    $user = rcUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('members.special-achievements', $member))
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'MEDAL',
            'title' => '',
            'awarded_on' => '01/02/2026',
            'order_document' => UploadedFile::fake()->create('order.exe', 10, 'application/x-msdownload'),
        ])
        ->assertRedirect(route('members.special-achievements', $member))
        ->assertSessionHasErrors([
            'achievement_type',
            'title',
            'awarded_on',
            'order_document',
        ]);

    expect(MemberSpecialAchievement::query()->where('member_id', $member->id)->exists())->toBeFalse();
});

test('special achievement update validates submitted fields', function (): void {
    $user = rcUser('members.view', 'members.manageSpecialAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = MemberSpecialAchievement::factory()
        ->forMember($member)
        ->commendationDisc()
        ->create();

    $this->actingAs($user)
        ->from(route('members.special-achievements', $member))
        ->patch(route('members.special-achievements.update', [$member, $achievement]), [
            'achievement_type' => 'INVALID',
            'title' => '',
            'awarded_on' => '02/02/2026',
        ])
        ->assertRedirect(route('members.special-achievements', $member))
        ->assertSessionHasErrors([
            'achievement_type',
            'title',
            'awarded_on',
        ]);

    expect($achievement->refresh()->achievement_type)->toBe('COMMENDATION_DISC');
});

test('special achievement mutations require special achievement permission', function (): void {
    $user = rcUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.special-achievements.store', $member), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
        ])
        ->assertForbidden();
});
