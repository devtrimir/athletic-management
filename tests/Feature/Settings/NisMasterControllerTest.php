<?php

declare(strict_types=1);

use App\Models\NisMaster;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->admin = rcUser('reference_data.manage');
    $this->user = rcUser();
});

test('index returns 200 for authorized user', function (): void {
    $this->actingAs($this->admin)
        ->get(route('nis-masters.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/nis-masters/index'));
});

test('index is forbidden without reference_data.manage', function (): void {
    $this->actingAs($this->user)
        ->get(route('nis-masters.index'))
        ->assertForbidden();
});

test('store creates nis master and redirects', function (): void {
    $this->actingAs($this->admin)
        ->post(route('nis-masters.store'), [
            'kind' => 'TOURNAMENT_TYPE',
            'code' => 'TEST_NIS',
            'name' => 'टेस्ट एनआईएस',
            'short_name' => 'TN',
            'sort_order' => 10,
            'is_active' => true,
        ])
        ->assertRedirect();

    expect(NisMaster::where('code', 'TEST_NIS')->exists())->toBeTrue();
});

test('store is forbidden without reference_data.manage', function (): void {
    $this->actingAs($this->user)
        ->post(route('nis-masters.store'), [
            'kind' => 'TOURNAMENT_TYPE',
            'code' => 'TEST_NIS',
            'name' => 'Test NIS',
        ])
        ->assertForbidden();
});
