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

        if (Schema::hasColumn('coaches', 'nis_master_id') && Schema::hasIndex('coaches', 'coaches_nis_masters_idx')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropIndex('coaches_nis_masters_idx');
            });
        }

        if (Schema::hasColumn('coaches', 'nis_master_id') && $this->nisForeignKeyExists()) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropForeign(['nis_master_id']);
            });
        }

        foreach (['nis_master_id', 'nis_certified'] as $column) {
            if (Schema::hasColumn('coaches', $column)) {
                Schema::table('coaches', function (Blueprint $table) use ($column): void {
                    $table->dropColumn($column);
                });
            }
        }

        $remainingIndexColumns = array_values(array_filter(
            ['tier_master_id', 'rank_master_id', 'designation_master_id'],
            fn (string $column): bool => Schema::hasColumn('coaches', $column),
        ));

        if ($remainingIndexColumns !== [] && ! Schema::hasIndex('coaches', 'coaches_nis_masters_idx')) {
            Schema::table('coaches', function (Blueprint $table) use ($remainingIndexColumns): void {
                $table->index($remainingIndexColumns, 'coaches_nis_masters_idx');
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

        if (! Schema::hasColumn('coaches', 'nis_certified')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->boolean('nis_certified')->default(false);
            });
        }

        if (! Schema::hasColumn('coaches', 'nis_master_id')) {
            // Plain column only: recreating the FK here would pin the table to
            // nis_masters and break full-batch rollbacks that later drop it.
            Schema::table('coaches', function (Blueprint $table): void {
                $table->unsignedBigInteger('nis_master_id')->nullable();
            });
        }

        $indexColumns = array_values(array_filter(
            ['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'],
            fn (string $column): bool => Schema::hasColumn('coaches', $column),
        ));

        if (count($indexColumns) > 1 && Schema::hasIndex('coaches', 'coaches_nis_masters_idx')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropIndex('coaches_nis_masters_idx');
            });
        }

        if (count($indexColumns) > 1) {
            Schema::table('coaches', function (Blueprint $table) use ($indexColumns): void {
                $table->index($indexColumns, 'coaches_nis_masters_idx');
            });
        }
    }

    private function nisForeignKeyExists(): bool
    {
        return match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => DB::table('information_schema.table_constraints')
                ->whereRaw('table_schema = schema()')
                ->where('table_name', 'coaches')
                ->where('constraint_name', 'coaches_nis_master_id_foreign')
                ->where('constraint_type', 'FOREIGN KEY')
                ->exists(),
            'pgsql' => DB::selectOne(
                "select 1 from pg_constraint where conrelid = 'coaches'::regclass and conname = 'coaches_nis_master_id_foreign'"
            ) !== null,
            default => false,
        };
    }
};
