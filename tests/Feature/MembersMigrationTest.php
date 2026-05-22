<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

test('members table is created by migration', function () {
    expect(Schema::hasTable('members'))->toBeTrue();
});

test('members table has all required columns', function () {
    $columns = [
        'id', 'organization_id',
        'member_code', 'pno',
        'full_name_hi', 'full_name_en', 'full_name_normalized',
        'father_name_hi', 'rank',
        'gender', 'dob', 'joining_date', 'mobile',
        'home_district_id', 'current_unit_id',
        'player_category', 'player_level', 'current_status',
        'source_refs',
        'deleted_at', 'created_at', 'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('members', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});
