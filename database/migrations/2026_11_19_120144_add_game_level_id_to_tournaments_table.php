<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A tournament is scored by its game level. Tournaments that already point at a
     * competition keep the level of that competition.
     */
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table): void {
            $table->foreignId('game_level_id')->nullable()->after('competition_id')->constrained('game_levels')->restrictOnDelete();
        });

        DB::table('tournaments')->whereNotNull('competition_id')->orderBy('id')->each(function (object $tournament): void {
            DB::table('tournaments')->where('id', $tournament->id)->update([
                'game_level_id' => DB::table('competitions')->where('id', $tournament->competition_id)->value('game_level_id'),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('game_level_id');
        });
    }
};
