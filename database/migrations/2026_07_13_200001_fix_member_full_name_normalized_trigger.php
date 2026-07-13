<?php

declare(strict_types=1);

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

        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_update');

        if (! $this->normalizeFunctionExists()) {
            return;
        }

        DB::unprepared(
            <<<"SQL"
            CREATE TRIGGER trg_members_normalize_before_insert
            BEFORE INSERT ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL AND NEW.full_name_normalized IS NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
            SQL,
        );

        DB::unprepared(
            <<<"SQL"
            CREATE TRIGGER trg_members_normalize_before_update
            BEFORE UPDATE ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL AND NEW.full_name_normalized IS NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
            SQL,
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->isMySqlDriver()) {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_update');

        if (! $this->normalizeFunctionExists()) {
            return;
        }

        DB::unprepared(
            <<<"SQL"
            CREATE TRIGGER trg_members_normalize_before_insert
            BEFORE INSERT ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
            SQL,
        );

        DB::unprepared(
            <<<"SQL"
            CREATE TRIGGER trg_members_normalize_before_update
            BEFORE UPDATE ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
            SQL,
        );
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), $this->mysqlDrivers, true);
    }

    private function normalizeFunctionExists(): bool
    {
        return DB::table('information_schema.routines')
            ->where('routine_schema', DB::raw('database()'))
            ->where('routine_name', 'normalize_devanagari')
            ->where('routine_type', 'FUNCTION')
            ->exists();
    }
};
