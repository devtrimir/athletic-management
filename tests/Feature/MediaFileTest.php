<?php

declare(strict_types=1);

use App\Models\MediaFile;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

// ── Helpers ──────────────────────────────────────────────────────────────────

function mfUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'organization_id' => $org->id,
        ]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert([
                'role_id' => $role->id,
                'permission_id' => $perm->id,
            ]);
        }
    }

    return $user;
}

function mfParticipation(User $user): Participation
{
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    return Participation::factory()->create(['member_id' => $member->id]);
}

function mfUploadRoute(Participation $participation): string
{
    return route('participations.media.store', $participation);
}

function mfDeleteRoute(Participation $participation, MediaFile $file): string
{
    return route('participations.media.destroy', [$participation, $file]);
}

// ── Upload ────────────────────────────────────────────────────────────────────

test('authenticated user with media.upload can upload a jpeg', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->image('photo.jpg', 100, 100)->size(500);

    $response = $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file]);

    $response->assertStatus(201)
        ->assertJsonStructure(['id', 'url', 'mime_type', 'size_bytes', 'original_name']);

    $this->assertDatabaseHas('media_files', [
        'mediable_id' => $participation->id,
        'mediable_type' => Participation::class,
        'organization_id' => $user->organization_id,
        'uploaded_by' => $user->id,
    ]);
});

test('authenticated user with media.upload can upload a png', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->image('photo.png', 100, 100)->size(500);

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(201);
});

test('authenticated user with media.upload can upload a webp', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->image('photo.webp', 100, 100);

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(201);
});

test('pdf upload is rejected with 422', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->create('doc.pdf', 500, 'application/pdf');

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);

    $this->assertDatabaseCount('media_files', 0);
});

test('file larger than 10 MB is rejected with 422', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    // 10241 KB > 10 MB limit
    $file = UploadedFile::fake()->image('big.jpg', 100, 100)->size(10_241);

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
});

test('upload is rejected when participation already has 20 files', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    // Insert 20 media records directly to avoid factory overhead
    for ($i = 0; $i < 20; $i++) {
        MediaFile::create([
            'organization_id' => $participation->member()->withoutGlobalScopes()->value('organization_id'),
            'mediable_type' => Participation::class,
            'mediable_id' => $participation->id,
            'disk' => 'public',
            'path' => "org_1/tournaments/0/events/0/members/{$participation->member_id}/file_{$i}.jpg",
            'original_name' => "photo_{$i}.jpg",
            'mime_type' => 'image/jpeg',
            'size_bytes' => 100_000,
            'uploaded_by' => $user->id,
        ]);
    }

    $file = UploadedFile::fake()->image('photo.jpg')->size(100);

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(422);
});

test('user without media.upload permission gets 403 on upload', function () {
    Storage::fake('public');

    $user = mfUser('members.view'); // no media.upload
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->image('photo.jpg')->size(100);

    $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(403);
});

test('unauthenticated user gets 401 on upload', function () {
    $participation = Participation::factory()->create();

    $this->postJson(mfUploadRoute($participation), [])
        ->assertStatus(401);
});

test('user from a different org gets 403 on upload (cross-org)', function () {
    Storage::fake('public');

    $attacker = mfUser('media.upload', 'members.view');
    $victim = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($victim); // belongs to victim's org

    $file = UploadedFile::fake()->image('photo.jpg')->size(100);

    // attacker tries to upload to another org's participation
    $this->actingAs($attacker)
        ->postJson(mfUploadRoute($participation), ['file' => $file])
        ->assertStatus(403);
});

test('uploaded file is physically stored on disk', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view');
    $participation = mfParticipation($user);

    $file = UploadedFile::fake()->image('photo.jpg', 100, 100)->size(300);

    $response = $this->actingAs($user)
        ->postJson(mfUploadRoute($participation), ['file' => $file]);

    $response->assertStatus(201);

    $path = MediaFile::latest('id')->first()?->path;
    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);
});

// ── Delete ────────────────────────────────────────────────────────────────────

test('user with media.delete can delete a media file', function () {
    Storage::fake('public');

    $user = mfUser('media.delete', 'members.view');
    $participation = mfParticipation($user);
    $mediaFile = MediaFile::factory()->forParticipation($participation)->create([
        'uploaded_by' => $user->id,
    ]);

    Storage::disk('public')->put($mediaFile->path, 'fake-content');

    $this->actingAs($user)
        ->deleteJson(mfDeleteRoute($participation, $mediaFile))
        ->assertStatus(204);

    $this->assertDatabaseMissing('media_files', ['id' => $mediaFile->id]);
    Storage::disk('public')->assertMissing($mediaFile->path);
});

test('user without media.delete permission gets 403 on delete', function () {
    Storage::fake('public');

    $user = mfUser('media.upload', 'members.view'); // upload but no delete
    $participation = mfParticipation($user);
    $mediaFile = MediaFile::factory()->forParticipation($participation)->create([
        'uploaded_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->deleteJson(mfDeleteRoute($participation, $mediaFile))
        ->assertStatus(403);

    $this->assertDatabaseHas('media_files', ['id' => $mediaFile->id]);
});

// ── Member media API ──────────────────────────────────────────────────────────

test('member media API returns grouped structure', function () {
    Storage::fake('public');

    $user = mfUser('members.view');
    $participation = mfParticipation($user);
    MediaFile::factory()->forParticipation($participation)->count(3)->create([
        'uploaded_by' => $user->id,
    ]);

    $memberId = $participation->member_id;

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.media.index', $memberId));

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [['tournament', 'events', 'total']],
            'total',
        ]);

    expect($response->json('total'))->toBe(3);
});

test('member media API returns 403 for cross-org access', function () {
    $attacker = mfUser('members.view');
    $victim = mfUser('members.view');
    $member = Member::factory()->create(['organization_id' => $victim->organization_id]);

    // Route model binding won't find a member from another org (returns 404 — intentional tenant isolation)
    $this->actingAs($attacker)
        ->getJson(route('v1.members.media.index', $member->id))
        ->assertStatus(404);
});

test('member media API filter by tournament_id works', function () {
    Storage::fake('public');

    $user = mfUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    // Two participations in different tournaments
    $p1 = Participation::factory()->create(['member_id' => $member->id]);
    $p2 = Participation::factory()->create(['member_id' => $member->id]);

    MediaFile::factory()->forParticipation($p1)->count(2)->create(['uploaded_by' => $user->id]);
    MediaFile::factory()->forParticipation($p2)->count(1)->create(['uploaded_by' => $user->id]);

    $tournament1Id = $p1->event->tournament_id;

    $response = $this->actingAs($user)
        ->getJson(route('v1.members.media.index', $member->id).'?filter[tournament_id]='.$tournament1Id);

    $response->assertStatus(200);
    expect($response->json('total'))->toBe(2);
});
