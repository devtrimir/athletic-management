<?php

declare(strict_types=1);

use App\Models\Organization;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('coaches table is created by migration', function () {
    expect(Schema::hasTable('coaches'))->toBeTrue();
});

test('coaches table has all required columns', function () {
    $columns = [
        'id', 'organization_id', 'member_id',
        'full_name', 'full_name',
        'pno', 'mobile',
        'deleted_at', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('coaches', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('nis_certified column is dropped while nis_master_id is kept', function () {
    expect(Schema::hasColumn('coaches', 'nis_certified'))->toBeFalse();
    expect(Schema::hasColumn('coaches', 'nis_master_id'))->toBeTrue();
});

test('coach_certifications table has attachment meta columns', function () {
    expect(Schema::hasTable('coach_certifications'))->toBeTrue();

    $columns = ['attachment_path', 'attachment_original_name', 'mime_type', 'size_bytes'];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('coach_certifications', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('pno is nullable', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name' => 'राम प्रसाद',
        'pno' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('coaches')->where('organization_id', $org->id)->count())->toBe(1);
});

test('duplicate pno in same org is rejected', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name' => 'राम प्रसाद',
        'pno' => '980123456',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(fn () => DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name' => 'श्याम लाल',
        'pno' => '980123456',
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});

test('multiple coaches with null pno in same org are allowed', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        ['organization_id' => $org->id, 'full_name' => 'कोच एक', 'pno' => null, 'created_at' => now(), 'updated_at' => now()],
        ['organization_id' => $org->id, 'full_name' => 'कोच दो', 'pno' => null, 'created_at' => now(), 'updated_at' => now()],
    ]);

    expect(DB::table('coaches')->where('organization_id', $org->id)->count())->toBe(2);
});

test('member_id is nullable', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name' => 'स्वतंत्र कोच',
        'member_id' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('coaches')->where('member_id', null)->count())->toBeGreaterThanOrEqual(1);
});
