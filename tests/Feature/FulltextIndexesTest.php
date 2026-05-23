<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

test('members table has ft_full_name_norm fulltext index with ngram parser', function () {
    $rows = DB::select("
        SHOW INDEX FROM members
        WHERE Key_name = 'ft_full_name_norm'
    ");

    expect($rows)->toHaveCount(1);
    expect((array) $rows[0])->toMatchArray([
        'Index_type' => 'FULLTEXT',
        'Column_name' => 'full_name_normalized',
    ]);

    // MySQL 8.0 Comment is empty for built-in parsers; verify ngram via CREATE TABLE
    $ddl = DB::select('SHOW CREATE TABLE members')[0]->{'Create Table'};
    expect($ddl)->toContain('ft_full_name_norm');
    expect($ddl)->toContain('ngram');
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'MySQL-only: FULLTEXT requires MySQL');

test('name_aliases table has ft_alias_norm fulltext index with ngram parser', function () {
    $rows = DB::select("
        SHOW INDEX FROM name_aliases
        WHERE Key_name = 'ft_alias_norm'
    ");

    expect($rows)->toHaveCount(1);
    expect((array) $rows[0])->toMatchArray([
        'Index_type' => 'FULLTEXT',
        'Column_name' => 'alias_normalized',
    ]);

    // MySQL 8.0 Comment is empty for built-in parsers; verify ngram via CREATE TABLE
    $ddl = DB::select('SHOW CREATE TABLE name_aliases')[0]->{'Create Table'};
    expect($ddl)->toContain('ft_alias_norm');
    expect($ddl)->toContain('ngram');
})->skip(fn () => DB::connection()->getDriverName() !== 'mysql', 'MySQL-only: FULLTEXT requires MySQL');

// NOTE: MATCH AGAINST functional test lives in T13 (MemberSearchTest) because
// InnoDB FULLTEXT does not return uncommitted rows — incompatible with the
// RefreshDatabase transaction wrapper used here.
