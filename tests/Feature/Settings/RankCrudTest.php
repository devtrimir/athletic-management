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
            'name' => 'टेस्ट रैंक',
            'short_name' => 'TR',
            'rank_order' => 999,
            'cadre_type' => 'IPS',
            'is_gazetted' => '1',
            'aliases' => 'Foo, Bar',
            'is_active' => '1',
        ])
        ->assertRedirect(route('ranks.index'));

    expect(Rank::where('code', 'TEST_RANK')->exists())->toBeTrue();
});

test('store inline creates rank and returns created data', function (): void {
    $response = $this->actingAs($this->admin)
        ->postJson(route('ranks.inline.store'), [
            'code' => 'INLINE_RANK',
            'name' => 'इनलाइन रैंक',
            'short_name' => 'IR',
            'rank_order' => 998,
            'is_active' => true,
        ]);

    $response->assertOk()
        ->assertJsonPath('rank.code', 'INLINE_RANK')
        ->assertJsonPath('rank.name', 'इनलाइन रैंक');

    expect(Rank::where('code', 'INLINE_RANK')->exists())->toBeTrue();
});

test('store is forbidden without permission', function (): void {
    $this->actingAs($this->user)
        ->post(route('ranks.store'), [
            'code' => 'TEST_RANK',
            'name' => 'Test Rank',
            'rank_order' => 999,
        ])
        ->assertForbidden();
});

test('edit page returns 200 for authorized user', function (): void {
    $rank = Rank::create([
        'code' => 'EDIT_RANK',
        'name' => 'एडिट रैंक',
        'short_name' => 'ER',
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
        'name' => 'अपडेट रैंक',
        'short_name' => 'UR',
        'rank_order' => 20,
        'cadre_type' => 'IPS',
        'is_gazetted' => false,
        'aliases' => ['Alias'],
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->patch(route('ranks.update', $rank), [
            'code' => 'UPDATE_RANK',
            'name' => 'अपडेटेड रैंक',
            'short_name' => 'UR',
            'rank_order' => 21,
            'cadre_type' => 'PPS',
            'is_gazetted' => '0',
            'aliases' => 'Alias One, Alias Two',
            'is_active' => '0',
        ])
        ->assertRedirect(route('ranks.index'));

    expect($rank->refresh()->name)->toBe('अपडेटेड रैंक');
    expect($rank->refresh()->aliases)->toBe(['Alias One', 'Alias Two']);
});

test('destroy deletes rank and redirects', function (): void {
    $rank = Rank::create([
        'code' => 'DELETE_RANK',
        'name' => 'Delete Rank',
        'rank_order' => 30,
        'is_gazetted' => false,
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('ranks.destroy', $rank))
        ->assertRedirect(route('ranks.index'));

    expect(Rank::find($rank->id))->toBeNull();
});
