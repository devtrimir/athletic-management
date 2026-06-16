<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coaches', function (Blueprint $table): void {
            if (! Schema::hasColumn('coaches', 'blood_group')) {
                $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])->nullable()->after('mobile');
            }

            if (! Schema::hasColumn('coaches', 'district_id')) {
                $table->foreignId('district_id')->nullable()->after('blood_group')->constrained('districts')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'unit_id')) {
                $table->foreignId('unit_id')->nullable()->after('district_id')->constrained('units')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'nis_master_id')) {
                $table->foreignId('nis_master_id')->nullable()->after('unit_id')->constrained('nis_masters')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'tier_master_id')) {
                $table->foreignId('tier_master_id')->nullable()->after('nis_master_id')->constrained('nis_masters')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'rank_master_id')) {
                $table->foreignId('rank_master_id')->nullable()->after('tier_master_id')->constrained('nis_masters')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'designation_master_id')) {
                $table->foreignId('designation_master_id')->nullable()->after('rank_master_id')->constrained('nis_masters')->nullOnDelete();
            }

            $table->index(['district_id', 'unit_id']);
            $table->index(['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'], 'coaches_nis_masters_idx');
        });
    }

    public function down(): void
    {
        Schema::table('coaches', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('designation_master_id');
            $table->dropConstrainedForeignId('rank_master_id');
            $table->dropConstrainedForeignId('tier_master_id');
            $table->dropConstrainedForeignId('nis_master_id');
            $table->dropConstrainedForeignId('unit_id');
            $table->dropConstrainedForeignId('district_id');
            $table->dropColumn('blood_group');
        });
    }
};
