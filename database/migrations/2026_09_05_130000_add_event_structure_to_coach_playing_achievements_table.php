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
        if (! Schema::hasTable('coach_playing_achievements')) {
            return;
        }

        Schema::table('coach_playing_achievements', function (Blueprint $table): void {
            if (! Schema::hasColumn('coach_playing_achievements', 'event_type')) {
                $table->string('event_type', 20)->nullable()->after('medal_type');
            }

            if (! Schema::hasColumn('coach_playing_achievements', 'source_achievement_id')) {
                // Provenance only, for a future copy-from-member feature; never
                // used by medal tally queries.
                $table->foreignId('source_achievement_id')
                    ->nullable()
                    ->after('event_type')
                    ->constrained('achievements')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('coach_playing_achievements')) {
            return;
        }

        Schema::table('coach_playing_achievements', function (Blueprint $table): void {
            if (Schema::hasColumn('coach_playing_achievements', 'source_achievement_id')) {
                $table->dropConstrainedForeignId('source_achievement_id');
            }

            if (Schema::hasColumn('coach_playing_achievements', 'event_type')) {
                $table->dropColumn('event_type');
            }
        });
    }
};
