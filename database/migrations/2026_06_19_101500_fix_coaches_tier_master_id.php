<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        Schema::table('coaches', function (Blueprint $table): void {
            if (! Schema::hasColumn('coaches', 'tier_master_id')) {
                if (Schema::hasTable('tournament_tiers')) {
                    $table->foreignId('tier_master_id')->nullable()->after('nis_master_id')->constrained('tournament_tiers')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('tier_master_id')->nullable()->after('nis_master_id');
                }
            }
        });

        if (! $this->isMySqlDriver()) {
            return;
        }

        if (
            Schema::hasColumn('coaches', 'tier_master_id')
            && ! $this->foreignKeyExists('coaches_tier_master_id_foreign')
            && Schema::hasTable('tournament_tiers')
        ) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->foreign('tier_master_id')->references('id')->on('tournament_tiers')->nullOnDelete();
            });
        }

        if (
            Schema::hasColumn('coaches', 'tier_master_id')
            && Schema::hasColumn('coaches', 'nis_master_id')
            && Schema::hasColumn('coaches', 'rank_master_id')
            && Schema::hasColumn('coaches', 'designation_master_id')
            && ! $this->hasIndex('coaches', 'coaches_nis_masters_idx')
        ) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->index(
                    ['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'],
                    'coaches_nis_masters_idx'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        if ($this->isMySqlDriver() && $this->foreignKeyExists('coaches_tier_master_id_foreign')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropForeign('coaches_tier_master_id_foreign');
            });
        }

        if ($this->hasIndex('coaches', 'coaches_nis_masters_idx')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropIndex('coaches_nis_masters_idx');
            });
        }

        if (Schema::hasColumn('coaches', 'tier_master_id')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropColumn('tier_master_id');
            });
        }
    }

    private function hasIndex(string $table, string $index): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    private function foreignKeyExists(string $constraint): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'coaches')
            ->where('constraint_name', $constraint)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
