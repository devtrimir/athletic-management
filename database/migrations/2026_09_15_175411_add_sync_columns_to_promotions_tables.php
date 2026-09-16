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
            $table->foreignId('member_promotion_id')
                ->nullable()
                ->after('coach_id')
                ->constrained('member_promotions')
                ->nullOnDelete();
        });

        Schema::table('member_promotions', function (Blueprint $table) {
            $table->foreignId('coach_promotion_id')
                ->nullable()
                ->after('member_id')
                ->constrained('coach_promotions')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_promotions', function (Blueprint $table) {
            $table->dropForeign(['coach_promotion_id']);
            $table->dropColumn('coach_promotion_id');
        });

        Schema::table('coach_promotions', function (Blueprint $table) {
            $table->dropForeign(['member_promotion_id']);
            $table->dropColumn('member_promotion_id');
        });
    }
};
