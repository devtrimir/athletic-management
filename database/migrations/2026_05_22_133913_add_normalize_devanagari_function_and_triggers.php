<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the normalize_devanagari stored function and BEFORE INSERT/UPDATE
     * triggers on members and name_aliases to auto-populate *_normalized columns.
     *
     * Steps in the function (in order):
     *   1. NFC normalisation via CONVERT(... USING utf8mb4)
     *   2. Strip ZWJ (U+200D) and ZWNJ (U+200C)
     *   3. Lowercase ASCII via LOWER()
     *   4. Strip leading rank prefixes (longest-match first)
     *   5. Collapse and trim whitespace
     *
     * NOTE: MySQL-only — silently skipped on other drivers (e.g. SQLite in tests).
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // ── Stored function ─────────────────────────────────────────────────
        DB::unprepared(<<<'SQL'
            CREATE FUNCTION normalize_devanagari(p_text TEXT)
            RETURNS TEXT
            DETERMINISTIC
            BEGIN
                DECLARE v_text TEXT;
                SET v_text = CONVERT(p_text USING utf8mb4);
                SET v_text = REGEXP_REPLACE(v_text, '[\\u200C\\u200D]', '');
                SET v_text = LOWER(v_text);
                SET v_text = REGEXP_REPLACE(v_text, '^(दलनायक|मु\\.आ\\.|पी\\.सी\\.|म\\.आ\\.|आ\\.)[[:space:]]*', '');
                SET v_text = TRIM(REGEXP_REPLACE(v_text, '[[:space:]]+', ' '));
                RETURN v_text;
            END
        SQL);

        // ── Triggers: members ────────────────────────────────────────────────
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

        // ── Triggers: name_aliases ───────────────────────────────────────────
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

    /**
     * Reverse the migrations.
     *
     * Triggers must be dropped before the function.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_update');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_update');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_insert');
        DB::unprepared('DROP FUNCTION IF EXISTS normalize_devanagari');
    }
};
