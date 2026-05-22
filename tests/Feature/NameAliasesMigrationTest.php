<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

test('name_aliases table is created by migration', function () {
    expect(Schema::hasTable('name_aliases'))->toBeTrue();
});

test('name_aliases table has all required columns', function () {
    $columns = ['id', 'member_id', 'alias_hi', 'alias_normalized', 'source', 'created_at', 'updated_at'];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('name_aliases', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});
