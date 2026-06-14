<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropNameTriggers();

        $this->renameColumnIfExists('members', 'full_name_hi', 'full_name');
        $this->dropColumnIfExists('members', 'full_name_en');
        $this->renameColumnIfExists('members', 'father_name_hi', 'father_name');

        $this->renameColumnIfExists('coaches', 'full_name_hi', 'full_name');
        $this->dropColumnIfExists('coaches', 'full_name_en');

        foreach (['districts', 'sports', 'units', 'ranks', 'designations'] as $table) {
            $this->renameColumnIfExists($table, 'name_hi', 'name');
            $this->dropColumnIfExists($table, 'name_en');
        }

        $this->renameColumnIfExists('teams', 'name_hi', 'name');
        $this->renameColumnIfExists('teams', 'in_charge_hi', 'in_charge');
        $this->renameColumnIfExists('tournaments', 'name_hi', 'name');
        $this->renameColumnIfExists('events', 'name_hi', 'name');
        $this->renameColumnIfExists('name_aliases', 'alias_hi', 'alias');
        $this->renameColumnIfExists('member_status_history', 'reason_hi', 'reason');
        $this->renameColumnIfExists('media_files', 'caption_hi', 'caption');

        $this->createNameTriggers();
    }

    public function down(): void
    {
        $this->dropNameTriggers();

        $this->renameColumnIfExists('members', 'full_name', 'full_name_hi');
        $this->addNullableStringColumnIfMissing('members', 'full_name_en');
        $this->renameColumnIfExists('members', 'father_name', 'father_name_hi');

        $this->renameColumnIfExists('coaches', 'full_name', 'full_name_hi');
        $this->addNullableStringColumnIfMissing('coaches', 'full_name_en');

        foreach (['districts', 'sports', 'units', 'ranks', 'designations'] as $table) {
            $this->renameColumnIfExists($table, 'name', 'name_hi');
            $this->addNullableStringColumnIfMissing($table, 'name_en');
            DB::table($table)->update(['name_en' => DB::raw('name_hi')]);
        }

        $this->renameColumnIfExists('teams', 'name', 'name_hi');
        $this->renameColumnIfExists('teams', 'in_charge', 'in_charge_hi');
        $this->renameColumnIfExists('tournaments', 'name', 'name_hi');
        $this->renameColumnIfExists('events', 'name', 'name_hi');
        $this->renameColumnIfExists('name_aliases', 'alias', 'alias_hi');
        $this->renameColumnIfExists('member_status_history', 'reason', 'reason_hi');
        $this->renameColumnIfExists('media_files', 'caption', 'caption_hi');

        $this->createLegacyNameTriggers();
    }

    private function renameColumnIfExists(string $table, string $from, string $to): void
    {
        if (! Schema::hasColumn($table, $from) || Schema::hasColumn($table, $to)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($from, $to): void {
            $table->renameColumn($from, $to);
        });
    }

    private function dropColumnIfExists(string $table, string $column): void
    {
        if (! Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($column): void {
            $table->dropColumn($column);
        });
    }

    private function addNullableStringColumnIfMissing(string $table, string $column): void
    {
        if (Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($column): void {
            $table->string($column)->nullable();
        });
    }

    private function dropNameTriggers(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_update');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_update');
    }

    private function createNameTriggers(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_insert
            BEFORE INSERT ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_update
            BEFORE UPDATE ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_name_aliases_normalize_before_insert
            BEFORE INSERT ON name_aliases
            FOR EACH ROW
            BEGIN
                IF NEW.alias IS NOT NULL THEN
                    SET NEW.alias_normalized = normalize_devanagari(NEW.alias);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_name_aliases_normalize_before_update
            BEFORE UPDATE ON name_aliases
            FOR EACH ROW
            BEGIN
                IF NEW.alias IS NOT NULL THEN
                    SET NEW.alias_normalized = normalize_devanagari(NEW.alias);
                END IF;
            END
        SQL);
    }

    private function createLegacyNameTriggers(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_insert
            BEFORE INSERT ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name_hi IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name_hi);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_update
            BEFORE UPDATE ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name_hi IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name_hi);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_name_aliases_normalize_before_insert
            BEFORE INSERT ON name_aliases
            FOR EACH ROW
            BEGIN
                IF NEW.alias_hi IS NOT NULL THEN
                    SET NEW.alias_normalized = normalize_devanagari(NEW.alias_hi);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_name_aliases_normalize_before_update
            BEFORE UPDATE ON name_aliases
            FOR EACH ROW
            BEGIN
                IF NEW.alias_hi IS NOT NULL THEN
                    SET NEW.alias_normalized = normalize_devanagari(NEW.alias_hi);
                END IF;
            END
        SQL);
    }
};
