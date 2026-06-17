<?php

use App\Models\Designation;
use App\Models\Rank;

beforeEach(function (): void {
    $this->admin = rcUser('reference_data.manage');
    $this->user = rcUser();
});

test('index returns 200 for authorized user', function (): void {
    $this->actingAs($this->admin)
        ->get(route('designations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/designations/index'));
});

test('create page returns 200 for authorized user', function (): void {
    $this->actingAs($this->admin)
        ->get(route('designations.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/designations/create'));
});

test('store creates designation and redirects', function (): void {
    $rank = Rank::create([
        'code' => 'MAP_RANK',
        'name' => 'Mapped Rank',
        'rank_order' => 1,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->post(route('designations.store'), [
            'code' => 'TEST_DESIGNATION',
            'name' => 'टेस्ट पद',
            'short_name' => 'TD',
            'designation_order' => 99,
            'mapped_rank_code' => $rank->code,
            'designation_type' => 'COMMISSIONERATE',
            'is_active' => '1',
        ])
        ->assertRedirect(route('designations.index'));

    expect(Designation::where('code', 'TEST_DESIGNATION')->exists())->toBeTrue();
});

test('store inline creates designation and returns created data', function (): void {
    $rank = Rank::create([
        'code' => 'INLINE_MAP',
        'name' => 'Inline Map',
        'rank_order' => 1,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->postJson(route('designations.inline.store'), [
            'code' => 'INLINE_DESIGNATION',
            'name' => 'इनलाइन पद',
            'short_name' => 'ID',
            'designation_order' => 98,
            'mapped_rank_code' => $rank->code,
            'designation_type' => 'DISTRICT',
            'is_active' => true,
        ]);

    $response->assertOk()
        ->assertJsonPath('designation.code', 'INLINE_DESIGNATION')
        ->assertJsonPath('designation.name', 'इनलाइन पद');

    expect(Designation::where('code', 'INLINE_DESIGNATION')->exists())->toBeTrue();
});

test('store is forbidden without permission', function (): void {
    $this->actingAs($this->user)
        ->post(route('designations.store'), [
            'code' => 'TEST_DESIGNATION',
            'name' => 'टेस्ट पद',
            'designation_order' => 99,
        ])
        ->assertForbidden();
});

test('edit page returns 200 for authorized user', function (): void {
    $rank = Rank::create([
        'code' => 'EDIT_MAP',
        'name' => 'Edit Map',
        'rank_order' => 1,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $designation = Designation::create([
        'code' => 'EDIT_DESIGNATION',
        'name' => 'एडिट पद',
        'short_name' => 'ED',
        'designation_order' => 10,
        'mapped_rank_code' => $rank->code,
        'designation_type' => 'STATE_HEAD',
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->get(route('designations.edit', $designation))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/designations/edit'));
});

test('update saves changes and redirects', function (): void {
    $rank = Rank::create([
        'code' => 'UPDATE_MAP',
        'name' => 'Update Map',
        'rank_order' => 1,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $designation = Designation::create([
        'code' => 'UPDATE_DESIGNATION',
        'name' => 'अपडेट पद',
        'designation_order' => 10,
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('designations.update', $designation), [
            'code' => 'UPDATE_DESIGNATION',
            'name' => 'अपडेटेड पद',
            'short_name' => 'UD',
            'designation_order' => 11,
            'mapped_rank_code' => $rank->code,
            'designation_type' => 'DISTRICT',
            'is_active' => '0',
        ])
        ->assertRedirect(route('designations.index'));

    expect($designation->refresh()->name)->toBe('अपडेटेड पद');
});

test('destroy deletes designation and redirects', function (): void {
    $designation = Designation::create([
        'code' => 'DELETE_DESIGNATION',
        'name' => 'डिलीट पद',
        'designation_order' => 10,
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('designations.destroy', $designation))
        ->assertRedirect(route('designations.index'));

    expect(Designation::find($designation->id))->toBeNull();
});
