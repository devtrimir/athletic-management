<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachSpecialAchievement;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function coachSpecialAchievementUser(string ...$permissions)
{
    $user = rcUser(...$permissions);
    $user->update(['email_verified_at' => now()]);

    return $user;
}

beforeEach(function (): void {
    Storage::fake('local');
});

test('unauthenticated user is redirected', function (): void {
    $coach = Coach::factory()->create();

    $this->post(route('coaches.special-achievements.store', $coach), [
        'achievement_type' => 'COMMENDATION_DISC',
        'title' => 'Test',
    ])->assertRedirect(route('login'));
});

test('user without coaches.manageSpecialAchievements cannot store', function (): void {
    $user = coachSpecialAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Test',
            'awarded_on' => '2026-08-25',
        ])
        ->assertForbidden();
});

test('user with coaches.manageSpecialAchievements can store a record', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-08-25',
            'issuing_authority' => 'DGP UP',
            'order_reference' => 'UPP/SA/1234',
            'place' => 'Lucknow',
            'remarks' => 'Excellent service',
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach));

    expect(CoachSpecialAchievement::where('coach_id', $coach->id)->exists())->toBeTrue();
});

test('store validates required fields', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [])
        ->assertSessionHasErrors(['achievement_type', 'title']);
});

test('update requires coaches.manageSpecialAchievements', function (): void {
    $user = coachSpecialAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->patch(route('coaches.special-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertForbidden();
});

test('update modifies the record and redirects', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()->forCoach($coach)->create([
        'title' => 'Original',
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.special-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated Title',
            'awarded_on' => '2025-01-15',
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach));

    expect($achievement->fresh()->title)->toBe('Updated Title');
});

test('update returns 404 for achievement belonging to another coach', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()->forCoach($otherCoach)->create();

    $this->actingAs($user)
        ->patch(route('coaches.special-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertNotFound();
});

test('destroy requires coaches.manageSpecialAchievements', function (): void {
    $user = coachSpecialAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->delete(route('coaches.special-achievements.destroy', [$coach, $achievement]))
        ->assertForbidden();
});

test('destroy removes the record and redirects', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->delete(route('coaches.special-achievements.destroy', [$coach, $achievement]))
        ->assertRedirect(route('coaches.special-achievements', $coach));

    expect(CoachSpecialAchievement::find($achievement->id))->toBeNull();
});

test('coach from another organization returns 404', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $otherOrg = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Test',
        ])
        ->assertNotFound();
});

test('store accepts an order document', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $file = UploadedFile::fake()->create('order.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'With document',
            'order_document' => $file,
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach));

    $achievement = CoachSpecialAchievement::where('coach_id', $coach->id)->first();
    expect($achievement)->not->toBeNull()
        ->and($achievement->order_document_path)->not->toBeNull()
        ->and($achievement->order_document_original_name)->toBe('order.pdf')
        ->and($achievement->order_document_mime_type)->toBe('application/pdf');
});

test('special achievements tab exposes standalone rows without heavy payloads', function (): void {
    $user = coachSpecialAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachSpecialAchievement::factory()
        ->forCoach($coach)
        ->commendationDisc()
        ->create([
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-01-15',
            'order_reference' => 'DISC-101',
        ]);

    $this->actingAs($user)
        ->get(route('coaches.special-achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'special-achievements')
            ->has('specialAchievements.records', 1)
            ->where('specialAchievements.records.0.order_reference', 'DISC-101')
            ->where('specialAchievements.summary.commendation_discs', 1)
            ->missing('coachAchievements')
            ->missing('auditLog')
            ->missing('statusHistory')
        );
});

test('special achievements tab requires coaches view permission', function (): void {
    $user = coachSpecialAchievementUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.special-achievements', $coach))
        ->assertForbidden();
});

test('special achievements tab does not expose coaches from another organization', function (): void {
    $user = coachSpecialAchievementUser('coaches.view');
    $otherOrg = Organization::factory()->create();
    $coach = Coach::withoutGlobalScopes()->create(
        Coach::factory()->make(['organization_id' => $otherOrg->id])->getAttributes()
    );

    $this->actingAs($user)
        ->get(route('coaches.special-achievements', $coach))
        ->assertNotFound();
});

test('special achievement mutations return to the special achievements tab with document access', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $viewer = coachSpecialAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $document = UploadedFile::fake()->create('commendation-order.pdf', 200, 'application/pdf');

    $response = $this->actingAs($user)
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
            'awarded_on' => '2026-02-01',
            'issuing_authority' => 'DGP UP',
            'order_reference' => 'DISC-100',
            'order_document' => $document,
            'place' => 'Lucknow',
            'remarks' => 'Special departmental recognition.',
        ]);

    $response->assertRedirect(route('coaches.special-achievements', $coach));

    $achievement = CoachSpecialAchievement::query()
        ->where('coach_id', $coach->id)
        ->firstOrFail();

    expect($achievement->order_document_path)->not->toBeNull()
        ->and($achievement->order_document_original_name)->toBe('commendation-order.pdf');
    Storage::disk('local')->assertExists($achievement->order_document_path);
    $storedDocumentPath = $achievement->order_document_path;

    $this->actingAs($user)
        ->get(route('coaches.special-achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('specialAchievements.records.0.order_document.original_name', 'commendation-order.pdf')
            ->where('specialAchievements.records.0.order_document.mime_type', 'application/pdf')
            ->where('specialAchievements.records.0.order_document.url', route('coaches.special-achievements.order-document.preview', [$coach, $achievement]))
            ->where('specialAchievements.records.0.order_document.preview_url', route('coaches.special-achievements.order-document.preview', [$coach, $achievement]))
            ->where('specialAchievements.records.0.order_document.download_url', route('coaches.special-achievements.order-document', [$coach, $achievement]))
        );

    expect(route('coaches.special-achievements.order-document', [$coach, $achievement]))
        ->not->toContain('/storage/');
    expect(route('coaches.special-achievements.order-document.preview', [$coach, $achievement]))
        ->not->toContain('/storage/');

    $this->actingAs($user)
        ->get(route('coaches.special-achievements.order-document.preview', [$coach, $achievement]))
        ->assertOk()
        ->assertHeader('content-disposition', 'inline; filename=commendation-order.pdf');

    $this->actingAs($user)
        ->get(route('coaches.special-achievements.order-document', [$coach, $achievement]))
        ->assertOk()
        ->assertDownload('commendation-order.pdf');

    $this->actingAs($viewer)
        ->get(route('coaches.special-achievements.order-document.preview', [$coach, $achievement]))
        ->assertNotFound();

    $this->actingAs($viewer)
        ->get(route('coaches.special-achievements.order-document', [$coach, $achievement]))
        ->assertNotFound();

    $this->actingAs($user)
        ->patch(route('coaches.special-achievements.update', [$coach, $achievement]), [
            'achievement_type' => 'SPECIAL_RECOGNITION',
            'title' => 'Special Recognition',
            'awarded_on' => '2026-02-02',
            'issuing_authority' => 'ADG Sports',
            'order_reference' => 'SA-101',
            'place' => 'Kanpur',
            'remarks' => 'Updated.',
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach));

    expect($achievement->refresh()->achievement_type)->toBe('SPECIAL_RECOGNITION');

    $this->actingAs($user)
        ->delete(route('coaches.special-achievements.destroy', [$coach, $achievement]))
        ->assertRedirect(route('coaches.special-achievements', $coach));

    $this->assertModelMissing($achievement);
    Storage::disk('local')->assertMissing($storedDocumentPath);
});

test('special achievement store validates required fields and document type', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.special-achievements', $coach))
        ->post(route('coaches.special-achievements.store', $coach), [
            'achievement_type' => 'MEDAL',
            'title' => '',
            'awarded_on' => '01/02/2026',
            'order_document' => UploadedFile::fake()->create('order.exe', 10, 'application/x-msdownload'),
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach))
        ->assertSessionHasErrors([
            'achievement_type',
            'title',
            'awarded_on',
            'order_document',
        ]);

    expect(CoachSpecialAchievement::query()->where('coach_id', $coach->id)->exists())->toBeFalse();
});

test('special achievement update validates submitted fields', function (): void {
    $user = coachSpecialAchievementUser('coaches.view', 'coaches.manageSpecialAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachSpecialAchievement::factory()
        ->forCoach($coach)
        ->commendationDisc()
        ->create();

    $this->actingAs($user)
        ->from(route('coaches.special-achievements', $coach))
        ->patch(route('coaches.special-achievements.update', [$coach, $achievement]), [
            'achievement_type' => 'INVALID',
            'title' => '',
            'awarded_on' => '02/02/2026',
        ])
        ->assertRedirect(route('coaches.special-achievements', $coach))
        ->assertSessionHasErrors([
            'achievement_type',
            'title',
            'awarded_on',
        ]);

    expect($achievement->refresh()->achievement_type)->toBe('COMMENDATION_DISC');
});
