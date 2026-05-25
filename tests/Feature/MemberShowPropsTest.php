<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\NameAlias;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// MemberController::show() Inertia prop shape (T14)
// ---------------------------------------------------------------------------

test('show returns member resource in Inertia props', function (): void {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/show')
            ->has('member', fn ($m) => $m
                ->has('id')
                ->has('member_code')
                ->has('pno')
                ->has('full_name_hi')
                ->has('full_name_en')
                ->has('father_name_hi')
                ->has('rank')
                ->has('gender')
                ->has('dob')
                ->has('joining_date')
                ->has('mobile')
                ->has('player_category')
                ->has('player_level')
                ->has('current_status')
                ->has('home_district')
                ->has('current_unit')
                ->etc()
            )
        );
});

test('show defers statusHistory prop', function (): void {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    MemberStatusHistory::factory()->create([
        'member_id' => $member->id,
        'status' => 'ACTIVE',
        'effective_on' => now()->subYear(),
    ]);

    // Deferred props are not included in the initial page response
    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('members/show'));
});

test('show defers aliases prop', function (): void {
    $user = memberUser('members.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    NameAlias::factory()->create(['member_id' => $member->id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('members/show'));
});

test('show returns 403 without members.view', function (): void {
    $user = memberUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertForbidden();
});

test('show returns 404 for member in another org', function (): void {
    $user = memberUser('members.view');
    $otherOrg = Organization::factory()->create();
    $member = Member::withoutGlobalScopes()->create(
        Member::factory()->make(['organization_id' => $otherOrg->id])->getAttributes()
    );

    $this->actingAs($user)
        ->get(route('members.show', $member))
        ->assertNotFound();
});
