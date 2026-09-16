<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Members\MemberDeletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function coachRestoreTestUser(string ...$permissions): User
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

test('coach check-pno returns 403 when user lacks coaches.view or coaches.create permission', function (): void {
    $user = coachRestoreTestUser();

    $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertForbidden();
});

test('coach check-pno returns available when PNO does not exist in the organization', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('available');
});

test('coach check-pno returns active_conflict when an active coach has the PNO', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('active_conflict')
        ->and($response['entity'])->toBe('coach');
});

test('coach check-pno returns active_conflict when an active member has the PNO', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('active_conflict')
        ->and($response['entity'])->toBe('member');
});

test('coach check-pno with ignore_member_id does not flag the linked member as an active conflict', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', [
            'pno' => '990011223',
            'ignore_member_id' => $member->id,
        ]))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('available');
});

test('registering as coach from a member profile still surfaces an archived coach with the same PNO', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);

    $archivedCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);
    $archivedCoach->delete();

    // The "Register as Coach" form prefills and locks the PNO from the
    // member, so the check must exclude that same member from the
    // active-conflict branch while still surfacing the archived coach.
    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', [
            'pno' => '990011223',
            'ignore_member_id' => $member->id,
        ]))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('deleted_coach')
        ->and($response['coach']['id'])->toBe($archivedCoach->id);
});

test('coach check-pno returns deleted_coach with impact summary when soft-deleted coach has the PNO', function (): void {
    $user = coachRestoreTestUser('coaches.create');

    $deletedCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
        'full_name' => 'Ramesh Yadav',
    ]);
    $deletedCoach->delete();

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('deleted_coach')
        ->and($response['coach']['id'])->toBe($deletedCoach->id)
        ->and($response['coach']['full_name'])->toBe('Ramesh Yadav')
        ->and($response['coach']['pno'])->toBe('990011223')
        ->and($response['coach']['can_purge'])->toBeTrue();
});

test('coach check-pno respects organization boundary', function (): void {
    $user = coachRestoreTestUser('coaches.create');
    $otherOrg = Organization::factory()->create();

    $deletedInOtherOrg = Coach::factory()->create([
        'organization_id' => $otherOrg->id,
        'pno' => '990011223',
    ]);
    $deletedInOtherOrg->delete();

    $response = $this->actingAs($user)
        ->getJson(route('coaches.check-pno', ['pno' => '990011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('available');
});

test('coach restore endpoint restores a soft-deleted coach and transitions status to ACTIVE', function (): void {
    $user = coachRestoreTestUser('coaches.restore');

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
        'coach_status' => 'INACTIVE',
    ]);
    $coach->delete();

    $this->actingAs($user)
        ->post(route('coaches.restore', $coach))
        ->assertRedirect(route('coaches.index'));

    $coach->refresh();

    expect($coach->trashed())->toBeFalse()
        ->and($coach->deleted_at)->toBeNull()
        ->and($coach->coach_status)->toBe('ACTIVE');

    $this->assertDatabaseHas('coach_status_histories', [
        'coach_id' => $coach->id,
        'status' => 'ACTIVE',
        'reason' => 'Coach restored from archive.',
        'recorded_by' => $user->id,
    ]);
});

test('coach restore endpoint prevents restoring when an active coach with same PNO exists', function (): void {
    $user = coachRestoreTestUser('coaches.restore');

    $deletedCoach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);
    $deletedCoach->delete();

    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011223',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.restore', $deletedCoach))
        ->assertSessionHasErrors(['pno']);

    expect($deletedCoach->fresh()->trashed())->toBeTrue();
});

test('coach restore requires coaches.restore permission', function (): void {
    $user = coachRestoreTestUser('coaches.view');

    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $coach->delete();

    $this->actingAs($user)
        ->post(route('coaches.restore', $coach))
        ->assertForbidden();
});

test('restoring an archived member re-links a coach that was unlinked by the archival', function (): void {
    $user = coachRestoreTestUser('members.update');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011224',
    ]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '990011224',
        'member_id' => $member->id,
    ]);

    $this->actingAs($user);
    app(MemberDeletionService::class)->delete($member);

    expect($coach->fresh()->member_id)->toBeNull();

    $this->actingAs($user)
        ->post(route('members.restore', $member))
        ->assertStatus(302);

    expect($coach->fresh()->member_id)->toBe($member->id);
});
