<?php

use App\Console\Commands\FixPostgresSequences;
use Illuminate\Support\Facades\DB;

test('it warns and fails on non pgsql connections', function () {
    config(['database.default' => 'sqlite']);

    $this->artisan(FixPostgresSequences::class)
        ->expectsOutputToContain('only applies to PostgreSQL')
        ->assertFailed();
});

test('it syncs sequences with the max column value on pgsql', function () {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Requires a PostgreSQL database connection.');
    }

    $this->artisan(FixPostgresSequences::class)
        ->expectsOutputToContain('Synced')
        ->assertSuccessful();

    $columns = DB::select(
        "SELECT table_name, column_name, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND column_default LIKE 'nextval%'"
    );

    expect($columns)->not->toBeEmpty();

    foreach ($columns as $column) {
        preg_match("/nextval\('([^']+)'::regclass\)/", $column->column_default, $matches);

        $sequenceName = str_contains($matches[1], '.')
            ? substr($matches[1], (int) strrpos($matches[1], '.') + 1)
            : $matches[1];

        $maxId = DB::selectOne("SELECT COALESCE(MAX(\"{$column->column_name}\"), 0) AS max_id FROM \"{$column->table_name}\"")->max_id;
        $lastValue = DB::selectOne('SELECT last_value FROM "'.$sequenceName.'"')->last_value;

        expect((int) $lastValue)->toBeGreaterThanOrEqual((int) $maxId);
    }
});
