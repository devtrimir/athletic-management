<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coach_sport', function (Blueprint $table): void {
            if (! Schema::hasColumn('coach_sport', 'level_master_id')) {
                $table->foreignId('level_master_id')->nullable()->after('is_primary')->constrained('nis_masters')->nullOnDelete();
            }

            if (! Schema::hasColumn('coach_sport', 'sport_event')) {
                $table->string('sport_event')->nullable()->after('level');
            }

            $table->index(['coach_id', 'sport_id', 'is_primary'], 'coach_sport_lookup_idx');
            $table->index(['level_master_id', 'sport_event'], 'coach_sport_level_event_idx');
        });
    }

    public function down(): void
    {
        Schema::table('coach_sport', function (Blueprint $table): void {
            if (Schema::hasColumn('coach_sport', 'sport_event')) {
                $table->dropColumn('sport_event');
            }

            if (Schema::hasColumn('coach_sport', 'level_master_id')) {
                $table->dropConstrainedForeignId('level_master_id');
            }
        });
    }
};
