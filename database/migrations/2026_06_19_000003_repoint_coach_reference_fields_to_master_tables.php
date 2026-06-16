<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->dropForeign(['designation_master_id']);
            }

            if (Schema::hasColumn('coaches', 'rank_master_id')) {
                $table->dropForeign(['rank_master_id']);
            }

            if (Schema::hasColumn('coaches', 'tier_master_id')) {
                $table->dropForeign(['tier_master_id']);
            }
        });

        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'tier_master_id')) {
                $table->foreign('tier_master_id')->references('id')->on('tournament_tiers')->nullOnDelete();
            }

            if (Schema::hasColumn('coaches', 'rank_master_id')) {
                $table->foreign('rank_master_id')->references('id')->on('ranks')->nullOnDelete();
            }

            if (Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->foreign('designation_master_id')->references('id')->on('designations')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->dropForeign(['designation_master_id']);
            }

            if (Schema::hasColumn('coaches', 'rank_master_id')) {
                $table->dropForeign(['rank_master_id']);
            }

            if (Schema::hasColumn('coaches', 'tier_master_id')) {
                $table->dropForeign(['tier_master_id']);
            }
        });

        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'tier_master_id')) {
                $table->foreign('tier_master_id')->references('id')->on('nis_masters')->nullOnDelete();
            }

            if (Schema::hasColumn('coaches', 'rank_master_id')) {
                $table->foreign('rank_master_id')->references('id')->on('nis_masters')->nullOnDelete();
            }

            if (Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->foreign('designation_master_id')->references('id')->on('nis_masters')->nullOnDelete();
            }
        });
    }
};
