<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\Incharge;
use App\Models\Organization;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use Illuminate\Support\Facades\Schema;

test('incharges table exists with required columns', function (): void {
    expect(Schema::hasTable('incharges'))->toBeTrue();

    foreach (['organization_id', 'full_name', 'pno', 'rank', 'designation', 'mobile', 'email', 'is_active', 'remarks', 'deleted_at'] as $column) {
        expect(Schema::hasColumn('incharges', $column))->toBeTrue();
    }
});

test('incharge index requires permission', function (): void {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('incharges.index'))
        ->assertForbidden();
});

test('can create update and view an incharge profile', function (): void {
    $user = rcUser('incharges.view', 'incharges.create', 'incharges.update');

    $this->actingAs($user)
        ->post(route('incharges.store'), [
            'full_name' => 'Asha Singh',
            'pno' => 'PNO-100',
            'rank' => 'Inspector',
            'mobile' => '9999999999',
            'email' => 'asha@example.com',
            'is_active' => true,
            'remarks' => 'Handles multiple teams.',
        ])
        ->assertRedirect();

    $incharge = Incharge::query()->where('pno', 'PNO-100')->firstOrFail();

    expect($incharge->organization_id)->toBe($user->organization_id)
        ->and($incharge->full_name)->toBe('Asha Singh');

    $this->actingAs($user)
        ->patch(route('incharges.update', $incharge), [
            'full_name' => 'Asha Kumari',
            'pno' => 'PNO-100',
            'rank' => 'Inspector',
            'mobile' => '8888888888',
            'email' => 'asha.kumari@example.com',
            'is_active' => false,
            'remarks' => 'Updated.',
        ])
        ->assertRedirect(route('incharges.show', $incharge));

    expect($incharge->refresh()->full_name)->toBe('Asha Kumari')
        ->and($incharge->is_active)->toBeFalse();

    $this->actingAs($user)
        ->get(route('incharges.show', $incharge))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('incharges/show')
            ->where('activeTab', 'overview')
            ->where('incharge.full_name', 'Asha Kumari')
            ->has('summary')
            ->missing('assignments')
            ->missing('auditLog')
        );
});

test('incharge store validates required and unique pno fields', function (): void {
    $user = rcUser('incharges.view', 'incharges.create');
    Incharge::factory()->create(['organization_id' => $user->organization_id, 'pno' => 'PNO-100']);

    $this->actingAs($user)
        ->post(route('incharges.store'), [
            'full_name' => '',
            'pno' => 'PNO-100',
        ])
        ->assertSessionHasErrors(['full_name', 'pno']);
});

test('incharge profile tab routes return focused payloads', function (): void {
    $user = rcUser('incharges.view');
    $organization = Organization::findOrFail($user->organization_id);
    $incharge = Incharge::factory()->forOrganization($organization)->create();
    $team = Team::factory()->forOrganization($organization)->create();

    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => $incharge->id,
        'full_name' => $incharge->full_name,
        'pno' => $incharge->pno,
    ]);

    $this->actingAs($user)
        ->get(route('incharges.teams', $incharge))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('incharges/show')
            ->where('activeTab', 'teams')
            ->has('assignments', 1)
            ->missing('auditLog')
        );

    AuditLog::create([
        'user_id' => $user->id,
        'organization_id' => $user->organization_id,
        'entity' => 'Incharge',
        'entity_id' => $incharge->id,
        'action' => 'updated',
        'diff' => ['old' => ['full_name' => 'Old'], 'new' => ['full_name' => $incharge->full_name]],
        'at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('incharges.changelog', $incharge))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('incharges/show')
            ->where('activeTab', 'changelog')
            ->has('auditLog')
            ->missing('assignments')
        );
});

test('incharge routes do not expose another organization records', function (): void {
    $user = rcUser('incharges.view');
    $otherOrg = Organization::factory()->create();
    $incharge = Incharge::withoutGlobalScopes()->create(
        Incharge::factory()->make(['organization_id' => $otherOrg->id])->getAttributes()
    );

    $this->actingAs($user)
        ->get(route('incharges.show', $incharge))
        ->assertNotFound();
});

test('can soft delete an incharge', function (): void {
    $user = rcUser('incharges.view', 'incharges.delete');
    $incharge = Incharge::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->delete(route('incharges.destroy', $incharge))
        ->assertRedirect(route('incharges.index'));

    $this->assertSoftDeleted($incharge);
});
