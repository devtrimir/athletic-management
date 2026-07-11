<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\TrainingVenue;
use App\Models\Unit;
use Illuminate\Support\Facades\Schema;

test('training venues table exists with required columns', function (): void {
    expect(Schema::hasTable('training_venues'))->toBeTrue();

    foreach ([
        'organization_id',
        'name',
        'code',
        'address',
        'district_id',
        'unit_id',
        'city',
        'state',
        'latitude',
        'longitude',
        'allowed_radius_meters',
        'photo_path',
        'status',
        'remarks',
        'deleted_at',
    ] as $column) {
        expect(Schema::hasColumn('training_venues', $column))->toBeTrue("Missing column: {$column}");
    }
});

test('training venue index requires permission', function (): void {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('training-venues.index'))
        ->assertForbidden();
});

test('training venue index can be filtered and paginated', function (): void {
    $user = rcUser('training-venues.view');

    TrainingVenue::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Central Athletics Ground',
        'code' => 'CAG',
        'city' => 'Lucknow',
        'status' => 'active',
    ]);
    TrainingVenue::factory()->inactive()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Reserve Swimming Pool',
        'code' => 'RSP',
        'city' => 'Kanpur',
    ]);
    TrainingVenue::factory()->create([
        'name' => 'Other Org Ground',
        'code' => 'OOG',
        'city' => 'Noida',
        'status' => 'active',
    ]);

    $this->actingAs($user)
        ->get(route('training-venues.index', [
            'filter' => [
                'q' => 'central',
                'status' => 'active',
            ],
            'per_page' => 10,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-venues/index')
            ->where('filters.q', 'central')
            ->where('filters.status', 'active')
            ->where('perPage', 10)
            ->where('trainingVenues.total', 1)
            ->where('trainingVenues.data.0.name', 'Central Athletics Ground')
            ->where('statuses', ['active', 'inactive', 'under_review'])
            ->etc());
});

test('admin can create update view and delete training venue', function (): void {
    $user = rcUser(
        'training-venues.view',
        'training-venues.create',
        'training-venues.update',
        'training-venues.delete',
    );
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('training-venues.store'), [
            'name' => 'Central Athletics Ground',
            'code' => 'CAG',
            'address' => 'Reserve Police Lines',
            'unit_id' => $unit->id,
            'city' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'latitude' => 26.8467,
            'longitude' => 80.9462,
            'allowed_radius_meters' => 250,
            'status' => 'active',
            'remarks' => 'Main external training ground.',
        ])
        ->assertRedirect();

    $trainingVenue = TrainingVenue::query()->where('code', 'CAG')->firstOrFail();

    expect($trainingVenue->organization_id)->toBe($user->organization_id)
        ->and($trainingVenue->created_by)->toBe($user->id)
        ->and($trainingVenue->allowed_radius_meters)->toBe(250);

    $this->actingAs($user)
        ->get(route('training-venues.show', $trainingVenue))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-venues/show')
            ->where('trainingVenue.name', 'Central Athletics Ground'));

    $this->actingAs($user)
        ->patch(route('training-venues.update', $trainingVenue), [
            'name' => 'Central Athletics Ground Updated',
            'code' => 'CAG',
            'address' => 'Reserve Police Lines',
            'unit_id' => $unit->id,
            'city' => 'Lucknow',
            'state' => 'Uttar Pradesh',
            'latitude' => 26.8468,
            'longitude' => 80.9463,
            'allowed_radius_meters' => 300,
            'status' => 'active',
            'remarks' => 'Updated radius.',
        ])
        ->assertRedirect(route('training-venues.show', $trainingVenue));

    expect($trainingVenue->refresh()->allowed_radius_meters)->toBe(300);

    $this->actingAs($user)
        ->delete(route('training-venues.destroy', $trainingVenue))
        ->assertRedirect(route('training-venues.index'));

    $this->assertSoftDeleted($trainingVenue);
    expect(AuditLog::query()
        ->where('entity', 'TrainingVenue')
        ->where('entity_id', $trainingVenue->id)
        ->whereIn('action', ['created', 'updated', 'deleted'])
        ->count())->toBe(3);
});

test('active training venue requires latitude longitude and radius', function (): void {
    $user = rcUser('training-venues.view', 'training-venues.create');

    $this->actingAs($user)
        ->post(route('training-venues.store'), [
            'name' => 'Incomplete Active Venue',
            'allowed_radius_meters' => 0,
            'status' => 'active',
        ])
        ->assertSessionHasErrors(['latitude', 'longitude', 'allowed_radius_meters']);
});

test('inactive training venue can be saved without coordinates', function (): void {
    $user = rcUser('training-venues.view', 'training-venues.create');

    $this->actingAs($user)
        ->post(route('training-venues.store'), [
            'name' => 'Draft Ground',
            'allowed_radius_meters' => 200,
            'status' => 'inactive',
        ])
        ->assertRedirect();

    expect(TrainingVenue::query()->where('name', 'Draft Ground')->exists())->toBeTrue();
});

test('training venue route binding does not expose another organization records', function (): void {
    $user = rcUser('training-venues.view');
    $otherOrg = Organization::factory()->create();
    $trainingVenue = TrainingVenue::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->get(route('training-venues.show', $trainingVenue))
        ->assertNotFound();
});
