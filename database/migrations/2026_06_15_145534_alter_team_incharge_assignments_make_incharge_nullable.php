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
        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            if ($this->foreignKeyExists('team_incharge_assignments_incharge_id_foreign')) {
                $table->dropForeign('team_incharge_assignments_incharge_id_foreign');
            }

            $table->foreignId('incharge_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            $table->foreignId('incharge_id')->nullable(false)->change();

            if (DB::getDriverName() === 'mysql'
                && ! $this->foreignKeyExists('team_incharge_assignments_incharge_id_foreign')) {
                $table->foreign('incharge_id')->references('id')->on('members')->cascadeOnDelete();
            }
        });
    }

    private function foreignKeyExists(string $constraintName): bool
    {
        if (DB::getDriverName() !== 'mysql') {
            return false;
        }

        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'team_incharge_assignments')
            ->where('constraint_name', $constraintName)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }
};
