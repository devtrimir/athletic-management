<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\District;
use App\Models\Organization;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->org = Organization::factory()->create(['code' => 'UPP', 'name' => 'UP Police Sports Unit']);

    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);
    $this->admin = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);
    DB::table('user_role')->insert([
        'user_id' => $this->admin->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);
});

// ── Store payload helper ───────────────────────────────────────────────────────

/**
 * @return array{route: string, payload: array<string, mixed>}
 */
function storeCase(string $resource, int $orgId): array
{
    return match ($resource) {
        'Sport' => [
            'route' => 'sports.store',
            'payload' => [
                'organization_id' => $orgId,
                'name' => 'हॉकी',
                'name' => 'Hockey',
                'category' => 'TEAM',
            ],
        ],
        'SportSession' => [
            'route' => 'sessions.store',
            'payload' => [
                'organization_id' => $orgId,
                'name' => '2024-25',
                'start_year' => 2024,
                'end_year' => 2025,
                'is_current' => false,
            ],
        ],
        'Unit' => [
            'route' => 'units.store',
            'payload' => [
                'organization_id' => $orgId,
                'name' => 'मुख्यालय',
                'name' => 'Headquarters',
                'unit_type' => 'HQ',
            ],
        ],
        'District' => [
            'route' => 'districts.store',
            'payload' => [
                'name' => 'लखनऊ',
                'name' => 'Lucknow',
                'state' => 'Uttar Pradesh',
                'code' => 'LKO',
            ],
        ],
        'TournamentTier' => [
            'route' => 'tournament-tiers.store',
            'payload' => [
                'code' => 'ZONAL',
                'label_hi' => 'ज़ोनल',
                'label_en' => 'Zonal',
                'weight' => 40,
            ],
        ],
        default => throw new InvalidArgumentException("Unknown resource: $resource"),
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('store fires a created audit log', function (string $resource): void {
    $case = storeCase($resource, $this->org->id);

    $this->actingAs($this->admin)
        ->post(route($case['route']), $case['payload'])
        ->assertRedirect();

    $log = AuditLog::where('entity', $resource)
        ->where('action', 'created')
        ->where('user_id', $this->admin->id)
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->entity_id)->not->toBeNull();
})->with(['Sport', 'SportSession', 'Unit', 'District', 'TournamentTier']);

test('update fires an updated audit log with a diff', function (string $resource): void {
    [$model, $updateRoute, $updatePayload, $changedField, $changedValue] = match ($resource) {
        'Sport' => [
            Sport::factory()->create(['organization_id' => $this->org->id, 'name' => 'हॉकी', 'category' => 'TEAM']),
            'sports.update',
            ['organization_id' => $this->org->id, 'name' => 'Hockey Updated', 'category' => 'TEAM'],
            'name',
            'Hockey Updated',
        ],
        'SportSession' => [
            SportSession::factory()->create(['organization_id' => $this->org->id, 'name' => '2024-25', 'start_year' => 2024, 'end_year' => 2025, 'is_current' => false]),
            'sessions.update',
            ['organization_id' => $this->org->id, 'name' => '2025-26', 'start_year' => 2025, 'end_year' => 2026, 'is_current' => false],
            'name',
            '2025-26',
        ],
        'Unit' => [
            Unit::factory()->create(['organization_id' => $this->org->id, 'name' => 'मुख्यालय', 'unit_type' => 'HQ']),
            'units.update',
            ['organization_id' => $this->org->id, 'name' => 'HQ Unit Updated', 'unit_type' => 'HQ'],
            'name',
            'HQ Unit Updated',
        ],
        'District' => [
            District::factory()->create(['name' => 'लखनऊ', 'state' => 'Uttar Pradesh', 'code' => 'LKO']),
            'districts.update',
            ['name' => 'Lucknow Updated', 'state' => 'Uttar Pradesh', 'code' => 'LKO'],
            'name',
            'Lucknow Updated',
        ],
        'TournamentTier' => [
            TournamentTier::factory()->create(['code' => 'ZONAL', 'label_en' => 'Zonal', 'label_hi' => 'ज़ोनल', 'weight' => 40]),
            'tournament-tiers.update',
            ['code' => 'ZONAL', 'label_hi' => 'ज़ोनल', 'label_en' => 'Zonal Updated', 'weight' => 40],
            'label_en',
            'Zonal Updated',
        ],
        default => throw new InvalidArgumentException("Unknown resource: $resource"),
    };

    $this->actingAs($this->admin)
        ->patch(route($updateRoute, $model), $updatePayload)
        ->assertRedirect();

    $log = AuditLog::where('entity', $resource)
        ->where('entity_id', $model->id)
        ->where('action', 'updated')
        ->where('user_id', $this->admin->id)
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->diff)->toHaveKey('old')
        ->and($log->diff)->toHaveKey('new')
        ->and($log->diff['new'][$changedField])->toBe($changedValue);
})->with(['Sport', 'SportSession', 'Unit', 'District', 'TournamentTier']);

test('destroy fires a deleted audit log', function (string $resource): void {
    [$model, $destroyRoute] = match ($resource) {
        'Sport' => [
            Sport::factory()->create(['organization_id' => $this->org->id]),
            'sports.destroy',
        ],
        'SportSession' => [
            SportSession::factory()->create(['organization_id' => $this->org->id]),
            'sessions.destroy',
        ],
        'Unit' => [
            Unit::factory()->create(['organization_id' => $this->org->id]),
            'units.destroy',
        ],
        'District' => [
            District::factory()->create(),
            'districts.destroy',
        ],
        'TournamentTier' => [
            TournamentTier::factory()->create(),
            'tournament-tiers.destroy',
        ],
        default => throw new InvalidArgumentException("Unknown resource: $resource"),
    };

    $modelId = $model->id;

    $this->actingAs($this->admin)
        ->delete(route($destroyRoute, $model))
        ->assertRedirect();

    $log = AuditLog::where('entity', $resource)
        ->where('entity_id', $modelId)
        ->where('action', 'deleted')
        ->where('user_id', $this->admin->id)
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->diff)->not->toBeNull();
})->with(['Sport', 'SportSession', 'Unit', 'District', 'TournamentTier']);
