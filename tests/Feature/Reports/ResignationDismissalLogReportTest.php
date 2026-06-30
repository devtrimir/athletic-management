<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\Organization;
use App\Models\Unit;
use App\Services\Reports\ResignationDismissalLogReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rdOrg(): Organization
{
    return Organization::factory()->create();
}

function rdMember(Organization $org, string $status = 'RESIGNED', ?Unit $unit = null): Member
{
    return Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => $status,
        'current_unit_id' => $unit?->id,
    ]);
}

function rdHistory(Member $member, string $status, string $effectiveOn = '2024-06-01'): MemberStatusHistory
{
    return MemberStatusHistory::factory()->create([
        'member_id' => $member->id,
        'status' => $status,
        'effective_on' => $effectiveOn,
    ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('returns empty when no resigned or dismissed members', function (): void {
    $org = rdOrg();

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], null, null, null);

    expect($result)->toBeEmpty();
});

test('returns resigned member with pno and effective_on', function (): void {
    $org = rdOrg();
    $member = rdMember($org, 'RESIGNED');
    rdHistory($member, 'RESIGNED', '2024-03-15');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], null, null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['member_code'])->toBe($member->member_code);
    expect($result[0]['pno'])->toBe($member->pno);
    expect($result[0]['current_status'])->toBe('RESIGNED');
    expect($result[0]['effective_on'])->toBe('2024-03-15');
});

test('returns dismissed member', function (): void {
    $org = rdOrg();
    $member = rdMember($org, 'DISMISSED');
    rdHistory($member, 'DISMISSED', '2023-11-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], null, null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['current_status'])->toBe('DISMISSED');
});

test('filters by status=RESIGNED excludes dismissed', function (): void {
    $org = rdOrg();

    $r = rdMember($org, 'RESIGNED');
    rdHistory($r, 'RESIGNED', '2024-01-01');

    $d = rdMember($org, 'DISMISSED');
    rdHistory($d, 'DISMISSED', '2024-01-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], null, null, 'RESIGNED');

    expect($result)->toHaveCount(1);
    expect($result[0]['current_status'])->toBe('RESIGNED');
});

test('filters by from_date', function (): void {
    $org = rdOrg();

    $early = rdMember($org, 'RESIGNED');
    rdHistory($early, 'RESIGNED', '2023-01-01');

    $late = rdMember($org, 'RESIGNED');
    rdHistory($late, 'RESIGNED', '2024-06-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], '2024-01-01', null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['effective_on'])->toBe('2024-06-01');
});

test('filters by to_date', function (): void {
    $org = rdOrg();

    $early = rdMember($org, 'RESIGNED');
    rdHistory($early, 'RESIGNED', '2022-05-10');

    $late = rdMember($org, 'RESIGNED');
    rdHistory($late, 'RESIGNED', '2025-09-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, [], null, '2023-01-01', null);

    expect($result)->toHaveCount(1);
    expect($result[0]['effective_on'])->toBe('2022-05-10');
});

test('filters by unit_id', function (): void {
    $org = rdOrg();
    $unitA = Unit::factory()->create(['organization_id' => $org->id]);
    $unitB = Unit::factory()->create(['organization_id' => $org->id]);

    $inUnit = rdMember($org, 'RESIGNED', $unitA);
    rdHistory($inUnit, 'RESIGNED', '2024-01-01');

    $outUnit = rdMember($org, 'RESIGNED', $unitB);
    rdHistory($outUnit, 'RESIGNED', '2024-01-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, ['unit_id' => $unitA->id], null, null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['unit']['id'])->toBe($unitA->id);
});

test('filters by member_name', function (): void {
    $org = rdOrg();

    $matchingMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RESIGNED',
        'full_name' => 'Amit Kumar',
    ]);
    rdHistory($matchingMember, 'RESIGNED', '2024-01-01');

    $otherMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RESIGNED',
        'full_name' => 'Rahul Singh',
    ]);
    rdHistory($otherMember, 'RESIGNED', '2024-01-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, ['member_name' => 'Amit'], null, null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['full_name'])->toBe('Amit Kumar');
});

test('filters by pno', function (): void {
    $org = rdOrg();

    $matchingMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RESIGNED',
        'pno' => 'PNO-1001',
    ]);
    rdHistory($matchingMember, 'RESIGNED', '2024-01-01');

    $otherMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RESIGNED',
        'pno' => 'PNO-2002',
    ]);
    rdHistory($otherMember, 'RESIGNED', '2024-01-01');

    $result = app(ResignationDismissalLogReport::class)->run($org->id, ['pno' => '1001'], null, null, null);

    expect($result)->toHaveCount(1);
    expect($result[0]['pno'])->toBe('PNO-1001');
});

test('does not leak across organisations', function (): void {
    $orgA = rdOrg();
    $orgB = rdOrg();

    $m = rdMember($orgB, 'RESIGNED');
    rdHistory($m, 'RESIGNED', '2024-01-01');

    $result = app(ResignationDismissalLogReport::class)->run($orgA->id, [], null, null, null);

    expect($result)->toBeEmpty();
});
