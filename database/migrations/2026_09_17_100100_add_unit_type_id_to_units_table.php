<?php

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
        Schema::table('units', function (Blueprint $table) {
            $table->foreignId('unit_type_id')->nullable()->after('unit_type')->constrained('unit_types')->restrictOnDelete();
        });

        DB::statement(<<<'SQL'
            update units
            set unit_type_id = unit_types.id
            from unit_types
            where units.unit_type = unit_types.code
        SQL);

        Schema::table('units', function (Blueprint $table) {
            $table->unsignedBigInteger('unit_type_id')->nullable(false)->change();
            $table->dropColumn('unit_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->enum('unit_type', ['PAC', 'GRP', 'DISTRICT', 'HQ', 'OTHER'])->nullable()->after('name');
        });

        DB::statement(<<<'SQL'
            update units
            set unit_type = unit_types.code
            from unit_types
            where units.unit_type_id = unit_types.id
        SQL);

        Schema::table('units', function (Blueprint $table) {
            $table->string('unit_type')->nullable(false)->change();
            $table->dropConstrainedForeignId('unit_type_id');
        });
    }
};
