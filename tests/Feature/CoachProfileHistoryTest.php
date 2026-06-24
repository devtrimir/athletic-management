<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function coachProfileUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($permissions === []) {
        return $user;
    }

    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    foreach ($permissions as $code) {
        $permission = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
        );

        DB::table('role_permission')->insert([
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ]);
    }

    return $user;
}

test('coach alias can be added and searched', function () {
    $user = coachProfileUser('coaches.view', 'coaches.update');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Primary Coach',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.aliases.store', $coach), [
            'alias' => 'पुराना नाम',
            'source' => 'legacy',
        ])
        ->assertRedirect(route('coaches.aliases', $coach));

    $this->assertDatabaseHas('coach_aliases', [
        'coach_id' => $coach->id,
        'alias' => 'पुराना नाम',
        'source' => 'legacy',
    ]);

    $this->actingAs($user)
        ->getJson(route('v1.search.coaches', ['q' => 'पुराना']))
        ->assertSuccessful()
        ->assertJsonPath('data.0.id', $coach->id);
});

test('coach status change writes history and updates current status', function () {
    $user = coachProfileUser('coaches.view', 'coaches.manageStatus');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'coach_status' => 'ACTIVE',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.status.store', $coach), [
            'status' => 'RETIRED',
            'effective_on' => '2026-06-17',
            'reason' => 'Pending inquiry',
        ])
        ->assertRedirect(route('coaches.status', $coach));

    $this->assertDatabaseHas('coach_status_histories', [
        'coach_id' => $coach->id,
        'status' => 'RETIRED',
        'reason' => 'Pending inquiry',
        'recorded_by' => $user->id,
    ]);

    expect($coach->refresh()->coach_status)->toBe('RETIRED');
});

test('coach photo can be uploaded and removed', function () {
    Storage::fake('public');

    $user = coachProfileUser('coaches.view', 'coaches.uploadMedia', 'coaches.deleteMedia');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.photo.store', $coach), [
            'photo' => UploadedFile::fake()->image('coach.jpg'),
        ])
        ->assertRedirect(route('coaches.show', $coach));

    $path = $coach->refresh()->photo_path;

    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);

    $this->actingAs($user)
        ->delete(route('coaches.photo.destroy', $coach))
        ->assertRedirect(route('coaches.show', $coach));

    expect($coach->refresh()->photo_path)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});
