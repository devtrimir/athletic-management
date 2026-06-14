<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

$isMysql = fn () => DB::connection()->getDriverName() === 'mysql';

// Helpers — bypass Eloquent global scopes; use raw DB queries
function insertOrg(): int
{
    return DB::table('organizations')->insertGetId([
        'name' => 'Test Org',
        'code' => 'TST'.fake()->unique()->numerify('##'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function insertMember(int $orgId, string $fullNameHi): int
{
    return DB::table('members')->insertGetId([
        'organization_id' => $orgId,
        'member_code' => 'UPP-2026-'.fake()->unique()->numerify('######'),
        'full_name' => $fullNameHi,
        'gender' => 'M',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
        'current_status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

test('trigger populates full_name_normalized on member insert', function () {
    $orgId = insertOrg();
    $id = insertMember($orgId, 'रामप्रसाद शर्मा');

    $row = DB::table('members')->where('id', $id)->first();
    expect($row->full_name_normalized)->not->toBeNull();
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('trigger re-populates full_name_normalized on member update', function () {
    $orgId = insertOrg();
    $id = insertMember($orgId, 'पुराना नाम');

    DB::table('members')->where('id', $id)->update(['full_name' => 'नया नाम']);

    $row = DB::table('members')->where('id', $id)->first();
    expect($row->full_name_normalized)->toBe('नया नाम');
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('rank prefix मु.आ. is stripped from normalized name', function () {
    $orgId = insertOrg();
    $id = insertMember($orgId, 'मु.आ. रामप्रसाद');

    $row = DB::table('members')->where('id', $id)->first();
    expect($row->full_name_normalized)->toBe('रामप्रसाद');
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('rank prefix आ. is stripped from normalized name', function () {
    $orgId = insertOrg();
    $id = insertMember($orgId, 'आ. सुरेश कुमार');

    $row = DB::table('members')->where('id', $id)->first();
    expect($row->full_name_normalized)->toBe('सुरेश कुमार');
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('ZWNJ character is stripped from normalized name', function () {
    $orgId = insertOrg();
    $nameWithZwnj = "खिलाड\u{200C}ी";
    $id = insertMember($orgId, $nameWithZwnj);

    $row = DB::table('members')->where('id', $id)->first();
    expect($row->full_name_normalized)->toBe('खिलाडी');
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('trigger populates alias_normalized on name_alias insert', function () {
    $orgId = insertOrg();
    $memberId = insertMember($orgId, 'सिद्धान्त सेठ');

    DB::table('name_aliases')->insert([
        'member_id' => $memberId,
        'alias' => 'fl)kUr lsB',
        'source' => 'krutidev',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $alias = DB::table('name_aliases')->where('member_id', $memberId)->first();
    expect($alias->alias_normalized)->not->toBeNull();
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');

test('function and triggers exist in information_schema', function () {
    $triggers = DB::select("
        SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND TRIGGER_NAME LIKE 'trg_%normalize%'
    ");
    expect($triggers)->toHaveCount(4);

    $fn = DB::select("
        SELECT ROUTINE_NAME FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = DATABASE()
          AND ROUTINE_NAME = 'normalize_devanagari'
    ");
    expect($fn)->toHaveCount(1);
})->skip(fn () => ! (DB::connection()->getDriverName() === 'mysql'), 'MySQL-only: triggers require MySQL');
