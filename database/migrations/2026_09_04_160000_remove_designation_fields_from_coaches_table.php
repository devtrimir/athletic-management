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

        if (! Schema::hasColumn('coaches', 'designation') && ! Schema::hasColumn('coaches', 'designation_master_id')) {
            return;
        }

        if (Schema::hasColumn('coaches', 'designation_master_id')) {
            Schema::table('coaches', function (Blueprint $table): void {
                if ($this->isMySqlDriver() && $this->foreignKeyExists('coaches_designation_master_id_foreign')) {
                    $table->dropForeign(['designation_master_id']);
                }

                if ($this->hasIndex('coaches', 'coaches_nis_masters_idx')) {
                    $table->dropIndex('coaches_nis_masters_idx');
                }
            });
        }

        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'designation')) {
                $table->dropColumn('designation');
            }

            if (Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->dropColumn('designation_master_id');
            }

            if (Schema::hasColumn('coaches', 'designation_en')) {
                $table->dropColumn('designation_en');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        Schema::table('coaches', function (Blueprint $table): void {
            if (! Schema::hasColumn('coaches', 'designation')) {
                $table->string('designation')->nullable();
            }

            if (! Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->unsignedBigInteger('designation_master_id')->nullable();
            }

            if (! Schema::hasColumn('coaches', 'designation_en')) {
                $table->string('designation_en')->nullable();
            }
        });

        // Full-batch rollback drops the masters table afterwards, so the
        // composite index is restored without a foreign key.
        if (
            ! $this->hasIndex('coaches', 'coaches_nis_masters_idx')
            && Schema::hasColumn('coaches', 'nis_master_id')
            && Schema::hasColumn('coaches', 'tier_master_id')
            && Schema::hasColumn('coaches', 'rank_master_id')
            && Schema::hasColumn('coaches', 'designation_master_id')
        ) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->index(
                    ['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'],
                    'coaches_nis_masters_idx'
                );
            });
        }
    }

    private function hasIndex(string $table, string $index): bool
    {
        return collect(Schema::getIndexes($table))->contains(
            fn (array $definition): bool => ($definition['name'] ?? null) === $index,
        );
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
