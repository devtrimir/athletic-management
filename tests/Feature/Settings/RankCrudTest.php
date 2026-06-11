<?php

use App\Models\Rank;

beforeEach(function (): void {
    $this->admin = rcUser('reference_data.manage');
    $this->user = rcUser();
});

test('index returns 200 for authorized user', function (): void {
    $this->actingAs($this->admin)
        ->get(route('ranks.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/ranks/index'));
});

test('create page returns 200 for authorized user', function (): void {
    $this->actingAs($this->admin)
        ->get(route('ranks.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/ranks/create'));
});

test('store creates rank and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('ranks.store'), [
            'code' => 'TEST_RANK',
            'name_en' => 'Test Rank',
            'short_name' => 'TR',
            'name_hi' => 'टेस्ट रैंक',
            'rank_order' => 999,
            'cadre_type' => 'IPS',
            'is_gazetted' => '1',
            'aliases' => 'Foo, Bar',
            'is_active' => '1',
        ])
        ->assertRedirect(route('ranks.index'));

    expect(Rank::where('code', 'TEST_RANK')->exists())->toBeTrue();
});

test('store is forbidden without permission', function (): void {
    $this->actingAs($this->user)
        ->post(route('ranks.store'), [
            'code' => 'TEST_RANK',
            'name_en' => 'Test Rank',
            'rank_order' => 999,
        ])
        ->assertForbidden();
});

test('edit page returns 200 for authorized user', function (): void {
    $rank = Rank::create([
        'code' => 'EDIT_RANK',
        'name_en' => 'Edit Rank',
        'short_name' => 'ER',
        'name_hi' => 'एडिट रैंक',
        'rank_order' => 10,
        'cadre_type' => 'IPS',
        'is_gazetted' => false,
        'aliases' => ['Alias'],
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->get(route('ranks.edit', $rank))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/ranks/edit'));
});

test('update saves changes and redirects', function (): void {
    $rank = Rank::create([
        'code' => 'UPDATE_RANK',
        'name_en' => 'Update Rank',
        'short_name' => 'UR',
        'name_hi' => 'अपडेट रैंक',
        'rank_order' => 20,
        'cadre_type' => 'IPS',
        'is_gazetted' => false,
        'aliases' => ['Alias'],
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('ranks.update', $rank), [
            'code' => 'UPDATE_RANK',
            'name_en' => 'Updated Rank',
            'short_name' => 'UR',
            'name_hi' => 'अपडेटेड रैंक',
            'rank_order' => 21,
            'cadre_type' => 'PPS',
            'is_gazetted' => '0',
            'aliases' => 'Alias One, Alias Two',
            'is_active' => '0',
        ])
        ->assertRedirect(route('ranks.index'));

    expect($rank->refresh()->name_en)->toBe('Updated Rank');
    expect($rank->refresh()->aliases)->toBe(['Alias One', 'Alias Two']);
});

test('destroy deletes rank and redirects', function (): void {
    $rank = Rank::create([
        'code' => 'DELETE_RANK',
        'name_en' => 'Delete Rank',
        'rank_order' => 30,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('ranks.destroy', $rank))
        ->assertRedirect(route('ranks.index'));

    expect(Rank::find($rank->id))->toBeNull();
});
