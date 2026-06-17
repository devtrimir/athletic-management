<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $mysqlDrivers = ['mysql', 'mariadb'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! $this->isMySqlDriver()) {
            return;
        }

        DB::unprepared('DROP FUNCTION IF EXISTS normalize_devanagari');
        DB::unprepared(<<<'SQL'
            CREATE FUNCTION normalize_devanagari(p_text TEXT)
            RETURNS TEXT
            DETERMINISTIC
            BEGIN
                DECLARE v_text TEXT;
                SET v_text = CONVERT(p_text USING utf8mb4);
                SET v_text = REGEXP_REPLACE(v_text, '[\u200C\u200D]', '');
                SET v_text = LOWER(v_text);
                SET v_text = REGEXP_REPLACE(v_text, '^(दलनायक|मु\\.आ\\.|पी\\.सी\\.|म\\.आ\\.|आ\\.)[[:space:]]*', '');
                SET v_text = TRIM(REGEXP_REPLACE(v_text, '[[:space:]]+', ' '));
                RETURN v_text;
            END
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->isMySqlDriver()) {
            return;
        }

        DB::unprepared('DROP FUNCTION IF EXISTS normalize_devanagari');
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), $this->mysqlDrivers, true);
    }
};
