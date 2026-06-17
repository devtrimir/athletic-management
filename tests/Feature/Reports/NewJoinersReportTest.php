<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\SportSession;
use App\Models\Unit;
use App\Services\Reports\NewJoinersReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function njOrg(): Organization
{
    return Organization::factory()->create();
}

function njUnit(Organization $org): Unit
{
    return Unit::factory()->create(['organization_id' => $org->id]);
}

function njMember(Organization $org, ?Unit $unit = null, ?string $joiningDate = '2026-04-01'): Member
{
    return Member::factory()->create([
        'organization_id' => $org->id,
        'current_unit_id' => $unit?->id,
        'joining_date' => $joiningDate,
        'current_status' => 'ACTIVE',
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns member whose joining_date is within range', function (): void {
    $org = njOrg();
    njMember($org, joiningDate: '2026-04-15');

    $result = app(NewJoinersReport::class)->run($org->id, [
        'from_date' => '2026-04-01',
        'to_date' => '2026-04-30',
    ]);

    expect($result)->toHaveCount(1);
    expect($result[0]['joining_date'])->toBe('2026-04-15');
});

test('excludes member with joining_date outside range', function (): void {
    $org = njOrg();
    njMember($org, joiningDate: '2025-01-01');

    $result = app(NewJoinersReport::class)->run($org->id, [
        'from_date' => '2026-04-01',
        'to_date' => '2026-04-30',
    ]);

    expect($result)->toBeEmpty();
});

test('excludes soft-deleted members', function (): void {
    $org = njOrg();
    njMember($org, joiningDate: '2026-04-10')->delete();

    $result = app(NewJoinersReport::class)->run($org->id, [
        'from_date' => '2026-04-01',
        'to_date' => '2026-04-30',
    ]);

    expect($result)->toBeEmpty();
});

test('excludes members with null joining_date', function (): void {
    $org = njOrg();
    njMember($org, joiningDate: null);

    $result = app(NewJoinersReport::class)->run($org->id, []);

    expect($result)->toBeEmpty();
});

test('unit_id filter narrows to that unit only', function (): void {
    $org = njOrg();
    $unitA = njUnit($org);
    $unitB = njUnit($org);

    njMember($org, $unitA, '2026-04-01');
    njMember($org, $unitB, '2026-04-02');

    $result = app(NewJoinersReport::class)->run($org->id, ['unit_id' => $unitA->id]);

    expect($result)->toHaveCount(1);
    expect($result[0]['unit']['id'])->toBe($unitA->id);
});

test('session_id filter derives date range from sport_sessions', function (): void {
    $org = njOrg();
    $session = SportSession::factory()->create([
        'organization_id' => $org->id,
        'start_year' => 2026,
        'end_year' => 2027,
    ]);

    njMember($org, joiningDate: '2026-06-01'); // inside
    njMember($org, joiningDate: '2025-12-31'); // outside

    $result = app(NewJoinersReport::class)->run($org->id, ['session_id' => $session->id]);

    expect($result)->toHaveCount(1);
    expect($result[0]['joining_date'])->toBe('2026-06-01');
});

test('results ordered by joining_date then full_name', function (): void {
    $org = njOrg();
    njMember($org, joiningDate: '2026-04-10');
    njMember($org, joiningDate: '2026-04-05');

    $result = app(NewJoinersReport::class)->run($org->id, [
        'from_date' => '2026-04-01',
        'to_date' => '2026-04-30',
    ]);

    expect($result[0]['joining_date'])->toBe('2026-04-05');
    expect($result[1]['joining_date'])->toBe('2026-04-10');
});

test('org isolation — other org members not returned', function (): void {
    $orgA = njOrg();
    $orgB = njOrg();

    njMember($orgA, joiningDate: '2026-04-01');
    njMember($orgB, joiningDate: '2026-04-01');

    $result = app(NewJoinersReport::class)->run($orgA->id, []);

    expect($result)->toHaveCount(1);
});
