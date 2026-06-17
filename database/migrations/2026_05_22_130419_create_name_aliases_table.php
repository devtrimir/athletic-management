<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $mysqlDrivers = ['mysql', 'mariadb'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('name_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('alias');
            $table->string('alias_normalized')->nullable()->comment('Populated by normalize_devanagari trigger in P2-T04');
            $table->enum('source', ['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual']);
            $table->timestamps();

            $table->index('member_id');
            $table->index('source');
        });

        $this->ensureNormalizeTriggers();
        $this->ensureFullTextIndex();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('name_aliases');
    }

    private function ensureNormalizeTriggers(): void
    {
        if (! $this->isMySqlDriver() || ! $this->normalizeFunctionExists()) {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_name_aliases_normalize_before_update');

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

    private function ensureFullTextIndex(): void
    {
        if (! $this->isMySqlDriver()) {
            return;
        }

        if (! $this->indexExists('name_aliases', 'ft_alias_norm')) {
            DB::unprepared(
                'ALTER TABLE name_aliases ADD FULLTEXT INDEX ft_alias_norm (alias_normalized) WITH PARSER ngram',
            );
        }
    }

    private function normalizeFunctionExists(): bool
    {
        return DB::table('information_schema.routines')
            ->where('routine_schema', DB::raw('database()'))
            ->where('routine_name', 'normalize_devanagari')
            ->where('routine_type', 'FUNCTION')
            ->exists();
    }

    private function indexExists(string $table, string $index): bool
    {
        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::raw('database()'))
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), $this->mysqlDrivers, true);
    }
};
