<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrective migration: environments that applied the original
     * coach_playing_achievements migration (with free-text sport_discipline)
     * before the sport-master revision landed never received the sport_id
     * column. Adds it when missing; no-ops where it already exists.
     */
    public function up(): void
    {
        if (! Schema::hasTable('coach_playing_achievements')) {
            return;
        }

        if (Schema::hasColumn('coach_playing_achievements', 'sport_id')) {
            return;
        }

        Schema::table('coach_playing_achievements', function (Blueprint $table) {
            // Nullable so existing legacy rows (sport_discipline text) survive;
            // new entries are required by form-request validation.
            $table->foreignId('sport_id')
                ->nullable()
                ->after('venue')
                ->constrained('sports')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('coach_playing_achievements') || ! Schema::hasColumn('coach_playing_achievements', 'sport_id')) {
            return;
        }

        Schema::table('coach_playing_achievements', function (Blueprint $table) {
            $table->dropForeign(['sport_id']);
            $table->dropColumn('sport_id');
        });
    }
};
