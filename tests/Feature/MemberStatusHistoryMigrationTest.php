<?php

declare(strict_types=1);

use App\Models\MemberStatusHistory;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('member_status_history table is created by migration', function () {
    expect(Schema::hasTable('member_status_history'))->toBeTrue();
});

test('member_status_history table has all required columns', function () {
    $columns = ['id', 'member_id', 'status', 'effective_on', 'reason', 'recorded_by', 'created_at', 'updated_at'];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('member_status_history', $column))
            ->toBeTrue("Missing column: {$column}");
    }
});

test('member_status_history status rejects invalid values', function () {
    $history = MemberStatusHistory::factory()->create();

    expect(fn () => DB::table('member_status_history')->where('id', $history->id)->update(['status' => 'INVALID']))
        ->toThrow(QueryException::class);
});
