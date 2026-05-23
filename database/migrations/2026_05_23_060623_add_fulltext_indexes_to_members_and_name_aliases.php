<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds FULLTEXT indexes with the ngram parser on the two normalized-name
     * columns used by the Phase-2 member search endpoint (T13).
     *
     * ngram_token_size=2 (server default) is used — no config change needed.
     *
     * NOTE: MySQL-only — silently skipped on other drivers (e.g. SQLite in tests).
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared(
            'ALTER TABLE members ADD FULLTEXT INDEX ft_full_name_norm (full_name_normalized) WITH PARSER ngram'
        );

        DB::unprepared(
            'ALTER TABLE name_aliases ADD FULLTEXT INDEX ft_alias_norm (alias_normalized) WITH PARSER ngram'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('ALTER TABLE name_aliases DROP INDEX ft_alias_norm');
        DB::unprepared('ALTER TABLE members DROP INDEX ft_full_name_norm');
    }
};
