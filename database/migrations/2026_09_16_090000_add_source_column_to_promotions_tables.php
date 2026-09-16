<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('coach_promotions', function (Blueprint $table) {
            $table->enum('source', ['native', 'synced'])->default('native')->after('member_promotion_id');
        });

        Schema::table('member_promotions', function (Blueprint $table) {
            $table->enum('source', ['native', 'synced'])->default('native')->after('coach_promotion_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_promotions', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        Schema::table('coach_promotions', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
