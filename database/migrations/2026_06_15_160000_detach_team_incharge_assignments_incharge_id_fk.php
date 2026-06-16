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
        if (! Schema::hasTable('team_incharge_assignments')) {
            return;
        }

        if (! Schema::hasColumn('team_incharge_assignments', 'incharge_id')) {
            return;
        }

        $hasMembersForeignKey = DB::getDriverName() === 'mysql'
            && $this->foreignKeyExists('team_incharge_assignments_incharge_id_foreign');

        if (! $hasMembersForeignKey) {
            return;
        }

        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            $table->dropForeign('team_incharge_assignments_incharge_id_foreign');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('team_incharge_assignments')) {
            return;
        }

        if (! Schema::hasColumn('team_incharge_assignments', 'incharge_id')) {
            return;
        }

        $shouldRestoreForeign = DB::getDriverName() === 'mysql'
            && ! $this->foreignKeyExists('team_incharge_assignments_incharge_id_foreign')
            && Schema::hasTable('members');

        if (! $shouldRestoreForeign) {
            return;
        }

        Schema::table('team_incharge_assignments', function (Blueprint $table) {
            $table->foreign('incharge_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }

    private function foreignKeyExists(string $constraintName): bool
    {
        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'team_incharge_assignments')
            ->where('constraint_name', $constraintName)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }
};
