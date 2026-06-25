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
        Schema::create('coach_promotion_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('coach_promotion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions')->cascadeOnDelete();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['coach_promotion_id', 'session_id', 'tournament_id', 'event_id', 'team_id'],
                'coach_reward_evidence_unique',
            );
            $table->index(['organization_id', 'session_id', 'tournament_id'], 'coach_reward_evidence_org_session_tournament');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_promotion_evidence');
    }
};
