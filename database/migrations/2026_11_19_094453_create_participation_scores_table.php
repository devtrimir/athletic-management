<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One stored score per player per participation, frozen with the points
     * version that produced it so later versions never rewrite history.
     */
    public function up(): void
    {
        Schema::create('participation_scores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('participation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('point_scheme_id')->constrained()->restrictOnDelete();
            $table->foreignId('game_level_id')->constrained()->restrictOnDelete();
            $table->string('result', 20);
            $table->unsignedSmallInteger('points');
            $table->date('scored_on')->nullable();
            $table->timestamps();

            $table->unique(['participation_id', 'member_id']);
            $table->index(['member_id', 'point_scheme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participation_scores');
    }
};
