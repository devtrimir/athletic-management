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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 20)->unique();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'mysql' && Schema::hasTable('users')) {
            $hasFk = DB::table('information_schema.key_column_usage')
                ->where('table_schema', DB::raw('DATABASE()'))
                ->where('table_name', 'users')
                ->where('column_name', 'organization_id')
                ->whereNotNull('referenced_table_name')
                ->where('referenced_table_name', 'organizations')
                ->exists();

            if (! $hasFk) {
                Schema::table('users', function (Blueprint $table): void {
                    $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql' && Schema::hasTable('users')) {
            $fkExists = DB::table('information_schema.referential_constraints')
                ->where('constraint_schema', DB::raw('DATABASE()'))
                ->where('constraint_name', 'users_organization_id_foreign')
                ->where('table_name', 'users')
                ->exists();

            if ($fkExists) {
                Schema::table('users', function (Blueprint $table): void {
                    $table->dropForeign('users_organization_id_foreign');
                });
            }
        }

        Schema::dropIfExists('organizations');
    }
};
