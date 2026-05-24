<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Unit;
use App\Services\Reports\UnitHeadcountReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hcOrg(): Organization
{
    return Organization::factory()->create();
}

function hcUnit(Organization $org): Unit
{
    return Unit::factory()->create(['organization_id' => $org->id]);
}

function hcMember(Organization $org, Unit $unit, string $category = 'GD', string $status = 'ACTIVE'): Member
{
    return Member::factory()->create([
        'organization_id' => $org->id,
        'current_unit_id' => $unit->id,
        'player_category' => $category,
        'current_status' => $status,
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('unit with no members returns zeros', function (): void {
    $org = hcOrg();
    $unit = hcUnit($org);

    $result = app(UnitHeadcountReport::class)->run($org->id, []);

    expect($result)->toHaveCount(1);
    expect($result[0]['total'])->toBe(0);
    expect($result[0]['GD'])->toBe(0);
    expect($result[0]['SKILLED'])->toBe(0);
});

test('counts GD and SKILLED members correctly', function (): void {
    $org = hcOrg();
    $unit = hcUnit($org);

    hcMember($org, $unit, 'GD');
    hcMember($org, $unit, 'GD');
    hcMember($org, $unit, 'SKILLED');

    $result = app(UnitHeadcountReport::class)->run($org->id, []);

    expect($result[0]['total'])->toBe(3);
    expect($result[0]['GD'])->toBe(2);
    expect($result[0]['SKILLED'])->toBe(1);
});

test('excludes non-ACTIVE members from count', function (): void {
    $org = hcOrg();
    $unit = hcUnit($org);

    hcMember($org, $unit, 'GD', 'ACTIVE');
    hcMember($org, $unit, 'GD', 'RESIGNED');
    hcMember($org, $unit, 'GD', 'DISMISSED');

    $result = app(UnitHeadcountReport::class)->run($org->id, []);

    expect($result[0]['total'])->toBe(1);
});

test('excludes soft-deleted members', function (): void {
    $org = hcOrg();
    $unit = hcUnit($org);
    $member = hcMember($org, $unit, 'GD');
    $member->delete();

    $result = app(UnitHeadcountReport::class)->run($org->id, []);

    expect($result[0]['total'])->toBe(0);
});

test('returns all units for org ordered by unit_type then name', function (): void {
    $org = hcOrg();
    $unitA = Unit::factory()->create(['organization_id' => $org->id, 'unit_type' => 'GRP']);
    $unitB = Unit::factory()->create(['organization_id' => $org->id, 'unit_type' => 'PAC']);

    $result = app(UnitHeadcountReport::class)->run($org->id, []);

    expect($result)->toHaveCount(2);
    // GRP comes before PAC alphabetically
    expect($result[0]['unit']['unit_type'])->toBe('GRP');
});

test('filters by unit_id returns single unit', function (): void {
    $org = hcOrg();
    $unitA = hcUnit($org);
    $unitB = hcUnit($org);
    hcMember($org, $unitA);

    $result = app(UnitHeadcountReport::class)->run($org->id, ['unit_id' => $unitA->id]);

    expect($result)->toHaveCount(1);
    expect($result[0]['unit']['id'])->toBe($unitA->id);
});

test('does not leak across organisations', function (): void {
    $orgA = hcOrg();
    $orgB = hcOrg();
    $unit = hcUnit($orgB);
    hcMember($orgB, $unit);

    $result = app(UnitHeadcountReport::class)->run($orgA->id, []);

    expect($result)->toBeEmpty();
});
