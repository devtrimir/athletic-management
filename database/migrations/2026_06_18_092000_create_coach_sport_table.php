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
        Schema::create('coach_sport', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->string('level')->nullable();
            $table->foreignId('level_master_id')->nullable()->constrained('tournament_tiers')->nullOnDelete();
            $table->string('sport_event')->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['coach_id', 'sport_id'], 'coach_sport_coach_id_sport_id_unique');
            $table->index('coach_id');
            $table->index('sport_id');
            $table->index('is_primary');
            $table->index('level_master_id');
            $table->index(['level_master_id', 'sport_event'], 'coach_sport_level_event_idx');
            $table->index(['coach_id', 'sport_id', 'is_primary'], 'coach_sport_lookup_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_sport');
    }
};
