<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('team_incharge_assignments')) {
            if (! $this->isMySqlDriver()) {
                return;
            }

            $this->repairExistingTable();

            return;
        }

        $this->createTable();
    }

    public function down(): void
    {
        Schema::dropIfExists('team_incharge_assignments');
    }

    private function createTable(): void
    {
        Schema::create('team_incharge_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedBigInteger('incharge_id')->nullable();
            $table->string('full_name');
            $table->string('pno', 20)->nullable();
            $table->string('rank', 100)->nullable();
            $table->string('designation', 100)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email')->nullable();
            $table->dateTime('assigned_at');
            $table->dateTime('removed_at')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('removed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('assignment_reason')->nullable();
            $table->text('removal_reason')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('is_current')->default(true);
            $table->unsignedBigInteger('current_team_id')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique('current_team_id', 'team_incharge_assignments_current_team_unique');
            $table->index('team_id');
            $table->index('incharge_id');
            $table->index('pno');
            $table->index('is_current');
            $table->index('assigned_at');
            $table->index('removed_at');
        });
    }

    private function repairExistingTable(): void
    {
        if ($this->hasGeneratedCurrentTeamId()) {
            DB::statement('ALTER TABLE `team_incharge_assignments` DROP COLUMN `current_team_id`');
            DB::statement('ALTER TABLE `team_incharge_assignments` ADD COLUMN `current_team_id` BIGINT UNSIGNED NULL AFTER `is_current`');
        }

        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            if (! $this->indexExists('team_incharge_assignments_current_team_unique')) {
                $table->unique('current_team_id', 'team_incharge_assignments_current_team_unique');
            }

            if (! $this->indexExists('team_incharge_assignments_team_id_index')) {
                $table->index('team_id');
            }

            if (! $this->indexExists('team_incharge_assignments_incharge_id_index')) {
                $table->index('incharge_id');
            }

            if (! $this->indexExists('team_incharge_assignments_pno_index')) {
                $table->index('pno');
            }

            if (! $this->indexExists('team_incharge_assignments_is_current_index')) {
                $table->index('is_current');
            }

            if (! $this->indexExists('team_incharge_assignments_assigned_at_index')) {
                $table->index('assigned_at');
            }

            if (! $this->indexExists('team_incharge_assignments_removed_at_index')) {
                $table->index('removed_at');
            }
        });

        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            if (! $this->foreignKeyExists('team_incharge_assignments_team_id_foreign')) {
                $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            }

            if (! $this->foreignKeyExists('team_incharge_assignments_assigned_by_foreign')) {
                $table->foreign('assigned_by')->references('id')->on('users')->nullOnDelete();
            }

            if (! $this->foreignKeyExists('team_incharge_assignments_removed_by_foreign')) {
                $table->foreign('removed_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    private function hasGeneratedCurrentTeamId(): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        $column = DB::table('information_schema.columns')
            ->select('generation_expression')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'team_incharge_assignments')
            ->where('column_name', 'current_team_id')
            ->first();

        if ($column === null) {
            return false;
        }

        $columnValues = get_object_vars($column);
        $generationExpression = $columnValues['generation_expression']
            ?? $columnValues['GENERATION_EXPRESSION']
            ?? null;

        return $generationExpression !== null;
    }

    private function indexExists(string $indexName): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'team_incharge_assignments')
            ->where('index_name', $indexName)
            ->exists();
    }

    private function foreignKeyExists(string $constraintName): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'team_incharge_assignments')
            ->where('constraint_name', $constraintName)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
