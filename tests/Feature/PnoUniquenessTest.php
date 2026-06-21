<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Incharge;
use App\Models\Member;
use App\Models\Organization;

test('coach creation rejects a pno already used by a member in the same organization', function (): void {
    $user = rcUser('coaches.create');

    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO-100',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.store'), [
            'full_name' => 'Coach One',
            'pno' => 'PNO-100',
        ])
        ->assertSessionHasErrors('pno');
});

test('team prabhari creation rejects a pno already used by a coach in the same organization', function (): void {
    $user = rcUser('incharges.create');

    Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO-200',
    ]);

    $this->actingAs($user)
        ->post(route('incharges.store'), [
            'full_name' => 'Team Prabhari One',
            'pno' => 'PNO-200',
            'is_active' => true,
        ])
        ->assertSessionHasErrors('pno');
});

test('member update rejects a pno already used by a team prabhari and allows its own pno', function (): void {
    $user = rcUser('members.update');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO-300',
    ]);
    Incharge::factory()->create([
        'organization_id' => $user->organization_id,
        'pno' => 'PNO-301',
    ]);

    $this->actingAs($user)
        ->patch(route('members.update', $member), [
            'pno' => 'PNO-301',
        ])
        ->assertSessionHasErrors('pno');

    $this->actingAs($user)
        ->patch(route('members.update', $member), [
            'pno' => 'PNO-300',
        ])
        ->assertRedirect(route('members.show', $member));
});

test('same pno may be reused in a different organization', function (): void {
    $user = rcUser('incharges.create');
    $otherOrganization = Organization::factory()->create();

    Member::factory()->create([
        'organization_id' => $otherOrganization->id,
        'pno' => 'PNO-400',
    ]);

    $this->actingAs($user)
        ->post(route('incharges.store'), [
            'full_name' => 'Team Prabhari Two',
            'pno' => 'PNO-400',
            'is_active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('incharges', [
        'organization_id' => $user->organization_id,
        'pno' => 'PNO-400',
    ]);
});
