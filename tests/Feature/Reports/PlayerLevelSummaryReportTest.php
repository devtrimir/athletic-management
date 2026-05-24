<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Unit;
use App\Services\Reports\PlayerLevelSummaryReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plOrg(): Organization
{
    return Organization::factory()->create();
}

function plUnit(Organization $org): Unit
{
    return Unit::factory()->create(['organization_id' => $org->id]);
}

function plMember(Organization $org, ?Unit $unit = null, string $level = 'ZONAL', string $status = 'ACTIVE'): Member
{
    return Member::factory()->create([
        'organization_id' => $org->id,
        'current_unit_id' => $unit?->id,
        'player_level' => $level,
        'current_status' => $status,
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns only present levels with correct counts', function (): void {
    $org = plOrg();
    plMember($org, level: 'ZONAL');
    plMember($org, level: 'ZONAL');
    plMember($org, level: 'NATIONAL');

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, []);

    expect($result)->toHaveCount(2);
    expect($result[0])->toMatchArray(['player_level' => 'ZONAL', 'total' => 2]);
    expect($result[1])->toMatchArray(['player_level' => 'NATIONAL', 'total' => 1]);
});

test('orders by canonical level sequence ZONAL → NATIONAL → INTERNATIONAL → AIPSC', function (): void {
    $org = plOrg();
    plMember($org, level: 'AIPSC');
    plMember($org, level: 'INTERNATIONAL');
    plMember($org, level: 'NATIONAL');
    plMember($org, level: 'ZONAL');

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, []);
    $levels = $result->pluck('player_level')->all();

    expect($levels)->toBe(['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC']);
});

test('excludes non-ACTIVE members', function (): void {
    $org = plOrg();
    plMember($org, level: 'ZONAL', status: 'ACTIVE');
    plMember($org, level: 'ZONAL', status: 'RESIGNED');
    plMember($org, level: 'NATIONAL', status: 'DISMISSED');

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, []);

    expect($result)->toHaveCount(1);
    expect($result[0])->toMatchArray(['player_level' => 'ZONAL', 'total' => 1]);
});

test('excludes soft-deleted members', function (): void {
    $org = plOrg();
    plMember($org, level: 'ZONAL');
    plMember($org, level: 'NATIONAL')->delete();

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, []);

    expect($result)->toHaveCount(1);
    expect($result[0]['player_level'])->toBe('ZONAL');
});

test('returns empty collection when no qualifying members exist', function (): void {
    $org = plOrg();

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, []);

    expect($result)->toBeEmpty();
});

test('unit_id filter narrows results to that unit only', function (): void {
    $org = plOrg();
    $unitA = plUnit($org);
    $unitB = plUnit($org);

    plMember($org, $unitA, 'ZONAL');
    plMember($org, $unitB, 'NATIONAL');

    $result = app(PlayerLevelSummaryReport::class)->run($org->id, ['unit_id' => $unitA->id]);

    expect($result)->toHaveCount(1);
    expect($result[0])->toMatchArray(['player_level' => 'ZONAL', 'total' => 1]);
});

test('org isolation — other org members not counted', function (): void {
    $orgA = plOrg();
    $orgB = plOrg();

    plMember($orgA, level: 'ZONAL');
    plMember($orgB, level: 'NATIONAL');

    $result = app(PlayerLevelSummaryReport::class)->run($orgA->id, []);

    expect($result)->toHaveCount(1);
    expect($result[0]['player_level'])->toBe('ZONAL');
});
