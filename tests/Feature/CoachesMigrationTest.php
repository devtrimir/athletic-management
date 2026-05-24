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
        'full_name_hi', 'full_name_en',
        'pno', 'mobile', 'nis_certified',
        'deleted_at', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('coaches', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('pno is nullable', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name_hi' => 'राम प्रसाद',
        'pno' => null,
        'nis_certified' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('coaches')->where('organization_id', $org->id)->count())->toBe(1);
});

test('duplicate pno in same org is rejected', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name_hi' => 'राम प्रसाद',
        'pno' => '980123456',
        'nis_certified' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(fn () => DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name_hi' => 'श्याम लाल',
        'pno' => '980123456',
        'nis_certified' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});

test('multiple coaches with null pno in same org are allowed', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        ['organization_id' => $org->id, 'full_name_hi' => 'कोच एक', 'pno' => null, 'nis_certified' => false, 'created_at' => now(), 'updated_at' => now()],
        ['organization_id' => $org->id, 'full_name_hi' => 'कोच दो', 'pno' => null, 'nis_certified' => false, 'created_at' => now(), 'updated_at' => now()],
    ]);

    expect(DB::table('coaches')->where('organization_id', $org->id)->count())->toBe(2);
});

test('member_id is nullable', function () {
    $org = Organization::factory()->create();

    DB::table('coaches')->insert([
        'organization_id' => $org->id,
        'full_name_hi' => 'स्वतंत्र कोच',
        'member_id' => null,
        'nis_certified' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('coaches')->where('member_id', null)->count())->toBeGreaterThanOrEqual(1);
});
