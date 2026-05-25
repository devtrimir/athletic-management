<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function coachUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

// ---------------------------------------------------------------------------
// index
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches index', function () {
    $this->get(route('coaches.index'))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on index', function () {
    $this->actingAs(coachUser())->get(route('coaches.index'))->assertForbidden();
});

test('user with coaches.view sees index', function () {
    $user = coachUser('coaches.view');

    $this->actingAs($user)
        ->get(route('coaches.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/index')
            ->has('coaches')
        );
});

test('index only shows coaches from own org', function () {
    $user = coachUser('coaches.view');
    $other = Organization::factory()->create();
    Coach::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->get(route('coaches.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 0));
});

test('index filter has_member=true returns only linked coaches', function () {
    $user = coachUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    Coach::factory()->create(['organization_id' => $user->organization_id, 'member_id' => $member->id]);
    Coach::factory()->standalone()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['has_member' => 'true']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 1));
});

test('index filter has_member=false returns only standalone coaches', function () {
    $user = coachUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    Coach::factory()->create(['organization_id' => $user->organization_id, 'member_id' => $member->id]);
    Coach::factory()->standalone()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['has_member' => 'false']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 1));
});

test('index filter nis_certified=1 returns only certified coaches', function () {
    $user = coachUser('coaches.view');
    Coach::factory()->nisCertified()->create(['organization_id' => $user->organization_id]);
    Coach::factory()->create(['organization_id' => $user->organization_id, 'nis_certified' => false]);

    $this->actingAs($user)
        ->get(route('coaches.index', ['filter' => ['nis_certified' => '1']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('coaches.total', 1));
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches create', function () {
    $this->get(route('coaches.create'))->assertRedirect(route('login'));
});

test('user without coaches.create gets 403 on create', function () {
    $this->actingAs(coachUser())->get(route('coaches.create'))->assertForbidden();
});

test('user with coaches.create sees create form', function () {
    $this->actingAs(coachUser('coaches.create'))
        ->get(route('coaches.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('coaches/create'));
});

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

test('user without coaches.create gets 403 on store', function () {
    $this->actingAs(coachUser())
        ->post(route('coaches.store'), ['full_name_hi' => 'राम'])
        ->assertForbidden();
});

test('store creates a standalone coach', function () {
    $user = coachUser('coaches.create');

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name_hi' => 'राम प्रसाद',
            'nis_certified' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coaches', [
        'full_name_hi' => 'राम प्रसाद',
        'member_id' => null,
        'organization_id' => $user->organization_id,
    ]);
});

test('store creates a linked coach', function () {
    $user = coachUser('coaches.create');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name_hi' => 'राम प्रसाद',
            'nis_certified' => false,
            'member_id' => $member->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('coaches', [
        'full_name_hi' => 'राम प्रसाद',
        'member_id' => $member->id,
        'organization_id' => $user->organization_id,
    ]);
});

test('store requires full_name_hi', function () {
    $this->actingAs(coachUser('coaches.create'))
        ->post(route('coaches.store'), [])
        ->assertSessionHasErrors('full_name_hi');
});

test('store rejects duplicate pno within the same org', function () {
    $user = coachUser('coaches.create');
    Coach::factory()->create(['organization_id' => $user->organization_id, 'pno' => '1234567890']);

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name_hi' => 'राम',
            'pno' => '1234567890',
        ])
        ->assertSessionHasErrors('pno');
});

// ---------------------------------------------------------------------------
// show
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches show', function () {
    $coach = Coach::factory()->create();
    $this->get(route('coaches.show', $coach))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on show', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->get(route('coaches.show', $coach))->assertForbidden();
});

test('show returns coach resource in Inertia props', function () {
    $user = coachUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->has('coach', fn ($c) => $c
                ->has('id')
                ->has('full_name_hi')
                ->has('full_name_en')
                ->has('pno')
                ->has('mobile')
                ->has('nis_certified')
                ->etc()
            )
        );
});

test('show deferred member prop is absent from initial response', function () {
    $user = coachUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.show', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->missing('member')
        );
});

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches edit', function () {
    $coach = Coach::factory()->create();
    $this->get(route('coaches.edit', $coach))->assertRedirect(route('login'));
});

test('user without coaches.update gets 403 on edit', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->get(route('coaches.edit', $coach))->assertForbidden();
});

test('user with coaches.update sees edit form', function () {
    $user = coachUser('coaches.update');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('coaches.edit', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/edit')
            ->has('coach')
        );
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('user without coaches.update gets 403 on update', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), ['full_name_hi' => 'नया नाम'])
        ->assertForbidden();
});

test('update persists changed fields and redirects', function () {
    $user = coachUser('coaches.update');
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'पुराना नाम',
        'nis_certified' => false,
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), [
            'full_name_hi' => 'नया नाम',
            'nis_certified' => true,
        ])
        ->assertRedirect(route('coaches.show', $coach));

    expect($coach->fresh()->full_name_hi)->toBe('नया नाम');
    expect($coach->fresh()->nis_certified)->toBeTrue();
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('user without coaches.delete gets 403 on destroy', function () {
    $user = coachUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->delete(route('coaches.destroy', $coach))->assertForbidden();
});

test('destroy soft-deletes coach and redirects to index', function () {
    $user = coachUser('coaches.delete');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('coaches.destroy', $coach))
        ->assertRedirect(route('coaches.index'));

    $this->assertSoftDeleted('coaches', ['id' => $coach->id]);
});

// ---------------------------------------------------------------------------
// T10 — name independence: updating a linked coach's name must not mutate
//         the linked member record
// ---------------------------------------------------------------------------

test('updating linked coach name does not mutate member full_name_hi', function () {
    $user = coachUser('coaches.update');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name_hi' => 'मूल सदस्य नाम',
    ]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'full_name_hi' => 'मूल सदस्य नाम',
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.update', $coach), [
            'full_name_hi' => 'बदला हुआ नाम',
        ]);

    expect($member->fresh()->full_name_hi)->toBe('मूल सदस्य नाम');
    expect($coach->fresh()->full_name_hi)->toBe('बदला हुआ नाम');
});
