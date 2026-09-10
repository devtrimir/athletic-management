<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
    ], uniqueBy: ['code']);
});

function restoreTestUser(string ...$permissions): User
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

test('check-pno returns 403 when user lacks members.view or members.create permission', function (): void {
    $user = restoreTestUser();

    $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '999999999']))
        ->assertForbidden();
});

test('check-pno returns available when PNO does not exist in the organization', function (): void {
    $user = restoreTestUser('members.create');

    $response = $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '880011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('available');
});

test('check-pno returns active_conflict when an active member has the PNO', function (): void {
    $user = restoreTestUser('members.create');

    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '880011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('active_conflict')
        ->and($response['entity'])->toBe('member');
});

test('check-pno returns deleted_member with impact summary when soft-deleted member has the PNO', function (): void {
    $user = restoreTestUser('members.create');

    $deletedMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
        'full_name' => 'Kailash Yadav',
    ]);
    $deletedMember->delete();

    $response = $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '880011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('deleted_member')
        ->and($response['member']['id'])->toBe($deletedMember->id)
        ->and($response['member']['full_name'])->toBe('Kailash Yadav')
        ->and($response['member']['pno'])->toBe('880011223')
        ->and($response['member']['can_purge'])->toBeTrue()
        ->and($response['member']['summary']['participations_count'])->toBe(0);
});

test('check-pno marks can_purge as false when soft-deleted member has historical connections', function (): void {
    $user = restoreTestUser('members.create');
    $orgId = $user->organization_id;

    $sport = Sport::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $deletedMember = Member::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
        'pno' => '880011223',
        'full_name' => 'Kailash Yadav',
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id]);
    Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $deletedMember->id,
        'session_id' => $session->id,
    ]);

    $deletedMember->delete();

    $response = $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '880011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('deleted_member')
        ->and($response['member']['can_purge'])->toBeFalse()
        ->and($response['member']['summary']['participations_count'])->toBe(1);
});

test('check-pno respects organization boundary', function (): void {
    $user = restoreTestUser('members.create');
    $otherOrg = Organization::factory()->create();

    $deletedInOtherOrg = Member::factory()->create([
        'organization_id' => $otherOrg->id,
        'pno' => '880011223',
    ]);
    $deletedInOtherOrg->delete();

    $response = $this->actingAs($user)
        ->getJson(route('members.check-pno', ['pno' => '880011223']))
        ->assertOk()
        ->json();

    expect($response['status'])->toBe('available');
});

test('restore endpoint restores a soft-deleted member and transitions status to ACTIVE', function (): void {
    $user = restoreTestUser('members.update');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
        'current_status' => 'INACTIVE',
    ]);
    $member->delete();

    $this->actingAs($user)
        ->post(route('members.restore', $member))
        ->assertRedirect(route('members.show', $member));

    $member->refresh();

    expect($member->trashed())->toBeFalse()
        ->and($member->deleted_at)->toBeNull()
        ->and($member->current_status)->toBe('ACTIVE');

    $this->assertDatabaseHas('member_status_history', [
        'member_id' => $member->id,
        'status' => 'ACTIVE',
        'reason' => 'Member restored from archive.',
        'recorded_by' => $user->id,
    ]);
});

test('restore endpoint prevents restoring when an active record with same PNO exists', function (): void {
    $user = restoreTestUser('members.update');

    $deletedMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
    ]);
    $deletedMember->delete();

    // Active member created with the same PNO
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
    ]);

    $this->actingAs($user)
        ->post(route('members.restore', $deletedMember))
        ->assertSessionHasErrors(['pno']);

    expect($deletedMember->fresh()->trashed())->toBeTrue();
});

test('force-destroy permanently removes a clean soft-deleted member', function (): void {
    $user = restoreTestUser('members.delete');

    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => '880011223',
    ]);
    $member->delete();

    $this->actingAs($user)
        ->delete(route('members.force-destroy', $member))
        ->assertRedirect(route('members.index', ['filter[status_scope]' => 'archived']));

    $this->assertDatabaseMissing('members', ['id' => $member->id]);
});

test('force-destroy rejects purging a soft-deleted member with historical connections', function (): void {
    $user = restoreTestUser('members.delete');
    $orgId = $user->organization_id;

    $sport = Sport::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $member = Member::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
        'pno' => '880011223',
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id]);
    Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    $member->delete();

    $this->actingAs($user)
        ->delete(route('members.force-destroy', $member))
        ->assertSessionHasErrors(['error']);

    $this->assertDatabaseHas('members', ['id' => $member->id]);
});

test('creating a new member with the same PNO as a soft-deleted member succeeds', function (): void {
    $user = restoreTestUser('members.create');
    $sport = Sport::factory()->create();

    $archivedMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'sport_id' => $sport->id,
        'pno' => '880011223',
        'full_name' => 'Old Kailash',
    ]);
    $archivedMember->delete();

    $postData = [
        'full_name' => 'New Kailash',
        'pno' => '880011223',
        'gender' => 'M',
        'player_category' => 'GD',
        'player_level' => 'STATE',
        'current_status' => 'ACTIVE',
        'sport_id' => $sport->id,
    ];

    $this->actingAs($user)
        ->post(route('members.store'), $postData)
        ->assertRedirect();

    // Verify both records exist: one trashed, one active
    expect(Member::where('pno', '880011223')->count())->toBe(1)
        ->and(Member::withTrashed()->where('pno', '880011223')->count())->toBe(2);

    $activeMember = Member::where('pno', '880011223')->first();
    expect($activeMember->full_name)->toBe('New Kailash')
        ->and($activeMember->deleted_at)->toBeNull();
});

test('members index shows archived members when status_scope is archived', function (): void {
    $user = restoreTestUser('members.view');

    $activeMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Active Athlete',
    ]);

    $archivedMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Archived Athlete',
    ]);
    $archivedMember->delete();

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['status_scope' => 'archived']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('members/index')
            ->where('statusCounts.archived', 1)
            ->has('members.data', 1)
            ->where('members.data.0.id', $archivedMember->id)
            ->where('members.data.0.full_name', 'Archived Athlete')
        );
});

test('all profile tab routes allow viewing soft-deleted member without 404', function (string $routeName): void {
    $user = restoreTestUser('members.view');

    $archivedMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Archived Athlete',
    ]);
    $archivedMember->delete();

    $this->actingAs($user)
        ->get(route($routeName, $archivedMember))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('members/show')
            ->where('member.id', $archivedMember->id)
        );
})->with([
    'members.show',
    'members.teams',
    'members.events',
    'members.performance',
    'members.external-coaching',
    'members.special-achievements',
    'members.promotions',
    'members.changelog',
    'members.media',
    'members.status',
]);
